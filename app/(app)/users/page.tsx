'use client';

import { OnlineStatusBadge } from '@/components/presence/OnlineStatus';
import { UserListSkeleton } from '@/components/ui/Skeleton';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Database } from '@/lib/types/database';
import { getLanguageName } from '@/lib/utils/languages';
import { MagnifyingGlassIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type User = Database['public']['Tables']['users']['Row'];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'online'>('all');
  const supabase = useSupabase();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('username', { ascending: true });

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [supabase]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());

    if (filter === 'online') {
      const isOnline = user.last_seen
        ? new Date().getTime() - new Date(user.last_seen).getTime() < 5 * 60 * 1000
        : false;
      return matchesSearch && isOnline;
    }

    return matchesSearch;
  });

  const startChat = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('create_or_get_direct_chat', {
        other_user_id: userId,
      });

      if (error) throw error;
      router.push(`/chat/${data}`);
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-cyan-600 mb-2">{t('users.browseUsers')}</h1>
        <p className="text-teal-700 dark:text-teal-400">{t('users.findUsers')}</p>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('users.userSearch')}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-midnight-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {t('users.allUsers')}
          </button>
          <button
            onClick={() => setFilter('online')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'online'
                ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {t('users.onlineUsers')}
          </button>
        </div>
      </div>

      {/* Users grid */}
      {loading ? (
        <UserListSkeleton />
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <UserCircleIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">{t('users.noUsersFound')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white dark:bg-slate-800 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt={user.username}
                        width={64}
                        height={64}
                        className="object-cover"
                      />
                    ) : (
                      <UserCircleIcon className="w-full h-full text-slate-400 p-2" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-midnight-900 dark:text-slate-100 truncate">
                      {user.username}
                    </p>
                    <p className="text-sm text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{t('presence.status')}</span>
                  <OnlineStatusBadge
                    status={user.status}
                    lastSeen={user.last_seen}
                    showLabel={true}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{t('common.language')}</span>
                  <span className="text-midnight-900 dark:text-slate-100">
                    {getLanguageName(user.preferred_language)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => startChat(user.id)}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
              >
                {t('users.startChat')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
