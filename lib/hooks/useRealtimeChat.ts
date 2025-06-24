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
  const notificationService = getNotificationService(supabase);
  const participantsRef = useRef<UserRow[]>([]);
  const hasInitializedRef = useRef(false);

  // Update participants ref when participants change
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  // Initialize realtime service
  useEffect(() => {
    if (!user || !chatId) return;

    const service = new RealtimeMessagesService(supabase);
    serviceRef.current = service;

    // Initialize notification service
    notificationService.initialize(user.id);

    return () => {
      service.cleanup();
      hasInitializedRef.current = false;
    };
  }, [user, chatId, supabase, notificationService]);

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
      setParticipants(participantData || []);
      participantsRef.current = participantData || [];

      // Load messages
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('timestamp', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (messageError) throw messageError;

      const sortedMessages = (messageData || []).reverse();
      setMessages(sortedMessages);
      setHasMore((messageData?.length || 0) === MESSAGES_PER_PAGE);

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
              if (!acc[reaction.message_id]) {
                acc[reaction.message_id] = [];
              }
              acc[reaction.message_id]?.push(reaction);
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
              if (!acc[receipt.message_id]) {
                acc[receipt.message_id] = [];
              }
              acc[receipt.message_id]?.push(receipt);
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

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user || !chatId || !serviceRef.current || hasInitializedRef.current) return;

    hasInitializedRef.current = true;

    const subscribe = async () => {
      await serviceRef.current?.subscribe(chatId, {
        onNewMessage: (message) => {
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
          if (playMessageSound && message.sender_id !== user.id && soundManager.isEnabled()) {
            soundManager.play('message');
          }

          // Call custom handler
          onNewMessage?.(message);

          // Create notification for messages from others
          if (message.sender_id !== user.id) {
            const sender = participantsRef.current.find((p) => p.id === message.sender_id);
            if (sender) {
              notificationService.createNotification({
                userId: user.id,
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
          setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
        },
        onMessageDeleted: (messageId) => {
          setMessages((prev) => prev.filter((m) => m.id !== messageId));
        },
        onReactionAdded: (reaction) => {
          setReactions((prev) => ({
            ...prev,
            [reaction.message_id]: [...(prev[reaction.message_id] || []), reaction],
          }));
        },
        onReactionRemoved: (reaction) => {
          setReactions((prev) => ({
            ...prev,
            [reaction.message_id]: (prev[reaction.message_id] || []).filter(
              (r) => r.id !== reaction.id,
            ),
          }));
        },
        onReadReceipt: (receipt) => {
          setReadReceipts((prev) => ({
            ...prev,
            [receipt.message_id]: [...(prev[receipt.message_id] || []), receipt],
          }));
        },
        onConnectionChange: setIsConnected,
      });

      // Load initial data after subscribing
      await loadInitialData();
    };

    subscribe();
  }, [
    user,
    chatId,
    loadInitialData,
    onNewMessage,
    playMessageSound,
    soundManager,
    notificationService,
  ]);

  // Send message
  const sendMessage = useCallback(
    async (text: string, replyTo?: string) => {
      if (!user || !chatId || !serviceRef.current) return;

      const messageData = {
        chat_id: chatId,
        sender_id: user.id,
        original_text: text,
        original_language: 'en', // This should be detected or user-specified
        reply_to: replyTo,
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
        .eq('sender_id', user?.id);

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
        .eq('sender_id', user?.id);

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
          if (!acc[reaction.message_id]) {
            acc[reaction.message_id] = [];
          }
          acc[reaction.message_id]?.push(reaction);
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
          if (!acc[receipt.message_id]) {
            acc[receipt.message_id] = [];
          }
          acc[receipt.message_id]?.push(receipt);
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
    hasInitializedRef.current = false;
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
