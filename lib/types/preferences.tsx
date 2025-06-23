/**
 * User preferences type definitions
 */

export interface UserPreferences {
  // UI Preferences
  compactView: boolean;
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  showTimestamps: boolean;
  messageGrouping: boolean;

  // Notification Preferences
  notificationSounds: boolean;
  messagePreview: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  desktopNotifications: boolean;
  soundVolume: number; // 0-1

  // Chat Preferences
  showTypingIndicator: boolean;
  autoTranslate: boolean;
  enterToSend: boolean;
  showReadReceipts: boolean;
}

export const defaultPreferences: UserPreferences = {
  compactView: false,
  theme: 'system',
  fontSize: 'medium',
  showTimestamps: true,
  messageGrouping: true,
  notificationSounds: true,
  messagePreview: true,
  pushNotifications: true,
  emailNotifications: false,
  desktopNotifications: true,
  soundVolume: 0.5,
  showTypingIndicator: true,
  autoTranslate: true,
  enterToSend: true,
  showReadReceipts: true,
};

export type PreferenceKey = keyof UserPreferences;

export type PreferenceValue<K extends PreferenceKey> = UserPreferences[K];

// Helper to validate preferences
export function isValidPreferences(prefs: unknown): prefs is UserPreferences {
  if (!prefs || typeof prefs !== 'object') return false;

  const p = prefs as Record<string, unknown>;

  return (
    typeof p.compactView === 'boolean' &&
    ['light', 'dark', 'system'].includes(p.theme as string) &&
    ['small', 'medium', 'large'].includes(p.fontSize as string) &&
    typeof p.showTimestamps === 'boolean' &&
    typeof p.messageGrouping === 'boolean' &&
    typeof p.notificationSounds === 'boolean' &&
    typeof p.messagePreview === 'boolean' &&
    typeof p.pushNotifications === 'boolean' &&
    typeof p.emailNotifications === 'boolean' &&
    typeof p.desktopNotifications === 'boolean' &&
    typeof p.soundVolume === 'number' &&
    p.soundVolume >= 0 &&
    p.soundVolume <= 1 &&
    typeof p.showTypingIndicator === 'boolean' &&
    typeof p.autoTranslate === 'boolean' &&
    typeof p.enterToSend === 'boolean' &&
    typeof p.showReadReceipts === 'boolean'
  );
}

// Merge preferences with defaults
export function mergeWithDefaults(partial: Partial<UserPreferences>): UserPreferences {
  return { ...defaultPreferences, ...partial };
}
