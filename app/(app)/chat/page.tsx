'use client';

import { ChatListSkeleton } from '@/components/ui/Skeleton';
import { useSupabase } from '@/lib/hooks/useSupabase';
import type { Database } from '@/lib/types/database';
import { ChatBubbleLeftRightIcon, PlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type ChatListView = Database['public']['Views']['chat_list']['Row'];

export default function ChatListPage() {
  const [chats, setChats] = useState<ChatListView[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();

  useEffect(() => {
    const loadChats = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_list')
          .select('*')
          .order('updated_at', { ascending: false });

        if (error) throw error;
        setChats(data || []);
      } catch (error) {
        console.error('Failed to load chats:', error);
      } finally {
        setLoading(false);
      }
    };

    // Initial load
    loadChats();

    // Subscribe to chat updates
    const channel = supabase
      .channel('chat-list-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
        // Reload chats when changes occur
        loadChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-cyan-600 mb-6">Your Chats</h1>
        <ChatListSkeleton />
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-cyan-600 mb-6">Your Chats</h1>
        <div className="text-center py-12">
          <ChatBubbleLeftRightIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-midnight-900 dark:text-slate-100 mb-2">
            No chats yet
          </h2>
          <p className="text-teal-700 dark:text-teal-400 mb-6">
            Start a conversation to begin chatting across languages
          </p>
          <Link
            href="/chat/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Start New Chat
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-cyan-600">Your Chats</h1>
        <Link
          href="/chat/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          New Chat
        </Link>
      </div>

      <div className="space-y-2">
        {chats.map((chat) => {
          const lastMessage = chat.last_message as
            | Database['public']['Tables']['messages']['Row']
            | null;
          const otherParticipants = (chat.other_participants || []) as Array<{
            id: string;
            username: string;
            avatar_url: string | null;
            status: Database['public']['Tables']['users']['Row']['status'];
            last_seen: string;
          }>;

          return (
            <Link
              key={chat.id}
              href={`/chat/${chat.id}`}
              className="block bg-white dark:bg-slate-800 rounded-lg p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-midnight-900 dark:text-slate-100">
                  {otherParticipants.map((p) => p.username).join(', ') || 'Chat'}
                </h3>
                {chat.unread_count > 0 && (
                  <span className="px-2 py-1 bg-cyan-500 text-white text-xs rounded-full">
                    {chat.unread_count}
                  </span>
                )}
              </div>

              {lastMessage && (
                <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                  {lastMessage.original_text}
                </p>
              )}

              <p className="text-xs text-slate-500 mt-1">
                {new Date(chat.updated_at).toLocaleDateString()}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
