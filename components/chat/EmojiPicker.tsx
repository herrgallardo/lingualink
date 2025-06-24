'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef } from 'react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  className?: string;
}

const EMOJI_CATEGORIES = {
  reactions: ['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🔥', '🎉', '💯'],
  smileys: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂'],
  gestures: ['👋', '👐', '🙌', '👏', '🤝', '👍', '👎', '👊', '✊', '🤛'],
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💕'],
  symbols: ['✅', '❌', '❓', '❗', '💡', '💥', '💫', '⭐', '🌟', '✨'],
} as const;

export function EmojiPicker({ onSelect, onClose, className = '' }: EmojiPickerProps) {
  const { t } = useTranslation();
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={pickerRef}
      className={`bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-2 w-64 ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-midnight-900 dark:text-slate-100">
          {t('common.emoji')}
        </span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
          aria-label={t('common.close')}
        >
          <XMarkIcon className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="space-y-2">
        {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
          <div key={category}>
            <div className="text-xs text-slate-500 capitalize mb-1">{category}</div>
            <div className="grid grid-cols-5 gap-1">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onSelect(emoji)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors text-lg"
                  aria-label={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
