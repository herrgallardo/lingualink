/**
 * Hook to manage user UI preferences with database persistence
 */
import { useSupabase } from '@/lib/hooks/useSupabase';
import type { UserPreferences } from '@/lib/types/preferences';
import { defaultPreferences, mergeWithDefaults } from '@/lib/types/preferences';
import { useCallback, useEffect, useState } from 'react';

type PreferencesJson = Record<string, unknown>;

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  try {
    // Try to parse JSON strings
    if (value.startsWith('"') && value.endsWith('"')) {
      return JSON.parse(value);
    } else if (value === 'true' || value === 'false') {
      return value === 'true';
    } else if (!isNaN(Number(value)) && value !== '') {
      return Number(value);
    }
  } catch {
    // If parsing fails, return original value
  }

  return value;
}

function fixDoubleSerialized(prefs: PreferencesJson): PreferencesJson {
  const fixed: PreferencesJson = {};

  for (const [key, value] of Object.entries(prefs)) {
    fixed[key] = parseJsonValue(value);
  }

  return fixed;
}

export function usePreferences(userId?: string) {
  const supabase = useSupabase();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);

  // Load preferences from database
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function loadPreferences() {
      try {
        setError(null);

        // Get user preferences from database
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('preferences')
          .eq('id', userId)
          .single();

        if (fetchError) throw fetchError;

        if (data?.preferences) {
          // Fix any double-serialized values
          const prefs = data.preferences as PreferencesJson;
          const fixed = fixDoubleSerialized(prefs);

          // Merge with defaults to ensure all keys exist
          const merged = mergeWithDefaults(fixed as Partial<UserPreferences>);
          setPreferences(merged);
        }
      } catch (err) {
        console.error('Failed to load preferences:', err);
        setError(err instanceof Error ? err : new Error('Failed to load preferences'));
      } finally {
        setLoading(false);
      }
    }

    loadPreferences();
  }, [userId, supabase]);

  // Update preference in database
  const updatePreference = useCallback(
    async <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      if (!userId) {
        // Guest user - only update local state
        setPreferences((prev) => ({ ...prev, [key]: value }));
        return;
      }

      setSaving(true);
      setError(null);

      try {
        // Update local state immediately (optimistic update)
        setPreferences((prev) => ({ ...prev, [key]: value }));

        // Try RPC first, fallback to direct update if RPC doesn't exist
        const { error: rpcError } = await supabase.rpc('update_user_preference', {
          user_id: userId,
          preference_key: key,
          preference_value: value, // Pass the raw value, not JSON.stringify
        });

        if (rpcError && rpcError.message.includes('function')) {
          // RPC function doesn't exist, update directly
          console.log('Using direct update method for preferences');
          const updatedPreferences = { ...preferences, [key]: value };

          const { error: updateError } = await supabase
            .from('users')
            .update({ preferences: updatedPreferences })
            .eq('id', userId);

          if (updateError) throw updateError;
        } else if (rpcError) {
          throw rpcError;
        }
      } catch (err) {
        console.error('Failed to update preference:', err);
        setError(err instanceof Error ? err : new Error('Failed to update preference'));

        // Revert optimistic update on error
        setPreferences((prev) => ({ ...prev, [key]: preferences[key] }));
      } finally {
        setSaving(false);
      }
    },
    [userId, supabase, preferences],
  );

  // Batch update multiple preferences
  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      if (!userId) {
        setPreferences((prev) => ({ ...prev, ...updates }));
        return;
      }

      setSaving(true);
      setError(null);

      try {
        // Update local state immediately
        setPreferences((prev) => ({ ...prev, ...updates }));

        // Update all preferences in database
        const { error: updateError } = await supabase
          .from('users')
          .update({ preferences: { ...preferences, ...updates } })
          .eq('id', userId);

        if (updateError) throw updateError;
      } catch (err) {
        console.error('Failed to update preferences:', err);
        setError(err instanceof Error ? err : new Error('Failed to update preferences'));

        // Revert on error
        setPreferences(preferences);
      } finally {
        setSaving(false);
      }
    },
    [userId, supabase, preferences],
  );

  // Reset to defaults
  const resetPreferences = useCallback(async () => {
    if (!userId) {
      setPreferences(defaultPreferences);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      setPreferences(defaultPreferences);

      const { error: updateError } = await supabase
        .from('users')
        .update({ preferences: defaultPreferences })
        .eq('id', userId);

      if (updateError) throw updateError;
    } catch (err) {
      console.error('Failed to reset preferences:', err);
      setError(err instanceof Error ? err : new Error('Failed to reset preferences'));
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  }, [userId, supabase, preferences]);

  return {
    preferences,
    updatePreference,
    updatePreferences,
    resetPreferences,
    loading,
    saving,
    error,
  };
}
