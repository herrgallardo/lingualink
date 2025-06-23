'use client';

import { useSupabase } from '@/lib/hooks/useSupabase';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { getNotificationService } from '@/lib/services/notification';
import { BellIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useState } from 'react';

interface NotificationBellProps {
  userId: string;
  onClick: () => void;
  className?: string;
}

export function NotificationBell({ userId, onClick, className = '' }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();
  const { t } = useTranslation();

  const notificationService = getNotificationService(supabase);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    if (!userId) return;

    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, notificationService]);

  // Initialize
  useEffect(() => {
    if (userId) {
      notificationService.initialize(userId);
      loadUnreadCount();
    }
  }, [userId, notificationService, loadUnreadCount]);

  // Listen for new notifications
  useEffect(() => {
    const handleNewNotification = () => {
      setUnreadCount((prev) => prev + 1);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('lingualink:notification', handleNewNotification);

      return () => {
        window.removeEventListener('lingualink:notification', handleNewNotification);
      };
    }
  }, []);

  // Listen for read notifications (custom events from notification center)
  useEffect(() => {
    const handleNotificationRead = () => {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const handleAllNotificationsRead = () => {
      setUnreadCount(0);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('lingualink:notification-read', handleNotificationRead);
      window.addEventListener('lingualink:all-notifications-read', handleAllNotificationsRead);

      return () => {
        window.removeEventListener('lingualink:notification-read', handleNotificationRead);
        window.removeEventListener('lingualink:all-notifications-read', handleAllNotificationsRead);
      };
    }
  }, []);

  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${className}`}
      aria-label={t('notifications.title')}
      disabled={loading}
    >
      <BellIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" />

      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full min-w-[20px] text-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-cyan-500 rounded-full animate-spin"></div>
        </div>
      )}
    </button>
  );
}
