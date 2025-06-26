'use client';

import { ConnectionStatus } from '@/components/chat/ConnectionStatus';
import { MessageInput } from '@/components/chat/MessageInput';
import { MessageList } from '@/components/chat/MessageList';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/lib/context/auth-context';
import { useTypingIndicator } from '@/lib/hooks/usePresence';
import { useRealtimeChat } from '@/lib/hooks/useRealtimeChat';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Database } from '@/lib/types/database';
import { getLanguageName } from '@/lib/utils/languages';
import { ArrowLeftIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

export default function ChatConversationPage() {
  const params = useParams();
  const rawChatId = params.id;
  const chatId = typeof rawChatId === 'string' ? rawChatId : (rawChatId?.[0] ?? '');
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [replyTo, setReplyTo] = useState<Database['public']['Tables']['messages']['Row'] | null>(
    null,
  );
  const [showInfo, setShowInfo] = useState(false);

  const {
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
  } = useRealtimeChat({
    chatId,
    playMessageSound: true,
  });

  const { typingUsers } = useTypingIndicator(chatId);

  // Get other participants
  const otherParticipants = participants.filter((p) => p.id !== user?.id);
  const chatTitle = otherParticipants.map((p) => p.username).join(', ') || t('chat.title');

  // Handle message editing with proper async handling
  const handleEditMessage = useCallback(
    async (messageId: string, newText: string) => {
      try {
        await editMessage(messageId, newText);
      } catch (error) {
        console.error('Failed to edit message:', error);
      }
    },
    [editMessage],
  );

  // Handle message deletion with confirmation
  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (window.confirm(t('chat.confirmDelete'))) {
        try {
          await deleteMessage(messageId);
        } catch (error) {
          console.error('Failed to delete message:', error);
        }
      }
    },
    [deleteMessage, t],
  );

  if (loading) {
    return <LoadingPage message={t('chat.loadingChat')} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="text-center">
          <InformationCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-midnight-900 dark:text-slate-100 mb-2">
            {t('errors.loadingError')}
          </h2>
          <p className="text-teal-700 dark:text-teal-400 mb-4">{(error as Error).message}</p>
          <button
            onClick={() => router.push('/chat')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            {t('chat.backToChats')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors lg:hidden"
              aria-label={t('common.back')}
            >
              <ArrowLeftIcon className="w-5 h-5 text-cyan-600" />
            </Link>

            <div>
              <h1 className="text-lg font-semibold text-midnight-900 dark:text-slate-100">
                {chatTitle}
              </h1>
              <ConnectionStatus isConnected={isConnected} />
            </div>
          </div>

          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label={t('chat.chatInfo')}
          >
            <InformationCircleIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <MessageList
        chatId={chatId}
        messages={messages}
        participants={participants}
        reactions={reactions}
        readReceipts={readReceipts}
        typingUsers={typingUsers}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onReplyMessage={setReplyTo}
        onReaction={addReaction}
        onLoadMore={loadMoreMessages}
        hasMore={hasMore}
      />

      {/* Message input */}
      <MessageInput
        chatId={chatId}
        onSendMessage={(text) => sendMessage(text, replyTo?.id)}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        disabled={!isConnected}
      />

      {/* Chat info sidebar (mobile overlay or desktop sidebar) */}
      {showInfo && (
        <div className="fixed inset-0 z-50 lg:relative lg:inset-auto lg:w-80 lg:border-l lg:border-slate-200 dark:lg:border-slate-700">
          <div className="h-full bg-white dark:bg-slate-900 lg:bg-transparent p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6 lg:hidden">
              <h2 className="text-lg font-semibold text-midnight-900 dark:text-slate-100">
                {t('chat.chatInfo')}
              </h2>
              <button
                onClick={() => setShowInfo(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                aria-label={t('common.close')}
              >
                <XMarkIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            {/* Participants */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-midnight-900 dark:text-slate-100">
                {t('chat.participants')}
              </h3>
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                    {participant.avatar_url ? (
                      <Image
                        src={participant.avatar_url}
                        alt={participant.username}
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    ) : (
                      <UserCircleIcon className="w-full h-full text-slate-400 p-1" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-midnight-900 dark:text-slate-100">
                      {participant.username}
                    </p>
                    <p className="text-xs text-slate-500">
                      {getLanguageName(participant.preferred_language)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Debug Panel - Only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-20 right-4 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg max-w-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold mb-2 text-midnight-900 dark:text-slate-100">🐛 Debug Info</h3>
          <div className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
            <p>
              <strong>Chat ID:</strong> {chatId}
            </p>
            <p>
              <strong>User ID:</strong> {user?.id}
            </p>
            <p>
              <strong>Connected:</strong> {isConnected ? '✅' : '❌'}
            </p>
            <p>
              <strong>Messages:</strong> {messages.length}
            </p>
            <p>
              <strong>Participants:</strong> {participants.length}
            </p>
            <p>
              <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
            </p>
            <p>
              <strong>Error:</strong> {error ? (error as Error).message : 'None'}
            </p>
          </div>
          <div className="mt-3 space-y-2">
            <button
              onClick={() => {
                console.log('📊 Current state:', {
                  messages,
                  participants,
                  reactions,
                  readReceipts,
                  chatId,
                  userId: user?.id,
                  error: error ? (error as Error).message : null,
                });
              }}
              className="w-full px-2 py-1 bg-cyan-500 text-white rounded text-xs hover:bg-cyan-600"
            >
              Log State to Console
            </button>
            <button
              onClick={refresh}
              className="w-full px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
            >
              Refresh Data
            </button>
            <button
              onClick={async () => {
                try {
                  await sendMessage('Test message ' + new Date().toISOString());
                } catch (error) {
                  console.error('Test message failed:', error);
                }
              }}
              className="w-full px-2 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600"
            >
              Send Test Message
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
