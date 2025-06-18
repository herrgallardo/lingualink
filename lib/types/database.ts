/**
 * Database type definitions
 * These will be auto-generated from Supabase in Step 4
 * For now, we'll define the structure manually
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          avatar_url: string | null;
          preferred_language: string;
          status: 'available' | 'busy' | 'do-not-disturb' | 'invisible';
          is_typing: boolean;
          last_seen: string; // timestamp with time zone
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          username: string;
          avatar_url?: string | null;
          preferred_language?: string;
          status?: 'available' | 'busy' | 'do-not-disturb' | 'invisible';
          is_typing?: boolean;
          last_seen?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string;
          avatar_url?: string | null;
          preferred_language?: string;
          status?: 'available' | 'busy' | 'do-not-disturb' | 'invisible';
          is_typing?: boolean;
          last_seen?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      chats: {
        Row: {
          id: string;
          created_at: string;
          participants: string[]; // Array of user IDs
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          participants: string[];
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          participants?: string[];
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          sender_id: string;
          timestamp: string;
          original_text: string;
          translations: Json; // Will be Record<string, string>
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          sender_id: string;
          timestamp?: string;
          original_text: string;
          translations?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          sender_id?: string;
          timestamp?: string;
          original_text?: string;
          translations?: Json;
          created_at?: string;
        };
      };
      glossary: {
        Row: {
          id: string;
          original_term: string;
          language: string;
          translated_term: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          original_term: string;
          language: string;
          translated_term: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          original_term?: string;
          language?: string;
          translated_term?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_status: 'available' | 'busy' | 'do-not-disturb' | 'invisible';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
