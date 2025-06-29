'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { EnvelopeIcon, LockClosedIcon, UserIcon } from '@heroicons/react/24/outline';

interface AuthFormProps {
  mode: 'login' | 'signup';
  email: string;
  password: string;
  username?: string;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onUsernameChange?: (username: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}

export const AuthForm = ({
  mode,
  email,
  password,
  username,
  onEmailChange,
  onPasswordChange,
  onUsernameChange,
  onSubmit,
  loading,
}: AuthFormProps) => {
  const { t } = useTranslation();

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === 'signup' && onUsernameChange && (
        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-midnight-900 dark:text-slate-100 mb-1"
          >
            {t('auth.username')}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UserIcon className="h-5 w-5 text-slate-500" />
            </div>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-midnight-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder={t('auth.usernamePlaceholder')}
              disabled={loading}
            />
          </div>
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-midnight-900 dark:text-slate-100 mb-1"
        >
          {t('auth.email')}
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <EnvelopeIcon className="h-5 w-5 text-slate-500" />
          </div>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-midnight-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            placeholder={t('auth.emailPlaceholder')}
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-midnight-900 dark:text-slate-100 mb-1"
        >
          {t('auth.password')}
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <LockClosedIcon className="h-5 w-5 text-slate-500" />
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-midnight-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            placeholder={t('auth.passwordPlaceholder')}
            minLength={8}
            disabled={loading}
          />
        </div>
        {mode === 'signup' && (
          <p className="mt-1 text-xs text-slate-500">{t('auth.passwordTooShort')}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? t('common.loading') : mode === 'login' ? t('auth.signIn') : t('auth.signUp')}
      </button>
    </form>
  );
};
