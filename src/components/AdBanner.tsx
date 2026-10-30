'use client';

import React from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';

interface AdBannerProps {
  slot: 'leaderboard' | 'sidebar' | 'in-article';
  className?: string;
  sponsorName?: string;
  sponsorUrl?: string;
  imageUrl?: string;
  headline?: string;
}

export function AdBanner({
  slot,
  className = '',
  sponsorName = 'Global Tech Cloud Platform',
  sponsorUrl = 'https://cloud.google.com',
  imageUrl,
  headline = 'Scale your cloud infrastructure with enterprise-grade reliability and 99.99% uptime.',
}: AdBannerProps) {
  if (slot === 'leaderboard') {
    return (
      <div className={`w-full max-w-7xl mx-auto px-4 sm:px-8 my-6 ${className}`}>
        <div className="rounded-2xl border border-[var(--border-light)] bg-gradient-to-r from-slate-50 via-gray-50 to-slate-100 dark:from-slate-900/60 dark:via-neutral-900/60 dark:to-neutral-950/60 p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs relative overflow-hidden group">
          {/* Subtle ad identifier */}
          <div className="absolute top-2 right-3 text-[9px] font-mono tracking-widest text-[var(--text-muted)] uppercase opacity-60">
            Advertisement &bull; Sponsored Desk
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#dc2626]/10 text-[#dc2626] dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#dc2626] block">
                {sponsorName}
              </span>
              <h4 className="font-headline font-bold text-sm sm:text-base text-[var(--text-primary)] leading-tight">
                {headline}
              </h4>
            </div>
          </div>

          <a
            href={sponsorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--text-primary)] hover:bg-[#dc2626] text-[var(--bg-primary)] hover:text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <span>Learn More</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  if (slot === 'sidebar') {
    return (
      <div className={`p-5 rounded-2xl border border-[var(--border-light)] bg-gradient-to-b from-[var(--card-bg)] to-[var(--bg-secondary)] shadow-xs relative overflow-hidden ${className}`}>
        <div className="text-[9px] font-mono tracking-wider text-[var(--text-muted)] uppercase mb-3 flex items-center justify-between">
          <span>Sponsored Story</span>
          <span>Ad</span>
        </div>

        {imageUrl && (
          <div className="aspect-[16/9] w-full rounded-xl overflow-hidden mb-3 bg-gray-200 dark:bg-gray-800">
            <img src={imageUrl} alt={headline} className="w-full h-full object-cover" />
          </div>
        )}

        <span className="text-[10px] font-bold uppercase tracking-wider text-[#dc2626] block mb-1">
          {sponsorName}
        </span>
        <h4 className="font-headline font-bold text-sm leading-snug mb-2 text-[var(--text-primary)]">
          {headline}
        </h4>
        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-4">
          Discover cutting-edge security, distributed servers, and scalable compute designed for modern applications.
        </p>

        <a
          href={sponsorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold transition-colors cursor-pointer"
        >
          <span>Explore Platform</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  // in-article banner
  return (
    <div className={`my-8 p-5 sm:p-6 rounded-2xl border border-[#dc2626]/20 bg-[var(--bg-secondary)] shadow-xs relative overflow-hidden ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-mono tracking-widest uppercase text-[var(--text-muted)]">
          Featured Partner Notice
        </span>
        <span className="text-[9px] font-bold text-[#dc2626] uppercase tracking-wider">
          Sponsored
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-headline font-bold text-base text-[var(--text-primary)] mb-1">
            {sponsorName}: {headline}
          </h4>
          <p className="text-xs text-[var(--text-secondary)] max-w-xl">
            Upgrade your team&apos;s workflow with reliable reporting, AI-augmented research, and seamless integrations.
          </p>
        </div>

        <a
          href={sponsorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <span>Partner Offer</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
