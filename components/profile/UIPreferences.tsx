'use client';

import { SpeakerWaveIcon, Squares2X2Icon, TableCellsIcon } from '@heroicons/react/24/outline';
import { Switch } from '../ui/Switch';

export interface UIPreferencesData {
  compactView: boolean;
  notificationSounds: boolean;
  messagePreview: boolean;
  showTypingIndicator: boolean;
  autoTranslate: boolean;
}

interface UIPreferencesProps {
  preferences: UIPreferencesData;
  onPreferenceChange: (key: keyof UIPreferencesData, value: boolean) => void;
}

export function UIPreferences({ preferences, onPreferenceChange }: UIPreferencesProps) {
  const preferenceItems = [
    {
      key: 'compactView' as const,
      label: 'Compact View',
      description: 'Show more messages on screen with reduced spacing',
      icon: <TableCellsIcon className="w-5 h-5" />,
    },
    {
      key: 'notificationSounds' as const,
      label: 'Notification Sounds',
      description: 'Play sounds for new messages and notifications',
      icon: <SpeakerWaveIcon className="w-5 h-5" />,
    },
    {
      key: 'messagePreview' as const,
      label: 'Message Preview',
      description: 'Show message content in notifications',
      icon: <Squares2X2Icon className="w-5 h-5" />,
    },
    {
      key: 'showTypingIndicator' as const,
      label: 'Typing Indicators',
      description: 'Show when others are typing',
      icon: <span className="text-base">💬</span>,
    },
    {
      key: 'autoTranslate' as const,
      label: 'Auto-Translate',
      description: 'Automatically translate incoming messages',
      icon: <span className="text-base">🌐</span>,
    },
  ];

  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold text-primary mb-4">UI Preferences</h3>

      <div className="space-y-4">
        {preferenceItems.map((item) => (
          <div
            key={item.key}
            className="flex items-start justify-between p-3 rounded-lg hover:bg-background-secondary transition-colors"
          >
            <div className="flex items-start gap-3 flex-1">
              <div className="text-muted mt-0.5">{item.icon}</div>
              <div className="flex-1">
                <label
                  htmlFor={item.key}
                  className="text-sm font-medium text-primary cursor-pointer"
                >
                  {item.label}
                </label>
                <p className="text-xs text-muted mt-0.5">{item.description}</p>
              </div>
            </div>
            <Switch
              id={item.key}
              checked={preferences[item.key]}
              onCheckedChange={(checked) => onPreferenceChange(item.key, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
