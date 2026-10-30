'use client';

import React, { useEffect, useState } from 'react';
import { Database, CheckCircle2, AlertTriangle, RefreshCw, X, Key, ExternalLink } from 'lucide-react';

interface SupabaseCheckResult {
  success: boolean;
  status: {
    configured: {
      supabaseUrl: boolean;
      anonKey: boolean;
      serviceRoleKey: boolean;
    };
    clientConnection: string;
    adminConnection: string;
    message: string;
    timestamp: string;
  };
}

export function SupabaseStatusBadge() {
  const [data, setData] = useState<SupabaseCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const checkConnection = async (force = false) => {
    if (!force && typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('supabase_status_cache');
      if (cached) {
        try {
          setData(JSON.parse(cached));
          setLoading(false);
          return;
        } catch {
          // ignore cache parse error
        }
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/supabase-test');
      const json = await res.json();
      setData(json);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('supabase_status_cache', JSON.stringify(json));
      }
    } catch (err) {
      setData({
        success: false,
        status: {
          configured: { supabaseUrl: false, anonKey: false, serviceRoleKey: false },
          clientConnection: 'Network error',
          adminConnection: 'Network error',
          message: 'Unable to reach /api/supabase-test endpoint.',
          timestamp: new Date().toISOString(),
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const isConfigured =
    data?.status.configured.supabaseUrl && data?.status.configured.anonKey;
  const isConnected = data?.success;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
          loading
            ? 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
            : isConnected
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
        }`}
        title="Supabase Connection Diagnostics"
      >
        <Database className="w-3.5 h-3.5 text-current" />
        <span className="hidden sm:inline">Supabase:</span>
        <span>
          {loading ? 'Checking...' : isConnected ? 'Connected' : isConfigured ? 'Connecting...' : 'Needs Keys'}
        </span>
        <span
          className={`w-2 h-2 rounded-full ${
            loading
              ? 'bg-gray-400 animate-pulse'
              : isConnected
              ? 'bg-emerald-500'
              : 'bg-amber-500 animate-ping'
          }`}
        />
      </button>

      {/* Diagnostics Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--border-light)] w-full max-w-lg rounded-xl shadow-2xl overflow-hidden p-6 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className={`p-2.5 rounded-lg ${
                  isConnected
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                }`}
              >
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg font-headline">Supabase Connection Diagnostics</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Environment variables & Client Verification
                </p>
              </div>
            </div>

            <div className="space-y-3 my-4 text-sm">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-light)]">
                <span className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</span>
                </span>
                {data?.status.configured.supabaseUrl ? (
                  <span className="inline-flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400 gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs font-medium text-amber-600 dark:text-amber-400 gap-1">
                    <AlertTriangle className="w-4 h-4" /> [paste URL]
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-light)]">
                <span className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
                </span>
                {data?.status.configured.anonKey ? (
                  <span className="inline-flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400 gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs font-medium text-amber-600 dark:text-amber-400 gap-1">
                    <AlertTriangle className="w-4 h-4" /> [paste anon key]
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-light)]">
                <span className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</span>
                </span>
                {data?.status.configured.serviceRoleKey ? (
                  <span className="inline-flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400 gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Configured (Server Only)
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs font-medium text-amber-600 dark:text-amber-400 gap-1">
                    <AlertTriangle className="w-4 h-4" /> [paste service role key]
                  </span>
                )}
              </div>

              <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-light)]">
                <div className="text-xs font-semibold mb-1 text-[var(--text-secondary)]">Client Status:</div>
                <div className="font-mono text-xs text-[var(--text-primary)]">
                  {data?.status.clientConnection || 'Pending'}
                </div>
              </div>
            </div>

            {!isConnected && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-800 dark:text-red-300 mb-4">
                <p className="font-semibold mb-1">To connect to your Supabase project:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Open <code className="bg-red-100 dark:bg-red-900/60 px-1 py-0.5 rounded font-mono">.env.local</code> in the project root.</li>
                  <li>Paste your Project URL, anon key, and service role key from the Supabase dashboard (Settings &rarr; API).</li>
                  <li>Click &quot;Recheck Connection&quot; below.</li>
                </ol>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-light)]">
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-red)] inline-flex items-center gap-1 transition-colors"
              >
                Open Supabase Dashboard <ExternalLink className="w-3 h-3" />
              </a>

              <button
                onClick={() => checkConnection(true)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Recheck Connection
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
