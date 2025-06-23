'use client';

import { useSupabase } from '@/lib/hooks/useSupabase';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { NotificationData } from '@/lib/services/notification';
import { getNotificationService } from '@/lib/services/notification';
import { formatDistanceToNow } from '@/lib/utils/date';
import { BellIcon, CheckIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useState } from 'react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function NotificationCenter({ isOpen, onClose, userId }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const supabase = useSupabase();
  const { t } = useTranslation();

  const notificationService = getNotificationService(supabase);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        notificationService.getNotifications(50, 0),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [notificationService]);

  // Initialize and load notifications
  useEffect(() => {
    if (userId && isOpen) {
      notificationService.initialize(userId);
      loadNotifications();
    }
  }, [userId, isOpen, notificationService, loadNotifications]);

  // Listen for new notifications
  useEffect(() => {
    const handleNewNotification = (event: CustomEvent<NotificationData>) => {
      setNotifications((prev) => [event.detail, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('lingualink:notification', handleNewNotification as EventListener);

      return () => {
        window.removeEventListener(
          'lingualink:notification',
          handleNewNotification as EventListener,
        );
      };
    }
  }, []);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    const success = await notificationService.markAsRead(notificationId);
    if (success) {
      setNotifications((prev) =>
        prev.map((notif) => (notif.id === notificationId ? { ...notif, read: true } : notif)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      const updatedCount = await notificationService.markAllAsRead();
      if (updatedCount > 0) {
        setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    const success = await notificationService.deleteNotification(notificationId);
    if (success) {
      setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
      // Update unread count if notification was unread
      const notification = notifications.find((n) => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: NotificationData['type']) => {
    switch (type) {
      case 'message':
        return '💬';
      case 'mention':
        return '🏷️';
      case 'reaction':
        return '❤️';
      case 'chat_invite':
        return '👥';
      case 'system':
        return '⚙️';
      default:
        return '📢';
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: NotificationData) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'message':
      case 'mention':
      case 'reaction':
        if (notification.data.chatId) {
          let url = `/chat/${notification.data.chatId}`;
          if (notification.data.messageId) {
            url += `#${notification.data.messageId}`;
          }
          window.location.href = url;
        }
        break;
      case 'chat_invite':
        if (notification.data.chatId) {
          window.location.href = `/chat/${notification.data.chatId}`;
        }
        break;
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Notification panel */}
      <div className="flex min-h-full items-start justify-center p-4 text-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-slate-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
            <div className="flex items-center gap-2">
              <BellIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h2 className="text-lg font-semibold text-midnight-900 dark:text-slate-100">
                {t('notifications.title')}
              </h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-cyan-500 text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={markingAllRead}
                  className="text-sm text-cyan-600 hover:text-cyan-700 font-medium disabled:opacity-50"
                >
                  {markingAllRead ? t('common.loading') : t('notifications.markAllAsRead')}
                </button>
              )}

              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label={t('common.close')}
              >
                <XMarkIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <BellIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">{t('notifications.empty')}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-cyan-50 dark:bg-cyan-900/20' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-midnight-900 dark:text-slate-100">
                              {notification.title}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              {notification.body}
                            </p>
                            <p className="text-xs text-slate-500 mt-2">
                              {formatDistanceToNow(new Date(notification.createdAt))} ago
                            </p>
                          </div>

                          <div className="flex items-center gap-1 ml-3">
                            {!notification.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                aria-label={t('notifications.markAsRead')}
                              >
                                <CheckIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                              aria-label={t('common.delete')}
                            >
                              <TrashIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
