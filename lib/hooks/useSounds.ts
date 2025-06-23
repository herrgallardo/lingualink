/**
 * React hook for notification sounds integrated with user preferences
 */
import { usePreferencesContext } from '@/lib/context/preferences-context';
import { getSoundManager, type SoundType } from '@/lib/services/sound-manager';
import { useCallback, useEffect, useRef } from 'react';

export function useSounds() {
  const { preferences } = usePreferencesContext();
  const soundManagerRef = useRef<ReturnType<typeof getSoundManager> | null>(null);

  // Get sound manager only on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      soundManagerRef.current = getSoundManager();
    }
  }, []);

  // Update sound manager settings when preferences change
  useEffect(() => {
    if (soundManagerRef.current) {
      soundManagerRef.current.setEnabled(preferences.notificationSounds);
      soundManagerRef.current.setGlobalVolume(preferences.soundVolume);
    }
  }, [preferences.notificationSounds, preferences.soundVolume]);

  // Play sound with preferences check
  const playSound = useCallback(
    (type: SoundType, volume?: number) => {
      if (preferences.notificationSounds && soundManagerRef.current) {
        soundManagerRef.current.play(type, volume);
      }
    },
    [preferences.notificationSounds],
  );

  // Play beep with preferences check
  const playBeep = useCallback(
    (frequency?: number, duration?: number, volume?: number) => {
      if (preferences.notificationSounds && soundManagerRef.current) {
        soundManagerRef.current.beep(frequency, duration, volume);
      }
    },
    [preferences.notificationSounds],
  );

  return {
    playSound,
    playBeep,
    isEnabled: preferences.notificationSounds,
    volume: preferences.soundVolume,
  };
}

// Specific sound hooks for common use cases
export function useMessageSound() {
  const { playSound } = useSounds();
  return useCallback(() => playSound('message'), [playSound]);
}

export function useNotificationSound() {
  const { playSound } = useSounds();
  return useCallback(() => playSound('notification'), [playSound]);
}

export function useMentionSound() {
  const { playSound } = useSounds();
  return useCallback(() => playSound('mention'), [playSound]);
}

export function useErrorSound() {
  const { playSound } = useSounds();
  return useCallback(() => playSound('error'), [playSound]);
}

export function useSuccessSound() {
  const { playSound } = useSounds();
  return useCallback(() => playSound('success'), [playSound]);
}
