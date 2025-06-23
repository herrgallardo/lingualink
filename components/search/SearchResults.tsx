'use client';

import type { Database } from '@/lib/types/database';
import { formatDistanceToNow } from '@/lib/utils/date';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';

type MessageSearchResult = Database['public']['Functions']['search_messages']['Returns'][0];
type UserSearchResult = Database['public']['Tables']['users']['Row'];
type ChatSearchResult = Database['public']['Views']['chat_list']['Row'];

interface MessageResultsProps {
  results: MessageSearchResult[];
  searchQuery: string;
}

export function MessageResults({ results, searchQuery }: MessageResultsProps) {
  return (
    <div className="space-y-3">
      {results.map((result) => (
        <Link
          key={result.message_id}
          href={`/chat/${result.chat_id}#${result.message_id}`}
          className="block bg-white dark:bg-slate-800 rounded-lg p-4 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="text-sm text-slate-500">
              {formatDistanceToNow(new Date(result.message_timestamp))} ago
            </div>
            {result.rank > 0 && (
              <div className="text-xs text-cyan-600 dark:text-cyan-400">
                Relevance: {Math.round(result.rank * 100)}%
              </div>
            )}
          </div>

          <p className="text-midnight-900 dark:text-slate-100">
            {highlightText(result.original_text, searchQuery)}
          </p>
        </Link>
      ))}
    </div>
  );
}

interface UserResultsProps {
  results: UserSearchResult[];
  onUserClick?: (userId: string) => void;
}

export function UserResults({ results, onUserClick }: UserResultsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {results.map((user) => (
        <button
          key={user.id}
          onClick={() => onUserClick?.(user.id)}
          className="bg-white dark:bg-slate-800 rounded-lg p-4 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={user.username}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              ) : (
                <UserCircleIcon className="w-full h-full text-slate-400 p-1" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-midnight-900 dark:text-slate-100 truncate">
                {user.username}
              </p>
              <p className="text-sm text-slate-500 truncate">{user.email}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>{user.preferred_language.toUpperCase()}</span>
            <span>{formatDistanceToNow(new Date(user.last_seen))} ago</span>
          </div>
        </button>
      ))}
    </div>
  );
}

interface ChatResultsProps {
  results: ChatSearchResult[];
}

export function ChatResults({ results }: ChatResultsProps) {
  return (
    <div className="space-y-2">
      {results.map((chat) => {
        const lastMessage = chat.last_message as
          | Database['public']['Tables']['messages']['Row']
          | null;
        const otherParticipants = (chat.other_participants || []) as Array<{
          id: string;
          username: string;
          avatar_url: string | null;
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
              {formatDistanceToNow(new Date(chat.updated_at))} ago
            </p>
          </Link>
        );
      })}
    </div>
  );
}

// Helper function to highlight search terms
function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));

  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={index}
        className="bg-yellow-200 dark:bg-yellow-800 text-midnight-900 dark:text-slate-100"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
