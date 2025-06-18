'use client';

import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { LanguageSelector } from '@/components/profile/LanguageSelector';
import { StatusSelector } from '@/components/profile/StatusSelector';
import { UIPreferences } from '@/components/profile/UIPreferences';
import { useAuth } from '@/lib/context/auth-context';
import { usePreferences } from '@/lib/hooks/usePreferences';
import { useProfile, useSupabase } from '@/lib/hooks/useSupabase';
import type { Database } from '@/lib/types/database';
import { ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type UserStatus = Database['public']['Tables']['users']['Row']['status'];

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const supabase = useSupabase();
  const { preferences, updatePreference } = usePreferences(user?.id);

  const [saving, setSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local state for profile fields
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [status, setStatus] = useState<UserStatus>('available');

  // Initialize local state from profile
  useEffect(() => {
    if (profile) {
      setAvatarUrl(profile.avatar_url);
      setPreferredLanguage(profile.preferred_language);
      setStatus(profile.status);
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user || !profile) return;

    setError(null);
    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          avatar_url: avatarUrl,
          preferred_language: preferredLanguage,
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading || !profile || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-teal-700 dark:text-teal-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/chat')}
              className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Back to chat"
            >
              <ArrowLeftIcon className="w-5 h-5 text-cyan-600" />
            </button>
            <h1 className="text-3xl font-bold text-cyan-600">Profile Settings</h1>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Avatar Section */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-midnight-900 dark:text-slate-100 mb-6">
                Profile Picture
              </h2>
              <AvatarUpload
                userId={user.id}
                currentAvatarUrl={avatarUrl}
                username={profile.username}
                onUpload={setAvatarUrl}
                size="large"
              />
            </div>

            {/* Account Info */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-midnight-900 dark:text-slate-100 mb-6">
                Account Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-teal-700 dark:text-teal-400 mb-1">
                    Username
                  </label>
                  <p className="text-midnight-900 dark:text-slate-100 font-medium">
                    {profile.username}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-teal-700 dark:text-teal-400 mb-1">
                    Email
                  </label>
                  <p className="text-midnight-900 dark:text-slate-100">{profile.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-teal-700 dark:text-teal-400 mb-1">
                    Member Since
                  </label>
                  <p className="text-midnight-900 dark:text-slate-100">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Communication Preferences */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-midnight-900 dark:text-slate-100 mb-6">
                Communication Preferences
              </h2>
              <div className="space-y-6">
                <LanguageSelector
                  selectedLanguage={preferredLanguage}
                  onLanguageChange={setPreferredLanguage}
                  showFlag={true}
                />

                <StatusSelector currentStatus={status} onStatusChange={setStatus} />
              </div>
            </div>

            {/* UI Preferences */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
              <UIPreferences preferences={preferences} onPreferenceChange={updatePreference} />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex items-center justify-end gap-4">
          {showSaveSuccess && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 animate-fade-in">
              <CheckIcon className="w-5 h-5" />
              <span>Profile saved successfully!</span>
            </div>
          )}

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
