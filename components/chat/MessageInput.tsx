'use client';

import { useAuth } from '@/lib/context/auth-context';
import { usePreferencesContext } from '@/lib/context/preferences-context';
import { useTypingIndicator } from '@/lib/hooks/usePresence';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Database } from '@/lib/types/database';
import {
  FaceSmileIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  PhotoIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EmojiPicker } from './EmojiPicker';

type MessageRow = Database['public']['Tables']['messages']['Row'];

interface MessageInputProps {
  chatId: string;
  onSendMessage: (text: string) => void;
  replyTo?: MessageRow | null;
  onCancelReply?: () => void;
  disabled?: boolean;
}

export function MessageInput({
  chatId,
  onSendMessage,
  replyTo,
  onCancelReply,
  disabled = false,
}: MessageInputProps) {
  const { user } = useAuth();
  const { preferences } = usePreferencesContext();
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { setTyping } = useTypingIndicator(chatId);

  // Handle typing indicator with 2-second debounce
  const handleTyping = useCallback(() => {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing to true
    setTyping(true);

    // Set timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 2000);
  }, [setTyping]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setTyping(false);
    };
  }, [setTyping]);

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(e.target.value);
      if (e.target.value.trim()) {
        handleTyping();
      }
    },
    [handleTyping],
  );

  // Handle send message
  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled) return;

    onSendMessage(trimmedMessage);
    setMessage('');

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(false);

    // Focus input
    inputRef.current?.focus();
  }, [message, disabled, onSendMessage, setTyping]);

  // Handle key press
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && preferences.enterToSend) {
        e.preventDefault();
        handleSend();
      }
    },
    [preferences.enterToSend, handleSend],
  );

  // Handle emoji select
  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      const newMessage = message + emoji;
      setMessage(newMessage);
      setShowEmojiPicker(false);
      inputRef.current?.focus();
      handleTyping();
    },
    [message, handleTyping],
  );

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [message]);

  return (
    <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex-1">
            <p className="text-xs text-slate-500 mb-1">{t('chat.inReplyTo')}</p>
            <p className="text-sm text-midnight-900 dark:text-slate-100 truncate">
              {replyTo.original_text}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
            aria-label={t('common.cancel')}
          >
            <XMarkIcon className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 p-4">
        {/* Attachment button */}
        <button
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          aria-label={t('chat.attachFile')}
          disabled={disabled}
        >
          <PaperClipIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>

        {/* Image button */}
        <button
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          aria-label={t('chat.sendImage')}
          disabled={disabled}
        >
          <PhotoIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>

        {/* Message input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder={t('chat.typeMessage')}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 max-h-32"
          />
        </div>

        {/* Emoji picker */}
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label={t('common.emoji')}
            disabled={disabled}
          >
            <FaceSmileIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>

          {showEmojiPicker && (
            <EmojiPicker
              onSelect={handleEmojiSelect}
              onClose={() => setShowEmojiPicker(false)}
              className="absolute bottom-full mb-2 right-0"
            />
          )}
        </div>

        {/* Voice message button */}
        <button
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          aria-label={t('chat.recordAudio')}
          disabled={disabled}
        >
          <MicrophoneIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className="p-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label={t('chat.sendMessage')}
        >
          <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
