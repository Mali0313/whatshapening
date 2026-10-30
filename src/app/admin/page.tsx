'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Users,
  FileText,
  FolderTree,
  ArrowLeft,
  AlertCircle,
  Eye,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  Edit3,
  Star,
  Zap,
  Plus,
  ExternalLink,
  Check,
  X,
  TrendingUp,
  BarChart3,
  UserCheck,
  Shield,
  Clock,
  Layers,
  Video,
  Play,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SupabaseStatusBadge } from '@/components/SupabaseStatusBadge';
import { createClient } from '@/lib/supabase/client';
import { validateVideoFile, uploadVideoWithProgress, MAX_VIDEO_SIZE_MB } from '@/lib/videoUpload';
import {
  getAdminOverview,
  getAdminPendingArticles,
  approveArticle,
  rejectArticle,
  getAllAdminArticles,
  toggleArticleFlag,
  deleteArticleAdmin,
  toggleVideoApproval,
  deleteArticleVideoAdmin,
  replaceArticleVideoAdmin,
  getAdminUsers,
  updateUserRole,
  deleteUserAdmin,
  getAdminCategories,
  createCategoryAdmin,
  updateCategoryAdmin,
  deleteCategoryAdmin,
} from '@/app/admin/actions';

interface OverviewMetrics {
  totalArticles: number;
  pendingApprovals: number;
  totalUsers: number;
  totalWriters: number;
  totalViews: number;
}

interface ArticleItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  cover_image_url?: string | null;
  category_id?: string | null;
  type?: string;
  status: 'draft' | 'pending' | 'published' | 'rejected';
  is_breaking?: boolean;
  is_featured?: boolean;
  views?: number;
  video_url?: string | null;
  video_path?: string | null;
  video_duration?: number | null;
  is_approved?: boolean;
  rejection_reason?: string | null;
  created_at: string;
  published_at?: string | null;
  category?: { id?: string; name: string; slug: string } | null;
  author?: { id?: string; full_name: string | null; avatar_url: string | null; role: string } | null;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'writer' | 'admin';
  bio?: string | null;
  created_at: string;
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export default function AdminPage() {
  const { user, profile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'pending' | 'articles' | 'users' | 'categories'
  >('overview');

  const [isPendingAction, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Data states
  const [overview, setOverview] = useState<OverviewMetrics>({
    totalArticles: 0,
    pendingApprovals: 0,
    totalUsers: 0,
    totalWriters: 0,
    totalViews: 0,
  });
  const [pendingList, setPendingList] = useState<ArticleItem[]>([]);
  const [allArticles, setAllArticles] = useState<ArticleItem[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([]);

  // Filter states for 'all articles'
  const [articleSearch, setArticleSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [videoFilter, setVideoFilter] = useState<'all' | 'with_video' | 'pending_video'>('all');

  // Video Management Modals
  const [videoPreviewModal, setVideoPreviewModal] = useState<{
    id: string;
    title: string;
    url: string;
    isApproved?: boolean;
  } | null>(null);
  const [replaceVideoModal, setReplaceVideoModal] = useState<{
    id: string;
    title: string;
    currentPath?: string;
  } | null>(null);
  const [isUploadingReplaceVideo, setIsUploadingReplaceVideo] = useState(false);
  const [replaceVideoProgress, setReplaceVideoProgress] = useState(0);
  const [replaceVideoError, setReplaceVideoError] = useState<string | null>(null);

  // Filter states for users
  const [userSearch, setUserSearch] = useState('');

  // Modals state
  const [previewArticle, setPreviewArticle] = useState<ArticleItem | null>(null);
  const [rejectingArticle, setRejectingArticle] = useState<ArticleItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [catNameInput, setCatNameInput] = useState('');
  const [catDescInput, setCatDescInput] = useState('');
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    type: 'article' | 'user' | 'category';
    id: string;
    name: string;
  } | null>(null);

  // Initial Data Fetch
  const loadInitialData = async () => {
    setLoading(true);
    setActionNotice(null);
    try {
      const [ovRes, pendRes, artRes, usrRes, catRes] = await Promise.all([
        getAdminOverview(),
        getAdminPendingArticles(),
        getAllAdminArticles(),
        getAdminUsers(),
        getAdminCategories(),
      ]);

      if (ovRes.success && ovRes.data) setOverview(ovRes.data);
      if (pendRes.success && pendRes.data) setPendingList(pendRes.data as ArticleItem[]);
      if (artRes.success && artRes.data) setAllArticles(artRes.data as ArticleItem[]);
      if (usrRes.success && usrRes.data) setUsersList(usrRes.data as UserProfile[]);
      if (catRes.success && catRes.data) setCategoriesList(catRes.data as CategoryItem[]);
    } catch (err: unknown) {
      setActionNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error loading admin data.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Filter articles on changes
  const handleFilterArticles = async (searchVal: string, statusVal: string, catVal: string) => {
    try {
      const res = await getAllAdminArticles({
        search: searchVal,
        status: statusVal,
        categoryId: catVal,
      });
      if (res.success && res.data) {
        setAllArticles(res.data as ArticleItem[]);
      }
    } catch {
      // safe fallback
    }
  };

  // 1. APPROVE ARTICLE
  const handleApprove = (articleId: string) => {
    startTransition(async () => {
      try {
        const res = await approveArticle(articleId);
        setActionNotice({ type: 'success', text: res.message || 'Article approved and published!' });
        setPendingList((prev) => prev.filter((a) => a.id !== articleId));
        setOverview((prev) => ({
          ...prev,
          pendingApprovals: Math.max(0, prev.pendingApprovals - 1),
          totalArticles: prev.totalArticles + 1,
        }));
        // Refresh articles list
        const refreshed = await getAllAdminArticles();
        if (refreshed.data) setAllArticles(refreshed.data as ArticleItem[]);
      } catch (err: unknown) {
        setActionNotice({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to approve article.',
        });
      }
    });
  };

  // 2. REJECT ARTICLE
  const handleReject = () => {
    if (!rejectingArticle) return;
    startTransition(async () => {
      try {
        const res = await rejectArticle(rejectingArticle.id, rejectionReason);
        setActionNotice({ type: 'success', text: res.message || 'Article rejected with note sent.' });
        setPendingList((prev) => prev.filter((a) => a.id !== rejectingArticle.id));
        setOverview((prev) => ({
          ...prev,
          pendingApprovals: Math.max(0, prev.pendingApprovals - 1),
        }));
        setRejectingArticle(null);
        setRejectionReason('');
        // Refresh articles list
        const refreshed = await getAllAdminArticles();
        if (refreshed.data) setAllArticles(refreshed.data as ArticleItem[]);
      } catch (err: unknown) {
        setActionNotice({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to reject article.',
        });
      }
    });
  };

  // 3. TOGGLE BREAKING / FEATURED
  const handleToggleFlag = (articleId: string, flag: 'is_breaking' | 'is_featured', currentVal: boolean) => {
    const newVal = !currentVal;
    // Optimistic UI update
    setAllArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, [flag]: newVal } : a))
    );
    startTransition(async () => {
      try {
        await toggleArticleFlag(articleId, flag, newVal);
        setActionNotice({
          type: 'success',
          text: `Article flag ${flag === 'is_breaking' ? 'Breaking' : 'Featured'} set to ${newVal ? 'ON' : 'OFF'}.`,
        });
      } catch (err: unknown) {
        // Revert on error
        setAllArticles((prev) =>
          prev.map((a) => (a.id === articleId ? { ...a, [flag]: currentVal } : a))
        );
        setActionNotice({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to update flag.',
        });
      }
    });
  };

  // 3b. TOGGLE VIDEO APPROVAL (is_approved review flag)
  const handleToggleVideoApproval = (articleId: string, newApproved: boolean) => {
    // Optimistic UI update
    setAllArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, is_approved: newApproved } : a))
    );
    setPendingList((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, is_approved: newApproved } : a))
    );

    startTransition(async () => {
      try {
        const res = await toggleVideoApproval(articleId, newApproved);
        setActionNotice({
          type: 'success',
          text: res.message || 'Video approval status updated.',
        });
      } catch (err: unknown) {
        // Revert on error
        setAllArticles((prev) =>
          prev.map((a) => (a.id === articleId ? { ...a, is_approved: !newApproved } : a))
        );
        setActionNotice({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to update video approval.',
        });
      }
    });
  };

  // 3c. DELETE VIDEO FROM ARTICLE (Admin)
  const handleDeleteVideo = (articleId: string) => {
    if (!confirm('Permanently delete this video? The file will be deleted from Supabase Storage.')) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await deleteArticleVideoAdmin(articleId);
        setActionNotice({ type: 'success', text: res.message || 'Video deleted.' });
        setAllArticles((prev) =>
          prev.map((a) =>
            a.id === articleId
              ? { ...a, video_url: null, video_path: null, is_approved: false }
              : a
          )
        );
        setVideoPreviewModal(null);
      } catch (err: unknown) {
        setActionNotice({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to delete video.',
        });
      }
    });
  };

  // 3d. REPLACE VIDEO (Admin file upload)
  const handleAdminReplaceFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replaceVideoModal || !user) return;

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

      const res = await replaceArticleVideoAdmin(replaceVideoModal.id, newUrl, newPath);
      setActionNotice({ type: 'success', text: res.message || 'Video replaced successfully.' });

      setAllArticles((prev) =>
        prev.map((a) =>
          a.id === replaceVideoModal.id
            ? { ...a, video_url: newUrl, video_path: newPath, is_approved: true }
            : a
        )
      );

      setReplaceVideoModal(null);
    } catch (err: unknown) {
      setReplaceVideoError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploadingReplaceVideo(false);
      setReplaceVideoProgress(0);
      if (e.target) e.target.value = '';
    }
  };

  // 4. USER ROLE CHANGE
  const handleRoleChange = (userId: string, newRole: 'user' | 'writer' | 'admin') => {
    startTransition(async () => {
      try {
        const res = await updateUserRole(userId, newRole);
        setActionNotice({ type: 'success', text: res.message || `Role updated to ${newRole}.` });
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        // Refresh overview counts
        const ovRes = await getAdminOverview();
        if (ovRes.data) setOverview(ovRes.data);
      } catch (err: unknown) {
        setActionNotice({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to update user role.',
        });
      }
    });
  };

  // 5. DELETE ACTIONS (Article, User, Category)
  const handleConfirmDelete = () => {
    if (!confirmDeleteModal) return;
    const { type, id } = confirmDeleteModal;

    startTransition(async () => {
      try {
        if (type === 'article') {
          const res = await deleteArticleAdmin(id);
          setActionNotice({ type: 'success', text: res.message || 'Article deleted.' });
          setAllArticles((prev) => prev.filter((a) => a.id !== id));
          setPendingList((prev) => prev.filter((a) => a.id !== id));
        } else if (type === 'user') {
          const res = await deleteUserAdmin(id);
          setActionNotice({ type: 'success', text: res.message || 'User deleted and banned.' });
          setUsersList((prev) => prev.filter((u) => u.id !== id));
        } else if (type === 'category') {
          const res = await deleteCategoryAdmin(id);
          setActionNotice({ type: 'success', text: res.message || 'Category deleted.' });
          setCategoriesList((prev) => prev.filter((c) => c.id !== id));
        }
        setConfirmDeleteModal(null);
      } catch (err: unknown) {
        setActionNotice({
          type: 'error',
          text: err instanceof Error ? err.message : 'Delete operation failed.',
        });
      }
    });
  };

  // 6. CATEGORIES (Add & Update)
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNameInput.trim()) return;

    startTransition(async () => {
      try {
        if (editingCategory) {
          const res = await updateCategoryAdmin(editingCategory.id, catNameInput, catDescInput);
          setActionNotice({ type: 'success', text: res.message || 'Category updated.' });
          setCategoriesList((prev) =>
            prev.map((c) =>
              c.id === editingCategory.id
                ? { ...c, name: catNameInput.trim(), description: catDescInput.trim() || null }
                : c
            )
          );
        } else {
          const res = await createCategoryAdmin(catNameInput, catDescInput);
          setActionNotice({ type: 'success', text: res.message || 'Category created.' });
          const catRes = await getAdminCategories();
          if (catRes.data) setCategoriesList(catRes.data as CategoryItem[]);
        }
        setIsAddCatModalOpen(false);
        setEditingCategory(null);
        setCatNameInput('');
        setCatDescInput('');
      } catch (err: unknown) {
        setActionNotice({
          type: 'error',
          text: err instanceof Error ? err.message : 'Category action failed.',
        });
      }
    });
  };

  const filteredUsers = usersList.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-10 w-full">
        {/* Top Breadcrumb & Controls */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[#dc2626] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to User Dashboard
          </Link>

          <div className="flex items-center gap-2">
            <SupabaseStatusBadge />
            <button
              onClick={loadInitialData}
              disabled={loading || isPendingAction}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-light)] text-xs font-medium bg-[var(--card-bg)] hover:border-[#dc2626] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading || isPendingAction ? 'animate-spin text-[#dc2626]' : ''}`} />
              Refresh Console
            </button>
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-[#dc2626] dark:bg-red-950/60 dark:text-red-400 text-[11px] font-bold uppercase tracking-wider">
              <Shield className="w-3 h-3" />
              Role: Admin
            </div>
          </div>
        </div>

        {/* Admin Header Title */}
        <div className="border-b border-[var(--border-light)] pb-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#dc2626] mb-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              Protected Authority Room
            </div>
            <h1 className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight">
              Administrative Command Center<span className="text-[#dc2626]">.</span>
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
              Oversee editorial queues, manage contributor privileges, enforce publishing standards, and curate news desks.
            </p>
          </div>
        </div>

        {/* Global Feedback Alert */}
        {actionNotice && (
          <div
            className={`mb-6 p-4 rounded-xl text-xs sm:text-sm flex items-start gap-3 transition-all ${
              actionNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-red-50 text-red-900 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
            }`}
          >
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-[#dc2626]" />
            )}
            <div className="flex-1 font-medium">{actionNotice.text}</div>
            <button
              onClick={() => setActionNotice(null)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-[var(--border-light)] pb-3 mb-8 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'overview'
                ? 'bg-[#dc2626] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 relative ${
              activeTab === 'pending'
                ? 'bg-[#dc2626] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Approvals</span>
            {pendingList.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'pending'
                    ? 'bg-white text-[#dc2626]'
                    : 'bg-[#dc2626] text-white'
                }`}
              >
                {pendingList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('articles')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'articles'
                ? 'bg-[#dc2626] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>All Articles</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'users'
                ? 'bg-[#dc2626] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users & Roles</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'categories'
                ? 'bg-[#dc2626] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Categories</span>
          </button>
        </div>

        {/* ========================================================
            TAB 1: OVERVIEW METRICS
        ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* 5 Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Total Articles */}
              <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-light)] shadow-sm hover:border-[#dc2626]/40 transition-colors">
                <div className="flex items-center justify-between text-[var(--text-muted)] mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Articles</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold font-headline">
                  {overview.totalArticles.toLocaleString()}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center gap-1">
                  <span className="text-emerald-600 font-semibold flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5" /> Live
                  </span>
                  published & drafts
                </div>
              </div>

              {/* Pending Approvals */}
              <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-light)] shadow-sm hover:border-amber-500/40 transition-colors">
                <div className="flex items-center justify-between text-[var(--text-muted)] mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Pending Review</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold font-headline text-amber-600 dark:text-amber-400">
                  {overview.pendingApprovals}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-1">
                  Awaiting editor sign-off
                </div>
              </div>

              {/* Total Users */}
              <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-light)] shadow-sm hover:border-purple-500/40 transition-colors">
                <div className="flex items-center justify-between text-[var(--text-muted)] mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Users</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold font-headline">
                  {overview.totalUsers.toLocaleString()}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-1">
                  Registered accounts
                </div>
              </div>

              {/* Writers */}
              <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-light)] shadow-sm hover:border-indigo-500/40 transition-colors">
                <div className="flex items-center justify-between text-[var(--text-muted)] mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Active Writers</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold font-headline">
                  {overview.totalWriters.toLocaleString()}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-1">
                  Direct-publish privilege
                </div>
              </div>

              {/* Total Views */}
              <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-light)] shadow-sm hover:border-red-500/40 transition-colors">
                <div className="flex items-center justify-between text-[var(--text-muted)] mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Readership</span>
                  <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/50 text-[#dc2626] flex items-center justify-center">
                    <Eye className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold font-headline text-[#dc2626]">
                  {overview.totalViews.toLocaleString()}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-1">
                  Total article page views
                </div>
              </div>
            </div>

            {/* Quick Actions & Editorial Workflow Guide */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-light)] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center justify-center mb-4">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="font-headline font-bold text-lg mb-1">
                    Editorial Review Queue
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    There are currently{' '}
                    <span className="font-bold text-[#dc2626]">
                      {overview.pendingApprovals} stories
                    </span>{' '}
                    submitted by community contributors waiting for review and fact-checking.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('pending')}
                  className="mt-5 w-full py-2.5 px-4 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  Inspect Pending Submissions
                </button>
              </div>

              <div className="p-6 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-light)] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 flex items-center justify-center mb-4">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="font-headline font-bold text-lg mb-1">
                    Manage Contributor Roles
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Promote regular users to vetted writers so their stories publish instantly without going through the pending review queue.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('users')}
                  className="mt-5 w-full py-2.5 px-4 rounded-xl border border-[var(--border-light)] hover:border-[#dc2626] hover:text-[#dc2626] text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  View All Contributor Roles
                </button>
              </div>

              <div className="p-6 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-light)] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-[#dc2626] dark:bg-red-950/60 dark:text-red-400 flex items-center justify-center mb-4">
                    <FolderTree className="w-5 h-5" />
                  </div>
                  <h3 className="font-headline font-bold text-lg mb-1">
                    Editorial Desks & Categories
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Organize your coverage into topical categories (Pakistan, World, Tech, Business, Opinion) and manage active desks.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('categories')}
                  className="mt-5 w-full py-2.5 px-4 rounded-xl border border-[var(--border-light)] hover:border-[#dc2626] hover:text-[#dc2626] text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  Configure Desks
                </button>
              </div>
            </div>

            {/* Server-Side & RLS Security Status Banner */}
            <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-emerald-200 dark:border-emerald-900/60 shadow-sm flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex-1 text-xs">
                <div className="font-bold text-sm text-[var(--text-primary)] mb-0.5">
                  Full Server-Side & Row Level Security (RLS) Active
                </div>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  Every action performed in this panel executes through Next.js Server Actions with <code className="px-1 py-0.5 rounded bg-[var(--bg-secondary)] font-mono text-[11px]">verifyAdminAuth()</code> checking profile permissions against Supabase Auth. Even if UI controls were manipulated, direct database operations are denied by Postgres RLS policies unless calling from an authentic administrator account.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: PENDING ARTICLES
        ======================================================== */}
        {activeTab === 'pending' && (
          <div className="bg-[var(--card-bg)] border border-[var(--border-light)] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-[var(--border-light)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="font-headline font-bold text-lg">Submissions Awaiting Approval</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Articles submitted by standard community users that require editorial clearance.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 self-start sm:self-auto">
                {pendingList.length} Pending
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-[var(--text-muted)] animate-pulse">
                Loading editorial queue...
              </div>
            ) : pendingList.length === 0 ? (
              <div className="p-16 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-headline font-bold text-base mb-1">Queue Clear</h3>
                <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                  All community submissions have been reviewed and approved or addressed.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-light)]">
                {pendingList.map((article) => (
                  <div
                    key={article.id}
                    className="p-5 sm:p-6 hover:bg-[var(--bg-secondary)]/50 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Article info */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Pending Review
                          </span>
                          {article.category && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-light)]">
                              {article.category.name}
                            </span>
                          )}
                          {article.video_url && (
                            <button
                              onClick={() =>
                                setVideoPreviewModal({
                                  id: article.id,
                                  title: article.title,
                                  url: article.video_url!,
                                  isApproved: article.is_approved,
                                })
                              }
                              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/85 text-white flex items-center gap-1 hover:bg-[#dc2626] transition-colors cursor-pointer shadow-xs"
                              title="Click to preview video dispatch"
                            >
                              <Play className="w-2.5 h-2.5 fill-current text-[#dc2626]" /> Attached Video
                            </button>
                          )}
                          <span className="text-xs text-[var(--text-muted)]">
                            Submitted on {new Date(article.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <h3 className="font-headline font-bold text-xl text-[var(--text-primary)] hover:text-[#dc2626] transition-colors">
                          {article.title}
                        </h3>

                        {article.excerpt && (
                          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 max-w-3xl">
                            {article.excerpt}
                          </p>
                        )}

                        <div className="flex items-center gap-2 pt-1 text-xs text-[var(--text-muted)]">
                          <span className="font-medium text-[var(--text-primary)]">
                            Author: {article.author?.full_name || 'Community Member'}
                          </span>
                          <span>&bull;</span>
                          <span className="font-mono text-[11px]">ID: {article.id.slice(0, 10)}...</span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
                        <button
                          onClick={() => setPreviewArticle(article)}
                          className="px-3.5 py-2 rounded-xl border border-[var(--border-light)] hover:border-[#dc2626] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer bg-[var(--card-bg)]"
                        >
                          <Eye className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          <span>Preview</span>
                        </button>

                        <button
                          onClick={() => handleApprove(article.id)}
                          disabled={isPendingAction}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve & Publish</span>
                        </button>

                        <button
                          onClick={() => {
                            setRejectingArticle(article);
                            setRejectionReason('');
                          }}
                          disabled={isPendingAction}
                          className="px-3.5 py-2 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject...</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 3: ALL ARTICLES
        ======================================================== */}
        {activeTab === 'articles' && (
          <div className="space-y-6">
            {/* Search & Filter Bar */}
            <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-light)] shadow-sm flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search articles by title or content snippet..."
                  value={articleSearch}
                  onChange={(e) => {
                    setArticleSearch(e.target.value);
                    handleFilterArticles(e.target.value, statusFilter, categoryFilter);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] focus:border-[#dc2626] focus:outline-none"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    handleFilterArticles(articleSearch, e.target.value, categoryFilter);
                  }}
                  className="w-full md:w-auto px-3 py-2 text-xs font-medium rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] focus:border-[#dc2626] focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="pending">Pending</option>
                  <option value="draft">Draft</option>
                  <option value="rejected">Rejected</option>
                </select>

                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    handleFilterArticles(articleSearch, statusFilter, e.target.value);
                  }}
                  className="w-full md:w-auto px-3 py-2 text-xs font-medium rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] focus:border-[#dc2626] focus:outline-none"
                >
                  <option value="all">All Desks</option>
                  {categoriesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Video / Media Review Filter */}
                <select
                  value={videoFilter}
                  onChange={(e) => setVideoFilter(e.target.value as 'all' | 'with_video' | 'pending_video')}
                  className="w-full md:w-auto px-3 py-2 text-xs font-medium rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] focus:border-[#dc2626] focus:outline-none"
                >
                  <option value="all">All Media</option>
                  <option value="with_video">📹 Has Attached Video</option>
                  <option value="pending_video">⏳ Video Pending Review</option>
                </select>

                <Link
                  href="/write"
                  className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider shrink-0 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Story
                </Link>
              </div>
            </div>

            {/* Articles Table */}
            <div className="bg-[var(--card-bg)] border border-[var(--border-light)] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-muted)] font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Headline / Story</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Desk</th>
                      <th className="py-3 px-3 text-center">Video & Review</th>
                      <th className="py-3 px-3 text-center">Breaking</th>
                      <th className="py-3 px-3 text-center">Featured</th>
                      <th className="py-3 px-3 text-right">Views</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-light)]">
                    {allArticles.filter((art) => {
                      if (videoFilter === 'with_video') return Boolean(art.video_url);
                      if (videoFilter === 'pending_video') return Boolean(art.video_url && !art.is_approved);
                      return true;
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[var(--text-muted)]">
                          No stories match the selected criteria.
                        </td>
                      </tr>
                    ) : (
                      allArticles.filter((art) => {
                        if (videoFilter === 'with_video') return Boolean(art.video_url);
                        if (videoFilter === 'pending_video') return Boolean(art.video_url && !art.is_approved);
                        return true;
                      }).map((art) => (
                        <tr
                          key={art.id}
                          className="hover:bg-[var(--bg-secondary)]/50 transition-colors"
                        >
                          {/* Story Info */}
                          <td className="py-3.5 px-4 max-w-sm">
                            <div className="font-headline font-bold text-sm text-[var(--text-primary)] hover:text-[#dc2626] transition-colors line-clamp-1">
                              {art.title}
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5">
                              <span>By {art.author?.full_name || 'Contributor'}</span>
                              <span>&bull;</span>
                              <span>{new Date(art.created_at).toLocaleDateString()}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                art.status === 'published'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : art.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : art.status === 'rejected'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                                  : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                              }`}
                            >
                              {art.status}
                            </span>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-3 text-[var(--text-secondary)] whitespace-nowrap">
                            {art.category?.name || 'General'}
                          </td>

                          {/* Video & Review (Admin Review Option) */}
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            {art.video_url ? (
                              <div className="inline-flex flex-col items-center gap-1.5">
                                <div className="flex items-center gap-1">
                                  {/* Preview Video Button */}
                                  <button
                                    onClick={() =>
                                      setVideoPreviewModal({
                                        id: art.id,
                                        title: art.title,
                                        url: art.video_url!,
                                        isApproved: art.is_approved,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/85 text-white text-[10px] font-bold hover:bg-[#dc2626] transition-colors cursor-pointer shadow-xs"
                                    title="Preview attached video"
                                  >
                                    <Play className="w-2.5 h-2.5 fill-current text-[#dc2626]" />
                                    <span>Play</span>
                                  </button>

                                  {/* Toggle Approval Flag */}
                                  <button
                                    onClick={() => handleToggleVideoApproval(art.id, !art.is_approved)}
                                    disabled={isPendingAction}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                      art.is_approved
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200 border border-emerald-300 dark:border-emerald-800'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-200 border border-amber-300 dark:border-amber-700 animate-pulse'
                                    }`}
                                    title={
                                      art.is_approved
                                        ? 'Click to set video to pending review'
                                        : 'Click to approve video and publish publicly'
                                    }
                                  >
                                    {art.is_approved ? (
                                      <>
                                        <Check className="w-2.5 h-2.5" />
                                        <span>Approved</span>
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="w-2.5 h-2.5" />
                                        <span>Pending Review</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <button
                                    onClick={() =>
                                      setReplaceVideoModal({
                                        id: art.id,
                                        title: art.title,
                                        currentPath: art.video_path || '',
                                      })
                                    }
                                    className="text-[var(--text-muted)] hover:text-[#dc2626] underline cursor-pointer"
                                    title="Replace video file"
                                  >
                                    Replace
                                  </button>
                                  <span className="text-[var(--border-light)]">&bull;</span>
                                  <button
                                    onClick={() => handleDeleteVideo(art.id)}
                                    className="text-red-500 hover:text-red-700 underline cursor-pointer"
                                    title="Delete video and remove storage file"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-[var(--text-muted)] text-[11px]">—</span>
                            )}
                          </td>

                          {/* Toggle Breaking */}
                          <td className="py-3.5 px-3 text-center">
                            <button
                              onClick={() =>
                                handleToggleFlag(art.id, 'is_breaking', Boolean(art.is_breaking))
                              }
                              title="Toggle Breaking News ticker"
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                art.is_breaking
                                  ? 'bg-red-600 text-white border-red-600 shadow-sm'
                                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-light)] hover:text-[#dc2626]'
                              }`}
                            >
                              <Zap className="w-3.5 h-3.5" />
                            </button>
                          </td>

                          {/* Toggle Featured */}
                          <td className="py-3.5 px-3 text-center">
                            <button
                              onClick={() =>
                                handleToggleFlag(art.id, 'is_featured', Boolean(art.is_featured))
                              }
                              title="Toggle Featured Lead Story"
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                art.is_featured
                                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-light)] hover:text-amber-500'
                              }`}
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>
                          </td>

                          {/* Views */}
                          <td className="py-3.5 px-3 text-right font-mono text-[11px] text-[var(--text-muted)]">
                            {(art.views || 0).toLocaleString()}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit in /write */}
                              <Link
                                href={`/write?edit=${art.id}`}
                                className="p-1.5 rounded-lg border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[#dc2626] hover:border-[#dc2626] transition-colors"
                                title="Edit story"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </Link>

                              {/* View live if published */}
                              {art.status === 'published' && (
                                <Link
                                  href={`/news/${art.slug}`}
                                  target="_blank"
                                  className="p-1.5 rounded-lg border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[#dc2626] hover:border-[#dc2626] transition-colors"
                                  title="View on site"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              )}

                              {/* Delete button */}
                              <button
                                onClick={() =>
                                  setConfirmDeleteModal({
                                    type: 'article',
                                    id: art.id,
                                    name: art.title,
                                  })
                                }
                                className="p-1.5 rounded-lg border border-[var(--border-light)] text-[var(--text-muted)] hover:text-red-600 hover:border-red-600 transition-colors cursor-pointer"
                                title="Delete story"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: USERS & ROLES
        ======================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-light)] shadow-sm flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Filter users by name or user ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] focus:border-[#dc2626] focus:outline-none"
                />
              </div>

              <div className="text-xs text-[var(--text-muted)]">
                Showing <span className="font-bold text-[var(--text-primary)]">{filteredUsers.length}</span> registered contributors
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-[var(--card-bg)] border border-[var(--border-light)] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-muted)] font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Contributor</th>
                      <th className="py-3 px-4">Identifier (ID)</th>
                      <th className="py-3 px-4">Joined</th>
                      <th className="py-3 px-4">Authorization Role</th>
                      <th className="py-3 px-4 text-right">Administrative Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-light)]">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-[var(--text-muted)]">
                          No users found matching query.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((usr) => (
                        <tr
                          key={usr.id}
                          className="hover:bg-[var(--bg-secondary)]/50 transition-colors"
                        >
                          {/* Contributor Avatar + Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 border border-[var(--border-light)] flex items-center justify-center font-bold text-xs">
                                {usr.avatar_url ? (
                                  <Image
                                    src={usr.avatar_url}
                                    alt={usr.full_name || 'User'}
                                    width={32}
                                    height={32}
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  (usr.full_name?.[0] || 'U').toUpperCase()
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-sm text-[var(--text-primary)]">
                                  {usr.full_name || 'Anonymous User'}
                                </div>
                                {usr.bio && (
                                  <div className="text-[11px] text-[var(--text-muted)] line-clamp-1 max-w-xs">
                                    {usr.bio}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Identifier */}
                          <td className="py-3.5 px-4 font-mono text-[11px] text-[var(--text-muted)]">
                            {usr.id.slice(0, 16)}...
                          </td>

                          {/* Joined */}
                          <td className="py-3.5 px-4 text-[var(--text-muted)]">
                            {new Date(usr.created_at).toLocaleDateString()}
                          </td>

                          {/* Role Selector */}
                          <td className="py-3.5 px-4">
                            <select
                              value={usr.role}
                              onChange={(e) =>
                                handleRoleChange(
                                  usr.id,
                                  e.target.value as 'user' | 'writer' | 'admin'
                                )
                              }
                              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none transition-colors ${
                                usr.role === 'admin'
                                  ? 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300'
                                  : usr.role === 'writer'
                                  ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300'
                                  : 'bg-[var(--bg-secondary)] border-[var(--border-light)] text-[var(--text-primary)]'
                              }`}
                            >
                              <option value="user">User (Review queue)</option>
                              <option value="writer">Writer (Instant publish)</option>
                              <option value="admin">Admin (Full Control)</option>
                            </select>
                          </td>

                          {/* Ban / Delete User */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() =>
                                setConfirmDeleteModal({
                                  type: 'user',
                                  id: usr.id,
                                  name: usr.full_name || usr.id,
                                })
                              }
                              className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete / Ban</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: CATEGORIES MANAGEMENT
        ======================================================== */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            {/* Header + Add Category Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-light)] shadow-sm">
              <div>
                <h2 className="font-headline font-bold text-lg">Editorial News Desks</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Organize stories into topical beats. Categories appear in the top global navigation bar.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingCategory(null);
                  setCatNameInput('');
                  setCatDescInput('');
                  setIsAddCatModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </div>

            {/* Categories List Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoriesList.map((cat) => (
                <div
                  key={cat.id}
                  className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-light)] shadow-sm hover:border-[#dc2626]/40 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-headline font-bold text-lg text-[var(--text-primary)]">
                        {cat.name}
                      </span>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-light)]">
                        /{cat.slug}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed min-h-[36px]">
                      {cat.description || 'General news desk coverage.'}
                    </p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-[var(--border-light)] flex items-center justify-between">
                    <Link
                      href={`/category/${cat.slug}`}
                      target="_blank"
                      className="text-xs font-semibold text-[var(--text-muted)] hover:text-[#dc2626] flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Desk
                    </Link>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setCatNameInput(cat.name);
                          setCatDescInput(cat.description || '');
                          setIsAddCatModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[#dc2626] hover:border-[#dc2626] transition-colors cursor-pointer"
                        title="Edit category"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() =>
                          setConfirmDeleteModal({
                            type: 'category',
                            id: cat.id,
                            name: cat.name,
                          })
                        }
                        className="p-1.5 rounded-lg border border-[var(--border-light)] text-[var(--text-muted)] hover:text-red-600 hover:border-red-600 transition-colors cursor-pointer"
                        title="Delete category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL 1: PREVIEW ARTICLE MODAL
        ======================================================== */}
        {previewArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-[var(--card-bg)] border border-[var(--border-light)] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col">
              <div className="p-5 border-b border-[var(--border-light)] flex items-center justify-between sticky top-0 bg-[var(--card-bg)] z-10">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    Previewing Submission
                  </span>
                  {previewArticle.category && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-light)]">
                      {previewArticle.category.name}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setPreviewArticle(null)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <h1 className="font-headline text-2xl sm:text-3xl font-bold leading-tight">
                  {previewArticle.title}
                </h1>

                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] pb-4 border-b border-[var(--border-light)]">
                  <span>Author: {previewArticle.author?.full_name || 'Anonymous Author'}</span>
                  <span>&bull;</span>
                  <span>Submitted on {new Date(previewArticle.created_at).toLocaleDateString()}</span>
                </div>

                {previewArticle.cover_image_url && (
                  <div className="w-full h-64 relative rounded-xl overflow-hidden border border-[var(--border-light)]">
                    <Image
                      src={previewArticle.cover_image_url}
                      alt={previewArticle.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                {previewArticle.excerpt && (
                  <div className="p-4 rounded-xl bg-[var(--bg-secondary)] italic text-xs text-[var(--text-secondary)] border-l-2 border-[#dc2626]">
                    {previewArticle.excerpt}
                  </div>
                )}

                <div className="text-sm leading-relaxed text-[var(--text-secondary)] space-y-3">
                  {previewArticle.content ? (
                    <div dangerouslySetInnerHTML={{ __html: previewArticle.content }} />
                  ) : (
                    <p>No full text body provided.</p>
                  )}
                </div>
              </div>

              <div className="p-5 border-t border-[var(--border-light)] bg-[var(--bg-secondary)]/50 flex items-center justify-end gap-3 sticky bottom-0">
                <button
                  onClick={() => setPreviewArticle(null)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-light)] text-xs font-semibold hover:border-[#dc2626]"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleApprove(previewArticle.id);
                    setPreviewArticle(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve Immediately
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL 2: REJECT ARTICLE WITH REASON MODAL
        ======================================================== */}
        {rejectingArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-[var(--card-bg)] border border-[var(--border-light)] rounded-2xl w-full max-w-lg shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  <h3 className="font-headline font-bold text-lg text-[var(--text-primary)]">
                    Reject Article Submission
                  </h3>
                </div>
                <button
                  onClick={() => setRejectingArticle(null)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[var(--text-secondary)] mb-4">
                You are rejecting <span className="font-bold text-[var(--text-primary)]">&quot;{rejectingArticle.title}&quot;</span>. Please state the reason so the contributor receives constructive editorial feedback.
              </p>

              <div className="space-y-2 mb-5">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Editorial Reason / Instructions for Revision:
                </label>
                <textarea
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Please verify figures cited in paragraph 3 and provide secondary sources before resubmitting."
                  className="w-full p-3 text-xs rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] focus:border-[#dc2626] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setRejectingArticle(null)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-light)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={isPendingAction}
                  className="px-5 py-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL 3: ADD / EDIT CATEGORY MODAL
        ======================================================== */}
        {isAddCatModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-[var(--card-bg)] border border-[var(--border-light)] rounded-2xl w-full max-w-md shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-headline font-bold text-lg">
                  {editingCategory ? 'Edit News Desk' : 'Create New News Desk'}
                </h3>
                <button
                  onClick={() => setIsAddCatModalOpen(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    required
                    value={catNameInput}
                    onChange={(e) => setCatNameInput(e.target.value)}
                    placeholder="e.g. Climate & Environment"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] focus:border-[#dc2626] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Editorial Scope / Description
                  </label>
                  <textarea
                    rows={3}
                    value={catDescInput}
                    onChange={(e) => setCatDescInput(e.target.value)}
                    placeholder="Brief description of stories published under this desk..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] focus:border-[#dc2626] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddCatModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[var(--border-light)] text-xs font-semibold text-[var(--text-muted)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPendingAction}
                    className="px-5 py-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    {editingCategory ? 'Save Changes' : 'Create Category'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL 4: CONFIRM DELETE MODAL
        ======================================================== */}
        {confirmDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-[var(--card-bg)] border border-[var(--border-light)] rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-[#dc2626] dark:bg-red-950/60 dark:text-red-400 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>

              <h3 className="font-headline font-bold text-lg mb-1">
                Confirm Permanent Removal
              </h3>

              <p className="text-xs text-[var(--text-secondary)] mb-6">
                Are you sure you want to permanently delete this{' '}
                <span className="font-bold text-[var(--text-primary)]">
                  {confirmDeleteModal.type}
                </span>{' '}
                (&quot;{confirmDeleteModal.name}&quot;)? This action is protected on the server side and cannot be undone.
              </p>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setConfirmDeleteModal(null)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-light)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isPendingAction}
                  className="px-5 py-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL 5: VIDEO PREVIEW MODAL
        ======================================================== */}
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

              <div className="p-4 bg-[var(--bg-secondary)]/50 border-t border-[var(--border-light)] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)] font-medium">Video Status:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      videoPreviewModal.isApproved
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {videoPreviewModal.isApproved ? 'Approved & Public' : 'Pending Review'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Quick Toggle in Preview Modal */}
                  <button
                    onClick={() => {
                      const newVal = !videoPreviewModal.isApproved;
                      handleToggleVideoApproval(videoPreviewModal.id, newVal);
                      setVideoPreviewModal({ ...videoPreviewModal, isApproved: newVal });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      videoPreviewModal.isApproved
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {videoPreviewModal.isApproved ? 'Set to Pending' : 'Approve Video Now'}
                  </button>

                  <button
                    onClick={() => setVideoPreviewModal(null)}
                    className="px-3.5 py-1.5 rounded-lg border border-[var(--border-light)] text-xs font-semibold hover:bg-[var(--bg-secondary)] cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL 6: REPLACE VIDEO MODAL
        ======================================================== */}
        {replaceVideoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-[var(--card-bg)] border border-[var(--border-light)] rounded-2xl w-full max-w-md shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#dc2626]" />
                  <h3 className="font-headline font-bold text-base">Replace Video Dispatch</h3>
                </div>
                <button
                  onClick={() => {
                    if (!isUploadingReplaceVideo) setReplaceVideoModal(null);
                  }}
                  disabled={isUploadingReplaceVideo}
                  className="p-1 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
                Upload a replacement video for: <br />
                <strong className="text-[var(--text-primary)]">&ldquo;{replaceVideoModal.title}&rdquo;</strong>.<br />
                <span className="text-[var(--text-muted)]">
                  The previous video file will be automatically deleted from Supabase Storage so no orphan files remain.
                </span>
              </p>

              {/* Upload Drop Zone */}
              <div className="border-2 border-dashed border-[var(--border-light)] hover:border-[#dc2626] rounded-xl p-6 text-center transition-colors mb-4 bg-[var(--bg-secondary)]/30">
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleAdminReplaceFileInput}
                  disabled={isUploadingReplaceVideo}
                  className="hidden"
                  id="admin-video-replace-input"
                />
                <label
                  htmlFor="admin-video-replace-input"
                  className="cursor-pointer flex flex-col items-center justify-center"
                >
                  <Upload className="w-8 h-8 text-[#dc2626] mb-2 animate-bounce" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Choose Replacement Video File
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] mt-1">
                    Allowed: MP4, WebM, MOV &bull; Max {MAX_VIDEO_SIZE_MB}MB
                  </span>
                </label>
              </div>

              {isUploadingReplaceVideo && (
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Uploading replacement video...</span>
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
                  onClick={() => setReplaceVideoModal(null)}
                  disabled={isUploadingReplaceVideo}
                  className="px-4 py-2 rounded-xl border border-[var(--border-light)] text-xs font-semibold text-[var(--text-muted)] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
