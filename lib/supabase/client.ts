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

  client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

  return client;
}
