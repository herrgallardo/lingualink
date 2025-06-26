/**
 * Real-time messaging service with improved error handling
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
  // REMOVED: private isConnected = false;
  private currentChatId: string | null = null;
  private subscriptionPromise: Promise<void> | null = null;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }

    this.loadQueueFromStorage();
  }

  /**
   * Subscribe to real-time updates for a chat
   */
  async subscribe(chatId: string, handlers: RealtimeMessageHandlers): Promise<void> {
    this.handlers = handlers;

    // If already subscribing, wait for it
    if (this.subscriptionPromise && this.currentChatId === chatId) {
      return this.subscriptionPromise;
    }

    // Clean up existing subscription if switching chats
    if (this.currentChatId && this.currentChatId !== chatId) {
      await this.unsubscribe();
    }

    this.currentChatId = chatId;

    // Create new subscription
    this.subscriptionPromise = this.createSubscription(chatId);

    try {
      await this.subscriptionPromise;
    } finally {
      this.subscriptionPromise = null;
    }
  }

  /**
   * Create a new subscription for a chat
   */
  private async createSubscription(chatId: string): Promise<void> {
    // Clean up any existing channel
    if (this.channel) {
      await this.cleanupChannel();
    }

    // Create channel
    this.channel = this.supabase.channel(`chat:${chatId}`, {
      config: {
        broadcast: {
          self: true,
          ack: true,
        },
      },
    });

    // Set up event listeners
    this.setupChannelListeners(this.channel, chatId);

    // Subscribe to channel
    return new Promise<void>((resolve, reject) => {
      if (!this.channel) {
        reject(new Error('Channel creation failed'));
        return;
      }

      const timeout = setTimeout(() => {
        console.warn('Channel subscription timeout - continuing anyway');
        resolve(); // Don't reject, just continue
      }, 10000);

      this.channel.subscribe((status) => {
        console.log(`Channel ${chatId} status: ${status}`);

        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          this.handleConnected();
          resolve();
        } else if (status === 'CHANNEL_ERROR') {
          clearTimeout(timeout);
          console.error('Channel error - continuing anyway');
          this.handleDisconnected();
          resolve(); // Don't reject, just continue
        } else if (status === 'CLOSED') {
          this.handleDisconnected();
        }
      });
    });
  }

  /**
   * Set up channel event listeners
   */
  private setupChannelListeners(channel: RealtimeChannel, chatId: string): void {
    // Subscribe to message changes
    channel
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
      );

    // Subscribe to reactions - without filter initially
    channel
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
    channel.on(
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
  }

  /**
   * Clean up channel
   */
  private async cleanupChannel(): Promise<void> {
    if (!this.channel) return;

    try {
      await this.channel.unsubscribe();
      await this.supabase.removeChannel(this.channel);
    } catch (error) {
      console.error('Error cleaning up channel:', error);
    } finally {
      this.channel = null;
    }
  }

  /**
   * Unsubscribe from current chat
   */
  async unsubscribe(): Promise<void> {
    await this.cleanupChannel();
    this.currentChatId = null;
    // REMOVED: this.isConnected = false;
    this.handlers = {};
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
      timestamp: message.timestamp ?? new Date().toISOString(),
      original_language: message.original_language ?? 'en',
      translations: message.translations ?? {},
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
    if (navigator.onLine) {
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

    // Process queue
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
    if (!navigator.onLine || this.messageQueue.size === 0) {
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
      }
    }
  }

  /**
   * Handle connection established
   */
  private handleConnected = (): void => {
    // REMOVED: this.isConnected = true;

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
    // REMOVED: this.isConnected = false;

    if (this.handlers.onConnectionChange) {
      this.handlers.onConnectionChange(false);
    }
  };

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    console.log('Network online, processing queue...');
    this.processQueue();
  };

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    console.log('Network offline');
    // REMOVED: this.isConnected = false;

    if (this.handlers.onConnectionChange) {
      this.handlers.onConnectionChange(false);
    }
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
