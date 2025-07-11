'use client';

import { SupabaseTest } from '@/components/SupabaseTest';
import { useAuth } from '@/lib/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/chat');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Supabase Connection Test */}
      <div className="container mx-auto px-4 py-4">
        <SupabaseTest />
      </div>

      {/* Hero Section with Gradient */}
      <div className="gradient-mint-to-cyan text-white">
        <div className="container mx-auto px-4 py-16">
          <h1 className="text-5xl font-bold mb-4">LinguaLink</h1>
          <p className="text-xl opacity-90">Real-time AI-powered translation chat application</p>
          {!loading && !user && (
            <div className="flex gap-4 mt-6">
              <a
                href="/auth/login"
                className="px-6 py-3 bg-white text-cyan-600 rounded-lg font-medium hover:opacity-90 transition-all"
              >
                Sign In
              </a>
              <a
                href="/auth/signup"
                className="px-6 py-3 bg-transparent border-2 border-white text-white rounded-lg font-medium hover:bg-white hover:bg-opacity-10 transition-all"
              >
                Sign Up
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Color Palette Showcase */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-semibold text-cyan-600 mb-8">Color Palette</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          <div className="text-center">
            <div className="bg-mint-400 h-24 rounded-lg shadow-md mb-2"></div>
            <p className="text-sm font-medium">Light Mint Green</p>
            <p className="text-xs text-slate-500">#80ee98</p>
          </div>
          <div className="text-center">
            <div className="bg-emerald-400 h-24 rounded-lg shadow-md mb-2"></div>
            <p className="text-sm font-medium">Aqua Green</p>
            <p className="text-xs text-slate-500">#46dfb1</p>
          </div>
          <div className="text-center">
            <div className="bg-cyan-500 h-24 rounded-lg shadow-md mb-2"></div>
            <p className="text-sm font-medium">Bright Cyan</p>
            <p className="text-xs text-slate-500">#09d1c7</p>
          </div>
          <div className="text-center">
            <div className="bg-teal-600 h-24 rounded-lg shadow-md mb-2"></div>
            <p className="text-sm font-medium">Teal Blue</p>
            <p className="text-xs text-slate-500">#15919b</p>
          </div>
          <div className="text-center">
            <div className="bg-teal-800 h-24 rounded-lg shadow-md mb-2"></div>
            <p className="text-sm font-medium">Deep Teal</p>
            <p className="text-xs text-slate-500">#0c6478</p>
          </div>
          <div className="text-center">
            <div className="bg-midnight-900 h-24 rounded-lg shadow-md mb-2"></div>
            <p className="text-sm font-medium">Midnight Blue</p>
            <p className="text-xs text-slate-500">#213a58</p>
          </div>
        </div>

        {/* Gradients */}
        <h3 className="text-2xl font-semibold text-teal-600 mb-4">Gradients</h3>
        <div className="space-y-4 mb-12">
          <div className="gradient-mint-to-cyan h-20 rounded-lg shadow-md"></div>
          <div className="gradient-cyan-to-midnight h-20 rounded-lg shadow-md"></div>
          <div className="gradient-full-spectrum h-20 rounded-lg shadow-md"></div>
        </div>

        {/* Typography */}
        <h3 className="text-2xl font-semibold text-teal-600 mb-4">Typography</h3>
        <div className="space-y-4 mb-12 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
          <h1 className="text-5xl font-bold text-midnight-900 dark:text-slate-100">Heading 1</h1>
          <h2 className="text-4xl font-semibold text-midnight-900 dark:text-slate-100">
            Heading 2
          </h2>
          <h3 className="text-3xl font-semibold text-midnight-900 dark:text-slate-100">
            Heading 3
          </h3>
          <h4 className="text-2xl font-medium text-midnight-900 dark:text-slate-100">Heading 4</h4>
          <p className="text-base text-midnight-900 dark:text-slate-100">
            This is a paragraph with primary text color. LinguaLink enables seamless communication
            across language barriers.
          </p>
          <p className="text-sm text-teal-700 dark:text-teal-400">
            This is secondary text, perfect for descriptions and supporting content.
          </p>
          <p className="text-xs text-slate-500">
            This is muted text, ideal for timestamps and metadata.
          </p>
        </div>

        {/* Buttons Example */}
        <h3 className="text-2xl font-semibold text-teal-600 mb-4">Components Preview</h3>
        <div className="space-y-4 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex flex-wrap gap-4">
            <button className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors">
              Primary Button
            </button>
            <button className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-hover transition-colors">
              Secondary Button
            </button>
            <button className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
              Accent Button
            </button>
            <button className="px-6 py-2 border-2 border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-colors">
              Outline Button
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
              <h4 className="font-semibold text-midnight-900 dark:text-slate-100 mb-2">
                Card Title
              </h4>
              <p className="text-sm text-teal-700 dark:text-teal-400">
                This is a card component using our design system colors.
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h4 className="font-semibold text-midnight-900 dark:text-slate-100 mb-2">
                Elevated Card
              </h4>
              <p className="text-sm text-teal-700 dark:text-teal-400">
                This card has a shadow for elevation.
              </p>
            </div>
            <div className="p-4 gradient-mint-to-cyan text-white rounded-lg">
              <h4 className="font-semibold mb-2">Gradient Card</h4>
              <p className="text-sm opacity-90">This card uses our gradient background.</p>
            </div>
          </div>
        </div>

        {/* Animation Examples */}
        <h3 className="text-2xl font-semibold text-teal-600 mb-4 mt-12">Animations</h3>
        <div className="flex gap-4">
          <div className="animate-fade-in p-4 bg-primary text-white rounded-lg">
            Fade In Animation
          </div>
          <div className="animate-slide-up p-4 bg-secondary text-white rounded-lg">
            Slide Up Animation
          </div>
        </div>
      </div>
    </div>
  );
}
