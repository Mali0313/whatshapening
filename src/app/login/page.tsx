'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const urlError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(
    urlError === 'auth_callback_failed'
      ? 'Verification link expired or invalid. Please log in again.'
      : urlError === 'admin_required'
      ? 'Access restricted: Administrator privileges required.'
      : null
  );
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl || supabaseUrl.includes('placeholder') || supabaseUrl.includes('[paste')) {
        setErrorMsg('Supabase environment variables are missing on Vercel. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel Project Settings, then Redeploy.');
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (data?.user) {
        setSuccessMsg('Signed in successfully! Redirecting...');
        setTimeout(() => {
          router.push(redirectTo);
          router.refresh();
        }, 800);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.toLowerCase().includes('failed to fetch')) {
        setErrorMsg('Connection failed (Failed to fetch). Please ensure NEXT_PUBLIC_SUPABASE_URL is added in Vercel and the project is redeployed.');
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Invalid login credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--border-light)] rounded-2xl p-6 sm:p-8 shadow-xl">
      <div className="text-center mb-6">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#dc2626]">
          Subscriber & Contributor Access
        </span>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight mt-1">
          Welcome Back<span className="text-[#dc2626]">.</span>
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1.5">
          Sign in to your &ldquo;What&apos;s Happening&rdquo; account to continue reading and writing.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#dc2626]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-light)] focus:border-[#dc2626] focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-[#dc2626] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-light)] focus:border-[#dc2626] focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-sm font-semibold tracking-wide uppercase transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
        >
          <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-[var(--border-light)] text-center text-xs text-[var(--text-muted)]">
        Don&apos;t have an account yet?{' '}
        <Link href="/signup" className="font-semibold text-[#dc2626] hover:underline">
          Create an account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <Suspense fallback={<div className="text-xs text-[var(--text-muted)]">Loading login...</div>}>
          <LoginForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
