/**
 * Real-time presence service for managing user online status
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
  private isJoining = false;
  private isLeaving = false;

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

    this.isJoining = true;

    try {
      // Leave any existing channel
      if (this.channel) {
        await this.leave();
      }

      this.channel = this.supabase.channel(channelName, {
        config: {
          presence: {
            key: this.userId,
          },
        },
      });

      const currentChannel = this.channel;

      // Subscribe to presence sync events
      currentChannel.on('presence', { event: 'sync' }, () => {
        // Presence state synced
      });

      // Subscribe and track user presence
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Subscription timeout'));
        }, 10000);

        currentChannel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            try {
              const presenceData: PresenceUser = {
                ...userData,
                online_at: new Date().toISOString(),
              };

              await currentChannel.track(presenceData);

              // Start heartbeat
              this.startHeartbeat();

              resolve();
            } catch (error) {
              reject(error);
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(timeout);
            reject(new Error(`Channel subscription failed: ${status}`));
          }
        });
      });
    } finally {
      this.isJoining = false;
    }
  }

  /**
   * Leave the presence channel
   */
  async leave(): Promise<void> {
    if (this.isLeaving) return;

    this.isLeaving = true;
    this.stopHeartbeat();

    if (this.channel) {
      try {
        await this.channel.untrack();
        await this.supabase.removeChannel(this.channel);
      } catch {
        // Silently handle errors during cleanup
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
   * Start heartbeat to keep presence alive and update last_seen
   */
  private startHeartbeat(): void {
    // Initial update
    this.updateLastSeen();

    // Update every 30 seconds
    this.updateInterval = setInterval(() => {
      this.updateLastSeen();
    }, 30000);
  }

  /**
   * Stop the heartbeat interval
   */
  private stopHeartbeat(): void {
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
