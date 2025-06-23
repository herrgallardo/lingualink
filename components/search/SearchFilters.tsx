'use client';

import { useSupabase } from '@/lib/hooks/useSupabase';
import type { SearchFilters } from '@/lib/services/search';
import type { Database } from '@/lib/types/database';
import {
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  PaperClipIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onReset: () => void;
}

// Minimal types for filter data
type FilterUser = {
  id: string;
  username: string;
};

type FilterChat = Database['public']['Views']['chat_list']['Row'];

export function SearchFilters({ filters, onFiltersChange, onReset }: SearchFiltersProps) {
  const supabase = useSupabase();
  const [isExpanded, setIsExpanded] = useState(false);
  const [users, setUsers] = useState<FilterUser[]>([]);
  const [chats, setChats] = useState<FilterChat[]>([]);
  const [loading, setLoading] = useState(false);

  // Load users and chats for filter options
  useEffect(() => {
    const loadFilterData = async () => {
      setLoading(true);
      try {
        // Load users (only id and username needed)
        const { data: userData } = await supabase
          .from('users')
          .select('id, username')
          .order('username');

        if (userData) {
          setUsers(userData as FilterUser[]);
        }

        // Load chats
        const { data: chatData } = await supabase
          .from('chat_list')
          .select('*')
          .order('updated_at', { ascending: false });

        if (chatData) {
          setChats(chatData);
        }
      } catch (error) {
        console.error('Failed to load filter data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isExpanded) {
      loadFilterData();
    }
  }, [isExpanded, supabase]);

  const handleDateRangeChange = (field: 'from' | 'to', value: string) => {
    const dateRange = filters.dateRange || { from: new Date(), to: new Date() };
    onFiltersChange({
      ...filters,
      dateRange: {
        ...dateRange,
        [field]: new Date(value),
      },
    });
  };

  const handleSenderToggle = (userId: string) => {
    const currentSenders = filters.senders || [];
    const newSenders = currentSenders.includes(userId)
      ? currentSenders.filter((id) => id !== userId)
      : [...currentSenders, userId];

    // Create new filters object, omitting senders if empty
    const newFilters: SearchFilters = { ...filters };
    if (newSenders.length > 0) {
      newFilters.senders = newSenders;
    } else {
      delete newFilters.senders;
    }

    onFiltersChange(newFilters);
  };

  const handleChatToggle = (chatId: string) => {
    const currentChats = filters.chats || [];
    const newChats = currentChats.includes(chatId)
      ? currentChats.filter((id) => id !== chatId)
      : [...currentChats, chatId];

    // Create new filters object, omitting chats if empty
    const newFilters: SearchFilters = { ...filters };
    if (newChats.length > 0) {
      newFilters.chats = newChats;
    } else {
      delete newFilters.chats;
    }

    onFiltersChange(newFilters);
  };

  const handleAttachmentsChange = (checked: boolean) => {
    const newFilters: SearchFilters = { ...filters };
    if (checked) {
      newFilters.hasAttachments = true;
    } else {
      delete newFilters.hasAttachments;
    }
    onFiltersChange(newFilters);
  };

  const handleUnreadOnlyChange = (checked: boolean) => {
    const newFilters: SearchFilters = { ...filters };
    if (checked) {
      newFilters.unreadOnly = true;
    } else {
      delete newFilters.unreadOnly;
    }
    onFiltersChange(newFilters);
  };

  const hasActiveFilters = !!(
    filters.dateRange ||
    filters.senders?.length ||
    filters.chats?.length ||
    filters.hasAttachments ||
    filters.languages?.length ||
    filters.unreadOnly
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-midnight-900 dark:text-slate-100">Filters</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 text-xs rounded-full">
              Active
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-4">
          {/* Date Range */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-midnight-900 dark:text-slate-100 mb-2">
              <CalendarIcon className="w-4 h-4" />
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={filters.dateRange?.from.toISOString().split('T')[0] || ''}
                onChange={(e) => handleDateRangeChange('from', e.target.value)}
                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
              />
              <input
                type="date"
                value={filters.dateRange?.to.toISOString().split('T')[0] || ''}
                onChange={(e) => handleDateRangeChange('to', e.target.value)}
                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
              />
            </div>
          </div>

          {/* Senders */}
          {!loading && users.length > 0 && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-midnight-900 dark:text-slate-100 mb-2">
                <UserIcon className="w-4 h-4" />
                Senders
              </label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {users.map((user) => (
                  <label key={user.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.senders?.includes(user.id) || false}
                      onChange={() => handleSenderToggle(user.id)}
                      className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <span className="text-sm text-midnight-900 dark:text-slate-100">
                      {user.username}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Chats */}
          {!loading && chats.length > 0 && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-midnight-900 dark:text-slate-100 mb-2">
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                Chats
              </label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {chats.map((chat) => {
                  const otherParticipants = (chat.other_participants || []) as Array<{
                    username: string;
                  }>;
                  const chatName = otherParticipants.map((p) => p.username).join(', ') || 'Chat';

                  return (
                    <label key={chat.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.chats?.includes(chat.id) || false}
                        onChange={() => handleChatToggle(chat.id)}
                        className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span className="text-sm text-midnight-900 dark:text-slate-100 truncate">
                        {chatName}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Other filters */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasAttachments || false}
                onChange={(e) => handleAttachmentsChange(e.target.checked)}
                className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              <PaperClipIcon className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-midnight-900 dark:text-slate-100">Has attachments</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.unreadOnly || false}
                onChange={(e) => handleUnreadOnlyChange(e.target.checked)}
                className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-sm text-midnight-900 dark:text-slate-100">Unread only</span>
            </label>
          </div>

          {/* Reset button */}
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
            >
              <XMarkIcon className="w-4 h-4" />
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
