'use client';

import { AuthForm } from '@/components/auth/AuthForm';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { useAuth } from '@/lib/context/auth-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signUp(email, password, username);
      router.push('/auth/verify-email');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface p-8 rounded-lg shadow-lg animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Create Account</h1>
        <p className="text-secondary">Join LinguaLink to start chatting</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
          {error}
        </div>
      )}

      <AuthForm
        mode="signup"
        email={email}
        password={password}
        username={username}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onUsernameChange={setUsername}
        onSubmit={handleSubmit}
        loading={loading}
      />

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-default"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-surface text-muted">Or continue with</span>
          </div>
        </div>

        <div className="mt-6">
          <OAuthButtons />
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-secondary">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-medium text-primary hover:text-primary-hover">
          Sign in
        </Link>
      </p>
    </div>
  );
}
