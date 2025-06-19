'use client';

import { useAuth } from '@/lib/context/auth-context';
import { usePreferences } from '@/lib/hooks/usePreferences';
import type { UserPreferences } from '@/lib/types/preferences';
import { createContext, useContext, useEffect } from 'react';

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  loading: boolean;
  saving: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { preferences, updatePreference, loading, saving } = usePreferences(user?.id);

  // Apply theme preference
  useEffect(() => {
    const root = document.documentElement;

    if (preferences.theme === 'dark') {
      root.classList.add('dark');
    } else if (preferences.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [preferences.theme]);

  // Apply font size preference
  useEffect(() => {
    const root = document.documentElement;

    switch (preferences.fontSize) {
      case 'small':
        root.style.fontSize = '14px';
        break;
      case 'large':
        root.style.fontSize = '18px';
        break;
      default: // medium
        root.style.fontSize = '16px';
    }
  }, [preferences.fontSize]);

  // Apply compact view preference
  useEffect(() => {
    const root = document.documentElement;

    if (preferences.compactView) {
      root.classList.add('compact-view');
    } else {
      root.classList.remove('compact-view');
    }
  }, [preferences.compactView]);

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreference, loading, saving }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferencesContext() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferencesContext must be used within a PreferencesProvider');
  }
  return context;
}
