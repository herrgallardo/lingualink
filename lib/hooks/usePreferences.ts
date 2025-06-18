/**
 * Hook to manage user UI preferences
 * Stores preferences in memory during the session
 */
import type { UIPreferencesData } from '@/components/profile/UIPreferences';
import { useCallback, useEffect, useState } from 'react';

// Default preferences
const defaultPreferences: UIPreferencesData = {
  compactView: false,
  notificationSounds: true,
  messagePreview: true,
  showTypingIndicator: true,
  autoTranslate: true,
};

// In-memory storage for preferences during the session
const memoryStorage: Record<string, UIPreferencesData> = {};

export function usePreferences(userId?: string) {
  const storageKey = userId ? `preferences_${userId}` : 'preferences_guest';

  // Initialize state from memory storage or defaults
  const [preferences, setPreferences] = useState<UIPreferencesData>(() => {
    return memoryStorage[storageKey] || defaultPreferences;
  });

  // Update memory storage when preferences change
  useEffect(() => {
    if (userId) {
      memoryStorage[storageKey] = preferences;
    }
  }, [preferences, storageKey, userId]);

  const updatePreference = useCallback(
    <K extends keyof UIPreferencesData>(key: K, value: UIPreferencesData[K]) => {
      setPreferences((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [],
  );

  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
    if (userId) {
      memoryStorage[storageKey] = defaultPreferences;
    }
  }, [storageKey, userId]);

  return {
    preferences,
    updatePreference,
    resetPreferences,
  };
}
