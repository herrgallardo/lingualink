'use client';

import { CommandPalette } from '@/components/layout/CommandPalette';
import { Sidebar } from '@/components/layout/Sidebar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useAuth } from '@/lib/context/auth-context';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const { t } = useTranslation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }

      // Cmd/Ctrl + / for sidebar toggle
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }

      // Cmd/Ctrl + Shift + N for notifications
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        setNotificationCenterOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-teal-700 dark:text-teal-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile header */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label={t('navigation.openSidebar')}
              >
                <svg
                  className="w-6 h-6 text-slate-600 dark:text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              <h1 className="text-xl font-bold text-cyan-600">LinguaLink</h1>

              <div className="flex items-center gap-2">
                <NotificationBell
                  userId={user.id}
                  onClick={() => setNotificationCenterOpen(true)}
                />

                <button
                  onClick={() => setCommandPaletteOpen(true)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label={t('navigation.openCommandPalette')}
                >
                  <svg
                    className="w-6 h-6 text-slate-600 dark:text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Desktop header */}
          <div className="hidden lg:flex items-center justify-end p-4 border-b border-slate-200 dark:border-slate-700">
            <NotificationBell userId={user.id} onClick={() => setNotificationCenterOpen(true)} />
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-white dark:bg-slate-900">
            {children}
          </main>
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />

      {/* Notification Center */}
      <NotificationCenter
        isOpen={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
        userId={user.id}
      />
    </div>
  );
}
