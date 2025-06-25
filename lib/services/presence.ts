/**
 * Real-time presence service with improved timeout handling
 */
import type { Database } from '@/lib/types/database';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

export interface PresenceUser {
  id: string;
  username: string;
  avatar_url: string | null;
  status: Database['public']['Tables']['users']['Row']['status'];
  last_seen: string;
  online_at: string;
}

// Supabase presence state structure
export interface PresenceState {
  [key: string]: PresenceUser[];
}

export class PresenceService {
  private supabase: SupabaseClient<Database>;
  private channel: RealtimeChannel | null = null;
  private userId: string;
  private updateInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private subscriptionTimeout: NodeJS.Timeout | null = null;
  private isJoining = false;
  private isLeaving = false;
  private retryCount = 0;
  private maxRetries = 5;
  private retryDelay = 1000;
  private maxRetryDelay = 30000;
  private lastHeartbeat = Date.now();

  constructor(supabase: SupabaseClient<Database>, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  /**
   * Join a presence channel and start tracking
   */
  async join(channelName: string, userData: Omit<PresenceUser, 'online_at'>): Promise<void> {
    // Prevent multiple simultaneous join attempts
    if (this.isJoining || this.isLeaving) {
      console.log('Already joining/leaving, skipping...');
      return;
    }

    // Check if page is unloading
    if (typeof window !== 'undefined' && window.performance.navigation.type === 1) {
      console.log('Page is reloading, skipping presence join...');
      return;
    }

    // Check if we're offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('Offline - skipping presence join');
      return;
    }

    this.isJoining = true;

    try {
      // Leave any existing channel
      if (this.channel) {
        await this.leave();
      }

      // Create channel with specific configuration
      this.channel = this.supabase.channel(channelName, {
        config: {
          presence: {
            key: this.userId,
          },
          broadcast: {
            self: false,
            ack: true,
          },
        },
      });

      const currentChannel = this.channel;

      // Subscribe to presence sync events
      currentChannel.on('presence', { event: 'sync' }, () => {
        // Presence state synced
        this.retryCount = 0; // Reset retry count on successful sync
      });

      // Subscribe and track user presence with timeout
      await new Promise<void>((resolve, reject) => {
        // Clear any existing timeout
        if (this.subscriptionTimeout) {
          clearTimeout(this.subscriptionTimeout);
        }

        this.subscriptionTimeout = setTimeout(() => {
          const error = new Error('Subscription timeout');
          console.warn('Presence subscription timeout');

          // Don't reject if we're offline or page is hidden
          if (typeof document !== 'undefined' && document.hidden) {
            resolve(); // Resolve anyway if page is hidden
          } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
            resolve(); // Resolve anyway if offline
          } else {
            reject(error);
          }
        }, 15000); // 15 second timeout

        currentChannel.subscribe(async (status) => {
          console.log(`Presence channel status: ${status}`);

          if (status === 'SUBSCRIBED') {
            if (this.subscriptionTimeout) {
              clearTimeout(this.subscriptionTimeout);
              this.subscriptionTimeout = null;
            }

            try {
              const presenceData: PresenceUser = {
                ...userData,
                online_at: new Date().toISOString(),
              };

              await currentChannel.track(presenceData);

              // Start heartbeat and update intervals
              this.startHeartbeat();
              this.startUpdateInterval();

              resolve();
            } catch (error) {
              reject(error);
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (this.subscriptionTimeout) {
              clearTimeout(this.subscriptionTimeout);
              this.subscriptionTimeout = null;
            }

            // Don't treat as error if offline or page hidden
            if (typeof document !== 'undefined' && document.hidden) {
              resolve();
            } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
              resolve();
            } else {
              const error = new Error(`Channel subscription failed: ${status}`);

              // Schedule retry if not exceeded
              if (this.retryCount < this.maxRetries) {
                this.scheduleRetry(channelName, userData);
                resolve(); // Don't reject, let retry handle it
              } else {
                reject(error);
              }
            }
          } else if (status === 'CLOSED') {
            // Channel closed, might need to reconnect
            if (this.retryCount < this.maxRetries && navigator.onLine && !document.hidden) {
              this.scheduleRetry(channelName, userData);
            }
          }
        });
      });
    } catch (error) {
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('WebSocket') || error.message.includes('interrupted')) {
          console.log('WebSocket connection issue, will retry when conditions improve');
        } else if (error.message.includes('timeout')) {
          console.log('Presence join timeout, will retry if online');
          if (this.retryCount < this.maxRetries && navigator.onLine) {
            this.scheduleRetry(channelName, userData);
          }
        } else {
          console.warn('Presence join error:', error.message);
        }
      }
    } finally {
      this.isJoining = false;
    }
  }

  /**
   * Schedule a retry for failed presence join
   */
  private scheduleRetry(channelName: string, userData: Omit<PresenceUser, 'online_at'>): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(this.retryDelay * Math.pow(2, this.retryCount), this.maxRetryDelay);
    this.retryCount++;

    console.log(
      `Scheduling presence retry in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;

      // Only retry if conditions are favorable
      if (navigator.onLine && !document.hidden && !this.isJoining && !this.isLeaving) {
        this.join(channelName, userData);
      }
    }, delay);
  }

  /**
   * Leave the presence channel
   */
  async leave(): Promise<void> {
    if (this.isLeaving) return;

    this.isLeaving = true;

    // Stop intervals
    this.stopHeartbeat();
    this.stopUpdateInterval();

    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.subscriptionTimeout) {
      clearTimeout(this.subscriptionTimeout);
      this.subscriptionTimeout = null;
    }

    if (this.channel) {
      try {
        await this.channel.untrack();
        await this.supabase.removeChannel(this.channel);
      } catch (error) {
        // Silently handle errors during cleanup
        console.log('Error during presence cleanup:', error);
      }
      this.channel = null;
    }

    // Update last_seen in database
    try {
      await this.updateLastSeen();
    } catch {
      // Silently handle errors
    }

    this.isLeaving = false;
    this.retryCount = 0; // Reset retry count
  }

  /**
   * Get current presence state
   */
  getPresenceState(): PresenceState {
    if (!this.channel) return {};

    try {
      const rawState = this.channel.presenceState<PresenceUser>();
      const formattedState: PresenceState = {};

      // Transform Supabase presence state to our format
      Object.entries(rawState).forEach(([key, presences]) => {
        if (Array.isArray(presences)) {
          // Filter and map to remove presence_ref
          formattedState[key] = presences
            .filter((p): p is PresenceUser & { presence_ref: string } => {
              return (
                p !== null &&
                typeof p === 'object' &&
                'id' in p &&
                'username' in p &&
                'avatar_url' in p &&
                'status' in p &&
                'last_seen' in p &&
                'online_at' in p
              );
            })
            .map(({ presence_ref: _presence_ref, ...userData }) => userData as PresenceUser);
        }
      });

      return formattedState;
    } catch {
      return {};
    }
  }

  /**
   * Update user's last seen timestamp
   */
  private async updateLastSeen(): Promise<void> {
    try {
      await this.supabase
        .from('users')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', this.userId);
    } catch {
      // Silently handle errors
    }
  }

  /**
   * Start heartbeat to detect stale connections
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.lastHeartbeat = Date.now();

      // If channel exists and we're online, update presence
      if (this.channel && navigator.onLine && !document.hidden) {
        const presenceState = this.getPresenceState();
        const myPresence = presenceState[this.userId]?.[0];

        if (myPresence) {
          // Update online_at to keep presence fresh
          this.channel
            .track({
              ...myPresence,
              online_at: new Date().toISOString(),
            })
            .catch(() => {
              // If track fails, presence might be stale
              console.log('Heartbeat failed, presence might be stale');
            });
        }
      }
    }, 30000);
  }

  /**
   * Stop heartbeat interval
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Start update interval for last_seen
   */
  private startUpdateInterval(): void {
    this.stopUpdateInterval();

    // Initial update
    this.updateLastSeen();

    // Update every 60 seconds
    this.updateInterval = setInterval(() => {
      this.updateLastSeen();
    }, 60000);
  }

  /**
   * Stop the update interval
   */
  private stopUpdateInterval(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Check if a user is currently online
   */
  isUserOnline(userId: string): boolean {
    const state = this.getPresenceState();
    return Object.values(state).some((users) => users.some((user) => user.id === userId));
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): PresenceUser[] {
    const state = this.getPresenceState();
    return Object.values(state).flat();
  }

  /**
   * Get online users count
   */
  getOnlineCount(): number {
    return this.getOnlineUsers().length;
  }

  /**
   * Check if presence is stale (no heartbeat for 2 minutes)
   */
  isPresenceStale(): boolean {
    return Date.now() - this.lastHeartbeat > 120000; // 2 minutes
  }
}

/**
 * Helper to determine if a user should be considered online based on last_seen
 */
export function isUserOnlineByLastSeen(lastSeen: string | null, thresholdMinutes = 5): boolean {
  if (!lastSeen) return false;

  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);

  return diffMinutes < thresholdMinutes;
}
