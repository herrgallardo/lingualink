/**
 * Real-time messaging service with offline support and reconnection
 */
import type { Database } from '@/lib/types/database';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

type Tables = Database['public']['Tables'];
type MessageRow = Tables['messages']['Row'];
type MessageInsert = Tables['messages']['Insert'];
type ReactionRow = Tables['message_reactions']['Row'];
type ReadReceiptRow = Tables['read_receipts']['Row'];

export interface MessageQueueItem {
  id: string;
  tempId: string;
  message: MessageInsert;
  retries: number;
  timestamp: number;
}

export interface RealtimeMessageHandlers {
  onNewMessage?: (message: MessageRow) => void;
  onMessageUpdated?: (message: MessageRow) => void;
  onMessageDeleted?: (messageId: string) => void;
  onReactionAdded?: (reaction: ReactionRow) => void;
  onReactionRemoved?: (reaction: ReactionRow) => void;
  onReadReceipt?: (receipt: ReadReceiptRow) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export class RealtimeMessagesService {
  private supabase: SupabaseClient<Database>;
  private channel: RealtimeChannel | null = null;
  private handlers: RealtimeMessageHandlers = {};
  private messageQueue: Map<string, MessageQueueItem> = new Map();
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private chatId: string | null = null;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }

    // Load queue from localStorage
    this.loadQueueFromStorage();
  }

  /**
   * Subscribe to real-time updates for a chat
   */
  async subscribe(chatId: string, handlers: RealtimeMessageHandlers): Promise<void> {
    this.chatId = chatId;
    this.handlers = handlers;

    // Unsubscribe from previous channel if exists
    await this.unsubscribe();

    // Create new channel
    this.channel = this.supabase.channel(`chat:${chatId}`, {
      config: {
        broadcast: {
          self: true,
          ack: true,
        },
      },
    });

    // Subscribe to message changes
    this.channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          if (payload.new && this.handlers.onNewMessage) {
            this.handlers.onNewMessage(payload.new as MessageRow);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          if (payload.new && this.handlers.onMessageUpdated) {
            this.handlers.onMessageUpdated(payload.new as MessageRow);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          if (payload.old && this.handlers.onMessageDeleted) {
            const oldMessage = payload.old as { id: string };
            this.handlers.onMessageDeleted(oldMessage.id);
          }
        },
      );

    // Subscribe to reactions
    this.channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions',
        },
        async (payload) => {
          const reaction = payload.new as ReactionRow;
          // Check if reaction is for a message in this chat
          const { data: message } = await this.supabase
            .from('messages')
            .select('chat_id')
            .eq('id', reaction.message_id)
            .single();

          if (message?.chat_id === chatId && this.handlers.onReactionAdded) {
            this.handlers.onReactionAdded(reaction);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'message_reactions',
        },
        async (payload) => {
          const reaction = payload.old as ReactionRow;
          // Check if reaction is for a message in this chat
          const { data: message } = await this.supabase
            .from('messages')
            .select('chat_id')
            .eq('id', reaction.message_id)
            .single();

          if (message?.chat_id === chatId && this.handlers.onReactionRemoved) {
            this.handlers.onReactionRemoved(reaction);
          }
        },
      );

    // Subscribe to read receipts
    this.channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'read_receipts',
      },
      async (payload) => {
        const receipt = payload.new as ReadReceiptRow;
        // Check if receipt is for a message in this chat
        const { data: message } = await this.supabase
          .from('messages')
          .select('chat_id')
          .eq('id', receipt.message_id)
          .single();

        if (message?.chat_id === chatId && this.handlers.onReadReceipt) {
          this.handlers.onReadReceipt(receipt);
        }
      },
    );

    // Handle connection state
    this.channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        this.handleConnected();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        this.handleDisconnected();
      }
    });
  }

  /**
   * Unsubscribe from real-time updates
   */
  async unsubscribe(): Promise<void> {
    if (this.channel) {
      await this.supabase.removeChannel(this.channel);
      this.channel = null;
    }

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.isConnected = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Send a message with optimistic updates and queuing
   */
  async sendMessage(
    message: Omit<MessageInsert, 'id' | 'created_at'>,
  ): Promise<{ tempId: string; message?: MessageRow; error?: Error }> {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create optimistic message
    const optimisticMessage: MessageRow = {
      id: tempId,
      ...message,
      created_at: new Date().toISOString(),
      timestamp: message.timestamp || new Date().toISOString(),
      original_language: message.original_language || 'en',
      translations: message.translations || {},
      edited_at: null,
      deleted_at: null,
    };

    // Notify handlers immediately (optimistic update)
    if (this.handlers.onNewMessage) {
      this.handlers.onNewMessage(optimisticMessage);
    }

    // Add to queue
    const queueItem: MessageQueueItem = {
      id: tempId,
      tempId,
      message,
      retries: 0,
      timestamp: Date.now(),
    };
    this.messageQueue.set(tempId, queueItem);
    this.saveQueueToStorage();

    // Try to send immediately if online
    if (navigator.onLine && this.isConnected) {
      try {
        const result = await this.sendQueuedMessage(queueItem);
        if (result) {
          return { tempId, message: result };
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        return { tempId, error: error as Error };
      }
    }

    // Process queue (will retry if online)
    this.processQueue();

    return { tempId };
  }

  /**
   * Send a queued message
   */
  private async sendQueuedMessage(queueItem: MessageQueueItem): Promise<MessageRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .insert(queueItem.message)
        .select()
        .single();

      if (error) throw error;

      // Remove from queue
      this.messageQueue.delete(queueItem.tempId);
      this.saveQueueToStorage();

      // Update optimistic message with real data
      if (data && this.handlers.onMessageUpdated) {
        this.handlers.onMessageUpdated(data);
      }

      return data;
    } catch (error) {
      queueItem.retries++;

      if (queueItem.retries >= 3) {
        // Max retries reached, remove from queue
        this.messageQueue.delete(queueItem.tempId);
        this.saveQueueToStorage();

        // Notify about failure
        if (this.handlers.onMessageDeleted) {
          this.handlers.onMessageDeleted(queueItem.tempId);
        }
      }

      throw error;
    }
  }

  /**
   * Process message queue
   */
  private async processQueue(): Promise<void> {
    if (!navigator.onLine || !this.isConnected || this.messageQueue.size === 0) {
      return;
    }

    // Process messages in order
    const sortedQueue = Array.from(this.messageQueue.values()).sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    for (const queueItem of sortedQueue) {
      try {
        await this.sendQueuedMessage(queueItem);
      } catch (error) {
        console.error('Failed to process queued message:', error);
        // Continue with next message
      }
    }
  }

  /**
   * Handle connection established
   */
  private handleConnected = (): void => {
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Notify handlers
    if (this.handlers.onConnectionChange) {
      this.handlers.onConnectionChange(true);
    }

    // Process any queued messages
    this.processQueue();
  };

  /**
   * Handle connection lost
   */
  private handleDisconnected = (): void => {
    this.isConnected = false;

    // Notify handlers
    if (this.handlers.onConnectionChange) {
      this.handlers.onConnectionChange(false);
    }

    // Schedule reconnection
    this.scheduleReconnect();
  };

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;

      if (this.chatId && navigator.onLine) {
        this.subscribe(this.chatId, this.handlers);
      }

      // Exponential backoff
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    }, this.reconnectDelay);
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    if (this.chatId && !this.isConnected) {
      this.subscribe(this.chatId, this.handlers);
    }
  };

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    // Connection will be lost automatically
    // Just ensure we handle it gracefully
  };

  /**
   * Save queue to localStorage
   */
  private saveQueueToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const queueArray = Array.from(this.messageQueue.entries());
      localStorage.setItem('lingualink_message_queue', JSON.stringify(queueArray));
    } catch (error) {
      console.error('Failed to save message queue:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadQueueFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('lingualink_message_queue');
      if (stored) {
        const queueArray = JSON.parse(stored) as [string, MessageQueueItem][];
        this.messageQueue = new Map(queueArray);
      }
    } catch (error) {
      console.error('Failed to load message queue:', error);
      this.messageQueue.clear();
    }
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.unsubscribe();

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }

    this.handlers = {};
    this.messageQueue.clear();
  }
}
