'use client';

import { useSupabase } from '@/lib/hooks/useSupabase';
import { useEffect, useState } from 'react';

export function SupabaseTest() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);
  const supabase = useSupabase();

  useEffect(() => {
    async function checkConnection() {
      try {
        // Test the connection by checking auth status
        const { error } = await supabase.auth.getSession();

        if (error) throw error;

        setStatus('connected');
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }

    checkConnection();
  }, [supabase]);

  return (
    <div className="p-4 rounded-lg border bg-surface">
      <h3 className="font-semibold text-primary mb-2">Supabase Connection Status</h3>

      {status === 'checking' && <p className="text-secondary">Checking connection...</p>}

      {status === 'connected' && (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-success rounded-full"></div>
          <p className="text-success">Connected to Supabase</p>
        </div>
      )}

      {status === 'error' && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-error rounded-full"></div>
            <p className="text-error">Connection failed</p>
          </div>
          <p className="text-sm text-muted">{error}</p>
          <p className="text-xs text-muted mt-2">
            Make sure you&#39;ve added your Supabase credentials to .env.local
          </p>
        </div>
      )}
    </div>
  );
}
