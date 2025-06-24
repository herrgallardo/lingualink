/**
 * Hook for real-time chat functionality
 */
import { useAuth } from '@/lib/context/auth-context';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { getNotificationService } from '@/lib/services/notification';
import { RealtimeMessagesService } from '@/lib/services/realtime-messages';
import { getSoundManager } from '@/lib/services/sound-manager';
import type { Database } from '@/lib/types/database';
import { useCallback, useEffect, useRef, useState } from 'react';

type Tables = Database['public']['Tables'];
type MessageRow = Tables['messages']['Row'];
type UserRow = Tables['users']['Row'];
type ReactionRow = Tables['message_reactions']['Row'];
type ReadReceiptRow = Tables['read_receipts']['Row'];

interface UseRealtimeChatOptions {
  chatId: string;
  onNewMessage?: (message: MessageRow) => void;
  playMessageSound?: boolean;
}

interface UseRealtimeChatReturn {
  messages: MessageRow[];
  participants: UserRow[];
  reactions: Record<string, ReactionRow[]>;
  readReceipts: Record<string, ReadReceiptRow[]>;
  loading: boolean;
  error: Error | null;
  isConnected: boolean;
  hasMore: boolean;
  sendMessage: (text: string, replyTo?: string) => Promise<void>;
  editMessage: (messageId: string, newText: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  refresh: () => Promise<void>;
}

const MESSAGES_PER_PAGE = 50;

export function useRealtimeChat({
  chatId,
  onNewMessage,
  playMessageSound = true,
}: UseRealtimeChatOptions): UseRealtimeChatReturn {
  const { user } = useAuth();
  const supabase = useSupabase();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [participants, setParticipants] = useState<UserRow[]>([]);
  const [reactions, setReactions] = useState<Record<string, ReactionRow[]>>({});
  const [readReceipts, setReadReceipts] = useState<Record<string, ReadReceiptRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const serviceRef = useRef<RealtimeMessagesService | null>(null);
  const soundManager = getSoundManager();
  const notificationServiceRef = useRef(getNotificationService(supabase));
  const participantsRef = useRef<UserRow[]>([]);

  // Update participants ref when participants change
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    if (!user || !chatId) return;

    setLoading(true);
    setError(null);

    try {
      // Load participants
      const { data: participantData, error: participantError } = await supabase.rpc(
        'get_chat_participants',
        { p_chat_id: chatId },
      );

      if (participantError) throw participantError;

      // Ensure participantData is an array
      const participants = participantData ?? [];
      setParticipants(participants);
      participantsRef.current = participants;

      // Load messages
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('timestamp', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (messageError) throw messageError;

      const sortedMessages = (messageData ?? []).reverse();
      setMessages(sortedMessages);
      setHasMore((messageData?.length ?? 0) === MESSAGES_PER_PAGE);

      // Load reactions for these messages
      if (sortedMessages.length > 0) {
        const messageIds = sortedMessages.map((m) => m.id);
        const { data: reactionData } = await supabase
          .from('message_reactions')
          .select('*')
          .in('message_id', messageIds);

        if (reactionData) {
          const reactionsByMessage = reactionData.reduce<Record<string, ReactionRow[]>>(
            (acc, reaction) => {
              const arr = acc[reaction.message_id] ?? [];
              acc[reaction.message_id] = [...arr, reaction];
              return acc;
            },
            {},
          );
          setReactions(reactionsByMessage);
        }

        // Load read receipts
        const { data: receiptData } = await supabase
          .from('read_receipts')
          .select('*')
          .in('message_id', messageIds);

        if (receiptData) {
          const receiptsByMessage = receiptData.reduce<Record<string, ReadReceiptRow[]>>(
            (acc, receipt) => {
              const arr = acc[receipt.message_id] ?? [];
              acc[receipt.message_id] = [...arr, receipt];
              return acc;
            },
            {},
          );
          setReadReceipts(receiptsByMessage);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load chat data'));
    } finally {
      setLoading(false);
    }
  }, [user, chatId, supabase]);

  // Initialize notification service once when user changes
  useEffect(() => {
    if (!user) return;
    notificationServiceRef.current.initialize(user.id);
  }, [user]);

  // Create realtime service instance once
  useEffect(() => {
    if (!serviceRef.current) {
      serviceRef.current = new RealtimeMessagesService(supabase);
    }

    // Cleanup on unmount
    return () => {
      if (serviceRef.current) {
        serviceRef.current.cleanup();
        serviceRef.current = null;
      }
    };
  }, [supabase]);

  // Subscribe to realtime updates when chatId changes
  useEffect(() => {
    if (!user || !chatId || !serviceRef.current) return;

    const currentService = serviceRef.current;
    const currentUserId = user.id;
    let isSubscribed = true;

    const subscribe = async () => {
      if (!isSubscribed) return;

      await currentService.subscribe(chatId, {
        onNewMessage: (message) => {
          if (!isSubscribed) return;

          setMessages((prev) => {
            // Check if message already exists (optimistic update)
            const exists = prev.some((m) => m.id === message.id || m.id === message.sender_id);
            if (exists) {
              // Replace temp message with real one
              return prev.map((m) => (m.id === message.sender_id ? message : m));
            }
            return [...prev, message];
          });

          // Play sound for messages from others
          if (playMessageSound && message.sender_id !== currentUserId && soundManager.isEnabled()) {
            soundManager.play('message');
          }

          // Call custom handler
          onNewMessage?.(message);

          // Create notification for messages from others
          if (message.sender_id !== currentUserId) {
            const sender = participantsRef.current.find((p) => p.id === message.sender_id);
            if (sender) {
              notificationServiceRef.current.createNotification({
                userId: currentUserId,
                title: sender.username,
                body: message.original_text,
                type: 'message',
                data: {
                  chatId,
                  messageId: message.id,
                  senderId: sender.id,
                },
              });
            }
          }
        },
        onMessageUpdated: (message) => {
          if (!isSubscribed) return;
          setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
        },
        onMessageDeleted: (messageId) => {
          if (!isSubscribed) return;
          setMessages((prev) => prev.filter((m) => m.id !== messageId));
        },
        onReactionAdded: (reaction) => {
          if (!isSubscribed) return;
          setReactions((prev) => {
            const existing = prev[reaction.message_id] ?? [];
            return {
              ...prev,
              [reaction.message_id]: [...existing, reaction],
            };
          });
        },
        onReactionRemoved: (reaction) => {
          if (!isSubscribed) return;
          setReactions((prev) => {
            const existing = prev[reaction.message_id] ?? [];
            return {
              ...prev,
              [reaction.message_id]: existing.filter((r) => r.id !== reaction.id),
            };
          });
        },
        onReadReceipt: (receipt) => {
          if (!isSubscribed) return;
          setReadReceipts((prev) => {
            const existing = prev[receipt.message_id] ?? [];
            return {
              ...prev,
              [receipt.message_id]: [...existing, receipt],
            };
          });
        },
        onConnectionChange: (connected) => {
          if (!isSubscribed) return;
          setIsConnected(connected);
        },
      });

      // Load initial data after subscribing
      if (isSubscribed) {
        await loadInitialData();
      }
    };

    subscribe();

    // Cleanup function for this specific subscription
    return () => {
      isSubscribed = false;
    };
  }, [user, chatId, loadInitialData, onNewMessage, playMessageSound, soundManager]);

  // Send message
  const sendMessage = useCallback(
    async (text: string, replyTo?: string) => {
      if (!user || !chatId || !serviceRef.current) return;

      const messageData = {
        chat_id: chatId,
        sender_id: user.id,
        original_text: text,
        original_language: 'en', // This should be detected or user-specified
        reply_to: replyTo ?? null,
      };

      const result = await serviceRef.current.sendMessage(messageData);
      if (result.error) {
        throw result.error;
      }
    },
    [user, chatId],
  );

  // Edit message
  const editMessage = useCallback(
    async (messageId: string, newText: string) => {
      const { error } = await supabase
        .from('messages')
        .update({
          original_text: newText,
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('sender_id', user?.id ?? '');

      if (error) throw error;
    },
    [supabase, user],
  );

  // Delete message (soft delete)
  const deleteMessage = useCallback(
    async (messageId: string) => {
      const { error } = await supabase
        .from('messages')
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('sender_id', user?.id ?? '');

      if (error) throw error;
    },
    [supabase, user],
  );

  // Add reaction
  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user) return;

      const { error } = await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });

      if (error && error.code !== '23505') {
        // Ignore duplicate key errors
        throw error;
      }
    },
    [supabase, user],
  );

  // Load more messages
  const loadMoreMessages = useCallback(async () => {
    if (!chatId || !hasMore) return;

    const offset = (page + 1) * MESSAGES_PER_PAGE;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + MESSAGES_PER_PAGE - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      setMessages((prev) => [...data.reverse(), ...prev]);
      setPage((prev) => prev + 1);
      setHasMore(data.length === MESSAGES_PER_PAGE);

      // Load reactions and read receipts for new messages
      const messageIds = data.map((m) => m.id);

      const { data: reactionData } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messageIds);

      if (reactionData) {
        const newReactions = reactionData.reduce<Record<string, ReactionRow[]>>((acc, reaction) => {
          const arr = acc[reaction.message_id] ?? [];
          acc[reaction.message_id] = [...arr, reaction];
          return acc;
        }, {});
        setReactions((prev) => ({ ...newReactions, ...prev }));
      }

      const { data: receiptData } = await supabase
        .from('read_receipts')
        .select('*')
        .in('message_id', messageIds);

      if (receiptData) {
        const newReceipts = receiptData.reduce<Record<string, ReadReceiptRow[]>>((acc, receipt) => {
          const arr = acc[receipt.message_id] ?? [];
          acc[receipt.message_id] = [...arr, receipt];
          return acc;
        }, {});
        setReadReceipts((prev) => ({ ...newReceipts, ...prev }));
      }
    } else {
      setHasMore(false);
    }
  }, [chatId, hasMore, page, supabase]);

  // Refresh data
  const refresh = useCallback(async () => {
    setPage(0);
    setHasMore(true);
    await loadInitialData();
  }, [loadInitialData]);

  return {
    messages,
    participants,
    reactions,
    readReceipts,
    loading,
    error,
    isConnected,
    hasMore,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    loadMoreMessages,
    refresh,
  };
}
