'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Database } from '@/lib/types/database';
import { CheckIcon } from '@heroicons/react/24/outline';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';

type UserRow = Database['public']['Tables']['users']['Row'];

interface ReadReceiptsProps {
  readBy: string[];
  participants: UserRow[];
  size?: 'small' | 'medium';
  showAvatars?: boolean;
  className?: string;
}

export function ReadReceipts({
  readBy,
  participants,
  size = 'small',
  showAvatars = false,
  className = '',
}: ReadReceiptsProps) {
  const { t } = useTranslation();

  const readByUsers = participants.filter((p) => readBy.includes(p.id));

  if (readByUsers.length === 0) {
    return (
      <div className={`flex items-center ${className}`}>
        <CheckIcon className={`text-slate-400 ${size === 'small' ? 'w-3 h-3' : 'w-4 h-4'}`} />
      </div>
    );
  }

  if (showAvatars) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="flex -space-x-1">
          {readByUsers.slice(0, 3).map((user) => (
            <div
              key={user.id}
              className={`
                rounded-full border border-white dark:border-slate-900 overflow-hidden
                ${size === 'small' ? 'w-4 h-4' : 'w-5 h-5'}
              `}
              title={t('chat.readBy', { name: user.username })}
            >
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={user.username}
                  width={size === 'small' ? 16 : 20}
                  height={size === 'small' ? 16 : 20}
                  className="object-cover"
                />
              ) : (
                <UserCircleIcon className="w-full h-full text-slate-400" />
              )}
            </div>
          ))}
          {readByUsers.length > 3 && (
            <div
              className={`
                flex items-center justify-center rounded-full
                bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400
                border border-white dark:border-slate-900
                ${size === 'small' ? 'w-4 h-4 text-xs' : 'w-5 h-5 text-xs'}
              `}
            >
              +{readByUsers.length - 3}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Simple double check for all read
  const allRead = readByUsers.length === participants.length - 1; // Exclude sender

  return (
    <div className={`flex items-center ${className}`}>
      <CheckIcon
        className={`${size === 'small' ? 'w-3 h-3' : 'w-4 h-4'} ${
          allRead ? 'text-cyan-500' : 'text-slate-400'
        }`}
      />
      {allRead && (
        <CheckIcon
          className={`${size === 'small' ? 'w-3 h-3 -ml-1.5' : 'w-4 h-4 -ml-2'} text-cyan-500`}
        />
      )}
    </div>
  );
}
