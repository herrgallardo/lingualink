/**
 * Hook for real-time chat functionality with enhanced debugging
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

// Type for RPC get_chat_participants response
interface RPCParticipant {
  user_id: string;
  username: string;
  avatar_url: string | null;
  preferred_language: string;
  status: Database['public']['Enums']['user_status'];
  is_typing: boolean;
  last_seen: string;
}

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
  const soundManager = useRef(getSoundManager());
  const notificationServiceRef = useRef(getNotificationService(supabase));
  const participantsRef = useRef<UserRow[]>([]);
  const mountedRef = useRef(true);
  const initializingRef = useRef(false);

  // Update participants ref when participants change
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  // Load initial data with enhanced debugging
  const loadInitialData = useCallback(async () => {
    if (!user || !chatId) {
      console.log('loadInitialData: Missing user or chatId', { user, chatId });
      return;
    }

    console.log('🔄 Loading initial data for chat:', chatId, 'user:', user.id);

    try {
      // First, verify the chat exists and user is a participant
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single();

      if (chatError) {
        console.error('❌ Failed to load chat:', chatError);
        throw chatError;
      }

      console.log('✅ Chat data:', chatData);

      // Check if user is a participant
      if (!chatData.participants.includes(user.id)) {
        console.error('❌ User is not a participant in this chat!');
        throw new Error('You are not a participant in this chat');
      }

      // Load participants using RPC
      const { data: participantData, error: participantError } = await supabase.rpc(
        'get_chat_participants',
        { p_chat_id: chatId },
      );

      if (participantError) {
        console.error('❌ Failed to load participants:', participantError);
        // Fallback: try direct query
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('users')
          .select('*')
          .in('id', chatData.participants);

        if (fallbackError) {
          console.error('❌ Fallback participant load failed:', fallbackError);
          throw participantError;
        }

        console.log('✅ Loaded participants via fallback:', fallbackData);
        setParticipants(fallbackData || []);
        participantsRef.current = fallbackData || [];
      } else {
        console.log('✅ Loaded participants via RPC:', participantData);

        // Map the RPC response to match UserRow structure
        const mappedParticipants: UserRow[] = (participantData || []).map((p: RPCParticipant) => ({
          id: p.user_id, // Map user_id to id
          email: '', // RPC doesn't return email, set empty
          username: p.username,
          avatar_url: p.avatar_url,
          preferred_language: p.preferred_language,
          status: p.status,
          is_typing: p.is_typing,
          last_seen: p.last_seen,
          preferences: {}, // RPC doesn't return preferences
          created_at: '', // RPC doesn't return created_at
          updated_at: '', // RPC doesn't return updated_at
        }));

        setParticipants(mappedParticipants);
        participantsRef.current = mappedParticipants;
      }

      // Load messages with detailed logging
      console.log('🔄 Loading messages...');
      const {
        data: messageData,
        error: messageError,
        count,
      } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('chat_id', chatId)
        .order('timestamp', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (messageError) {
        console.error('❌ Failed to load messages:', messageError);
        throw messageError;
      }

      console.log(`✅ Loaded ${messageData?.length || 0} messages (total: ${count}):`, messageData);

      const sortedMessages = (messageData ?? []).reverse();
      setMessages(sortedMessages);
      setHasMore((messageData?.length ?? 0) === MESSAGES_PER_PAGE);

      // Load reactions and read receipts
      if (sortedMessages.length > 0) {
        const messageIds = sortedMessages.map((m) => m.id);

        const { data: reactionData, error: reactionError } = await supabase
          .from('message_reactions')
          .select('*')
          .in('message_id', messageIds);

        if (reactionError) {
          console.error('⚠️ Failed to load reactions:', reactionError);
        } else if (reactionData) {
          console.log('✅ Loaded reactions:', reactionData);
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

        const { data: receiptData, error: receiptError } = await supabase
          .from('read_receipts')
          .select('*')
          .in('message_id', messageIds);

        if (receiptError) {
          console.error('⚠️ Failed to load read receipts:', receiptError);
        } else if (receiptData) {
          console.log('✅ Loaded read receipts:', receiptData);
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

      console.log('✅ Initial data load complete');
    } catch (err) {
      console.error('❌ loadInitialData error:', err);
      setError(err instanceof Error ? err : new Error('Failed to load chat data'));
    }
  }, [user, chatId, supabase]);

  // Initialize everything
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Initialize notification service
  useEffect(() => {
    if (!user) return;
    notificationServiceRef.current.initialize(user.id);
  }, [user]);

  // Create realtime service
  useEffect(() => {
    if (!serviceRef.current) {
      serviceRef.current = new RealtimeMessagesService(supabase);
    }

    return () => {
      if (serviceRef.current && mountedRef.current === false) {
        const service = serviceRef.current;
        serviceRef.current = null;
        service.cleanup();
      }
    };
  }, [supabase]);

  // Main initialization effect
  useEffect(() => {
    if (!user || !chatId || !serviceRef.current || initializingRef.current) return;

    let cancelled = false;
    initializingRef.current = true;

    const initializeChat = async () => {
      console.log('🚀 Initializing chat:', chatId);
      setLoading(true);
      setError(null);

      try {
        // First load the data
        await loadInitialData();

        if (cancelled) return;

        // Get the service reference
        const service = serviceRef.current;
        if (!service) {
          throw new Error('Realtime service not initialized');
        }

        // Then subscribe to realtime updates
        console.log('🔄 Subscribing to realtime updates...');
        await service.subscribe(chatId, {
          onNewMessage: (message) => {
            if (cancelled) return;
            console.log('📨 New message received:', message);

            setMessages((prev) => {
              const exists = prev.some((m) => m.id === message.id);
              if (exists) {
                return prev.map((m) => (m.id === message.id ? message : m));
              }
              return [...prev, message];
            });

            if (
              playMessageSound &&
              message.sender_id !== user.id &&
              soundManager.current.isEnabled()
            ) {
              soundManager.current.play('message');
            }

            onNewMessage?.(message);

            if (message.sender_id !== user.id) {
              const sender = participantsRef.current.find((p) => p.id === message.sender_id);
              if (sender) {
                notificationServiceRef.current.createNotification({
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
            if (cancelled) return;
            console.log('✏️ Message updated:', message);
            setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
          },
          onMessageDeleted: (messageId) => {
            if (cancelled) return;
            console.log('🗑️ Message deleted:', messageId);
            setMessages((prev) => prev.filter((m) => m.id !== messageId));
          },
          onReactionAdded: (reaction) => {
            if (cancelled) return;
            console.log('😀 Reaction added:', reaction);
            setReactions((prev) => {
              const existing = prev[reaction.message_id] ?? [];
              return {
                ...prev,
                [reaction.message_id]: [...existing, reaction],
              };
            });
          },
          onReactionRemoved: (reaction) => {
            if (cancelled) return;
            console.log('😢 Reaction removed:', reaction);
            setReactions((prev) => {
              const existing = prev[reaction.message_id] ?? [];
              return {
                ...prev,
                [reaction.message_id]: existing.filter((r) => r.id !== reaction.id),
              };
            });
          },
          onReadReceipt: (receipt) => {
            if (cancelled) return;
            console.log('👁️ Read receipt:', receipt);
            setReadReceipts((prev) => {
              const existing = prev[receipt.message_id] ?? [];
              return {
                ...prev,
                [receipt.message_id]: [...existing, receipt],
              };
            });
          },
          onConnectionChange: (connected) => {
            if (cancelled) return;
            console.log(connected ? '✅ Connected to realtime' : '❌ Disconnected from realtime');
            setIsConnected(connected);
          },
        });

        if (!cancelled) {
          setIsConnected(true);
          console.log('✅ Chat initialization complete');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('❌ Failed to initialize chat:', err);
          setError(err instanceof Error ? err : new Error('Failed to connect to chat'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          initializingRef.current = false;
        }
      }
    };

    initializeChat();

    return () => {
      cancelled = true;
      initializingRef.current = false;
    };
  }, [user, chatId, loadInitialData, onNewMessage, playMessageSound]);

  // Send message with enhanced logging
  const sendMessage = useCallback(
    async (text: string, replyTo?: string) => {
      if (!user || !chatId) {
        console.error('❌ Cannot send message: missing user or chatId');
        throw new Error('Chat not initialized');
      }

      console.log('📤 Sending message:', { text, chatId, userId: user.id });

      const messageData = {
        chat_id: chatId,
        sender_id: user.id,
        original_text: text,
        original_language: 'en',
        reply_to: replyTo ?? null,
        timestamp: new Date().toISOString(),
      };

      try {
        // Direct insert to test
        const { data, error } = await supabase
          .from('messages')
          .insert(messageData)
          .select()
          .single();

        if (error) {
          console.error('❌ Failed to send message:', error);
          throw error;
        }

        console.log('✅ Message sent successfully:', data);

        // If we're not getting realtime updates, manually add the message
        if (!serviceRef.current) {
          setMessages((prev) => [...prev, data]);
        }
      } catch (error) {
        console.error('❌ Send message error:', error);
        throw error;
      }
    },
    [user, chatId, supabase],
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
    console.log('🔄 Refreshing chat data...');
    setPage(0);
    setHasMore(true);
    await loadInitialData();
  }, [loadInitialData]);

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
        await supabase
          .from('read_receipts')
          .insert({
            message_id: message.id,
            user_id: user.id,
          })
          .select();
      }
    };

    markAsRead();
  }, [messages, user, readReceipts, supabase]);

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
