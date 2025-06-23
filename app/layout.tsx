import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/lib/context/auth-context';
import { PreferencesProvider } from '@/lib/context/preferences-context';
import { PresenceProvider } from '@/lib/context/presence-context';
import { ProfileProvider } from '@/lib/context/profile-context';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LinguaLink - Real-Time Translation Chat',
  description: 'Break language barriers with AI-powered real-time translation',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ErrorBoundary>
          <AuthProvider>
            <ProfileProvider>
              <PreferencesProvider>
                <PresenceProvider>{children}</PresenceProvider>
              </PreferencesProvider>
            </ProfileProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
