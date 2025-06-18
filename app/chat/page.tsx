'use client';

import { useAuth } from '@/lib/context/auth-context';
import { useProfile } from '@/lib/hooks/useSupabase';
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';

export default function ChatPage() {
  const { signOut } = useAuth();
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-primary">LinguaLink Chat</h1>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 px-4 py-2 text-secondary hover:text-primary transition-colors"
          >
            <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
            Sign Out
          </button>
        </div>

        <div className="bg-surface rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-primary mb-4">Welcome, {profile?.username}!</h2>
          <p className="text-secondary">
            This is the chat page. We&#39;ll build the full chat interface in the upcoming steps.
          </p>
          <div className="mt-4 space-y-2 text-sm text-muted">
            <p>Your email: {profile?.email}</p>
            <p>Preferred language: {profile?.preferred_language}</p>
            <p>Status: {profile?.status}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
