'use client';

import { useSupabase } from '@/lib/hooks/useSupabase';
import type { Database } from '@/lib/types/database';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type {
  REALTIME_SUBSCRIBE_STATES,
  RealtimeChannel,
  SupabaseClient,
} from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

interface SubscriptionEvent {
  id: string;
  timestamp: Date;
  type:
    | 'subscribe'
    | 'unsubscribe'
    | 'error'
    | 'status'
    | 'presence'
    | 'broadcast'
    | 'postgres_changes';
  channelName: string;
  status?: string;
  error?: string;
  details?: unknown;
}

interface ChannelInfo {
  name: string;
  status: 'unsubscribed' | 'subscribing' | 'subscribed' | 'unsubscribing' | 'error';
  createdAt: Date;
  lastActivity: Date;
  eventCount: number;
  topic: string;
  presenceKey?: string | undefined;
}

interface ChannelOptions {
  config?: {
    presence?: {
      key?: string;
    };
  };
  [key: string]: unknown;
}

interface ExtendedSupabaseClient extends SupabaseClient<Database> {
  channel: (name: string, opts?: ChannelOptions) => RealtimeChannel;
  removeChannel: (channel: RealtimeChannel) => Promise<'ok' | 'timed out' | 'error'>;
  getChannels: () => RealtimeChannel[];
}

export function RealtimeDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState<SubscriptionEvent[]>([]);
  const [channels, setChannels] = useState<Map<string, ChannelInfo>>(new Map());
  const [filter, setFilter] = useState<string>('');
  const eventIdCounter = useRef(0);
  const supabase = useSupabase() as ExtendedSupabaseClient;

  useEffect(() => {
    // Check if debug mode is enabled
    const debugMode =
      typeof window !== 'undefined' && window.localStorage.getItem('lingualink_debug') === 'true';
    if (!debugMode) return;

    // Monkey patch the channel methods to track subscriptions
    const originalChannel = supabase.channel.bind(supabase);
    const originalRemoveChannel = supabase.removeChannel.bind(supabase);
    const originalGetChannels = supabase.getChannels.bind(supabase);

    // Track channel creation
    supabase.channel = function (name: string, opts?: ChannelOptions) {
      const event: SubscriptionEvent = {
        id: `event-${++eventIdCounter.current}`,
        timestamp: new Date(),
        type: 'subscribe',
        channelName: name,
        status: 'channel_created',
        details: opts,
      };

      setEvents((prev) => [...prev, event]);

      const channel = originalChannel(name, opts);

      // Track channel info
      setChannels((prev) => {
        const newChannels = new Map(prev);
        const channelInfo: ChannelInfo = {
          name,
          status: 'unsubscribed',
          createdAt: new Date(),
          lastActivity: new Date(),
          eventCount: 1,
          topic: channel.topic,
          presenceKey: opts?.config?.presence?.key,
        };
        newChannels.set(name, channelInfo);
        return newChannels;
      });

      // Monkey patch channel methods
      const originalSubscribe = channel.subscribe.bind(channel);
      const originalUnsubscribe = channel.unsubscribe.bind(channel);
      const originalOn = channel.on.bind(channel);

      channel.subscribe = function (
        callback?: (status: REALTIME_SUBSCRIBE_STATES, err?: Error) => void,
        timeout?: number,
      ) {
        const subscribeEvent: SubscriptionEvent = {
          id: `event-${++eventIdCounter.current}`,
          timestamp: new Date(),
          type: 'subscribe',
          channelName: name,
          status: 'subscribing',
        };
        setEvents((prev) => [...prev, subscribeEvent]);

        const wrappedCallback = (status: REALTIME_SUBSCRIBE_STATES, err?: Error) => {
          const statusEvent: SubscriptionEvent = {
            id: `event-${++eventIdCounter.current}`,
            timestamp: new Date(),
            type: 'status',
            channelName: name,
            status: status.toLowerCase(),
            ...(err && { error: err.message }),
          };
          setEvents((prev) => [...prev, statusEvent]);

          setChannels((prev) => {
            const newChannels = new Map(prev);
            const channelInfo = newChannels.get(name);
            if (channelInfo) {
              channelInfo.status = status.toLowerCase() as ChannelInfo['status'];
              channelInfo.lastActivity = new Date();
              channelInfo.eventCount++;
            }
            return newChannels;
          });

          callback?.(status, err);
        };

        try {
          return originalSubscribe(wrappedCallback, timeout);
        } catch (error) {
          const errorEvent: SubscriptionEvent = {
            id: `event-${++eventIdCounter.current}`,
            timestamp: new Date(),
            type: 'error',
            channelName: name,
            error: error instanceof Error ? error.message : String(error),
          };
          setEvents((prev) => [...prev, errorEvent]);
          throw error;
        }
      };

      channel.on = function (event: string, filter: unknown, callback?: unknown) {
        const onEvent: SubscriptionEvent = {
          id: `event-${++eventIdCounter.current}`,
          timestamp: new Date(),
          type: event.startsWith('postgres_changes')
            ? 'postgres_changes'
            : event === 'presence'
              ? 'presence'
              : 'broadcast',
          channelName: name,
          details: { event, filter: typeof filter === 'function' ? 'callback' : filter },
        };
        setEvents((prev) => [...prev, onEvent]);

        return originalOn(event as never, filter as never, callback as never);
      };

      channel.unsubscribe = function () {
        const unsubscribeEvent: SubscriptionEvent = {
          id: `event-${++eventIdCounter.current}`,
          timestamp: new Date(),
          type: 'unsubscribe',
          channelName: name,
        };
        setEvents((prev) => [...prev, unsubscribeEvent]);

        return originalUnsubscribe();
      };

      return channel;
    };

    // Track channel removal
    supabase.removeChannel = function (channel: RealtimeChannel) {
      const removeEvent: SubscriptionEvent = {
        id: `event-${++eventIdCounter.current}`,
        timestamp: new Date(),
        type: 'unsubscribe',
        channelName: channel.topic,
        status: 'removed',
      };
      setEvents((prev) => [...prev, removeEvent]);

      setChannels((prev) => {
        const newChannels = new Map(prev);
        newChannels.delete(channel.topic);
        return newChannels;
      });

      return originalRemoveChannel(channel);
    };

    // Restore original methods on cleanup
    return () => {
      supabase.channel = originalChannel;
      supabase.removeChannel = originalRemoveChannel;
      supabase.getChannels = originalGetChannels;
    };
  }, [supabase]);

  // Enable debug mode
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+Shift+D to toggle debug panel
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('lingualink_debug', (!isOpen).toString());
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredEvents = filter
    ? events.filter(
        (e) =>
          e.channelName.includes(filter) ||
          e.type.includes(filter) ||
          e.status?.includes(filter) ||
          e.error?.includes(filter),
      )
    : events;

  const activeChannels = Array.from(channels.values()).filter((c) => c.status === 'subscribed');
  const errorChannels = Array.from(channels.values()).filter((c) => c.status === 'error');

  const renderDetails = (details: unknown): ReactNode => {
    try {
      return <pre className="text-xs overflow-x-auto mt-1">{JSON.stringify(details, null, 2)}</pre>;
    } catch {
      return <div className="text-xs text-slate-500 mt-1">Unable to display details</div>;
    }
  };

  return (
    <div className="fixed bottom-0 right-0 w-96 h-96 bg-white dark:bg-slate-800 border-l border-t border-slate-200 dark:border-slate-700 shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-sm">Realtime Debug Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700/50 text-xs space-y-1">
        <div className="flex justify-between">
          <span>Total Channels:</span>
          <span className="font-mono">{channels.size}</span>
        </div>
        <div className="flex justify-between">
          <span>Active:</span>
          <span className="font-mono text-green-600">{activeChannels.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Errors:</span>
          <span className="font-mono text-red-600">{errorChannels.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Total Events:</span>
          <span className="font-mono">{events.length}</span>
        </div>
      </div>

      {/* Filter */}
      <div className="p-2">
        <input
          type="text"
          placeholder="Filter events..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded"
        />
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredEvents
          .slice(-100)
          .reverse()
          .map((event) => (
            <div
              key={event.id}
              className={`text-xs p-2 rounded border ${
                event.type === 'error'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : event.type === 'subscribe'
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    : event.type === 'unsubscribe'
                      ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                      : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-semibold">{event.type}</span>
                <span className="text-slate-500">{event.timestamp.toLocaleTimeString()}</span>
              </div>
              <div className="font-mono text-slate-600 dark:text-slate-400">
                {event.channelName}
              </div>
              {event.status && (
                <div className="text-slate-500 mt-1">
                  Status: <span className="font-semibold">{event.status}</span>
                </div>
              )}
              {event.error && (
                <div className="text-red-600 dark:text-red-400 mt-1">Error: {event.error}</div>
              )}
              {event.details ? (
                <details className="mt-1">
                  <summary className="cursor-pointer text-slate-500">Details</summary>
                  {renderDetails(event.details)}
                </details>
              ) : null}
            </div>
          ))}
      </div>

      {/* Active Channels */}
      <details className="border-t border-slate-200 dark:border-slate-700">
        <summary className="px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
          Active Channels ({activeChannels.length})
        </summary>
        <div className="max-h-32 overflow-y-auto p-2 space-y-1">
          {activeChannels.map((channel) => (
            <div
              key={channel.name}
              className="text-xs p-2 bg-green-50 dark:bg-green-900/20 rounded"
            >
              <div className="font-mono font-semibold">{channel.name}</div>
              <div className="text-slate-500">
                Created: {channel.createdAt.toLocaleTimeString()}
              </div>
              <div className="text-slate-500">Events: {channel.eventCount}</div>
              {channel.presenceKey && (
                <div className="text-slate-500">Presence: {channel.presenceKey}</div>
              )}
            </div>
          ))}
        </div>
      </details>

      {/* Footer */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-700 text-xs text-center text-slate-500">
        Press Ctrl+Shift+D to toggle
      </div>
    </div>
  );
}
