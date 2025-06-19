'use client';

import { isUserOnlineByLastSeen } from '@/lib/services/presence';
import { createContext, useContext, useEffect } from 'react';
import { usePresence } from '../hooks/usePresence';

interface PresenceContextType {
  isUserOnline: (userId: string) => boolean;
  onlineCount: number;
  isConnected: boolean;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const presence = usePresence({
    channelName: 'global-presence',
    autoJoin: true,
  });

  // Handle window focus/blur to update presence
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched to another tab/minimized window
        presence.leave();
      } else {
        // User returned to the tab
        presence.join();
      }
    };

    const handleBeforeUnload = () => {
      // Clean up presence before page unload
      presence.leave();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [presence]);

  // Enhanced isUserOnline that checks both real-time presence and last_seen
  const isUserOnline = (userId: string): boolean => {
    // First check real-time presence
    if (presence.isUserOnline(userId)) {
      return true;
    }

    // Fallback to checking last_seen timestamp
    const user = presence.onlineUsers.find((u) => u.id === userId);
    if (user?.last_seen) {
      return isUserOnlineByLastSeen(user.last_seen);
    }

    return false;
  };

  return (
    <PresenceContext.Provider
      value={{
        isUserOnline,
        onlineCount: presence.onlineCount,
        isConnected: presence.isConnected,
      }}
    >
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresenceContext() {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error('usePresenceContext must be used within a PresenceProvider');
  }
  return context;
}
