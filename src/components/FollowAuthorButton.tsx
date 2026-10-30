'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface FollowAuthorButtonProps {
  authorId: string;
  authorName?: string;
  initialFollowers?: number;
  className?: string;
}

export function FollowAuthorButton({
  authorId,
  authorName = 'Author',
  initialFollowers = 42,
  className = '',
}: FollowAuthorButtonProps) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(initialFollowers);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`wh_follow_${authorId}`);
      if (stored === 'true') {
        setIsFollowing(true);
      }
      const storedCount = localStorage.getItem(`wh_follow_count_${authorId}`);
      if (storedCount) {
        setFollowerCount(parseInt(storedCount, 10));
      }
    } catch {
      // Storage unavailable
    }
  }, [authorId]);

  const toggleFollow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent following oneself if logged in with same id
    if (user && user.id === authorId) {
      alert("You cannot follow your own author profile.");
      return;
    }

    const nextState = !isFollowing;
    const nextCount = nextState ? followerCount + 1 : Math.max(0, followerCount - 1);

    setIsFollowing(nextState);
    setFollowerCount(nextCount);

    try {
      localStorage.setItem(`wh_follow_${authorId}`, String(nextState));
      localStorage.setItem(`wh_follow_count_${authorId}`, String(nextCount));
    } catch {
      // Storage unavailable
    }
  };

  return (
    <button
      onClick={toggleFollow}
      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
        isFollowing
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-400 hover:bg-red-50 hover:text-red-700 hover:border-red-400 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-600'
          : 'bg-[#dc2626] text-white hover:bg-[#b91c1c] shadow-sm hover:shadow'
      } ${className}`}
      title={isFollowing ? `Unfollow ${authorName}` : `Follow ${authorName}`}
    >
      {isFollowing ? (
        <>
          <UserCheck className="w-3.5 h-3.5" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlus className="w-3.5 h-3.5" />
          <span>Follow</span>
        </>
      )}
      <span
        className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full ${
          isFollowing
            ? 'bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200'
            : 'bg-white/20 text-white'
        }`}
      >
        {followerCount}
      </span>
    </button>
  );
}
