/**
 * React hooks for Supabase functionality
 */
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/types/database';
import type { Session, User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

// Types
type Tables = Database['public']['Tables'];
type UserProfile = Tables['users']['Row'];

/**
 * Hook to get the Supabase client
 */
export function useSupabase() {
  return createClient();
}

/**
 * Hook to get the current user and session
 */
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();

  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    }

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return { user, session, loading };
}

/**
 * Hook to get the current user's profile
 */
export function useProfile() {
  const { user } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = useSupabase();

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let mounted = true;
    const userId = user.id; // Store user.id after null check

    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();

        if (error) throw error;

        if (mounted) {
          setProfile(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load profile'));
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    // Subscribe to profile changes
    const channel = supabase
      .channel(`profile:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (mounted && payload.new && typeof payload.new === 'object') {
            setProfile(payload.new as UserProfile);
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  return { profile, loading, error };
}

/**
 * Hook for real-time presence
 */
export function usePresence(channelName: string) {
  const [presenceState, setPresenceState] = useState<Record<string, unknown>>({});
  const supabase = useSupabase();
  const { user } = useUser();

  useEffect(() => {
    if (!user || !channelName) return;

    const userId = user.id; // Store user.id after null check
    const channel = supabase.channel(channelName);

    // Track presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setPresenceState(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setPresenceState((prev) => ({ ...prev, [key]: newPresences }));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setPresenceState((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId });
        }
      });

    return () => {
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [channelName, user, supabase]);

  return presenceState;
}
