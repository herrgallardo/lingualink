'use client';

import { MessageEditor } from '@/components/chat/MessageEditor';
import { useAuth } from '@/lib/context/auth-context';
import { usePreferencesContext } from '@/lib/context/preferences-context';
import { useProfile } from '@/lib/hooks/useSupabase';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Database } from '@/lib/types/database';
import { formatTime, getDateLabel } from '@/lib/utils/date';
import { getLanguageName } from '@/lib/utils/languages';
import {
  ArrowUturnLeftIcon,
  EllipsisHorizontalIcon,
  FaceSmileIcon,
  LanguageIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { MessageReactions } from './MessageReactions';
import { ReadReceipts } from './ReadReceipts';

type MessageRow = Database['public']['Tables']['messages']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];
type ReactionRow = Database['public']['Tables']['message_reactions']['Row'];

interface MessageProps {
  message: MessageRow;
  sender: UserRow;
  showTimestamp?: boolean;
  showDateSeparator?: boolean;
  isGrouped?: boolean;
  previousMessage?: MessageRow | null;
  onEdit?: (messageId: string, newText: string) => void | Promise<void>;
  onDelete?: (messageId: string) => void | Promise<void>;
  onReply?: (message: MessageRow) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  reactions?: ReactionRow[];
  readBy?: string[];
  chatParticipants?: UserRow[];
}

export function Message({
  message,
  sender,
  showTimestamp = true,
  showDateSeparator = false,
  isGrouped = false,
  previousMessage: _previousMessage,
  onEdit,
  onDelete,
  onReply,
  onReaction,
  reactions = [],
  readBy = [],
  chatParticipants = [],
}: MessageProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { preferences } = usePreferencesContext();
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const [showTranslation, setShowTranslation] = useState(preferences.autoTranslate);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const isOwnMessage = user?.id === sender.id;
  const messageDate = new Date(message.timestamp);

  // Get translated text for user's language
  useEffect(() => {
    if (preferences.autoTranslate && message.translations) {
      const translations = message.translations as Record<string, string>;
      const userLang = profile?.preferred_language || 'en';
      if (translations[userLang] && translations[userLang] !== message.original_text) {
        setTranslatedText(translations[userLang]);
      }
    }
  }, [message, preferences.autoTranslate, profile?.preferred_language]);

  const handleMenuAction = useCallback(
    (action: 'edit' | 'delete' | 'reply') => {
      setShowMenu(false);
      switch (action) {
        case 'edit':
          setIsEditing(true);
          break;
        case 'delete':
          onDelete?.(message.id);
          break;
        case 'reply':
          onReply?.(message);
          break;
      }
    },
    [message, onDelete, onReply],
  );

  const handleSaveEdit = useCallback(
    async (newText: string) => {
      if (onEdit) {
        try {
          await onEdit(message.id, newText);
          setIsEditing(false);
        } catch (error) {
          console.error('Failed to edit message:', error);
        }
      }
    },
    [onEdit, message.id],
  );

  const toggleTranslation = useCallback(() => {
    setShowTranslation(!showTranslation);
  }, [showTranslation]);

  return (
    <>
      {/* Date separator */}
      {showDateSeparator && (
        <div className="flex items-center gap-4 py-4">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-xs text-slate-500 font-medium">{getDateLabel(messageDate)}</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>
      )}

      {/* Message */}
      <div
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${
          isGrouped ? 'mt-0.5' : 'mt-4'
        }`}
      >
        <div className={`flex gap-2 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
          {/* Avatar */}
          {!isGrouped && (
            <div className="flex-shrink-0">
              {sender.avatar_url ? (
                <Image
                  src={sender.avatar_url}
                  alt={sender.username}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <UserCircleIcon className="w-8 h-8 text-slate-400" />
              )}
            </div>
          )}

          {/* Message content */}
          <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
            {/* Sender name (for group chats) */}
            {!isGrouped && !isOwnMessage && chatParticipants.length > 2 && (
              <span className="text-xs text-slate-500 mb-1 ml-2">{sender.username}</span>
            )}

            {/* Message bubble or editor */}
            {isEditing ? (
              <MessageEditor
                initialText={message.original_text}
                onSave={handleSaveEdit}
                onCancel={() => setIsEditing(false)}
                className="w-full"
              />
            ) : (
              <div className="group relative">
                <div
                  className={`px-4 py-2 rounded-2xl ${
                    isOwnMessage
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-midnight-900 dark:text-slate-100'
                  } ${message.deleted_at ? 'italic opacity-60' : ''}`}
                >
                  {message.deleted_at ? (
                    <span className="text-sm">{t('chat.messageDeleted')}</span>
                  ) : (
                    <>
                      {/* Original or translated text */}
                      <p className="break-words whitespace-pre-wrap">
                        {showTranslation && translatedText ? translatedText : message.original_text}
                      </p>

                      {/* Translation indicator */}
                      {translatedText && (
                        <button
                          onClick={toggleTranslation}
                          className={`flex items-center gap-1 mt-1 text-xs ${
                            isOwnMessage
                              ? 'text-cyan-100 hover:text-white'
                              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                          }`}
                        >
                          <LanguageIcon className="w-3 h-3" />
                          {showTranslation
                            ? t('chat.showOriginal')
                            : t('chat.translatedFrom', {
                                language: getLanguageName(message.original_language),
                              })}
                        </button>
                      )}

                      {/* Edited indicator */}
                      {message.edited_at && (
                        <span
                          className={`text-xs ${isOwnMessage ? 'text-cyan-100' : 'text-slate-500'}`}
                        >
                          {t('chat.messageEdited')}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Message menu */}
                {!message.deleted_at && (
                  <div className="absolute top-0 right-0 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="relative">
                      <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1 bg-white dark:bg-slate-700 rounded-full shadow-md hover:bg-slate-50 dark:hover:bg-slate-600"
                      >
                        <EllipsisHorizontalIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      </button>

                      {showMenu && (
                        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-10">
                          {onReply && (
                            <button
                              onClick={() => handleMenuAction('reply')}
                              className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                              <ArrowUturnLeftIcon className="w-4 h-4" />
                              {t('chat.replyToMessage')}
                            </button>
                          )}

                          {isOwnMessage && onEdit && (
                            <button
                              onClick={() => handleMenuAction('edit')}
                              className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                              <PencilIcon className="w-4 h-4" />
                              {t('chat.editMessage')}
                            </button>
                          )}

                          {isOwnMessage && onDelete && (
                            <button
                              onClick={() => handleMenuAction('delete')}
                              className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <TrashIcon className="w-4 h-4" />
                              {t('chat.deleteMessage')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick reaction button */}
                {!message.deleted_at && onReaction && (
                  <button
                    onClick={() => onReaction(message.id, '👍')}
                    className="absolute -bottom-2 -right-2 p-1 bg-white dark:bg-slate-700 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                  >
                    <FaceSmileIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </button>
                )}
              </div>
            )}

            {/* Reactions */}
            {reactions.length > 0 && onReaction && (
              <MessageReactions
                reactions={reactions}
                messageId={message.id}
                onAddReaction={onReaction}
                className="mt-1"
              />
            )}

            {/* Timestamp and read receipts */}
            <div
              className={`flex items-center gap-2 mt-1 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
            >
              {preferences.showTimestamps && showTimestamp && (
                <span className="text-xs text-slate-500">{formatTime(messageDate)}</span>
              )}

              {preferences.showReadReceipts && isOwnMessage && readBy.length > 0 && (
                <ReadReceipts readBy={readBy} participants={chatParticipants} size="small" />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
