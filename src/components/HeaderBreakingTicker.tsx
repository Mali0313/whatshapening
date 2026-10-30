'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface BreakingHeadline {
  id: string;
  title: string;
  slug?: string;
  categoryName?: string;
}

const FALLBACK_BREAKING: BreakingHeadline[] = [
  {
    id: 'f1',
    title: 'Global Climate Summit agrees on historic renewable infrastructure framework',
    categoryName: 'Climate',
  },
  {
    id: 'f2',
    title: 'KSE-100 rallies past record levels amid strong corporate investor confidence',
    categoryName: 'Markets',
  },
  {
    id: 'f3',
    title: 'State Bank unveils modernized real-time digital transaction corridors',
    categoryName: 'Finance',
  },
  {
    id: 'f4',
    title: 'Next-generation green hydrogen energy complex breaks ground',
    categoryName: 'Energy',
  },
  {
    id: 'f5',
    title: 'International trade delegation finalizes landmark regional tech agreements',
    categoryName: 'Economy',
  },
];

export function HeaderBreakingTicker() {
  const [headlines, setHeadlines] = useState<BreakingHeadline[]>(FALLBACK_BREAKING);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Fetch real articles from Supabase to include in breaking ticker
  useEffect(() => {
    async function fetchBreakingArticles() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('articles')
          .select('id, title, slug, is_breaking, category:categories(name)')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(6);

        if (!error && data && data.length > 0) {
          const dbArticles: BreakingHeadline[] = data.map((item: any) => ({
            id: item.id,
            title: item.title,
            slug: item.slug,
            categoryName: item.category?.name || (item.is_breaking ? 'Urgent' : 'Breaking'),
          }));

          // Merge DB articles at top, then unique fallbacks
          const merged = [
            ...dbArticles,
            ...FALLBACK_BREAKING.filter(
              (f) => !dbArticles.some((d) => d.title.toLowerCase() === f.title.toLowerCase())
            ),
          ];
          setHeadlines(merged);
        }
      } catch {
        // use fallback headlines gracefully
      }
    }

    fetchBreakingArticles();
  }, []);

  // Live rotate headlines every 4.5 seconds with smooth fade transition
  useEffect(() => {
    if (isPaused || headlines.length <= 1) return;

    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % headlines.length);
        setIsVisible(true);
      }, 300);
    }, 4500);

    return () => clearInterval(interval);
  }, [isPaused, headlines.length]);

  const current = headlines[currentIndex] || FALLBACK_BREAKING[0];

  return (
    <div
      className="hidden lg:flex items-center gap-2 overflow-hidden text-xs max-w-md xl:max-w-lg select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      title="Live Breaking Ticker (Pauses on hover)"
    >
      <span className="inline-flex items-center gap-1 font-bold text-[#dc2626] uppercase tracking-wider text-[10px] shrink-0">
        <Flame className="w-3.5 h-3.5 fill-current animate-pulse text-[#dc2626]" />
        Breaking
      </span>

      <div
        className={`truncate transition-all duration-300 ease-out ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1.5'
        }`}
      >
        {current.slug ? (
          <Link
            href={`/news/${current.slug}`}
            className="truncate text-[var(--text-secondary)] hover:text-[#dc2626] transition-colors flex items-center gap-1.5"
          >
            {current.categoryName && (
              <span className="font-bold text-[10px] uppercase text-[#dc2626] bg-red-50 dark:bg-red-950/50 px-1.5 py-0.5 rounded">
                {current.categoryName}
              </span>
            )}
            <span className="truncate">{current.title}</span>
          </Link>
        ) : (
          <span className="truncate text-[var(--text-secondary)] hover:text-[#dc2626] cursor-pointer transition-colors flex items-center gap-1.5">
            {current.categoryName && (
              <span className="font-bold text-[10px] uppercase text-[#dc2626] bg-red-50 dark:bg-red-950/50 px-1.5 py-0.5 rounded">
                {current.categoryName}
              </span>
            )}
            <span className="truncate">{current.title}</span>
          </span>
        )}
      </div>
    </div>
  );
}

