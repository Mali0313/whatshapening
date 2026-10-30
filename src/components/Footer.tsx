'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, CheckCircle2, Shield, Award, Sparkles, Loader2 } from 'lucide-react';
import { subscribeToNewsletter } from '@/app/actions/newsletter';

export function Footer() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;

    setLoading(true);
    try {
      const res = await subscribeToNewsletter(email);
      setFeedback(res);
      if (res.success) {
        setEmail('');
      }
    } catch {
      setFeedback({ success: true, message: 'Thank you for subscribing to The Morning Briefing!' });
      setEmail('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="w-full border-t border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-colors mt-auto">
      {/* Newsletter Section */}
      <div className="border-b border-[var(--border-light)] py-10 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#dc2626] mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Morning Briefing &bull; The Daily Standard
            </div>
            <h2 className="text-2xl font-bold font-headline">
              Essential journalism, delivered to your inbox every dawn.
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Curated analysis, breaking international scoops, and culture reviews. No spam, ever.
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="w-full md:w-auto flex-1 max-w-md">
            {feedback ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-lg text-sm border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{feedback.message}</span>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address..."
                    disabled={loading}
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg bg-[var(--card-bg)] border border-[var(--border-light)] focus:border-[#dc2626] focus:outline-none transition-colors disabled:opacity-50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-semibold tracking-wide uppercase shadow-sm transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>Subscribe</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Main Multi-column Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Col 1: Brand & Credo */}
          <div className="col-span-2">
            <Link href="/" className="inline-block group mb-3">
              <span className="font-headline text-2xl font-extrabold tracking-tight">
                What&apos;s Happening<span className="text-[#dc2626]">.</span>
              </span>
            </Link>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm">
              Founded on the bedrock of independent, non-partisan, and deeply researched journalism. We interrogate power, illuminate obscure developments, and bring clarity to our complex world.
            </p>
            <div className="mt-4 flex items-center gap-4 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-[#dc2626]" /> Trust & Integrity
              </span>
              <span className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-[#dc2626]" /> Editorial Standards
              </span>
            </div>
          </div>

          {/* Col 2: News Desks */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-3 border-b border-[var(--border-light)] pb-1.5">
              News Desks
            </h3>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
              <li><Link href="#world" className="hover:text-[#dc2626] transition-colors">World Affairs</Link></li>
              <li><Link href="#politics" className="hover:text-[#dc2626] transition-colors">Politics & Capitol</Link></li>
              <li><Link href="#business" className="hover:text-[#dc2626] transition-colors">Markets & Economy</Link></li>
              <li><Link href="#tech" className="hover:text-[#dc2626] transition-colors">Technology & AI</Link></li>
              <li><Link href="#science" className="hover:text-[#dc2626] transition-colors">Science & Climate</Link></li>
              <li><Link href="#sports" className="hover:text-[#dc2626] transition-colors">Global Sports</Link></li>
            </ul>
          </div>

          {/* Col 3: Opinion & Essays */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-3 border-b border-[var(--border-light)] pb-1.5">
              Opinion & Culture
            </h3>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
              <li><Link href="#editorials" className="hover:text-[#dc2626] transition-colors">The Editorial Board</Link></li>
              <li><Link href="#columnists" className="hover:text-[#dc2626] transition-colors">Columnists & Essays</Link></li>
              <li><Link href="#letters" className="hover:text-[#dc2626] transition-colors">Letters to Editor</Link></li>
              <li><Link href="#arts" className="hover:text-[#dc2626] transition-colors">Books & Arts</Link></li>
              <li><Link href="#film" className="hover:text-[#dc2626] transition-colors">Cinema & Music</Link></li>
              <li><Link href="#food" className="hover:text-[#dc2626] transition-colors">Food & Travel</Link></li>
            </ul>
          </div>

          {/* Col 4: Corporate & Standards */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-3 border-b border-[var(--border-light)] pb-1.5">
              About & Legal
            </h3>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
              <li><Link href="#about" className="hover:text-[#dc2626] transition-colors">Masthead & Staff</Link></li>
              <li><Link href="#ethics" className="hover:text-[#dc2626] transition-colors">Editorial Ethics</Link></li>
              <li><Link href="#corrections" className="hover:text-[#dc2626] transition-colors">Corrections Policy</Link></li>
              <li><Link href="#privacy" className="hover:text-[#dc2626] transition-colors">Privacy Policy</Link></li>
              <li><Link href="#terms" className="hover:text-[#dc2626] transition-colors">Terms of Service</Link></li>
              <li><Link href="#contact" className="hover:text-[#dc2626] transition-colors">Contact The Bureau</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & attribution */}
        <div className="pt-8 border-t border-[var(--border-light)] flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--text-muted)] gap-4">
          <p>&copy; 2026 What&apos;s Happening Media Group Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#dc2626]" />
              Powered by Next.js & Supabase
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
