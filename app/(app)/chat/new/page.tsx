'use client';

import { UserListSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/lib/context/auth-context';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Database } from '@/lib/types/database';
import { MagnifyingGlassIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type User = Database['public']['Tables']['users']['Row'];

export default function NewChatPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creatingChat, setCreatingChat] = useState<string | null>(null);
  const supabase = useSupabase();
  const router = useRouter();
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const loadUsers = async () => {
      if (!currentUser) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .neq('id', currentUser.id) // Exclude current user
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
  }, [supabase, currentUser]);

  const createChat = async (otherUserId: string) => {
    if (creatingChat) return; // Prevent multiple simultaneous requests

    setCreatingChat(otherUserId);
    try {
      const { data, error } = await supabase.rpc('create_or_get_direct_chat', {
        other_user_id: otherUserId,
      });

      if (error) throw error;

      if (data) {
        // Use replace instead of push to prevent back navigation issues
        router.replace(`/chat/${data}`);
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
      setCreatingChat(null);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-cyan-600 mb-6">{t('chat.startNewChat')}</h1>

      {/* Search */}
      <div className="relative mb-6">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('chat.searchPeople')}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-midnight-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        />
      </div>

      {/* Users list */}
      {loading ? (
        <UserListSkeleton />
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">{t('users.noUsersFound')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => createChat(user.id)}
              disabled={creatingChat !== null}
              className="bg-white dark:bg-slate-800 rounded-lg p-4 hover:shadow-md transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                  {user.avatar_url ? (
                    <Image
                      src={user.avatar_url}
                      alt={user.username}
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  ) : (
                    <UserCircleIcon className="w-full h-full text-slate-400 p-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-midnight-900 dark:text-slate-100 truncate">
                    {user.username}
                  </p>
                  <p className="text-sm text-slate-500 truncate">{user.email}</p>
                </div>
              </div>

              {creatingChat === user.id && (
                <p className="text-xs text-cyan-600 mt-2">{t('chat.connectingToChat')}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
