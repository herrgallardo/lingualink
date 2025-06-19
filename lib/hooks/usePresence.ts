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

  // Initialize presence service
  useEffect(() => {
    if (!user || !profile) return;

    const service = new PresenceService(supabase, user.id);
    serviceRef.current = service;

    return () => {
      // Cleanup on unmount
      service.leave().catch(console.error);
    };
  }, [user, profile, supabase]);

  // Join presence channel
  const join = useCallback(async () => {
    if (!serviceRef.current || !user || !profile) {
      setError(new Error('Presence service not initialized'));
      return;
    }

    try {
      setError(null);
      await serviceRef.current.join(channelName, {
        id: user.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        status: profile.status,
        last_seen: profile.last_seen,
      });
      setIsConnected(true);

      // Set up interval to update presence state
      const updateState = () => {
        if (serviceRef.current) {
          setPresenceState(serviceRef.current.getPresenceState());
        }
      };

      updateState();

      // Store interval reference
      intervalRef.current = setInterval(updateState, 1000);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to join presence'));
      setIsConnected(false);
    }
  }, [channelName, user, profile]);

  // Leave presence channel
  const leave = useCallback(async () => {
    if (!serviceRef.current) return;

    try {
      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      await serviceRef.current.leave();
      setIsConnected(false);
      setPresenceState({});
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to leave presence'));
    }
  }, []);

  // Auto-join on mount if enabled
  useEffect(() => {
    let mounted = true;

    const handleAutoJoin = async () => {
      if (autoJoin && user && profile && mounted) {
        await join();
      }
    };

    handleAutoJoin();

    return () => {
      mounted = false;
      if (autoJoin) {
        leave();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoJoin, user, profile]); // Intentionally omit join/leave to avoid infinite loops

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Helper functions
  const isUserOnline = useCallback(
    (userId: string): boolean => {
      return serviceRef.current?.isUserOnline(userId) ?? false;
    },
    [], // No dependencies needed, serviceRef is stable
  );

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

  useEffect(() => {
    if (!user || !chatId) return;

    const channel = supabase.channel(`typing:${chatId}`);

    // Track typing status for current user
    const userTypingData = {
      user_id: user.id,
      is_typing: false,
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typing = new Set<string>();

        // Supabase presence state structure:
        // { [presence_ref]: Array<presence_data> }
        Object.entries(state).forEach(([_ref, presences]) => {
          if (Array.isArray(presences)) {
            presences.forEach((presence) => {
              // Check if this presence object has our expected structure
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
        if (status === 'SUBSCRIBED') {
          // Track initial state
          await channel.track(userTypingData);
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [chatId, user, supabase]);

  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!user || !chatId) return;

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      try {
        // Update typing status in database
        await supabase.from('users').update({ is_typing: isTyping }).eq('id', user.id);

        // Also update presence channel
        const channel = supabase.channel(`typing:${chatId}`);
        await channel.track({
          user_id: user.id,
          is_typing: isTyping,
        });

        // Auto-stop typing after 2 seconds
        if (isTyping) {
          typingTimeoutRef.current = setTimeout(() => {
            setTyping(false);
          }, 2000);
        }
      } catch (error) {
        console.error('Failed to update typing status:', error);
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
