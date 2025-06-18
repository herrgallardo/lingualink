/**
 * Supabase client with service role for admin operations
 * ⚠️ NEVER expose this client to the browser
 */
import type { Database } from '@/lib/types/database';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

let serviceClient: ReturnType<typeof createSupabaseClient<Database>> | undefined;

export function createServiceClient() {
  if (serviceClient) return serviceClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase service role environment variables');
  }

  serviceClient = createSupabaseClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serviceClient;
}
