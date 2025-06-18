import { useEffect } from 'react';
import { useSupabase, useUser } from './useSupabase';

export function useProfileCreation() {
  const { user } = useUser();
  const supabase = useSupabase();

  useEffect(() => {
    async function ensureProfile() {
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
          status: 'available',
          is_typing: false,
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (createError) {
          console.error('Failed to create profile:', createError);
        } else {
          console.log('Profile created successfully');
        }
      }
    }

    ensureProfile();
  }, [user, supabase]);
}
