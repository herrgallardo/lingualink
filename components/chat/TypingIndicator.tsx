'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';

interface TypingIndicatorProps {
  users: string[];
  className?: string;
}

export function TypingIndicator({ users, className = '' }: TypingIndicatorProps) {
  const { t } = useTranslation();

  if (users.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (users.length === 1) {
      return t('presence.isTyping', { name: users[0] });
    } else if (users.length === 2) {
      return t('presence.areTyping', { names: `${users[0]} ${t('common.and')} ${users[1]}` });
    } else {
      return t('chat.andOthersTyping', { count: users.length - 1 });
    }
  };

  return (
    <div className={`flex items-center gap-2 text-sm text-slate-500 ${className}`}>
      <div className="flex gap-1">
        <span
          className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
      <span>{getTypingText()}</span>
    </div>
  );
}

interface TypingPulseProps {
  className?: string;
}

export function TypingPulse({ className = '' }: TypingPulseProps) {
  return (
    <div
      className={`inline-flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-2xl ${className}`}
    >
      <span
        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
        style={{ animationDelay: '150ms' }}
      />
      <span
        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );
}
