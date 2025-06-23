'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { useParams } from 'next/navigation';

export default function ChatConversationPage() {
  const params = useParams();
  const chatId = params.id as string;
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4">
        <div className="text-center py-12">
          <p className="text-slate-500">{t('chat.selectChat')}</p>
          <p className="text-sm text-slate-400 mt-2">Chat ID: {chatId}</p>
        </div>
      </div>
    </div>
  );
}
