'use client';

import {
  LastSeenText,
  OnlineStatusBadge,
  OnlineStatusIndicator,
} from '@/components/presence/OnlineStatus';
import { useAuth } from '@/lib/context/auth-context';
import { usePreferencesContext } from '@/lib/context/preferences-context';
import { usePresenceContext } from '@/lib/context/presence-context';
import { useMessageSound } from '@/lib/hooks/useSounds';
import { useProfile } from '@/lib/hooks/useSupabase';
import { getLanguageName } from '@/lib/utils/languages';
import {
  ArrowRightStartOnRectangleIcon,
  BellIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function ChatPage() {
  const { signOut } = useAuth();
  const { profile, loading } = useProfile();
  const { onlineCount, isConnected } = usePresenceContext();
  const { preferences } = usePreferencesContext();
  const playMessageSound = useMessageSound();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-teal-700 dark:text-teal-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-cyan-600">LinguaLink Chat</h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 text-sm text-teal-700 dark:text-teal-400">
                <UsersIcon className="w-4 h-4" />
                <span>{onlineCount} users online</span>
              </div>
              {isConnected && (
                <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                  <OnlineStatusIndicator size="small" status="available" />
                  <span>Connected</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/profile')}
              className="flex items-center gap-2 px-4 py-2 text-teal-700 dark:text-teal-400 hover:text-cyan-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
              aria-label="Profile settings"
            >
              <Cog6ToothIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 text-teal-700 dark:text-teal-400 hover:text-cyan-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
            >
              <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="relative">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-cyan-500">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={`${profile.username} avatar`}
                    width={64}
                    height={64}
                    className="object-cover"
                    priority
                  />
                ) : (
                  <UserCircleIcon className="w-full h-full text-slate-400" />
                )}
              </div>
              <div className="absolute bottom-0 right-0">
                {profile && (
                  <OnlineStatusIndicator
                    userId={profile.id}
                    status={profile.status || 'available'}
                    {...(profile.last_seen !== undefined && { lastSeen: profile.last_seen })}
                    size="large"
                    className="ring-2 ring-white dark:ring-slate-800"
                  />
                )}
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-midnight-900 dark:text-slate-100 flex items-center gap-2">
                Welcome, {profile?.username}!
              </h2>
              <p className="text-teal-700 dark:text-teal-400 mt-1">
                Ready to chat in {getLanguageName(profile?.preferred_language || 'en')}
              </p>
              <LastSeenText lastSeen={profile?.last_seen || null} className="mt-1" />
            </div>
          </div>

          <p className="text-teal-700 dark:text-teal-400 mb-4">
            This is the chat page. We&#39;ll build the full chat interface in the upcoming steps.
          </p>

          {/* Preferences Demo */}
          <div className="mb-6 p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
            <h3 className="text-sm font-semibold text-cyan-700 dark:text-cyan-300 mb-3">
              Preferences Demo
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={playMessageSound}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 text-cyan-600 border border-cyan-200 dark:border-cyan-800 rounded-md hover:bg-cyan-50 dark:hover:bg-cyan-900/30 transition-colors text-sm"
              >
                <BellIcon className="w-4 h-4" />
                Test Sound
              </button>
              <div className="px-3 py-1.5 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 border border-slate-200 dark:border-slate-700 rounded-md text-sm">
                View: {preferences.compactView ? 'Compact' : 'Comfortable'}
              </div>
              <div className="px-3 py-1.5 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 border border-slate-200 dark:border-slate-700 rounded-md text-sm">
                Theme: {preferences.theme}
              </div>
              <div className="px-3 py-1.5 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 border border-slate-200 dark:border-slate-700 rounded-md text-sm">
                Font: {preferences.fontSize}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Go to Profile Settings to change preferences
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div>
              <p className="text-xs text-slate-500 mb-1">Email</p>
              <p className="text-sm text-midnight-900 dark:text-slate-100">{profile?.email}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Preferred Language</p>
              <p className="text-sm text-midnight-900 dark:text-slate-100">
                {getLanguageName(profile?.preferred_language || 'en')}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Status</p>
              {profile && (
                <OnlineStatusBadge
                  userId={profile.id}
                  {...(profile.status !== undefined && { status: profile.status })}
                  {...(profile.last_seen !== undefined && { lastSeen: profile.last_seen })}
                />
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Last Seen</p>
              <p className="text-sm text-midnight-900 dark:text-slate-100">
                {profile?.last_seen ? new Date(profile.last_seen).toLocaleString() : 'Now'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
