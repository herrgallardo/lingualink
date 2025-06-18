'use client';

import { useSupabase, useUser } from '@/lib/hooks/useSupabase';
import { createContext, useCallback, useContext, useEffect } from 'react';

interface ProfileContextType {
  ensureProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUser();
  const supabase = useSupabase();

  const ensureProfile = useCallback(async () => {
    if (!user || !user.email) return;

    // Check if profile exists
    const { error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    // If profile doesn't exist, create it
    if (fetchError && fetchError.code === 'PGRST116') {
      const { error: createError } = await supabase.from('users').insert({
        id: user.id,
        email: user.email,
        username: user.email.split('@')[0],
        preferred_language: 'en',
        status: 'available' as const,
        is_typing: false,
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (createError) {
        console.error('Failed to create profile:', createError);
      } else {
        console.log('Profile created successfully');
        // Trigger a refresh of the profile data
        window.location.reload();
      }
    }
  }, [user, supabase]);

  useEffect(() => {
    ensureProfile();
  }, [ensureProfile]);

  return <ProfileContext.Provider value={{ ensureProfile }}>{children}</ProfileContext.Provider>;
};

export const useProfileContext = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfileContext must be used within a ProfileProvider');
  }
  return context;
};
