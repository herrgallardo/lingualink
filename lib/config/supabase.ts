/**
 * Supabase configuration and constants
 */

// Environment validation
function validateEnv() {
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please check your .env.local file.',
    );
  }
}

// Validate on module load in development
if (process.env.NODE_ENV === 'development') {
  validateEnv();
}

// Supabase configuration
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
} as const;

// Validation helper
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// Table names
export const TABLES = {
  USERS: 'users',
  CHATS: 'chats',
  MESSAGES: 'messages',
  GLOSSARY: 'glossary',
} as const;

// Storage buckets
export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  MESSAGE_ATTACHMENTS: 'message-attachments',
} as const;

// Realtime channels
export const CHANNELS = {
  PRESENCE: 'presence',
  CHAT: (chatId: string) => `chat:${chatId}`,
  USER: (userId: string) => `user:${userId}`,
  TYPING: (chatId: string) => `typing:${chatId}`,
} as const;

// Auth configuration
export const AUTH_CONFIG = {
  redirectTo: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  passwordMinLength: 8,
  emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
} as const;

// Default user settings
export const DEFAULT_USER_SETTINGS = {
  preferredLanguage: 'en',
  status: 'available' as const,
  isTyping: false,
} as const;
