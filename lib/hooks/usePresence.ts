/**
 * React hook for managing real-time presence
 */
import { PresenceService, type PresenceState, type PresenceUser } from '@/lib/services/presence';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useProfile, useSupabase, useUser } from './useSupabase';

interface UsePresenceOptions {
  channelName?: string;
  autoJoin?: boolean;
}

interface UsePresenceReturn {
  presenceState: PresenceState;
  onlineUsers: PresenceUser[];
  onlineCount: number;
  isUserOnline: (userId: string) => boolean;
  join: () => Promise<void>;
  leave: () => Promise<void>;
  isConnected: boolean;
  error: Error | null;
}

export function usePresence(options: UsePresenceOptions = {}): UsePresenceReturn {
  const { channelName = 'global', autoJoin = true } = options;
  const supabase = useSupabase();
  const { user } = useUser();
  const { profile } = useProfile();
  const [presenceState, setPresenceState] = useState<PresenceState>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const serviceRef = useRef<PresenceService | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const hasJoinedRef = useRef(false);

  // Initialize presence service
  useEffect(() => {
    mountedRef.current = true;

    if (!user || !profile) return;

    const service = new PresenceService(supabase, user.id);
    serviceRef.current = service;

    return () => {
      mountedRef.current = false;
      hasJoinedRef.current = false;
      // Cleanup on unmount
      if (service) {
        service.leave().catch(() => {
          // Silently handle cleanup errors
        });
      }
    };
  }, [user, profile, supabase]);

  // Join presence channel
  const join = useCallback(async () => {
    if (!serviceRef.current || !user || !profile || !mountedRef.current || hasJoinedRef.current) {
      return;
    }

    try {
      hasJoinedRef.current = true;
      setError(null);

      await serviceRef.current.join(channelName, {
        id: user.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        status: profile.status,
        last_seen: profile.last_seen,
      });

      if (!mountedRef.current) return;

      setIsConnected(true);

      // Set up interval to update presence state
      const updateState = () => {
        if (serviceRef.current && mountedRef.current) {
          setPresenceState(serviceRef.current.getPresenceState());
        }
      };

      updateState();

      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Store interval reference
      intervalRef.current = setInterval(updateState, 1000);
    } catch (err) {
      hasJoinedRef.current = false;
      // Only set error if we're still mounted
      if (mountedRef.current) {
        const error = err instanceof Error ? err : new Error('Failed to join presence');
        setError(error);
        setIsConnected(false);
        // Don't log errors for expected failures (like during navigation)
        if (!error.message.includes('interrupted')) {
          console.warn('Presence join error:', error.message);
        }
      }
    }
  }, [channelName, user, profile]);

  // Leave presence channel
  const leave = useCallback(async () => {
    if (!serviceRef.current) return;

    hasJoinedRef.current = false;

    try {
      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      await serviceRef.current.leave();

      if (mountedRef.current) {
        setIsConnected(false);
        setPresenceState({});
      }
    } catch {
      // Silently handle leave errors
    }
  }, []);

  // Auto-join on mount if enabled
  useEffect(() => {
    if (!autoJoin || !user || !profile) return;

    // Add a small delay to ensure everything is ready
    const timer = setTimeout(() => {
      if (mountedRef.current && !hasJoinedRef.current) {
        join();
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [autoJoin, user, profile, join]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Helper functions
  const isUserOnline = useCallback((userId: string): boolean => {
    return serviceRef.current?.isUserOnline(userId) ?? false;
  }, []);

  const onlineUsers = Object.values(presenceState).flat();
  const onlineCount = onlineUsers.length;

  return {
    presenceState,
    onlineUsers,
    onlineCount,
    isUserOnline,
    join,
    leave,
    isConnected,
    error,
  };
}

/**
 * Hook to track typing status in a chat
 */
export function useTypingIndicator(chatId: string) {
  const supabase = useSupabase();
  const { user } = useUser();
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!user || !chatId) return;

    const channel = supabase.channel(`typing:${chatId}`);
    channelRef.current = channel;

    // Track typing status for current user
    const userTypingData = {
      user_id: user.id,
      is_typing: false,
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        if (!mountedRef.current) return;

        const state = channel.presenceState();
        const typing = new Set<string>();

        Object.entries(state).forEach(([_ref, presences]) => {
          if (Array.isArray(presences)) {
            presences.forEach((presence) => {
              if (
                presence &&
                typeof presence === 'object' &&
                'user_id' in presence &&
                'is_typing' in presence &&
                presence.user_id !== user.id &&
                presence.is_typing === true
              ) {
                typing.add(presence.user_id as string);
              }
            });
          }
        });

        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && mountedRef.current) {
          await channel.track(userTypingData);
        }
      });

    return () => {
      mountedRef.current = false;
      // Clean up timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Untrack and remove channel
      channel.untrack().catch(() => {});
      supabase.removeChannel(channel);
    };
  }, [chatId, user, supabase]);

  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!user || !chatId || !channelRef.current || !mountedRef.current) return;

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      try {
        // Update typing status in database
        await supabase.from('users').update({ is_typing: isTyping }).eq('id', user.id);

        // Also update presence channel
        await channelRef.current.track({
          user_id: user.id,
          is_typing: isTyping,
        });

        // Auto-stop typing after 2 seconds
        if (isTyping && mountedRef.current) {
          typingTimeoutRef.current = setTimeout(() => {
            setTyping(false);
          }, 2000);
        }
      } catch {
        // Silently handle errors
      }
    },
    [user, chatId, supabase],
  );

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    typingUsers: Array.from(typingUsers),
    setTyping,
    isAnyoneTyping: typingUsers.size > 0,
  };
}
