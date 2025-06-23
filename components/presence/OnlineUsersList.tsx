'use client';

import { usePresence } from '@/lib/hooks/usePresence';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { OnlineStatusIndicator } from './OnlineStatus';

interface OnlineUsersListProps {
  className?: string;
  showCurrentUser?: boolean;
}

export function OnlineUsersList({ className = '', showCurrentUser = false }: OnlineUsersListProps) {
  const { onlineUsers } = usePresence();
  const { t } = useTranslation();

  // Filter out current user if needed
  const displayUsers = showCurrentUser
    ? onlineUsers
    : onlineUsers.filter((user) => user.id !== user.id); // This will be fixed when we have current user context

  if (displayUsers.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-sm text-slate-500">{t('presence.noUsersOnline')}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <h3 className="text-sm font-semibold text-midnight-900 dark:text-slate-100 mb-3">
        {t('presence.onlineUsers')} ({displayUsers.length})
      </h3>

      <div className="space-y-2">
        {displayUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={t('common.avatar', { name: user.username })}
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                ) : (
                  <UserCircleIcon className="w-full h-full text-slate-400 p-1" />
                )}
              </div>
              <div className="absolute bottom-0 right-0">
                <OnlineStatusIndicator
                  status={user.status}
                  size="small"
                  className="ring-2 ring-white dark:ring-slate-800"
                />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-midnight-900 dark:text-slate-100 truncate">
                {user.username}
              </p>
              <p className="text-xs text-slate-500 capitalize">{t(`presence.${user.status}`)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CompactOnlineUsersProps {
  maxDisplay?: number;
  className?: string;
}

export function CompactOnlineUsers({ maxDisplay = 3, className = '' }: CompactOnlineUsersProps) {
  const { onlineUsers } = usePresence();
  const { t } = useTranslation();

  const displayUsers = onlineUsers.slice(0, maxDisplay);
  const remainingCount = Math.max(0, onlineUsers.length - maxDisplay);

  if (onlineUsers.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex -space-x-2">
        {displayUsers.map((user) => (
          <div
            key={user.id}
            className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-700"
            title={user.username}
          >
            {user.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={user.username}
                width={32}
                height={32}
                className="object-cover"
              />
            ) : (
              <UserCircleIcon className="w-full h-full text-slate-400 p-1" />
            )}
          </div>
        ))}

        {remainingCount > 0 && (
          <div className="relative w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              +{remainingCount}
            </span>
          </div>
        )}
      </div>

      <span className="text-xs text-slate-500 ml-2">
        {t('presence.onlineCount', { count: onlineUsers.length })}
      </span>
    </div>
  );
}
