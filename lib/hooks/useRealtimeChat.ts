import { useAuth } from '@/lib/context/auth-context';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { getNotificationService } from '@/lib/services/notification';
import { getSoundManager } from '@/lib/services/sound-manager';
import type { Database } from '@/lib/types/database';
import { useCallback, useEffect, useRef, useState } from 'react';

type Tables = Database['public']['Tables'];
type MessageRow = Tables['messages']['Row'];
type UserRow = Tables['users']['Row'];
type ReactionRow = Tables['message_reactions']['Row'];
type ReadReceiptRow = Tables['read_receipts']['Row'];

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

  const soundManager = useRef(getSoundManager());
  const notificationServiceRef = useRef(getNotificationService(supabase));
  const participantsRef = useRef<UserRow[]>([]);
  const mountedRef = useRef(true);
  const channelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  const loadInitialData = useCallback(async () => {
    if (!user || !chatId) {
      console.log('loadInitialData: Missing user or chatId', { user, chatId });
      return;
    }

    console.log('🔄 Loading initial data for chat:', chatId, 'user:', user.id);

    try {
      // Verify chat exists and user is participant
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

      if (!chatData.participants.includes(user.id)) {
        console.error('❌ User is not a participant in this chat!');
        throw new Error('You are not a participant in this chat');
      }

      // Load participants with fallback
      let participantData: UserRow[] = [];

      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_chat_participants', {
          p_chat_id: chatId,
        });

        if (rpcError) {
          console.error('❌ RPC failed:', rpcError);
          throw rpcError;
        }

        participantData = (rpcData || []).map((p: RPCParticipant) => ({
          id: p.user_id,
          email: '',
          username: p.username,
          avatar_url: p.avatar_url,
          preferred_language: p.preferred_language,
          status: p.status,
          is_typing: p.is_typing,
          last_seen: p.last_seen,
          preferences: {},
          created_at: '',
          updated_at: '',
        }));
      } catch (rpcError) {
        console.log('Using fallback for participants...');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('users')
          .select('*')
          .in('id', chatData.participants);

        if (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError);
          throw fallbackError;
        }

        participantData = fallbackData || [];
      }

      console.log('✅ Loaded participants:', participantData);
      setParticipants(participantData);
      participantsRef.current = participantData;

      // Load messages
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

      console.log(`✅ Loaded ${messageData?.length || 0} messages (total: ${count})`);

      const sortedMessages = (messageData ?? []).reverse();
      setMessages(sortedMessages);
      setHasMore((messageData?.length ?? 0) === MESSAGES_PER_PAGE);

      // Load reactions and read receipts
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

      console.log('✅ Initial data load complete');
    } catch (err) {
      console.error('❌ loadInitialData error:', err);
      setError(err instanceof Error ? err : new Error('Failed to load chat data'));
    }
  }, [user, chatId, supabase]);

  const setupRealtimeSubscription = useCallback(async () => {
    if (!user || !chatId || !mountedRef.current) return;

    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    try {
      console.log('🔄 Setting up realtime subscription...');

      const channel = supabase
        .channel(`chat:${chatId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`,
          },
          (payload) => {
            if (!mountedRef.current) return;

            const newMessage = payload.new as MessageRow;
            console.log('📨 New message received:', newMessage);

            setMessages((prev) => {
              const exists = prev.some((m) => m.id === newMessage.id);
              if (exists) return prev;
              return [...prev, newMessage];
            });

            if (newMessage.sender_id !== user.id) {
              if (playMessageSound && soundManager.current.isEnabled()) {
                soundManager.current.play('message');
              }

              const sender = participantsRef.current.find((p) => p.id === newMessage.sender_id);
              if (sender) {
                notificationServiceRef.current.createNotification({
                  userId: user.id,
                  title: sender.username,
                  body: newMessage.original_text,
                  type: 'message',
                  data: {
                    chatId,
                    messageId: newMessage.id,
                    senderId: sender.id,
                  },
                });
              }
            }

            onNewMessage?.(newMessage);
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`,
          },
          (payload) => {
            if (!mountedRef.current) return;

            const updatedMessage = payload.new as MessageRow;
            console.log('✏️ Message updated:', updatedMessage);

            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m)),
            );
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'message_reactions',
          },
          async (payload) => {
            const reaction = payload.new as ReactionRow;
            const { data: message } = await supabase
              .from('messages')
              .select('chat_id')
              .eq('id', reaction.message_id)
              .single();

            if (message?.chat_id === chatId) {
              setReactions((prev) => {
                const arr = prev[reaction.message_id] ?? [];
                return { ...prev, [reaction.message_id]: [...arr, reaction] };
              });
            }
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'read_receipts',
          },
          async (payload) => {
            const receipt = payload.new as ReadReceiptRow;
            const { data: message } = await supabase
              .from('messages')
              .select('chat_id')
              .eq('id', receipt.message_id)
              .single();

            if (message?.chat_id === chatId) {
              setReadReceipts((prev) => {
                const arr = prev[receipt.message_id] ?? [];
                return { ...prev, [receipt.message_id]: [...arr, receipt] };
              });
            }
          },
        )
        .subscribe((status) => {
          console.log(`Channel status: ${status}`);

          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = null;
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsConnected(false);

            if (!reconnectTimeoutRef.current && mountedRef.current) {
              reconnectTimeoutRef.current = setTimeout(() => {
                if (mountedRef.current) {
                  console.log('Attempting to reconnect...');
                  setupRealtimeSubscription();
                }
              }, 5000);
            }
          }
        });

      channelRef.current = channel;
      console.log('✅ Realtime subscription setup complete');
    } catch (err) {
      console.error('❌ Failed to setup realtime subscription:', err);
      setIsConnected(false);
    }
  }, [user, chatId, supabase, onNewMessage, playMessageSound]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    notificationServiceRef.current.initialize(user.id);
  }, [user]);

  useEffect(() => {
    if (!user || !chatId) return;

    let cancelled = false;

    const initializeChat = async () => {
      console.log('🚀 Initializing chat:', chatId);
      setLoading(true);
      setError(null);

      try {
        await loadInitialData();

        if (!cancelled) {
          await setupRealtimeSubscription();
        }
      } catch (err) {
        if (!cancelled) {
          console.error('❌ Failed to initialize chat:', err);
          setError(err instanceof Error ? err : new Error('Failed to connect to chat'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initializeChat();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, chatId, loadInitialData, setupRealtimeSubscription, supabase]);

  const sendMessage = useCallback(
    async (text: string, replyTo?: string) => {
      if (!user || !chatId) {
        console.error('❌ Cannot send message: missing user or chatId');
        throw new Error('Chat not initialized');
      }

      console.log('📤 Sending message:', { text, chatId, userId: user.id });

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date().toISOString();

      const optimisticMessage: MessageRow = {
        id: tempId,
        chat_id: chatId,
        sender_id: user.id,
        original_text: text,
        original_language: 'en',
        translations: {},
        timestamp,
        created_at: timestamp,
        edited_at: null,
        deleted_at: null,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            chat_id: chatId,
            sender_id: user.id,
            original_text: text,
            original_language: 'en',
            ...(replyTo && { reply_to: replyTo }),
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Failed to send message:', error);
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          throw error;
        }

        console.log('✅ Message sent successfully:', data);
        setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
      } catch (error) {
        console.error('❌ Send message error:', error);
        throw error;
      }
    },
    [user, chatId, supabase],
  );

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
    } else {
      setHasMore(false);
    }
  }, [chatId, hasMore, page, supabase]);

  const refresh = useCallback(async () => {
    console.log('🔄 Refreshing chat data...');
    setPage(0);
    setHasMore(true);
    setMessages([]);
    setReactions({});
    setReadReceipts({});
    await loadInitialData();
    await setupRealtimeSubscription();
  }, [loadInitialData, setupRealtimeSubscription]);

  useEffect(() => {
    if (!user || messages.length === 0) return;

    const unreadMessages = messages.filter(
      (msg) =>
        msg.sender_id !== user.id && !readReceipts[msg.id]?.some((r) => r.user_id === user.id),
    );

    if (unreadMessages.length === 0) return;

    const markAsRead = async () => {
      for (const message of unreadMessages) {
        try {
          await supabase
            .from('read_receipts')
            .insert({
              message_id: message.id,
              user_id: user.id,
            })
            .select();
        } catch (error) {
          if (error && typeof error === 'object' && 'code' in error && error.code !== '23505') {
            console.error('Failed to mark message as read:', error);
          }
        }
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
