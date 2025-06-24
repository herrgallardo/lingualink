'use client';

import { useAuth } from '@/lib/context/auth-context';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Database } from '@/lib/types/database';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useCallback, useState } from 'react';
import { EmojiPicker } from './EmojiPicker';

type ReactionRow = Database['public']['Tables']['message_reactions']['Row'];

interface MessageReactionsProps {
  reactions: ReactionRow[];
  messageId: string;
  onAddReaction?: (messageId: string, emoji: string) => void;
  className?: string;
}

interface GroupedReaction {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

export function MessageReactions({
  reactions,
  messageId,
  onAddReaction,
  className = '',
}: MessageReactionsProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const supabase = useSupabase();

  // Group reactions by emoji
  const groupedReactions = reactions.reduce<GroupedReaction[]>((groups, reaction) => {
    const existingGroup = groups.find((g) => g.emoji === reaction.emoji);

    if (existingGroup) {
      existingGroup.count++;
      existingGroup.users.push(reaction.user_id);
      if (reaction.user_id === user?.id) {
        existingGroup.hasReacted = true;
      }
    } else {
      groups.push({
        emoji: reaction.emoji,
        count: 1,
        users: [reaction.user_id],
        hasReacted: reaction.user_id === user?.id,
      });
    }

    return groups;
  }, []);

  const handleReactionClick = useCallback(
    async (emoji: string, hasReacted: boolean) => {
      if (!user) return;

      if (hasReacted) {
        // Remove reaction
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id)
          .eq('emoji', emoji);

        if (error) {
          console.error('Failed to remove reaction:', error);
        }
      } else if (onAddReaction) {
        // Add reaction
        onAddReaction(messageId, emoji);
      }
    },
    [user, messageId, onAddReaction, supabase],
  );

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      if (onAddReaction) {
        onAddReaction(messageId, emoji);
        setShowEmojiPicker(false);
      }
    },
    [messageId, onAddReaction],
  );

  if (groupedReactions.length === 0 && !onAddReaction) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {groupedReactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleReactionClick(reaction.emoji, reaction.hasReacted)}
          className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
            transition-all hover:scale-110
            ${
              reaction.hasReacted
                ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-300 dark:ring-cyan-700'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }
          `}
          title={t('chat.whoReacted')}
        >
          <span>{reaction.emoji}</span>
          <span className="font-medium">{reaction.count}</span>
        </button>
      ))}

      {onAddReaction && (
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label={t('chat.addReaction')}
          >
            <PlusIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>

          {showEmojiPicker && (
            <EmojiPicker
              onSelect={handleEmojiSelect}
              onClose={() => setShowEmojiPicker(false)}
              className="absolute bottom-full mb-2 left-0 z-20"
            />
          )}
        </div>
      )}
    </div>
  );
}
