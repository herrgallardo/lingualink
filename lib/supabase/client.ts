/**
 * Supabase client for browser/client-side usage
 */
import type { Database } from '@/lib/types/database';
import { createBrowserClient } from '@supabase/ssr';

// Singleton pattern to ensure we only create one client
let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Create client with enhanced configuration for better WebSocket handling
  client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
      timeout: 20000, // Increase timeout to 20 seconds
    },
    global: {
      headers: {
        'x-client-info': 'lingualink/1.0.0',
      },
    },
    db: {
      schema: 'public',
    },
  });

  // Add connection monitoring for better debugging
  if (typeof window !== 'undefined') {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      console.log('🌐 Network online - Supabase will automatically reconnect');
    });

    window.addEventListener('offline', () => {
      console.log('📵 Network offline');
    });

    // Monitor page visibility for better connection management
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('👁️ Page visible - Supabase will check connections');
      }
    });
  }

  return client;
}

// Helper function to check WebSocket connection status
export function checkWebSocketStatus(): boolean {
  if (typeof window === 'undefined') return false;

  // Check if we're online
  if (!navigator.onLine) {
    console.log('📵 No internet connection');
    return false;
  }

  // Check if page is visible
  if (document.hidden) {
    console.log('👁️‍🗨️ Page is hidden');
    return false;
  }

  return true;
}

// Helper function to force reconnect all channels
export async function forceReconnectChannels() {
  if (!client) return;

  console.log('🔄 Force reconnecting all channels...');

  try {
    // Get all channels and reconnect them
    const channels = client.getChannels();

    for (const channel of channels) {
      try {
        await channel.unsubscribe();
        await channel.subscribe();
      } catch (error) {
        console.error(`Failed to reconnect channel ${channel.topic}:`, error);
      }
    }

    console.log('✅ Channel reconnection complete');
  } catch (error) {
    console.error('❌ Failed to reconnect channels:', error);
  }
}
