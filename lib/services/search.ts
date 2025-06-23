/**
 * Search service for messages, users, and chats
 */
import type { Database } from '@/lib/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface SearchFilters {
  dateRange?: {
    from: Date;
    to: Date;
  };
  senders?: string[];
  chats?: string[];
  hasAttachments?: boolean;
  languages?: string[];
  unreadOnly?: boolean;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface SearchResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Type alias for message search result
type MessageSearchResult = Database['public']['Functions']['search_messages']['Returns'][0];

export class SearchService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Search messages with fuzzy matching
   */
  async searchMessages(
    query: string,
    filters?: SearchFilters,
    pagination: PaginationParams = { page: 1, pageSize: 20 },
  ): Promise<SearchResult<MessageSearchResult>> {
    try {
      const offset = (pagination.page - 1) * pagination.pageSize;

      // Use the RPC function for text search
      const { data, error } = await this.supabase.rpc('search_messages', {
        search_query: query,
        limit_count: pagination.pageSize,
        offset_count: offset,
      });

      if (error) throw error;

      // Apply additional filters if needed (would need to modify RPC function for full support)
      // For now, we'll do client-side filtering for demonstration
      let filteredData = data || [];

      if (filters && filteredData.length > 0) {
        // Filter by date range
        if (filters.dateRange) {
          const { from, to } = filters.dateRange;
          filteredData = filteredData.filter((msg: MessageSearchResult) => {
            const msgDate = new Date(msg.message_timestamp);
            return msgDate >= from && msgDate <= to;
          });
        }

        // Filter by senders
        if (filters.senders && filters.senders.length > 0) {
          filteredData = filteredData.filter((msg: MessageSearchResult) =>
            filters.senders?.includes(msg.sender_id),
          );
        }

        // Filter by chats
        if (filters.chats && filters.chats.length > 0) {
          filteredData = filteredData.filter((msg: MessageSearchResult) =>
            filters.chats?.includes(msg.chat_id),
          );
        }
      }

      // For now, we'll estimate total count based on the filtered results
      // In production, you'd want to get the actual count from the database
      const totalCount = filteredData.length;
      const totalPages = Math.ceil(totalCount / pagination.pageSize);

      // Apply pagination to filtered results
      const paginatedData = filteredData.slice(
        (pagination.page - 1) * pagination.pageSize,
        pagination.page * pagination.pageSize,
      );

      return {
        data: paginatedData,
        totalCount,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages,
      };
    } catch (error) {
      console.error('Message search error:', error);
      throw error;
    }
  }

  /**
   * Search users with fuzzy matching
   */
  async searchUsers(
    query: string,
    pagination: PaginationParams = { page: 1, pageSize: 20 },
  ): Promise<SearchResult<Database['public']['Tables']['users']['Row']>> {
    try {
      const offset = (pagination.page - 1) * pagination.pageSize;

      // First get total count
      const { count } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .or(`username.ilike.%${query}%,email.ilike.%${query}%`);

      // Then get paginated data
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
        .order('username', { ascending: true })
        .range(offset, offset + pagination.pageSize - 1);

      if (error) throw error;

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pagination.pageSize);

      return {
        data: data || [],
        totalCount,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages,
      };
    } catch (error) {
      console.error('User search error:', error);
      throw error;
    }
  }

  /**
   * Search chats
   */
  async searchChats(
    query: string,
    pagination: PaginationParams = { page: 1, pageSize: 20 },
  ): Promise<SearchResult<Database['public']['Views']['chat_list']['Row']>> {
    try {
      const offset = (pagination.page - 1) * pagination.pageSize;

      // First, get all chats for the user
      const { data: allChats, error: chatsError } = await this.supabase
        .from('chat_list')
        .select('*')
        .order('updated_at', { ascending: false });

      if (chatsError) throw chatsError;

      if (!allChats) {
        return {
          data: [],
          totalCount: 0,
          page: pagination.page,
          pageSize: pagination.pageSize,
          totalPages: 0,
        };
      }

      // Filter chats based on participant names or last message
      const filteredChats = allChats.filter((chat) => {
        // Check participant names
        const otherParticipants = (chat.other_participants || []) as Array<{
          username: string;
        }>;
        const matchesParticipant = otherParticipants.some((p) =>
          p.username.toLowerCase().includes(query.toLowerCase()),
        );

        // Check last message content
        const lastMessage = chat.last_message as
          | Database['public']['Tables']['messages']['Row']
          | null;
        const matchesMessage =
          lastMessage && lastMessage.original_text.toLowerCase().includes(query.toLowerCase());

        return matchesParticipant || matchesMessage;
      });

      // Apply pagination
      const paginatedChats = filteredChats.slice(offset, offset + pagination.pageSize);

      return {
        data: paginatedChats,
        totalCount: filteredChats.length,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: Math.ceil(filteredChats.length / pagination.pageSize),
      };
    } catch (error) {
      console.error('Chat search error:', error);
      throw error;
    }
  }
}
