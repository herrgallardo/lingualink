/**
 * Database type definitions
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
          preferences: Json;
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
          preferences?: Json;
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
          preferences?: Json;
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
          original_language: string;
          translations: Json; // Will be Record<string, string>
          edited_at: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          sender_id: string;
          timestamp?: string;
          original_text: string;
          original_language?: string;
          translations?: Json;
          edited_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          sender_id?: string;
          timestamp?: string;
          original_text?: string;
          original_language?: string;
          translations?: Json;
          edited_at?: string | null;
          deleted_at?: string | null;
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
          chat_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          original_term: string;
          language: string;
          translated_term: string;
          created_by: string;
          chat_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          original_term?: string;
          language?: string;
          translated_term?: string;
          created_by?: string;
          chat_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      message_reactions: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          user_id?: string;
          emoji?: string;
          created_at?: string;
        };
      };
      read_receipts: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          read_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          read_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          user_id?: string;
          read_at?: string;
        };
      };
    };
    Views: {
      chat_list: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          participants: string[];
          last_message: Json | null;
          unread_count: number;
          other_participants: Json | null;
        };
      };
      user_stats: {
        Row: {
          user_id: string;
          total_chats: number;
          total_messages_sent: number;
          messages_last_week: number;
          languages_used: number;
          last_message_at: string | null;
        };
      };
    };
    Functions: {
      is_participant: {
        Args: { user_id: string; chat_id: string };
        Returns: boolean;
      };
      get_unread_count: {
        Args: { p_user_id: string; p_chat_id: string };
        Returns: number;
      };
      create_or_get_direct_chat: {
        Args: { other_user_id: string };
        Returns: string;
      };
      search_messages: {
        Args: {
          search_query: string;
          limit_count?: number;
          offset_count?: number;
        };
        Returns: {
          message_id: string;
          chat_id: string;
          sender_id: string;
          original_text: string;
          message_timestamp: string;
          rank: number;
        }[];
      };
      get_chat_participants: {
        Args: { p_chat_id: string };
        Returns: {
          user_id: string;
          username: string;
          avatar_url: string | null;
          status: Database['public']['Enums']['user_status'];
          is_typing: boolean;
          last_seen: string;
          preferred_language: string;
        }[];
      };
      refresh_user_stats: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
      update_user_preference: {
        Args: {
          user_id: string;
          preference_key: string;
          preference_value: Json;
        };
        Returns: Json;
      };
      get_user_preferences: {
        Args: { user_id: string };
        Returns: Json;
      };
    };
    Enums: {
      user_status: 'available' | 'busy' | 'do-not-disturb' | 'invisible';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
