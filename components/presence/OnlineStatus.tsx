'use client';

import { usePresenceContext } from '@/lib/context/presence-context';
import { isUserOnlineByLastSeen } from '@/lib/services/presence';
import type { Database } from '@/lib/types/database';

type UserStatus = Database['public']['Tables']['users']['Row']['status'];

interface OnlineStatusIndicatorProps {
  userId?: string;
  status?: UserStatus;
  lastSeen?: string | null;
  size?: 'small' | 'medium' | 'large';
  showOffline?: boolean;
  className?: string;
}

export function OnlineStatusIndicator({
  userId,
  status = 'available',
  lastSeen,
  size = 'medium',
  showOffline = true,
  className = '',
}: OnlineStatusIndicatorProps) {
  const { isUserOnline } = usePresenceContext();

  // Determine online status
  const isOnline = userId
    ? isUserOnline(userId)
    : lastSeen
      ? isUserOnlineByLastSeen(lastSeen)
      : false;

  // Don't show offline indicator if showOffline is false
  if (!isOnline && !showOffline) {
    return null;
  }

  // Size classes
  const sizeClasses = {
    small: 'w-2 h-2',
    medium: 'w-3 h-3',
    large: 'w-4 h-4',
  };

  // Determine color based on online status and user status
  const getStatusColor = () => {
    if (!isOnline) {
      return 'bg-slate-400';
    }

    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'busy':
        return 'bg-amber-500';
      case 'do-not-disturb':
        return 'bg-red-500';
      case 'invisible':
        return 'bg-slate-500';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <span
      className={`inline-block rounded-full ${sizeClasses[size]} ${getStatusColor()} ${className}`}
      aria-label={`Status: ${isOnline ? status : 'offline'}`}
    />
  );
}

interface OnlineStatusBadgeProps {
  userId?: string;
  status?: UserStatus;
  lastSeen?: string | null;
  showLabel?: boolean;
  className?: string;
}

export function OnlineStatusBadge({
  userId,
  status = 'available',
  lastSeen,
  showLabel = true,
  className = '',
}: OnlineStatusBadgeProps) {
  const { isUserOnline } = usePresenceContext();

  const isOnline = userId
    ? isUserOnline(userId)
    : lastSeen
      ? isUserOnlineByLastSeen(lastSeen)
      : false;

  const getStatusLabel = () => {
    if (!isOnline) return 'Offline';

    switch (status) {
      case 'available':
        return 'Available';
      case 'busy':
        return 'Busy';
      case 'do-not-disturb':
        return 'Do Not Disturb';
      case 'invisible':
        return 'Invisible';
      default:
        return 'Unknown';
    }
  };

  const getStatusStyles = () => {
    if (!isOnline) {
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }

    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'busy':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
      case 'do-not-disturb':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'invisible':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  // Build props object conditionally to handle exactOptionalPropertyTypes
  const indicatorProps: OnlineStatusIndicatorProps = {
    status,
    size: 'small',
    showOffline: true,
  };

  // Only add userId if it's defined
  if (userId !== undefined) {
    indicatorProps.userId = userId;
  }

  // Only add lastSeen if it's not undefined
  if (lastSeen !== undefined) {
    indicatorProps.lastSeen = lastSeen;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyles()} ${className}`}
    >
      <OnlineStatusIndicator {...indicatorProps} />
      {showLabel && <span>{getStatusLabel()}</span>}
    </span>
  );
}

interface LastSeenTextProps {
  lastSeen: string | null;
  className?: string;
}

export function LastSeenText({ lastSeen, className = '' }: LastSeenTextProps) {
  if (!lastSeen) {
    return <span className={`text-xs text-slate-500 ${className}`}>Never seen</span>;
  }

  const formatLastSeen = (date: string): string => {
    const lastSeenDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return lastSeenDate.toLocaleDateString();
    }
  };

  const isOnline = isUserOnlineByLastSeen(lastSeen);

  return (
    <span
      className={`text-xs ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-slate-500'} ${className}`}
    >
      {isOnline ? 'Active now' : `Last seen ${formatLastSeen(lastSeen)}`}
    </span>
  );
}
