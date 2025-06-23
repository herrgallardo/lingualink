'use client';

import { CompactOnlineUsers } from '@/components/presence/OnlineUsersList';
import { useAuth } from '@/lib/context/auth-context';
import { useProfile } from '@/lib/hooks/useSupabase';
import {
  ArrowRightStartOnRectangleIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UserCircleIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close sidebar on outside click (mobile)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        window.innerWidth < 1024
      ) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  }, [pathname, onClose]);

  const navigationItems = [
    {
      name: 'Chats',
      href: '/chat',
      icon: ChatBubbleLeftRightIcon,
      active: pathname.startsWith('/chat'),
    },
    {
      name: 'New Chat',
      href: '/chat/new',
      icon: PlusIcon,
      active: pathname === '/chat/new',
    },
    {
      name: 'Search',
      href: '/search',
      icon: MagnifyingGlassIcon,
      active: pathname.startsWith('/search'),
    },
    {
      name: 'Users',
      href: '/users',
      icon: UserGroupIcon,
      active: pathname.startsWith('/users'),
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: Cog6ToothIcon,
      active: pathname.startsWith('/profile'),
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-800 shadow-xl
          transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:shadow-none lg:border-r lg:border-slate-200 dark:lg:border-slate-700
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <Link
              href="/chat"
              className="flex items-center gap-3 text-2xl font-bold text-cyan-600 hover:text-cyan-700 transition-colors"
            >
              <span className="text-3xl">🌐</span>
              LinguaLink
            </Link>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors lg:hidden"
              aria-label="Close sidebar"
            >
              <XMarkIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>

          {/* User profile section */}
          {profile && (
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.username}
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  ) : (
                    <UserCircleIcon className="w-full h-full text-slate-400 p-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-midnight-900 dark:text-slate-100 truncate">
                    {profile.username}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{profile.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-all
                  ${
                    item.active
                      ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
                  }
                `}
              >
                <item.icon
                  className={`w-5 h-5 ${item.active ? 'text-cyan-600 dark:text-cyan-400' : ''}`}
                />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Online users */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <CompactOnlineUsers maxDisplay={5} />
          </div>

          {/* Sign out button */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => signOut()}
              className="flex items-center gap-3 w-full px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors"
            >
              <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
