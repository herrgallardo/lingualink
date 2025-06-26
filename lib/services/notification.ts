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
  private isInitialized = false;
  private initializePromise: Promise<void> | null = null;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  /**
   * Initialize notification service for a user
   */
  async initialize(userId: string): Promise<void> {
    // If already initialized for this user, return early
    if (this.isInitialized && this.userId === userId) {
      return;
    }

    // If currently initializing, wait for it to complete
    if (this.initializePromise) {
      await this.initializePromise;
      if (this.isInitialized && this.userId === userId) {
        return;
      }
    }

    // If initialized for a different user, cleanup first
    if (this.isInitialized && this.userId !== userId) {
      await this.cleanup();
    }

    // Start initialization
    this.initializePromise = this.doInitialize(userId);

    try {
      await this.initializePromise;
    } finally {
      this.initializePromise = null;
    }
  }

  /**
   * Perform the actual initialization
   */
  private async doInitialize(userId: string): Promise<void> {
    this.userId = userId;

    try {
      // Setup realtime - this won't throw even if it fails
      await this.setupRealtimeSubscription();

      // Request notification permission - this is optional
      try {
        await this.requestNotificationPermission();
      } catch (error) {
        console.warn('Failed to setup browser notifications:', error);
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      this.isInitialized = true;
    }
  }

  /**
   * Setup realtime subscription for notifications
   */
  private async setupRealtimeSubscription(): Promise<void> {
    if (!this.userId) return;

    // Clean up any existing channel
    if (this.channel) {
      try {
        await this.supabase.removeChannel(this.channel);
      } catch (error) {
        console.error('Error removing old notification channel:', error);
      }
      this.channel = null;
    }

    try {
      // First, check if notifications table exists and we have access
      const { error: testError } = await this.supabase
        .from('notifications')
        .select('id')
        .eq('user_id', this.userId)
        .limit(1);

      if (testError) {
        console.warn('Cannot access notifications table:', testError.message);
        return;
      }

      // Create new channel
      const channelName = `notifications:${this.userId}`;
      this.channel = this.supabase.channel(channelName);

      // Set up event listener
      this.channel.on(
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
      );

      // Subscribe to the channel
      await new Promise<void>((resolve) => {
        if (!this.channel) {
          resolve();
          return;
        }

        const timeout = setTimeout(() => {
          console.warn('Notification realtime subscription timeout - continuing without realtime');
          resolve();
        }, 5000);

        this.channel.subscribe((status) => {
          console.log(`Notification channel status: ${status}`);

          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            console.log('Notification realtime subscription successful');
            resolve();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(timeout);
            console.warn(`Notification realtime subscription failed: ${status}`);
            resolve();
          }
        });
      });
    } catch (error) {
      console.warn('Failed to setup realtime notifications:', error);
    }
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

    try {
      // Use upsert with onConflict to handle duplicates
      await this.supabase.from('push_subscriptions').upsert(
        {
          user_id: this.userId,
          endpoint: subscription.endpoint,
          p256dh: subscriptionObj.keys?.p256dh || '',
          auth: subscriptionObj.keys?.auth || '',
          user_agent: navigator.userAgent,
          last_used: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,endpoint',
        },
      );
    } catch (error) {
      // Silently handle duplicate key errors
      if (error && typeof error === 'object' && 'code' in error && error.code !== '23505') {
        console.error('Failed to save push subscription:', error);
      }
    }
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

      // Emit event for NotificationBell to update count
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lingualink:notification-read'));
      }

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

      // Emit event for NotificationBell to update count
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lingualink:all-notifications-read'));
      }

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
  async cleanup(): Promise<void> {
    if (this.channel) {
      try {
        await this.supabase.removeChannel(this.channel);
      } catch (error) {
        console.error('Error cleaning up notification channel:', error);
      }
      this.channel = null;
    }
    this.isInitialized = false;
    this.userId = null;
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
