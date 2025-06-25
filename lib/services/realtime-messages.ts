/**
 * Real-time messaging service with improved timeout handling and reconnection
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

interface ChannelState {
  channel: RealtimeChannel;
  status: 'unsubscribed' | 'subscribing' | 'subscribed' | 'unsubscribing' | 'error';
  subscriptionPromise?: Promise<void>;
  retryCount: number;
  lastError?: Error;
}

export class RealtimeMessagesService {
  private supabase: SupabaseClient<Database>;
  private channelStates: Map<string, ChannelState> = new Map();
  private handlers: RealtimeMessageHandlers = {};
  private messageQueue: Map<string, MessageQueueItem> = new Map();
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private timeoutTimers: Map<string, NodeJS.Timeout> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private subscriptionTimeout = 15000; // 15 seconds timeout
  private currentChatId: string | null = null;
  private cleanupFunctions: Map<string, () => void> = new Map();

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }

    // Load queue from localStorage
    this.loadQueueFromStorage();
  }

  /**
   * Subscribe to real-time updates for a chat
   */
  async subscribe(chatId: string, handlers: RealtimeMessageHandlers): Promise<void> {
    this.handlers = handlers;
    this.currentChatId = chatId;

    // Clear any existing timeout for this chat
    const existingTimeout = this.timeoutTimers.get(chatId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.timeoutTimers.delete(chatId);
    }

    // Check if we already have an active subscription for this chat
    const existingState = this.channelStates.get(chatId);

    if (existingState) {
      // If already subscribed, just return
      if (existingState.status === 'subscribed') {
        console.log(`Already subscribed to chat ${chatId}`);
        this.handleConnected();
        return;
      }

      // If currently subscribing, wait for it to complete
      if (existingState.status === 'subscribing' && existingState.subscriptionPromise) {
        console.log(`Already subscribing to chat ${chatId}, waiting...`);
        return existingState.subscriptionPromise;
      }

      // If in error state and haven't exceeded retry limit, try again
      if (existingState.status === 'error' && existingState.retryCount < 3) {
        console.log(
          `Retrying subscription to chat ${chatId} (attempt ${existingState.retryCount + 1})`,
        );
        existingState.retryCount++;
      } else if (existingState.status === 'error') {
        // Too many retries, clean up and start fresh
        console.log(`Too many retries for chat ${chatId}, starting fresh`);
        await this.cleanupChannel(chatId);
      }
    }

    // Create new subscription
    const subscriptionPromise = this.createSubscription(chatId);

    // Store the promise so other calls can wait for it
    const channelState = this.channelStates.get(chatId);
    if (channelState) {
      channelState.subscriptionPromise = subscriptionPromise;
    }

    try {
      await subscriptionPromise;
    } catch (error) {
      console.error(`Failed to subscribe to chat ${chatId}:`, error);
      // Don't throw immediately, let reconnection logic handle it
      const state = this.channelStates.get(chatId);
      if (state) {
        state.lastError = error as Error;
      }
    }
  }

  /**
   * Create a new subscription for a chat
   */
  private async createSubscription(chatId: string): Promise<void> {
    // Create channel with specific configuration
    const channel = this.supabase.channel(`chat:${chatId}`, {
      config: {
        broadcast: {
          self: true,
          ack: true,
        },
        presence: {
          key: chatId,
        },
      },
    });

    // Store channel state
    const state: ChannelState = {
      channel,
      status: 'subscribing',
      retryCount: this.channelStates.get(chatId)?.retryCount || 0,
    };
    this.channelStates.set(chatId, state);

    // Set up event listeners before subscribing
    this.setupChannelListeners(channel, chatId);

    // Subscribe to channel with timeout
    return new Promise<void>((resolve, reject) => {
      let subscribeTimeout: NodeJS.Timeout | undefined;
      let resolved = false;

      // Cleanup function
      const cleanup = () => {
        if (subscribeTimeout) {
          clearTimeout(subscribeTimeout);
          subscribeTimeout = undefined;
        }
      };

      // Store cleanup function
      this.cleanupFunctions.set(chatId, cleanup);

      // Set timeout for subscription
      subscribeTimeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          state.status = 'error';
          state.lastError = new Error('Subscription timeout');
          cleanup();
          reject(state.lastError);

          // Schedule retry if not exceeded attempts
          if (state.retryCount < 3) {
            this.scheduleRetry(chatId);
          }
        }
      }, this.subscriptionTimeout);

      // Store timeout reference
      this.timeoutTimers.set(chatId, subscribeTimeout);

      // Subscribe with status callback
      channel.subscribe((status) => {
        console.log(`Channel ${chatId} status: ${status}`);

        if (status === 'SUBSCRIBED') {
          state.status = 'subscribed';
          state.retryCount = 0; // Reset retry count on success
          if (!resolved) {
            resolved = true;
            this.handleConnected();
            cleanup();
            resolve();
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          state.status = 'error';
          state.lastError = new Error(`Channel subscription failed: ${status}`);
          if (!resolved) {
            resolved = true;
            this.handleDisconnected();
            cleanup();

            // Don't reject immediately, try to recover
            if (state.retryCount < 3) {
              this.scheduleRetry(chatId);
              resolve(); // Resolve to prevent promise rejection
            } else {
              reject(state.lastError);
            }
          }
        } else if (status === 'CLOSED') {
          state.status = 'unsubscribed';
          this.handleDisconnected();
        }
      });
    });
  }

  /**
   * Schedule a retry for a failed subscription
   */
  private scheduleRetry(chatId: string): void {
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay,
    );

    console.log(`Scheduling retry for chat ${chatId} in ${delay}ms`);

    setTimeout(() => {
      const state = this.channelStates.get(chatId);
      if (state && state.status === 'error' && chatId === this.currentChatId) {
        this.subscribe(chatId, this.handlers);
      }
    }, delay);

    this.reconnectAttempts++;
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
   * Clean up a channel
   */
  private async cleanupChannel(chatId: string): Promise<void> {
    const state = this.channelStates.get(chatId);
    if (!state) return;

    // Update status
    state.status = 'unsubscribing';

    // Clear any timeouts
    const timeout = this.timeoutTimers.get(chatId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeoutTimers.delete(chatId);
    }

    // Run cleanup function if exists
    const cleanup = this.cleanupFunctions.get(chatId);
    if (cleanup) {
      cleanup();
      this.cleanupFunctions.delete(chatId);
    }

    try {
      // Unsubscribe and remove channel
      await state.channel.unsubscribe();
      await this.supabase.removeChannel(state.channel);
    } catch (error) {
      console.error(`Error cleaning up channel ${chatId}:`, error);
    } finally {
      // Remove from maps
      this.channelStates.delete(chatId);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  async unsubscribe(): Promise<void> {
    // Clear all timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    for (const timeout of this.timeoutTimers.values()) {
      clearTimeout(timeout);
    }
    this.timeoutTimers.clear();

    // Clean up all channels
    const cleanupPromises = Array.from(this.channelStates.keys()).map((chatId) =>
      this.cleanupChannel(chatId),
    );

    await Promise.all(cleanupPromises);

    // Reset state
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.currentChatId = null;
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

    // Schedule reconnection if we have an active chat
    if (this.currentChatId && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  };

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;

      if (this.currentChatId && navigator.onLine) {
        // Try to reconnect to current chat
        this.subscribe(this.currentChatId, this.handlers);
      }
    }, delay);
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    console.log('Network online, attempting to reconnect...');
    this.reconnectAttempts = 0;

    if (this.currentChatId) {
      // Clear any existing reconnect timer
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // Try to reconnect immediately
      this.subscribe(this.currentChatId, this.handlers);
    }
  };

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    console.log('Network offline');
    this.isConnected = false;

    // Notify handlers
    if (this.handlers.onConnectionChange) {
      this.handlers.onConnectionChange(false);
    }
  };

  /**
   * Handle page unload
   */
  private handleBeforeUnload = (): void => {
    // Quick cleanup on page unload
    for (const state of this.channelStates.values()) {
      try {
        state.channel.unsubscribe();
      } catch {
        // Ignore errors during unload
      }
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
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }

    this.handlers = {};
    this.messageQueue.clear();
  }
}
