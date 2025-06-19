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
    // Only start after the page is fully loaded
    if (typeof window !== 'undefined' && document.readyState === 'complete') {
      const timer = setTimeout(() => setIsReady(true), 1000);
      return () => clearTimeout(timer);
    } else {
      const handleLoad = () => {
        const timer = setTimeout(() => setIsReady(true), 1000);
        return () => clearTimeout(timer);
      };

      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
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
      } else {
        // User returned to the tab - wait a bit before reconnecting
        reconnectTimeout = setTimeout(() => {
          presence.join().catch(() => {
            // Silently handle join errors
          });
        }, 500);
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
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
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
