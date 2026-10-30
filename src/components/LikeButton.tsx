'use client';

import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface LikeButtonProps {
  articleId: string;
  initialLikes?: number;
  className?: string;
  variant?: 'compact' | 'full';
}

export function LikeButton({
  articleId,
  initialLikes = 18,
  className = '',
  variant = 'compact',
}: LikeButtonProps) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check local storage for liked state
    try {
      const storedLiked = localStorage.getItem(`wh_like_${articleId}`);
      if (storedLiked === 'true') {
        setLiked(true);
      }
      const storedCount = localStorage.getItem(`wh_like_count_${articleId}`);
      if (storedCount) {
        setLikes(parseInt(storedCount, 10));
      }
    } catch {
      // Storage unavailable
    }
  }, [articleId]);

  const toggleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);

    const nextLiked = !liked;
    const nextCount = nextLiked ? likes + 1 : Math.max(0, likes - 1);

    setLiked(nextLiked);
    setLikes(nextCount);

    try {
      localStorage.setItem(`wh_like_${articleId}`, String(nextLiked));
      localStorage.setItem(`wh_like_count_${articleId}`, String(nextCount));
    } catch {
      // Storage unavailable
    }
  };

  if (variant === 'full') {
    return (
      <button
        onClick={toggleLike}
        className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border transition-all duration-200 cursor-pointer font-medium text-sm ${
          liked
            ? 'bg-red-50 border-red-500 text-[#dc2626] shadow-sm dark:bg-red-950/40 dark:border-red-600'
            : 'border-[var(--border-light)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:border-[#dc2626] hover:text-[#dc2626]'
        } ${className}`}
        aria-label={liked ? 'Unlike article' : 'Like article'}
      >
        <Heart
          className={`w-5 h-5 transition-transform duration-300 ${
            liked ? 'fill-[#dc2626] text-[#dc2626] scale-110' : 'text-current'
          } ${isAnimating ? 'animate-bounce' : ''}`}
        />
        <span>{liked ? 'Liked' : 'Like'}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 font-bold">
          {likes}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleLike}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all duration-200 cursor-pointer ${
        liked
          ? 'bg-red-50 border-red-500 text-[#dc2626] dark:bg-red-950/40 dark:border-red-600'
          : 'border-[var(--border-light)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:border-[#dc2626] hover:text-[#dc2626]'
      } ${className}`}
      aria-label={liked ? 'Unlike article' : 'Like article'}
      title={liked ? 'Liked by you' : 'Like this article'}
    >
      <Heart
        className={`w-4 h-4 transition-transform ${
          liked ? 'fill-[#dc2626] text-[#dc2626] scale-110' : 'text-current'
        } ${isAnimating ? 'scale-125' : ''}`}
      />
      <span className="font-semibold">{likes}</span>
    </button>
  );
}
