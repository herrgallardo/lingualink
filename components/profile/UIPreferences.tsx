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
import type { ReactElement } from 'react';
import { Switch } from '../ui/Switch';

interface UIPreferencesProps {
  preferences: UserPreferences;
  onPreferenceChange: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  loading?: boolean;
}

// Define types for preference items
type SwitchItem = {
  key: keyof UserPreferences;
  label: string;
  description: string;
  icon: ReactElement;
  type: 'switch';
};

type SelectItem = {
  key: keyof UserPreferences;
  label: string;
  description: string;
  icon: ReactElement;
  type: 'select';
  options: Array<{ value: string; label: string }>;
};

type PreferenceItem = SwitchItem | SelectItem;

export function UIPreferences({
  preferences,
  onPreferenceChange,
  loading = false,
}: UIPreferencesProps) {
  const appearanceItems: PreferenceItem[] = [
    {
      key: 'compactView',
      label: 'Compact View',
      description: 'Show more messages on screen with reduced spacing',
      icon: <TableCellsIcon className="w-5 h-5" />,
      type: 'switch',
    },
    {
      key: 'theme',
      label: 'Theme',
      description: 'Choose your preferred color theme',
      icon: <span className="text-base">🎨</span>,
      type: 'select',
      options: [
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
        { value: 'system', label: 'System' },
      ],
    },
    {
      key: 'fontSize',
      label: 'Font Size',
      description: 'Adjust text size for better readability',
      icon: <span className="text-base">🔤</span>,
      type: 'select',
      options: [
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' },
      ],
    },
    {
      key: 'showTimestamps',
      label: 'Show Timestamps',
      description: 'Display time for each message',
      icon: <ClockIcon className="w-5 h-5" />,
      type: 'switch',
    },
    {
      key: 'messageGrouping',
      label: 'Group Messages',
      description: 'Group consecutive messages from same sender',
      icon: <Squares2X2Icon className="w-5 h-5" />,
      type: 'switch',
    },
  ];

  const notificationItems: PreferenceItem[] = [
    {
      key: 'notificationSounds',
      label: 'Notification Sounds',
      description: 'Play sounds for new messages',
      icon: <SpeakerWaveIcon className="w-5 h-5" />,
      type: 'switch',
    },
    {
      key: 'messagePreview',
      label: 'Message Preview',
      description: 'Show message content in notifications',
      icon: <BellIcon className="w-5 h-5" />,
      type: 'switch',
    },
  ];

  const chatItems: PreferenceItem[] = [
    {
      key: 'showTypingIndicator',
      label: 'Typing Indicators',
      description: 'Show when others are typing',
      icon: <ChatBubbleLeftRightIcon className="w-5 h-5" />,
      type: 'switch',
    },
    {
      key: 'autoTranslate',
      label: 'Auto-Translate',
      description: 'Automatically translate incoming messages',
      icon: <LanguageIcon className="w-5 h-5" />,
      type: 'switch',
    },
    {
      key: 'enterToSend',
      label: 'Enter to Send',
      description: 'Press Enter to send messages (Shift+Enter for new line)',
      icon: <span className="text-base">⏎</span>,
      type: 'switch',
    },
    {
      key: 'showReadReceipts',
      label: 'Read Receipts',
      description: 'Show when messages have been read',
      icon: <span className="text-base">✓✓</span>,
      type: 'switch',
    },
  ];

  const renderPreferenceItem = (item: PreferenceItem) => {
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
      const currentValue = preferences[item.key] as string;
      return (
        <select
          id={item.key}
          value={currentValue}
          onChange={(e) => {
            const value = e.target.value;
            if (item.key === 'theme') {
              onPreferenceChange(item.key, value as UserPreferences['theme']);
            } else if (item.key === 'fontSize') {
              onPreferenceChange(item.key, value as UserPreferences['fontSize']);
            }
          }}
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
