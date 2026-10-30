'use client';

import React, { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface BookmarkButtonProps {
  articleId: string;
  articleTitle?: string;
  className?: string;
}

export function BookmarkButton({ articleId, articleTitle, className = '' }: BookmarkButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkBookmark() {
      if (!user) {
        // Check local storage for guests
        const local = localStorage.getItem(`wh_bm_${articleId}`);
        if (local === 'true') setBookmarked(true);
        return;
      }

      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('bookmarks')
          .select('id')
          .eq('user_id', user.id)
          .eq('article_id', articleId)
          .maybeSingle();

        if (data) setBookmarked(true);
      } catch {
        // Fallback
      }
    }

    checkBookmark();
  }, [user, articleId]);

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      // Toggle in local storage and notify
      const next = !bookmarked;
      setBookmarked(next);
      localStorage.setItem(`wh_bm_${articleId}`, String(next));
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      if (bookmarked) {
        await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('article_id', articleId);
        setBookmarked(false);
      } else {
        await supabase
          .from('bookmarks')
          .insert([{ user_id: user.id, article_id: articleId }]);
        setBookmarked(true);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleBookmark}
      disabled={loading}
      className={`p-2 rounded-full border transition-all cursor-pointer ${
        bookmarked
          ? 'bg-red-50 text-[#dc2626] border-red-200 dark:bg-red-950/40 dark:border-red-800'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--text-muted)] hover:text-[#dc2626] border-[var(--border-light)]'
      } ${className}`}
      title={bookmarked ? 'Remove Bookmark' : 'Bookmark Article'}
      aria-label="Bookmark article"
    >
      <Bookmark
        className={`w-4 h-4 transition-transform ${bookmarked ? 'fill-current scale-110' : ''}`}
      />
    </button>
  );
}
