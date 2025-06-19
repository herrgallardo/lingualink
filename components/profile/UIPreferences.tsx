'use client';

import type { UserPreferences } from '@/lib/types/preferences';
import {
  BellIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  LanguageIcon,
  SpeakerWaveIcon,
  Squares2X2Icon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import { Switch } from '../ui/Switch';

interface UIPreferencesProps {
  preferences: UserPreferences;
  onPreferenceChange: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  loading?: boolean;
}

export function UIPreferences({
  preferences,
  onPreferenceChange,
  loading = false,
}: UIPreferencesProps) {
  const appearanceItems = [
    {
      key: 'compactView' as const,
      label: 'Compact View',
      description: 'Show more messages on screen with reduced spacing',
      icon: <TableCellsIcon className="w-5 h-5" />,
      type: 'switch' as const,
    },
    {
      key: 'theme' as const,
      label: 'Theme',
      description: 'Choose your preferred color theme',
      icon: <span className="text-base">🎨</span>,
      type: 'select' as const,
      options: [
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
        { value: 'system', label: 'System' },
      ],
    },
    {
      key: 'fontSize' as const,
      label: 'Font Size',
      description: 'Adjust text size for better readability',
      icon: <span className="text-base">🔤</span>,
      type: 'select' as const,
      options: [
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' },
      ],
    },
    {
      key: 'showTimestamps' as const,
      label: 'Show Timestamps',
      description: 'Display time for each message',
      icon: <ClockIcon className="w-5 h-5" />,
      type: 'switch' as const,
    },
    {
      key: 'messageGrouping' as const,
      label: 'Group Messages',
      description: 'Group consecutive messages from same sender',
      icon: <Squares2X2Icon className="w-5 h-5" />,
      type: 'switch' as const,
    },
  ];

  const notificationItems = [
    {
      key: 'notificationSounds' as const,
      label: 'Notification Sounds',
      description: 'Play sounds for new messages',
      icon: <SpeakerWaveIcon className="w-5 h-5" />,
      type: 'switch' as const,
    },
    {
      key: 'messagePreview' as const,
      label: 'Message Preview',
      description: 'Show message content in notifications',
      icon: <BellIcon className="w-5 h-5" />,
      type: 'switch' as const,
    },
  ];

  const chatItems = [
    {
      key: 'showTypingIndicator' as const,
      label: 'Typing Indicators',
      description: 'Show when others are typing',
      icon: <ChatBubbleLeftRightIcon className="w-5 h-5" />,
      type: 'switch' as const,
    },
    {
      key: 'autoTranslate' as const,
      label: 'Auto-Translate',
      description: 'Automatically translate incoming messages',
      icon: <LanguageIcon className="w-5 h-5" />,
      type: 'switch' as const,
    },
    {
      key: 'enterToSend' as const,
      label: 'Enter to Send',
      description: 'Press Enter to send messages (Shift+Enter for new line)',
      icon: <span className="text-base">⏎</span>,
      type: 'switch' as const,
    },
    {
      key: 'showReadReceipts' as const,
      label: 'Read Receipts',
      description: 'Show when messages have been read',
      icon: <span className="text-base">✓✓</span>,
      type: 'switch' as const,
    },
  ];

  const renderPreferenceItem = (item: (typeof appearanceItems)[0]) => {
    if (item.type === 'switch') {
      return (
        <Switch
          id={item.key}
          checked={preferences[item.key] as boolean}
          onCheckedChange={(checked) => onPreferenceChange(item.key, checked)}
          disabled={loading}
        />
      );
    }

    if (item.type === 'select' && 'options' in item) {
      return (
        <select
          id={item.key}
          value={preferences[item.key] as string}
          onChange={(e) => onPreferenceChange(item.key, e.target.value as any)}
          disabled={loading}
          className="px-3 py-1 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          {item.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Appearance Section */}
      <div>
        <h3 className="text-lg font-semibold text-midnight-900 dark:text-slate-100 mb-4">
          Appearance
        </h3>
        <div className="space-y-4">
          {appearanceItems.map((item) => (
            <div
              key={item.key}
              className="flex items-start justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="text-slate-500 mt-0.5">{item.icon}</div>
                <div className="flex-1">
                  <label
                    htmlFor={item.key}
                    className="text-sm font-medium text-midnight-900 dark:text-slate-100 cursor-pointer"
                  >
                    {item.label}
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                </div>
              </div>
              {renderPreferenceItem(item)}
            </div>
          ))}
        </div>
      </div>

      {/* Notifications Section */}
      <div>
        <h3 className="text-lg font-semibold text-midnight-900 dark:text-slate-100 mb-4">
          Notifications
        </h3>
        <div className="space-y-4">
          {notificationItems.map((item) => (
            <div
              key={item.key}
              className="flex items-start justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="text-slate-500 mt-0.5">{item.icon}</div>
                <div className="flex-1">
                  <label
                    htmlFor={item.key}
                    className="text-sm font-medium text-midnight-900 dark:text-slate-100 cursor-pointer"
                  >
                    {item.label}
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                </div>
              </div>
              {renderPreferenceItem(item)}
            </div>
          ))}

          {/* Sound Volume Slider */}
          {preferences.notificationSounds && (
            <div className="flex items-start justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <div className="flex items-start gap-3 flex-1">
                <div className="text-slate-500 mt-0.5">🔊</div>
                <div className="flex-1">
                  <label
                    htmlFor="soundVolume"
                    className="text-sm font-medium text-midnight-900 dark:text-slate-100"
                  >
                    Sound Volume
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {Math.round(preferences.soundVolume * 100)}%
                  </p>
                </div>
              </div>
              <input
                id="soundVolume"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={preferences.soundVolume}
                onChange={(e) => onPreferenceChange('soundVolume', parseFloat(e.target.value))}
                disabled={loading}
                className="w-24"
              />
            </div>
          )}
        </div>
      </div>

      {/* Chat Section */}
      <div>
        <h3 className="text-lg font-semibold text-midnight-900 dark:text-slate-100 mb-4">
          Chat Behavior
        </h3>
        <div className="space-y-4">
          {chatItems.map((item) => (
            <div
              key={item.key}
              className="flex items-start justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="text-slate-500 mt-0.5">{item.icon}</div>
                <div className="flex-1">
                  <label
                    htmlFor={item.key}
                    className="text-sm font-medium text-midnight-900 dark:text-slate-100 cursor-pointer"
                  >
                    {item.label}
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                </div>
              </div>
              {renderPreferenceItem(item)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
