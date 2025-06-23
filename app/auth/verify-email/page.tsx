'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg animate-fade-in text-center">
      <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <EnvelopeIcon className="w-8 h-8 text-cyan-600" />
      </div>

      <h1 className="text-2xl font-bold text-cyan-600 mb-2">{t('auth.verifyEmailTitle')}</h1>
      <p className="text-teal-700 dark:text-teal-400 mb-6">{t('auth.verifyEmailDescription')}</p>

      <div className="space-y-3">
        <p className="text-sm text-slate-500">{t('auth.didntReceiveEmail')}</p>

        <Link
          href="/auth/login"
          className="inline-block px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
        >
          {t('auth.backToLogin')}
        </Link>
      </div>
    </div>
  );
}
