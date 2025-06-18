'use client';

import { useAuth } from '@/lib/context/auth-context';
import { useProfile } from '@/lib/hooks/useSupabase';
import { getLanguageName } from '@/lib/utils/languages';
import {
  ArrowRightStartOnRectangleIcon,
  Cog6ToothIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function ChatPage() {
  const { signOut } = useAuth();
  const { profile, loading } = useProfile();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'busy':
        return 'bg-amber-500';
      case 'do-not-disturb':
        return 'bg-red-500';
      case 'invisible':
        return 'bg-slate-500';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-cyan-600">LinguaLink Chat</h1>
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
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-midnight-900 dark:text-slate-100 flex items-center gap-2">
                Welcome, {profile?.username}!
                <span
                  className={`w-3 h-3 rounded-full ${getStatusColor(profile?.status || 'available')}`}
                />
              </h2>
              <p className="text-teal-700 dark:text-teal-400 mt-1">
                Ready to chat in {getLanguageName(profile?.preferred_language || 'en')}
              </p>
            </div>
          </div>

          <p className="text-teal-700 dark:text-teal-400 mb-4">
            This is the chat page. We&#39;ll build the full chat interface in the upcoming steps.
          </p>

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
              <p className="text-sm text-midnight-900 dark:text-slate-100 capitalize">
                {profile?.status.replace('-', ' ')}
              </p>
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
