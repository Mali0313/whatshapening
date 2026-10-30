'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  PenSquare,
  FileText,
  Bookmark,
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  ShieldCheck,
  Eye,
  Trash2,
  Edit,
  ExternalLink,
  Plus,
  XCircle,
  Inbox,
  Check,
  Video,
  Play,
  Upload,
  X,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import {
  deleteArticleVideoAction,
  replaceArticleVideoAction,
  deleteArticleWithMediaAction,
} from '@/app/actions/articleVideoActions';
import { validateVideoFile, uploadVideoWithProgress, MAX_VIDEO_SIZE_MB } from '@/lib/videoUpload';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

interface UserArticle {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'pending' | 'published' | 'rejected';
  type: string;
  views: number;
  video_url?: string | null;
  video_path?: string | null;
  is_approved?: boolean;
  rejection_reason?: string | null;
  created_at: string;
}

interface UserBookmark {
  id: string;
  article_id: string;
  created_at: string;
  article: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    cover_image_url: string | null;
    published_at: string;
    category?: {
      name: string;
      slug: string;
    };
  } | null;
}

interface UserNotification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  article_id?: string | null;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');

  const { user, profile, isAdmin, isWriter } = useAuth();
  const [activeMainTab, setActiveMainTab] = useState<'articles' | 'bookmarks' | 'notifications'>(
    'articles'
  );
  const [activeStatusTab, setActiveStatusTab] = useState<
    'all' | 'published' | 'pending' | 'draft' | 'rejected'
  >('all');

  const [articles, setArticles] = useState<UserArticle[]>([]);
  const [bookmarks, setBookmarks] = useState<UserBookmark[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);

  const [loadingArticles, setLoadingArticles] = useState(true);
  const [loadingBookmarks, setLoadingBookmarks] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null
  );

  // Video Management Modals in Writer Dashboard
  const [videoPreviewModal, setVideoPreviewModal] = useState<{
    id: string;
    title: string;
    url: string;
  } | null>(null);
  const [replaceVideoTarget, setReplaceVideoTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isUploadingReplaceVideo, setIsUploadingReplaceVideo] = useState(false);
  const [replaceVideoProgress, setReplaceVideoProgress] = useState(0);
  const [replaceVideoError, setReplaceVideoError] = useState<string | null>(null);

  // 1. Fetch user articles
  const fetchArticles = async () => {
    if (!user) return;
    setLoadingArticles(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('articles')
        .select('id, title, slug, status, type, views, rejection_reason, created_at, video_url, video_path, is_approved')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setArticles(data as UserArticle[]);
      }
    } catch {
      // Safe catch
    } finally {
      setLoadingArticles(false);
    }
  };

  // 2. Fetch bookmarks
  const fetchBookmarks = async () => {
    if (!user) return;
    setLoadingBookmarks(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bookmarks')
        .select('id, article_id, created_at, article:articles(id, title, slug, excerpt, cover_image_url, published_at, category:categories(name, slug))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setBookmarks(data as unknown as UserBookmark[]);
      }
    } catch {
      // Safe catch
    } finally {
      setLoadingBookmarks(false);
    }
  };

  // 3. Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    setLoadingNotifications(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setNotifications(data as UserNotification[]);
      }
    } catch {
      // Safe catch
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchArticles();
      fetchBookmarks();
      fetchNotifications();
    }
  }, [user]);

  // Delete article (including any attached video files in Supabase Storage)
  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('Are you sure you want to permanently delete this article? All attached video and media files will be deleted.')) return;

    try {
      const res = await deleteArticleWithMediaAction(articleId);
      setActionMsg({ type: 'success', text: res.message || 'Article deleted successfully.' });
      setArticles((prev) => prev.filter((a) => a.id !== articleId));
    } catch (err: unknown) {
      setActionMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete article.',
      });
    }
  };

  // Remove video from article (clean up Supabase Storage)
  const handleRemoveVideoFromArticle = async (articleId: string) => {
    if (!confirm('Are you sure you want to remove the video from this article? The file will be permanently deleted from storage.')) return;

    try {
      const res = await deleteArticleVideoAction(articleId);
      setActionMsg({ type: 'success', text: res.message || 'Video removed from post and storage.' });
      setArticles((prev) =>
        prev.map((a) =>
          a.id === articleId
            ? { ...a, video_url: null, video_path: null, is_approved: false }
            : a
        )
      );
      if (videoPreviewModal?.id === articleId) setVideoPreviewModal(null);
    } catch (err: unknown) {
      setActionMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to remove video.',
      });
    }
  };

  // Replace video on article
  const handleWriterReplaceFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replaceVideoTarget || !user) return;

    setReplaceVideoError(null);
    const validation = validateVideoFile(file, user.id);
    if (!validation.valid) {
      setReplaceVideoError(validation.error || 'Invalid video file.');
      return;
    }

    setIsUploadingReplaceVideo(true);
    setReplaceVideoProgress(0);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

      const { videoUrl: newUrl, videoPath: newPath } = await uploadVideoWithProgress({
        file,
        userId: user.id,
        supabaseUrl,
        anonKey,
        accessToken: session?.access_token,
        onProgress: (percent) => setReplaceVideoProgress(percent),
      });

      const res = await replaceArticleVideoAction(replaceVideoTarget.id, newUrl, newPath);
      setActionMsg({
        type: 'success',
        text: res.message || 'Video replaced. It will appear live once approved by an editor.',
      });

      setArticles((prev) =>
        prev.map((a) =>
          a.id === replaceVideoTarget.id
            ? { ...a, video_url: newUrl, video_path: newPath, is_approved: res.is_approved }
            : a
        )
      );

      setReplaceVideoTarget(null);
    } catch (err: unknown) {
      setReplaceVideoError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploadingReplaceVideo(false);
      setReplaceVideoProgress(0);
      if (e.target) e.target.value = '';
    }
  };

  // Remove bookmark
  const handleRemoveBookmark = async (bookmarkId: string) => {
    try {
      const supabase = createClient();
      await supabase.from('bookmarks').delete().eq('id', bookmarkId);
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
      setActionMsg({ type: 'success', text: 'Removed from bookmarks.' });
    } catch {
      // safe
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notifId: string) => {
    try {
      const supabase = createClient();
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notifId);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
    } catch {
      // safe
    }
  };

  const filteredArticles = articles.filter((a) => {
    if (activeStatusTab === 'all') return true;
    return a.status === activeStatusTab;
  });

  const publishedCount = articles.filter((a) => a.status === 'published').length;
  const pendingCount = articles.filter((a) => a.status === 'pending').length;
  const draftCount = articles.filter((a) => a.status === 'draft').length;
  const rejectedCount = articles.filter((a) => a.status === 'rejected').length;
  const unreadNotifs = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 w-full">
      {/* Alert Banner */}
      {actionMsg && (
        <div
          className={`mb-6 p-4 rounded-xl text-xs flex items-center justify-between gap-2.5 ${
            actionMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
          }`}
        >
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="text-current hover:opacity-75">
            Dismiss
          </button>
        </div>
      )}

      {urlError === 'admin_required' && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          <div>
            <strong>Administrator Privileges Required:</strong> Your account is currently assigned the role &ldquo;{profile?.role || 'user'}&rdquo;.
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-light)] pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#dc2626]">
              Newsroom Dashboard
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                profile?.role === 'admin'
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                  : profile?.role === 'writer'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              Role: {profile?.role || 'user'}
            </span>
          </div>
          <h1 className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight">
            Welcome, {profile?.full_name || user?.email?.split('@')[0]}
            <span className="text-[#dc2626]">.</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Manage your articles, drafts, editorial submissions, bookmarks, and account notifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/write"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-semibold uppercase tracking-wider shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Write Story</span>
          </Link>
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[var(--border-light)] text-xs font-semibold hover:border-[#dc2626] hover:text-[#dc2626] transition-colors"
          >
            <User className="w-4 h-4" />
            <span>Edit Profile</span>
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold uppercase tracking-wider shadow-sm transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Panel</span>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-xl border border-[var(--border-light)] bg-[var(--card-bg)] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>Published</span>
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-headline text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            {publishedCount}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Live on platform</p>
        </div>

        <div className="p-5 rounded-xl border border-[var(--border-light)] bg-[var(--card-bg)] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>In Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-headline text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            {pendingCount}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Pending approval</p>
        </div>

        <div className="p-5 rounded-xl border border-[var(--border-light)] bg-[var(--card-bg)] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>Bookmarks</span>
            <Bookmark className="w-4 h-4 text-[#dc2626]" />
          </div>
          <div className="font-headline text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            {bookmarks.length}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Saved articles</p>
        </div>

        <div className="p-5 rounded-xl border border-[var(--border-light)] bg-[var(--card-bg)] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>Notifications</span>
            <Bell className="w-4 h-4 text-purple-600" />
          </div>
          <div className="font-headline text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            {unreadNotifs}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Unread alerts</p>
        </div>
      </div>

      {/* Main Navigation Tabs: Articles, Bookmarks, Notifications */}
      <div className="flex gap-2 border-b border-[var(--border-light)] pb-3 mb-6">
        <button
          onClick={() => setActiveMainTab('articles')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer ${
            activeMainTab === 'articles'
              ? 'bg-[#dc2626] text-white shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>My Articles ({articles.length})</span>
        </button>

        <button
          onClick={() => setActiveMainTab('bookmarks')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer ${
            activeMainTab === 'bookmarks'
              ? 'bg-[#dc2626] text-white shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>My Bookmarks ({bookmarks.length})</span>
        </button>

        <button
          onClick={() => setActiveMainTab('notifications')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer ${
            activeMainTab === 'notifications'
              ? 'bg-[#dc2626] text-white shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
          {unreadNotifs > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
          )}
        </button>
      </div>

      {/* TAB 1: MY ARTICLES */}
      {activeMainTab === 'articles' && (
        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--card-bg)] shadow-sm overflow-hidden">
          {/* Subfilter status pills */}
          <div className="border-b border-[var(--border-light)] px-6 py-4 flex items-center justify-between flex-wrap gap-4">
            <h2 className="font-headline text-lg font-bold">Author Posts</h2>

            <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-light)] text-xs">
              <button
                onClick={() => setActiveStatusTab('all')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeStatusTab === 'all'
                    ? 'bg-[var(--card-bg)] shadow-sm text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                All ({articles.length})
              </button>
              <button
                onClick={() => setActiveStatusTab('published')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeStatusTab === 'published'
                    ? 'bg-[var(--card-bg)] shadow-sm text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Published ({publishedCount})
              </button>
              <button
                onClick={() => setActiveStatusTab('pending')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeStatusTab === 'pending'
                    ? 'bg-[var(--card-bg)] shadow-sm text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setActiveStatusTab('draft')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeStatusTab === 'draft'
                    ? 'bg-[var(--card-bg)] shadow-sm text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Drafts ({draftCount})
              </button>
              <button
                onClick={() => setActiveStatusTab('rejected')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeStatusTab === 'rejected'
                    ? 'bg-[var(--card-bg)] shadow-sm text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Rejected ({rejectedCount})
              </button>
            </div>
          </div>

          {/* List of articles */}
          {loadingArticles ? (
            <div className="p-12 text-center text-xs text-[var(--text-muted)] animate-pulse">
              Loading your articles...
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 text-[#dc2626] dark:bg-red-950/50 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-headline text-lg font-bold mb-1">No articles in this view</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto mb-4">
                You haven&apos;t written any stories matching this status yet.
              </p>
              <Link
                href="/write"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#dc2626] text-white text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Write New Story
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-light)]">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="p-5 sm:px-6 hover:bg-[var(--bg-secondary)] transition-colors space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            article.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : article.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : article.status === 'rejected'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                          }`}
                        >
                          {article.status}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {new Date(article.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)]">&bull;</span>
                        <span className="text-[11px] text-[var(--text-muted)] uppercase">
                          {article.type}
                        </span>
                      </div>

                      {article.status === 'published' ? (
                        <Link
                          href={`/news/${article.slug}`}
                          className="font-headline font-bold text-lg hover:text-[#dc2626] transition-colors"
                        >
                          {article.title}
                        </Link>
                      ) : (
                        <h3 className="font-headline font-bold text-lg">{article.title}</h3>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="hidden sm:flex items-center gap-1 text-xs text-[var(--text-muted)] mr-2">
                        <Eye className="w-3.5 h-3.5" /> {article.views} views
                      </span>

                      {/* Edit Button */}
                      <Link
                        href={`/write?edit=${article.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border-light)] hover:border-[#dc2626] hover:text-[#dc2626] text-xs font-semibold transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Link>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteArticle(article.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold transition-colors cursor-pointer"
                        title="Delete this article and attached files"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Video Attachment Strip & Writer Actions */}
                  {article.video_url ? (
                    <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() =>
                            setVideoPreviewModal({
                              id: article.id,
                              title: article.title,
                              url: article.video_url!,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/85 text-white text-[11px] font-bold hover:bg-[#dc2626] transition-colors cursor-pointer shadow-xs"
                          title="Watch video preview"
                        >
                          <Play className="w-3 h-3 fill-current text-[#dc2626]" />
                          <span>Watch Video</span>
                        </button>

                        {article.is_approved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Video Approved & Live</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[11px] font-semibold"
                            title="Editors review attached videos before they appear on the public site"
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Video Pending Review</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <button
                          onClick={() => setReplaceVideoTarget({ id: article.id, title: article.title })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--border-light)] hover:border-[#dc2626] hover:text-[#dc2626] font-medium transition-colors cursor-pointer bg-[var(--card-bg)] text-[var(--text-primary)]"
                          title="Replace this video file"
                        >
                          <Upload className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          <span>Replace Video</span>
                        </button>

                        <button
                          onClick={() => handleRemoveVideoFromArticle(article.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 font-medium transition-colors cursor-pointer bg-[var(--card-bg)]"
                          title="Remove video and delete file from storage"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Video</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] pt-0.5">
                      <Video className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>No video attached</span>
                      <span>&bull;</span>
                      <Link
                        href={`/write?edit=${article.id}`}
                        className="text-[#dc2626] hover:underline font-medium"
                      >
                        + Attach a video
                      </Link>
                    </div>
                  )}

                  {/* REJECTION REASON SHOWN IF REJECTED */}
                  {article.status === 'rejected' && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-300 flex items-start gap-2">
                      <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#dc2626]" />
                      <div>
                        <strong>Editorial Decision (Rejection Reason):</strong>{' '}
                        <span>
                          {article.rejection_reason ||
                            'Does not align with current editorial guidelines. You may revise and resubmit.'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY BOOKMARKS */}
      {activeMainTab === 'bookmarks' && (
        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--card-bg)] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[var(--border-light)]">
            <h2 className="font-headline text-lg font-bold">Saved Reading List</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Articles and essays you have marked to read later.
            </p>
          </div>

          {loadingBookmarks ? (
            <div className="p-12 text-center text-xs text-[var(--text-muted)] animate-pulse">
              Loading saved bookmarks...
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 text-[#dc2626] dark:bg-red-950/50 flex items-center justify-center mx-auto mb-3">
                <Bookmark className="w-6 h-6" />
              </div>
              <h3 className="font-headline text-lg font-bold mb-1">No bookmarks yet</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto mb-4">
                Click the bookmark ribbon icon on any article to save it to this private list.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#dc2626] text-white text-xs font-semibold"
              >
                Browse Top Stories
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-light)]">
              {bookmarks.map((bm) => {
                const art = bm.article;
                if (!art) return null;
                return (
                  <div
                    key={bm.id}
                    className="p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <div className="flex gap-4 items-center">
                      {art.cover_image_url && (
                        <div className="w-20 h-14 rounded-lg overflow-hidden bg-[var(--bg-secondary)] shrink-0 hidden sm:block">
                          <img
                            src={art.cover_image_url}
                            alt={art.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div>
                        {art.category && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#dc2626] block mb-1">
                            {art.category.name}
                          </span>
                        )}
                        <Link
                          href={`/news/${art.slug}`}
                          className="font-headline font-bold text-base hover:text-[#dc2626] transition-colors line-clamp-1"
                        >
                          {art.title}
                        </Link>
                        <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
                          Saved on {new Date(bm.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Link
                        href={`/news/${art.slug}`}
                        className="px-3 py-1.5 rounded-lg border border-[var(--border-light)] hover:border-[#dc2626] text-xs font-medium transition-colors inline-flex items-center gap-1"
                      >
                        <span>Read</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        onClick={() => handleRemoveBookmark(bm.id)}
                        className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium transition-colors cursor-pointer"
                        title="Remove from bookmarks"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MY NOTIFICATIONS */}
      {activeMainTab === 'notifications' && (
        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--card-bg)] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between">
            <div>
              <h2 className="font-headline text-lg font-bold">Editorial Alerts & Notifications</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Updates regarding article approval, reviews, or editorial notes.
              </p>
            </div>
            {unreadNotifs > 0 && (
              <span className="text-xs font-semibold bg-red-100 text-[#dc2626] px-2.5 py-1 rounded-full">
                {unreadNotifs} Unread
              </span>
            )}
          </div>

          {loadingNotifications ? (
            <div className="p-12 text-center text-xs text-[var(--text-muted)] animate-pulse">
              Loading alerts...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-950/50 flex items-center justify-center mx-auto mb-3">
                <Inbox className="w-6 h-6" />
              </div>
              <h3 className="font-headline text-lg font-bold mb-1">No notifications</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                You are all caught up! Editorial reviews and system alerts will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-light)]">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-5 sm:px-6 flex items-start justify-between gap-4 transition-colors ${
                    !n.is_read ? 'bg-red-50/40 dark:bg-red-950/20' : 'hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-[#dc2626] shrink-0" />
                      )}
                      <h4 className="font-bold text-sm text-[var(--text-primary)]">{n.title}</h4>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed pl-4">
                      {n.message}
                    </p>
                  </div>

                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      className="px-2.5 py-1 rounded text-xs font-medium text-[var(--text-muted)] hover:text-[#dc2626] border border-[var(--border-light)] shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark Read</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Video Preview Modal (Writer) */}
      {videoPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[var(--card-bg)] border border-[var(--border-light)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-light)]">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-[#dc2626]" />
                <h3 className="font-headline font-bold text-sm truncate max-w-md">
                  {videoPreviewModal.title}
                </h3>
              </div>
              <button
                onClick={() => setVideoPreviewModal(null)}
                className="p-1 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-[16/9] w-full bg-black">
              <video
                src={videoPreviewModal.url}
                controls
                autoPlay
                preload="metadata"
                className="w-full h-full object-contain"
              >
                Your browser does not support HTML5 video.
              </video>
            </div>

            <div className="p-4 bg-[var(--bg-secondary)]/50 border-t border-[var(--border-light)] flex items-center justify-end">
              <button
                onClick={() => setVideoPreviewModal(null)}
                className="px-4 py-1.5 rounded-lg border border-[var(--border-light)] text-xs font-semibold hover:bg-[var(--bg-secondary)] cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replace Video Modal (Writer) */}
      {replaceVideoTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--card-bg)] border border-[var(--border-light)] rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#dc2626]" />
                <h3 className="font-headline font-bold text-base">Replace Video</h3>
              </div>
              <button
                onClick={() => {
                  if (!isUploadingReplaceVideo) setReplaceVideoTarget(null);
                }}
                disabled={isUploadingReplaceVideo}
                className="p-1 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
              Upload a replacement video for: <br />
              <strong className="text-[var(--text-primary)]">&ldquo;{replaceVideoTarget.title}&rdquo;</strong>.<br />
              <span className="text-[var(--text-muted)]">
                The old video will be deleted from storage. New video uploads require editorial approval before appearing publicly.
              </span>
            </p>

            {/* Upload Zone */}
            <div className="border-2 border-dashed border-[var(--border-light)] hover:border-[#dc2626] rounded-xl p-6 text-center transition-colors mb-4 bg-[var(--bg-secondary)]/30">
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleWriterReplaceFileInput}
                disabled={isUploadingReplaceVideo}
                className="hidden"
                id="writer-video-replace-input"
              />
              <label
                htmlFor="writer-video-replace-input"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <Upload className="w-8 h-8 text-[#dc2626] mb-2 animate-bounce" />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Choose Replacement File
                </span>
                <span className="text-[10px] text-[var(--text-muted)] mt-1">
                  Allowed: MP4, WebM, MOV &bull; Max {MAX_VIDEO_SIZE_MB}MB
                </span>
              </label>
            </div>

            {isUploadingReplaceVideo && (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Uploading video...</span>
                  <span className="text-[#dc2626]">{replaceVideoProgress}%</span>
                </div>
                <div className="w-full bg-[var(--bg-secondary)] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#dc2626] h-full transition-all duration-150"
                    style={{ width: `${replaceVideoProgress}%` }}
                  />
                </div>
              </div>
            )}

            {replaceVideoError && (
              <div className="p-3 mb-4 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                {replaceVideoError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setReplaceVideoTarget(null)}
                disabled={isUploadingReplaceVideo}
                className="px-4 py-2 rounded-xl border border-[var(--border-light)] text-xs font-semibold text-[var(--text-muted)] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<div className="p-8 text-center text-xs text-[var(--text-muted)]">Loading dashboard...</div>}>
          <DashboardContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
