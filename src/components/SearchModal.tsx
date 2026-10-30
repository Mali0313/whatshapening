'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, X, ArrowRight, TrendingUp, Sparkles, ChevronRight, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SuggestionItem {
  id: string;
  title: string;
  slug: string;
  category?: { name: string } | null;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const trendingTopics = [
    'Pakistan Economy',
    'AI Sovereignty',
    'Renewable Microgrids',
    'Climate Summit',
    'Monetary Policy',
    'Decathlon World Record',
  ];

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery('');
      setSuggestions([]);
    }
  }, [isOpen]);

  // Keyboard shortcut listener (ESC to close, CMD+K to toggle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Live suggestions query
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('articles')
          .select('id, title, slug, category:categories(name)')
          .eq('status', 'published')
          .or(`title.ilike.%${query.trim()}%,excerpt.ilike.%${query.trim()}%`)
          .limit(4);

        if (data) {
          const mapped = data.map((item: any) => ({
            ...item,
            category: Array.isArray(item.category) ? item.category[0] : item.category,
          }));
          setSuggestions(mapped);
        }
      } catch {
        // Fallback
      } finally {
        setSearching(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  // Execute full search navigation
  const executeSearch = (searchQuery: string) => {
    const term = searchQuery.trim();
    if (!term) return;
    onClose();
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--border-light)] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden p-5 sm:p-6 relative animate-scale-in"
      >
        {/* Search Input Bar with Workable Submit Button */}
        <form onSubmit={handleSubmit} className="flex items-center gap-3 border-b border-[var(--border-light)] pb-4">
          <Search className="w-5 h-5 text-[#dc2626] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search news, topics, authors, editorials..."
            className="w-full bg-transparent text-sm sm:text-base focus:outline-none placeholder:text-[var(--text-muted)]"
          />

          {query.trim().length > 0 && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              title="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span>Search</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </form>

        {/* Live Matching Article Suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-4 border-b border-[var(--border-light)] pb-4">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#dc2626]" /> Matching Stories
              </span>
              <span>{suggestions.length} found</span>
            </div>

            <div className="space-y-1.5">
              {suggestions.map((item) => (
                <Link
                  key={item.id}
                  href={`/news/${item.slug}`}
                  onClick={onClose}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--bg-secondary)] transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <FileText className="w-4 h-4 text-[#dc2626] shrink-0" />
                    <span className="font-headline font-semibold text-xs sm:text-sm text-[var(--text-primary)] group-hover:text-[#dc2626] transition-colors truncate">
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.category?.name && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-muted)]">
                        {item.category.name}
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Trending Searches Chips (Clicking any chip immediately searches) */}
        <div className="mt-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#dc2626]" />
            Trending Topics
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingTopics.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => executeSearch(topic)}
                className="px-3 py-1.5 rounded-full text-xs bg-[var(--bg-secondary)] hover:bg-red-50 hover:text-[#dc2626] dark:hover:bg-red-950/40 border border-[var(--border-light)] transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
              >
                <span>{topic}</span>
                <ArrowRight className="w-3 h-3 opacity-60" />
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Helper Bar */}
        <div className="mt-5 pt-3 border-t border-[var(--border-light)] flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-light)] font-mono text-[10px]">Enter</kbd> to view all search results</span>
          <button
            type="button"
            onClick={() => executeSearch(query || 'news')}
            className="text-[#dc2626] font-semibold hover:underline inline-flex items-center gap-1"
          >
            <span>Search page</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
