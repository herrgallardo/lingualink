'use client';

import { isUserOnlineByLastSeen } from '@/lib/services/presence';
import { createContext, useContext, useEffect, useState } from 'react';
import { usePresence } from '../hooks/usePresence';

interface PresenceContextType {
  isUserOnline: (userId: string) => boolean;
  onlineCount: number;
  isConnected: boolean;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  // Delay initialization until after page load to avoid interruption errors
  useEffect(() => {
    let timer: NodeJS.Timeout;

    // Only start after the page is fully loaded and we're online
    if (typeof window !== 'undefined' && document.readyState === 'complete' && navigator.onLine) {
      timer = setTimeout(() => setIsReady(true), 2000);
    } else {
      const handleLoad = () => {
        if (navigator.onLine) {
          timer = setTimeout(() => setIsReady(true), 2000);
        }
      };

      window.addEventListener('load', handleLoad);
      return () => {
        window.removeEventListener('load', handleLoad);
        if (timer) clearTimeout(timer);
      };
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const presence = usePresence({
    channelName: 'global-presence',
    autoJoin: isReady, // Only auto-join when ready
  });

  // Handle window focus/blur to update presence
  useEffect(() => {
    if (!isReady) return;

    let reconnectTimeout: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      // Clear any pending reconnect
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      if (document.hidden) {
        // User switched to another tab/minimized window
        presence.leave().catch(() => {
          // Silently handle leave errors
        });
      } else if (navigator.onLine) {
        // User returned to the tab and is online - wait a bit before reconnecting
        reconnectTimeout = setTimeout(() => {
          presence.join().catch(() => {
            // Silently handle join errors
          });
        }, 1000);
      }
    };

    const handleOnlineStatus = () => {
      if (navigator.onLine && !document.hidden) {
        // Back online, try to reconnect
        reconnectTimeout = setTimeout(() => {
          presence.join().catch(() => {
            // Silently handle join errors
          });
        }, 1000);
      } else if (!navigator.onLine) {
        // Went offline, leave presence
        presence.leave().catch(() => {
          // Silently handle leave errors
        });
      }
    };

    const handleBeforeUnload = () => {
      // Clean up presence before page unload
      presence.leave().catch(() => {
        // Silently handle leave errors during unload
      });
    };

    // Only add listeners if document is defined (client-side)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('online', handleOnlineStatus);
      window.addEventListener('offline', handleOnlineStatus);
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('online', handleOnlineStatus);
        window.removeEventListener('offline', handleOnlineStatus);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, [presence, isReady]);

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
