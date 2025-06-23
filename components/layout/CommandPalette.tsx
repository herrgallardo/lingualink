'use client';

import { useAuth } from '@/lib/context/auth-context';
import { useTranslation } from '@/lib/i18n/useTranslation';
import {
  ArrowRightStartOnRectangleIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PlusIcon,
  SunIcon,
  UserCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Command {
  id: string;
  name: string;
  description?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  action: () => void;
  shortcut?: string;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { t } = useTranslation();

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const commands: Command[] = [
    {
      id: 'chats',
      name: t('navigation.chats'),
      description: t('chat.viewAllChats'),
      icon: ChatBubbleLeftRightIcon,
      action: () => {
        router.push('/chat');
        onClose();
      },
    },
    {
      id: 'new-chat',
      name: t('chat.startNewChat'),
      description: t('chat.createNewConversation'),
      icon: PlusIcon,
      action: () => {
        router.push('/chat/new');
        onClose();
      },
      shortcut: 'Ctrl+N',
    },
    {
      id: 'search',
      name: t('search.searchMessages'),
      description: t('search.findMessages'),
      icon: MagnifyingGlassIcon,
      action: () => {
        router.push('/search');
        onClose();
      },
      shortcut: 'Ctrl+F',
    },
    {
      id: 'users',
      name: t('users.browseUsers'),
      description: t('users.findAndConnect'),
      icon: UserGroupIcon,
      action: () => {
        router.push('/users');
        onClose();
      },
    },
    {
      id: 'profile',
      name: t('profile.profileSettings'),
      description: t('profile.manageProfile'),
      icon: UserCircleIcon,
      action: () => {
        router.push('/profile');
        onClose();
      },
      shortcut: 'Ctrl+,',
    },
    {
      id: 'toggle-theme',
      name: t('settings.theme'),
      description: t('settings.switchTheme'),
      icon: document.documentElement.classList.contains('dark') ? SunIcon : MoonIcon,
      action: () => {
        document.documentElement.classList.toggle('dark');
        onClose();
      },
      shortcut: 'Ctrl+T',
    },
    {
      id: 'preferences',
      name: t('settings.preferences'),
      description: t('settings.customizeApp'),
      icon: Cog6ToothIcon,
      action: () => {
        router.push('/profile#preferences');
        onClose();
      },
    },
    {
      id: 'sign-out',
      name: t('common.signOut'),
      description: t('auth.logoutAccount'),
      icon: ArrowRightStartOnRectangleIcon,
      action: () => {
        signOut();
        onClose();
      },
    },
  ];

  // Filter commands based on search
  const filteredCommands = commands.filter(
    (command) =>
      command.name.toLowerCase().includes(search.toLowerCase()) ||
      command.description?.toLowerCase().includes(search.toLowerCase()),
  );

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            filteredCommands.length > 0 ? (prev + 1) % filteredCommands.length : 0,
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            filteredCommands.length > 0
              ? (prev - 1 + filteredCommands.length) % filteredCommands.length
              : 0,
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands.length > 0 && filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Command palette */}
      <div className="flex min-h-full items-start justify-center p-4 text-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-slate-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg animate-fade-in">
          <div className="border-b border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <MagnifyingGlassIcon className="w-5 h-5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder-slate-500"
                placeholder={t('navigation.commandPlaceholder')}
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-400 rounded">
                ESC
              </kbd>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto py-2">
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500">
                {t('search.noResultsFor', { query: search })}
              </div>
            ) : (
              <ul role="list" className="px-2">
                {filteredCommands.map((command, index) => (
                  <li key={command.id}>
                    <button
                      onClick={command.action}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                        ${
                          index === selectedIndex
                            ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-900 dark:text-cyan-100'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }
                      `}
                    >
                      <command.icon
                        className={`w-5 h-5 flex-shrink-0 ${
                          index === selectedIndex
                            ? 'text-cyan-600 dark:text-cyan-400'
                            : 'text-slate-400'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{command.name}</p>
                        {command.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {command.description}
                          </p>
                        )}
                      </div>
                      {command.shortcut && (
                        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-400 rounded">
                          {command.shortcut}
                        </kbd>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 font-medium bg-slate-100 dark:bg-slate-700 dark:text-slate-400 rounded">
                    ↑↓
                  </kbd>
                  {t('navigation.navigate')}
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 font-medium bg-slate-100 dark:bg-slate-700 dark:text-slate-400 rounded">
                    ↵
                  </kbd>
                  {t('common.select')}
                </span>
              </div>
              <span className="flex items-center gap-1">
                {t('navigation.openWith')}
                <kbd className="px-1.5 py-0.5 font-medium bg-slate-100 dark:bg-slate-700 dark:text-slate-400 rounded">
                  ⌘K
                </kbd>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
