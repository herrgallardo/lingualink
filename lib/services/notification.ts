/**
 * Notification service for managing in-app and push notifications
 */
import type { Database } from '@/lib/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

export type NotificationType = 'message' | 'mention' | 'reaction' | 'system' | 'chat_invite';

export interface NotificationData {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data: Record<string, unknown>;
  read: boolean;
  clicked: boolean;
  createdAt: string;
  expiresAt: string | null;
}

export interface CreateNotificationParams {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, unknown>;
  expiresAt?: Date | null;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class NotificationService {
  private supabase: SupabaseClient<Database>;
  private userId: string | null = null;
  private channel: ReturnType<typeof this.supabase.channel> | null = null;
  private pushSubscription: globalThis.PushSubscription | null = null;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  /**
   * Initialize notification service for a user
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    await this.setupRealtimeSubscription();
    await this.requestNotificationPermission();
  }

  /**
   * Setup realtime subscription for notifications
   */
  private async setupRealtimeSubscription(): Promise<void> {
    if (!this.userId) return;

    this.channel = this.supabase
      .channel(`notifications:${this.userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${this.userId}`,
        },
        (payload) => {
          this.handleNewNotification(payload.new as NotificationData);
        },
      )
      .subscribe();
  }

  /**
   * Handle new notification
   */
  private handleNewNotification(notification: NotificationData): void {
    // Show browser notification if permission granted
    this.showBrowserNotification(notification);

    // Emit custom event for in-app handling
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lingualink:notification', {
          detail: notification,
        }),
      );
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      await this.setupPushNotifications();
      return 'granted';
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await this.setupPushNotifications();
      }
      return permission;
    }

    return Notification.permission;
  }

  /**
   * Setup push notifications
   */
  private async setupPushNotifications(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
        ),
      });

      this.pushSubscription = subscription;

      // Save subscription to database
      await this.savePushSubscription(subscription);
    } catch (error) {
      console.error('Failed to setup push notifications:', error);
    }
  }

  /**
   * Convert VAPID key
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Save push subscription to database
   */
  private async savePushSubscription(subscription: globalThis.PushSubscription): Promise<void> {
    if (!this.userId) return;

    const subscriptionObj = subscription.toJSON();

    await this.supabase.from('push_subscriptions').upsert({
      user_id: this.userId,
      endpoint: subscription.endpoint,
      p256dh: subscriptionObj.keys?.p256dh || '',
      auth: subscriptionObj.keys?.auth || '',
      user_agent: navigator.userAgent,
      last_used: new Date().toISOString(),
    });
  }

  /**
   * Show browser notification
   */
  private showBrowserNotification(notification: NotificationData): void {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    ) {
      return;
    }

    const options: NotificationOptions = {
      body: notification.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: notification.id,
      data: {
        id: notification.id,
        type: notification.type,
        ...notification.data,
      },
      actions: [
        {
          action: 'view',
          title: 'View',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
        },
      ],
    };

    const browserNotification = new Notification(notification.title, options);

    browserNotification.onclick = () => {
      this.handleNotificationClick(notification);
      browserNotification.close();
    };

    // Auto-close after 5 seconds
    setTimeout(() => {
      browserNotification.close();
    }, 5000);
  }

  /**
   * Handle notification click
   */
  private handleNotificationClick(notification: NotificationData): void {
    // Mark as clicked
    this.markNotificationClicked(notification.id);

    // Navigate based on type
    if (typeof window !== 'undefined') {
      switch (notification.type) {
        case 'message':
          if (notification.data.chatId) {
            window.location.href = `/chat/${notification.data.chatId}`;
          }
          break;
        case 'mention':
          if (notification.data.chatId && notification.data.messageId) {
            window.location.href = `/chat/${notification.data.chatId}#${notification.data.messageId}`;
          }
          break;
        case 'reaction':
          if (notification.data.chatId) {
            window.location.href = `/chat/${notification.data.chatId}`;
          }
          break;
        default:
          window.focus();
      }
    }
  }

  /**
   * Create a new notification
   */
  async createNotification(params: CreateNotificationParams): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.rpc('create_notification', {
        p_user_id: params.userId,
        p_title: params.title,
        p_body: params.body,
        p_type: params.type,
        p_data: params.data || {},
        p_expires_at: params.expiresAt?.toISOString() || null,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to create notification:', error);
      return null;
    }
  }

  /**
   * Get notifications for current user
   */
  async getNotifications(limit = 50, offset = 0): Promise<NotificationData[]> {
    if (!this.userId) return [];

    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return (data || []).map((item) => ({
        id: item.id,
        userId: item.user_id,
        title: item.title,
        body: item.body,
        type: item.type as NotificationType,
        data: (item.data as Record<string, unknown>) || {},
        read: item.read,
        clicked: item.clicked,
        createdAt: item.created_at,
        expiresAt: item.expires_at,
      }));
    } catch (error) {
      console.error('Failed to get notifications:', error);
      return [];
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    if (!this.userId) return 0;

    try {
      const { count, error } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.userId)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  }

  /**
   * Mark notification as clicked
   */
  async markNotificationClicked(notificationId: string): Promise<void> {
    try {
      await this.supabase
        .from('notifications')
        .update({ clicked: true })
        .eq('id', notificationId)
        .eq('user_id', this.userId);
    } catch (error) {
      console.error('Failed to mark notification as clicked:', error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('mark_all_notifications_read');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      return 0;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', this.userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to delete notification:', error);
      return false;
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

// Singleton instance
let notificationService: NotificationService | null = null;

export function getNotificationService(supabase: SupabaseClient<Database>): NotificationService {
  if (!notificationService) {
    notificationService = new NotificationService(supabase);
  }
  return notificationService;
}
