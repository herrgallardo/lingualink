'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { WifiIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
  className?: string;
}

export function ConnectionStatus({ isConnected, className = '' }: ConnectionStatusProps) {
  const { t } = useTranslation();
  const [showReconnecting, setShowReconnecting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (!isConnected) {
      // Show reconnecting message after 2 seconds of disconnection
      timer = setTimeout(() => {
        setShowReconnecting(true);
      }, 2000);
    } else {
      setShowReconnecting(false);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isConnected]);

  if (isConnected && !showReconnecting) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <WifiIcon
        className={`w-4 h-4 ${isConnected ? 'text-green-500' : 'text-amber-500 animate-pulse'}`}
      />
      <span
        className={`${
          isConnected ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
        }`}
      >
        {isConnected ? t('connection.connected') : t('connection.reconnecting')}
      </span>
    </div>
  );
}
