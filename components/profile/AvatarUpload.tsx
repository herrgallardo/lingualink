'use client';

import { useSupabase } from '@/lib/hooks/useSupabase';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cleanupOldAvatars, uploadAvatar } from '@/lib/utils/avatar-upload';
import { CameraIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useRef, useState } from 'react';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  username: string;
  onUpload: (url: string) => void;
  size?: 'small' | 'medium' | 'large';
}

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  username,
  onUpload,
  size = 'medium',
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = useSupabase();
  const { t } = useTranslation();

  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32',
  };

  const sizePixels = {
    small: 64,
    medium: 96,
    large: 128,
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const result = await uploadAvatar(supabase, {
        file,
        userId,
        maxSizeMB: 2,
        quality: 0.9,
        maxDimension: 512,
      });

      if (result.success && result.url) {
        // Update user profile with new avatar URL
        const { error: updateError } = await supabase
          .from('users')
          .update({ avatar_url: result.url })
          .eq('id', userId);

        if (updateError) throw updateError;

        onUpload(result.url);

        // Cleanup old avatars in the background
        cleanupOldAvatars(supabase, userId, 3).catch(console.error);
      } else {
        setError(result.error || t('profile.failedToUploadPhoto'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.failedToUploadPhoto'));
    } finally {
      setUploading(false);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        <div
          className={`${sizeClasses[size]} rounded-full overflow-hidden bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 group-hover:border-cyan-500 transition-colors relative`}
        >
          {currentAvatarUrl ? (
            <Image
              src={currentAvatarUrl}
              alt={`${username} avatar`}
              width={sizePixels[size]}
              height={sizePixels[size]}
              className="object-cover"
              priority
            />
          ) : (
            <UserCircleIcon className="w-full h-full text-slate-400" />
          )}
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={t('profile.uploadPhoto')}
        >
          <CameraIcon className="w-4 h-4" />
        </button>

        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        aria-label={t('common.file')}
      />

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <p className="mt-2 text-xs text-slate-500">
        {t('profile.maxSize', { size: '2MB' })} • {t('profile.acceptedFormats')}
      </p>
    </div>
  );
}
