'use client';

import { useAuth } from '@/lib/context/auth-context';
import { usePreferencesContext } from '@/lib/context/preferences-context';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Database } from '@/lib/types/database';
import { isSameDay } from '@/lib/utils/date';
import { ArrowDownIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Message } from './Message';
import { TypingIndicator } from './TypingIndicator';

type MessageRow = Database['public']['Tables']['messages']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];
type ReactionRow = Database['public']['Tables']['message_reactions']['Row'];
type ReadReceiptRow = Database['public']['Tables']['read_receipts']['Row'];

interface MessageListProps {
  chatId: string;
  messages: MessageRow[];
  participants: UserRow[];
  reactions: Record<string, ReactionRow[]>;
  readReceipts: Record<string, ReadReceiptRow[]>;
  typingUsers: string[];
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReplyMessage?: (message: MessageRow) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
}

export function MessageList({
  chatId,
  messages,
  participants,
  reactions,
  readReceipts,
  typingUsers,
  onEditMessage,
  onDeleteMessage,
  onReplyMessage,
  onReaction,
  onLoadMore,
  hasMore = false,
  loading = false,
}: MessageListProps) {
  const { user } = useAuth();
  const { preferences } = usePreferencesContext();
  const { t } = useTranslation();
  const supabase = useSupabase();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    setAutoScroll(isNearBottom);
    setShowScrollButton(!isNearBottom);

    // Load more messages when scrolling to top
    if (scrollTop === 0 && hasMore && !loading) {
      onLoadMore?.();
    }
  }, [hasMore, loading, onLoadMore]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setAutoScroll(true);
  }, []);

  // Mark messages as read
  useEffect(() => {
    if (!user || messages.length === 0) return;

    const unreadMessages = messages.filter(
      (msg) =>
        msg.sender_id !== user.id && !readReceipts[msg.id]?.some((r) => r.user_id === user.id),
    );

    if (unreadMessages.length === 0) return;

    const markAsRead = async () => {
      for (const message of unreadMessages) {
        await supabase.from('read_receipts').insert({
          message_id: message.id,
          user_id: user.id,
        });
      }
    };

    markAsRead();
  }, [messages, user, readReceipts, supabase]);

  // Group messages by sender and time
  const groupedMessages = messages.reduce<
    Array<{
      message: MessageRow;
      showDateSeparator: boolean;
      isGrouped: boolean;
    }>
  >((grouped, message, index) => {
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const messageDate = new Date(message.timestamp);
    const prevDate = prevMessage ? new Date(prevMessage.timestamp) : null;

    // Check if we need a date separator
    const showDateSeparator = !prevDate || !isSameDay(messageDate, prevDate);

    // Check if message should be grouped with previous
    let isGrouped = false;
    if (preferences.messageGrouping && prevMessage && !showDateSeparator) {
      const timeDiff = messageDate.getTime() - prevDate!.getTime();
      isGrouped = prevMessage.sender_id === message.sender_id && timeDiff < 60000; // 1 minute
    }

    grouped.push({ message, showDateSeparator, isGrouped });
    return grouped;
  }, []);

  // Get participant map
  const participantMap = participants.reduce<Record<string, UserRow>>((map, participant) => {
    map[participant.id] = participant;
    return map;
  }, {});

  // Get typing users names
  const typingUserNames = typingUsers
    .map((userId) => participantMap[userId]?.username)
    .filter(Boolean);

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 py-2"
      >
        {/* Load more indicator */}
        {loading && hasMore && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-sm text-slate-500">
              <div className="w-4 h-4 border-2 border-slate-300 border-t-cyan-500 rounded-full animate-spin" />
              {t('chat.loadingMessages')}
            </div>
          </div>
        )}

        {/* No more messages */}
        {!hasMore && messages.length > 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-slate-500">{t('chat.noMoreMessages')}</p>
          </div>
        )}

        {/* Messages */}
        {groupedMessages.map(({ message, showDateSeparator, isGrouped }, index) => {
          const sender = participantMap[message.sender_id];
          if (!sender) return null;

          const messageReactions = reactions[message.id] || [];
          const messageReadReceipts = readReceipts[message.id] || [];
          const readBy = messageReadReceipts.map((r) => r.user_id);

          return (
            <Message
              key={message.id}
              message={message}
              sender={sender}
              showDateSeparator={showDateSeparator}
              isGrouped={isGrouped}
              previousMessage={index > 0 ? messages[index - 1] : null}
              onEdit={onEditMessage}
              onDelete={onDeleteMessage}
              onReply={onReplyMessage}
              onReaction={onReaction}
              reactions={messageReactions}
              readBy={readBy}
              chatParticipants={participants}
              showTimestamp={!isGrouped || index === messages.length - 1}
            />
          );
        })}

        {/* Typing indicator */}
        {typingUserNames.length > 0 && (
          <div className="px-4 py-2">
            <TypingIndicator users={typingUserNames} />
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg hover:shadow-xl transition-shadow"
          aria-label={t('chat.scrollToBottom')}
        >
          <ArrowDownIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
      )}
    </div>
  );
}
