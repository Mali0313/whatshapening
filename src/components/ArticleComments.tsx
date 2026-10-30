'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  ThumbsUp,
  Trash2,
  CornerDownRight,
  Sparkles,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useAuth } from './AuthProvider';

export interface CommentItem {
  id: string;
  articleId: string;
  authorName: string;
  authorEmail?: string;
  authorAvatar?: string;
  isAuthor?: boolean;
  isAdmin?: boolean;
  content: string;
  createdAt: string;
  likes: number;
  likedByMe?: boolean;
}

interface ArticleCommentsProps {
  articleId: string;
  articleTitle: string;
  authorId?: string;
}

export function ArticleComments({
  articleId,
  articleTitle,
  authorId,
}: ArticleCommentsProps) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Storage key
  const storageKey = `wh_comments_${articleId}`;

  // Default seed comments for engagement
  const defaultSeeds: CommentItem[] = [
    {
      id: `seed-1-${articleId}`,
      articleId,
      authorName: 'Kamran Haider',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      content:
        'This is a remarkable development with far-reaching implications. Glad to see in-depth reporting covering this groundbreaking announcement in full detail!',
      createdAt: '2026-10-28T04:00:00.000Z',
      likes: 12,
      likedByMe: false,
    },
    {
      id: `seed-2-${articleId}`,
      articleId,
      authorName: 'Dr. Zeeshan Malik',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
      content:
        'The technological leap here cannot be understated. Looking forward to follow-up coverage as testing milestones unfold.',
      createdAt: '2026-10-28T07:00:00.000Z',
      likes: 7,
      likedByMe: false,
    },
  ];

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setComments(parsed);
          return;
        }
      }
      // If no stored comments, initialize with defaults
      setComments(defaultSeeds);
      localStorage.setItem(storageKey, JSON.stringify(defaultSeeds));
    } catch {
      setComments(defaultSeeds);
    }
  }, [articleId]);

  const saveComments = (updated: CommentItem[]) => {
    setComments(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // storage unavailable
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);

    const commenterName =
      profile?.full_name ||
      user?.user_metadata?.full_name ||
      user?.email?.split('@')[0] ||
      guestName.trim() ||
      'Reader';

    const isArticleAuthor = Boolean(user && authorId && user.id === authorId);
    const isAdmin = Boolean(profile?.role === 'admin');

    const created: CommentItem = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      articleId,
      authorName: commenterName,
      authorEmail: user?.email,
      authorAvatar: profile?.avatar_url || user?.user_metadata?.avatar_url,
      isAuthor: isArticleAuthor,
      isAdmin: isAdmin,
      content: newComment.trim(),
      createdAt: new Date().toISOString(),
      likes: 0,
      likedByMe: false,
    };

    const next = [created, ...comments];
    saveComments(next);
    setNewComment('');
    setReplyingTo(null);
    setIsSubmitting(false);
  };

  const toggleCommentLike = (commentId: string) => {
    const next = comments.map((c) => {
      if (c.id === commentId) {
        const liked = !c.likedByMe;
        return {
          ...c,
          likedByMe: liked,
          likes: liked ? c.likes + 1 : Math.max(0, c.likes - 1),
        };
      }
      return c;
    });
    saveComments(next);
  };

  const handleDeleteComment = (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    const next = comments.filter((c) => c.id !== commentId);
    saveComments(next);
  };

  const formatCommentDate = (dateStr: string) => {
    try {
      if (typeof window === 'undefined') {
        return 'Recently';
      }
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (60 * 1000));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  const currentUserName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    guestName ||
    'You';

  const userInitial = currentUserName.charAt(0).toUpperCase();

  return (
    <section className="mt-14 pt-10 border-t-2 border-[#dc2626]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 text-[#dc2626] flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-headline text-2xl font-bold tracking-tight">
              Reader Discussions
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              {comments.length} {comments.length === 1 ? 'thought' : 'thoughts'} shared on this story
            </p>
          </div>
        </div>

        <span className="text-xs uppercase tracking-wider font-bold text-[#dc2626] bg-red-50 dark:bg-red-950/40 px-3 py-1 rounded-full border border-red-200 dark:border-red-900">
          Editorial Forum
        </span>
      </div>

      {/* New Comment Box */}
      <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-light)] shadow-sm mb-10">
        <form onSubmit={handleAddComment}>
          <div className="flex items-start gap-3">
            {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
              <img
                src={profile?.avatar_url || user?.user_metadata?.avatar_url}
                alt={currentUserName}
                className="w-10 h-10 rounded-full object-cover border border-[var(--border-light)] shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#dc2626] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                {userInitial}
              </div>
            )}

            <div className="flex-1 space-y-3">
              {/* If not logged in, ask for name */}
              {!user && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Your Name (Optional)"
                    className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-[#dc2626] w-full max-w-xs"
                  />
                </div>
              )}

              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="What is your perspective on this report? Share your insights..."
                rows={3}
                required
                className="w-full px-4 py-3 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#dc2626]/20 focus:border-[#dc2626] transition-all resize-none"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline">
                  Civil discourse adhering to editorial community guidelines.
                </span>

                <button
                  type="submit"
                  disabled={isSubmitting || !newComment.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ml-auto"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post Comment</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map((comm) => {
          const isOwn = user?.email && comm.authorEmail === user.email;
          const canDelete = isOwn || profile?.role === 'admin';
          const initial = comm.authorName ? comm.authorName.charAt(0).toUpperCase() : 'R';

          return (
            <div
              key={comm.id}
              className="p-5 rounded-2xl border border-[var(--border-light)] bg-[var(--card-bg)] shadow-sm hover:border-[var(--border-hover,var(--border-light))] transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  {comm.authorAvatar ? (
                    <img
                      src={comm.authorAvatar}
                      alt={comm.authorName}
                      className="w-9 h-9 rounded-full object-cover border border-[var(--border-light)]"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-primary)] flex items-center justify-center font-bold text-xs">
                      {initial}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-headline font-bold text-sm text-[var(--text-primary)]">
                        {comm.authorName}
                      </span>

                      {comm.isAuthor && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-[#dc2626] dark:bg-red-950/60 dark:text-red-300">
                          Author
                        </span>
                      )}

                      {comm.isAdmin && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                          Editor
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                      {formatCommentDate(comm.createdAt)}
                    </span>
                  </div>
                </div>

                {canDelete && (
                  <button
                    onClick={() => handleDeleteComment(comm.id)}
                    className="text-[var(--text-muted)] hover:text-red-600 transition-colors p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                    title="Delete comment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Comment Content */}
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed pl-12 whitespace-pre-line">
                {comm.content}
              </p>

              {/* Comment Interactions */}
              <div className="flex items-center gap-4 pl-12 mt-3 pt-2 text-xs text-[var(--text-muted)]">
                <button
                  onClick={() => toggleCommentLike(comm.id)}
                  className={`inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    comm.likedByMe
                      ? 'text-[#dc2626] font-bold'
                      : 'hover:text-[#dc2626]'
                  }`}
                >
                  <ThumbsUp
                    className={`w-3.5 h-3.5 ${
                      comm.likedByMe ? 'fill-[#dc2626] text-[#dc2626]' : ''
                    }`}
                  />
                  <span>{comm.likes}</span>
                </button>

                <button
                  onClick={() => {
                    setReplyingTo(comm.id);
                    setNewComment(`@${comm.authorName} `);
                  }}
                  className="inline-flex items-center gap-1 hover:text-[#dc2626] transition-colors cursor-pointer"
                >
                  <CornerDownRight className="w-3.5 h-3.5" />
                  <span>Reply</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
