'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  PenSquare,
  Sparkles,
  Save,
  Send,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Upload,
  UploadCloud,
  X,
  Tag,
  Lock,
  Unlock,
  RefreshCw,
  Video,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { RichTextEditor } from '@/components/RichTextEditor';
import { articleSchema } from '@/lib/validations/article';
import {
  validateVideoFile,
  uploadVideoWithProgress,
  MAX_VIDEO_SIZE_MB,
  ALLOWED_VIDEO_FORMATS,
} from '@/lib/videoUpload';
import { ZodError } from 'zod';
import Link from 'next/link';

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

function WriteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const { user, profile, isWriter, isAdmin } = useAuth();

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugLocked, setIsSlugLocked] = useState(true);
  const [type, setType] = useState<'news' | 'article'>('news');
  const [categoryId, setCategoryId] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoPath, setVideoPath] = useState('');
  const [initialVideoPath, setInitialVideoPath] = useState<string | null>(null);
  const [initialIsApproved, setInitialIsApproved] = useState<boolean>(false);
  const [videoMeta, setVideoMeta] = useState<{ name: string; size: string } | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isBreaking, setIsBreaking] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(Boolean(editId));

  // Helper to slugify
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Sync auto-slug when title changes if locked
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (isSlugLocked && !editId) {
      setSlug(slugify(newTitle));
    }
  };

  // Load Categories & Edit Post Data
  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient();
        const { data: catData } = await supabase
          .from('categories')
          .select('id, name, slug')
          .order('name');

        if (catData && catData.length > 0) {
          setCategories(catData);
          if (!categoryId) setCategoryId(catData[0].id);
        }

        // If editing existing post
        if (editId) {
          const { data: article, error } = await supabase
            .from('articles')
            .select('*')
            .eq('id', editId)
            .single();

          if (!error && article) {
            setTitle(article.title || '');
            setSlug(article.slug || '');
            setIsSlugLocked(false);
            setExcerpt(article.excerpt || '');
            setContent(article.content || '');
            setCategoryId(article.category_id || (catData ? catData[0]?.id : ''));
            setType(article.type || 'news');
            setCoverImageUrl(article.cover_image_url || '');
            setVideoUrl(article.video_url || '');
            setVideoPath(article.video_path || '');
            setInitialVideoPath(article.video_path || null);
            setInitialIsApproved(article.is_approved || false);
            if (article.video_url) {
              const fileNameFromPath = article.video_path
                ? article.video_path.split('/').pop()?.replace(/^\d+-/, '') || 'attached-video.mp4'
                : 'attached-video.mp4';
              setVideoMeta({
                name: fileNameFromPath,
                size: 'Attached video dispatch',
              });
            }
            setIsBreaking(article.is_breaking || false);
            setIsFeatured(article.is_featured || false);
          }
        }
      } catch {
        // Fallback
      } finally {
        setInitialLoading(false);
      }
    }

    init();
  }, [editId]);

  // Image Upload to Supabase Storage 'article-images'
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingImage(true);
    setGeneralError(null);

    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `articles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('article-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('article-images').getPublicUrl(filePath);
      setCoverImageUrl(data.publicUrl);
    } catch (err: unknown) {
      setGeneralError(
        err instanceof Error ? err.message : 'Unable to upload image to Supabase Storage.'
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Video Upload to Supabase Storage 'news-videos' with Progress
  const processVideoFile = async (file: File) => {
    if (!file) return;

    setVideoError(null);
    setGeneralError(null);

    // 1. Validate file (login, network, format, max 100MB)
    const validation = validateVideoFile(file, user?.id);
    if (!validation.valid) {
      setVideoError(validation.error || 'Video validation failed.');
      if (videoInputRef.current) videoInputRef.current.value = '';
      return;
    }

    setVideoMeta({
      name: file.name,
      size: formatBytes(file.size),
    });
    setUploadingVideo(true);
    setVideoUploadProgress(0);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

      const { videoUrl: uploadedUrl, videoPath: uploadedPath } = await uploadVideoWithProgress({
        file,
        userId: user!.id,
        supabaseUrl,
        anonKey,
        accessToken: session?.access_token,
        onProgress: (percent) => setVideoUploadProgress(percent),
      });

      setVideoUrl(uploadedUrl);
      setVideoPath(uploadedPath);
      setVideoUploadProgress(100);
    } catch (err: unknown) {
      // If upload fails, ensure videoUrl & videoPath are NOT saved with broken links
      setVideoUrl('');
      setVideoPath('');
      setVideoMeta(null);
      setVideoUploadProgress(0);
      setVideoError(err instanceof Error ? err.message : 'Video upload failed. Please try again.');
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleVideoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processVideoFile(file);
    }
  };

  const handleRemoveVideo = async () => {
    if (videoPath) {
      try {
        const supabase = createClient();
        await supabase.storage.from('news-videos').remove([videoPath]);
      } catch {
        // Ignore remote deletion errors
      }
    }
    setVideoUrl('');
    setVideoPath('');
    setVideoMeta(null);
    setVideoError(null);
    setVideoUploadProgress(0);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  // Tag chip handlers
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^#/, '');
      if (clean && !tags.includes(clean)) {
        setTags([...tags, clean]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Submit & Save Form
  const handleSave = async (targetAction: 'draft' | 'submit') => {
    if (!user) return;

    setSaving(true);
    setFieldErrors({});
    setGeneralError(null);
    setSuccessMsg(null);

    // Calculate status:
    // If saving as draft: 'draft'
    // If submit: publish directly
    let targetStatus: 'draft' | 'pending' | 'published' = 'draft';
    if (targetAction === 'submit') {
      targetStatus = 'published';
    }

    // Check if video is currently uploading
    if (uploadingVideo) {
      setGeneralError('Please wait for the video upload to complete before saving.');
      setSaving(false);
      return;
    }

    const cleanTitle = title.trim();
    let cleanSlug = slug.trim() || slugify(cleanTitle) || `story-${Date.now()}`;
    cleanSlug = slugify(cleanSlug) || `story-${Date.now()}`;

    const cleanExcerpt = excerpt.trim();
    const rawContentText = content.replace(/<[^>]*>?/gm, '').trim();

    // Flexible fallback: if content is empty but excerpt is provided, use excerpt
    // If excerpt is empty but content is provided, extract from content
    const finalContent = rawContentText.length > 0 
      ? content.trim() 
      : (cleanExcerpt ? `<p>${cleanExcerpt}</p>` : (cleanTitle ? `<p>${cleanTitle}</p>` : '<p></p>'));

    const finalExcerpt = cleanExcerpt.length > 0
      ? cleanExcerpt
      : (rawContentText.slice(0, 500) || cleanTitle);

    // 1. Zod validation
    try {
      articleSchema.parse({
        title: cleanTitle,
        slug: cleanSlug,
        excerpt: finalExcerpt,
        content: finalContent,
        category_id: categoryId,
        type,
        cover_image_url: coverImageUrl,
        video_url: videoUrl.trim() || null,
        video_path: videoPath.trim() || null,
        tags,
      });
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const errors: Record<string, string> = {};
        err.issues.forEach((issue) => {
          const path = issue.path[0] as string;
          errors[path] = issue.message;
        });
        setFieldErrors(errors);
        setGeneralError('Please correct the validation errors highlighted below.');
        setSaving(false);
        return;
      }
    }

    // 2. Database Insert / Update
    try {
      const supabase = createClient();
      // Determine video approval flag
      let approvedFlag = true;
      const cleanVideoUrl = videoUrl.trim() || null;
      const cleanVideoPath = videoPath.trim() || null;

      if (cleanVideoUrl) {
        if (isAdmin) {
          approvedFlag = true;
        } else if (editId && initialVideoPath === cleanVideoPath) {
          approvedFlag = initialIsApproved;
        } else {
          // Contributor or writer video requires administrative clearance
          approvedFlag = false;
        }
      }

      // If existing video was replaced or removed during edit, delete old storage file (no orphan files)
      if (initialVideoPath && initialVideoPath !== cleanVideoPath) {
        try {
          await supabase.storage.from('news-videos').remove([initialVideoPath]);
        } catch (cleanupErr) {
          console.warn('Storage cleanup warning during video update:', cleanupErr);
        }
      }

      const articlePayload = {
        title: cleanTitle,
        slug: cleanSlug,
        excerpt: finalExcerpt,
        content: finalContent,
        category_id: categoryId || null,
        type,
        cover_image_url: coverImageUrl.trim() || null,
        video_url: cleanVideoUrl,
        video_path: cleanVideoPath,
        is_approved: approvedFlag,
        status: targetStatus,
        is_breaking: isBreaking,
        is_featured: isFeatured,
        published_at: targetStatus === 'published' ? new Date().toISOString() : null,
        author_id: user.id,
      };

      if (editId) {
        const { error } = await supabase
          .from('articles')
          .update(articlePayload)
          .eq('id', editId)
          .eq('author_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('articles').insert([articlePayload]);
        if (error) throw error;
      }

      setSuccessMsg(
        targetStatus === 'published'
          ? 'Article published live!'
          : 'Article draft saved!'
      );

      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      setGeneralError(err instanceof Error ? err.message : 'Failed to save article.');
    } finally {
      setSaving(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="py-24 text-center text-xs text-[var(--text-muted)] animate-pulse">
        Loading story details for editing...
      </div>
    );
  }

  const role = profile?.role || 'user';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12 w-full">
      {/* Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[#dc2626] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>

        <span className="text-xs text-[var(--text-muted)]">
          Signed in as <strong className="text-[var(--text-primary)]">{profile?.full_name || user?.email}</strong>{' '}
          <span className="uppercase font-mono text-[10px] text-[#dc2626]">({role})</span>
        </span>
      </div>

      {/* Editorial Header */}
      <div className="border-b border-[var(--border-light)] pb-5 mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#dc2626]">
            {editId ? 'Story Editor' : 'Compose News Dispatch'}
          </span>
          <span className="text-xs text-[var(--text-muted)]">&bull;</span>
          <span className="text-xs text-[var(--text-muted)]">
            {role === 'user'
              ? 'Contributor submissions require editorial approval'
              : 'Direct publication privileges enabled'}
          </span>
        </div>
        <h1 className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight">
          {editId ? 'Edit Article' : 'Write a Story'}
          <span className="text-[#dc2626]">.</span>
        </h1>
      </div>

      {/* Global Alerts */}
      {generalError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#dc2626]" />
          <span>{generalError}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Title */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Headline Title *
            </label>
            {fieldErrors.title && (
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                {fieldErrors.title}
              </span>
            )}
          </div>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g. Landmark Renewable Energy Framework Adopted at Geneva Summit"
            className={`w-full p-3 font-headline text-xl sm:text-2xl font-bold rounded-xl bg-[var(--card-bg)] border ${
              fieldErrors.title ? 'border-red-500' : 'border-[var(--border-light)]'
            } focus:border-[#dc2626] focus:outline-none transition-colors`}
          />
        </div>

        {/* Auto-Slug */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
              <span>URL Slug *</span>
              <button
                type="button"
                onClick={() => setIsSlugLocked(!isSlugLocked)}
                className="text-[11px] text-[var(--text-muted)] hover:text-[#dc2626] inline-flex items-center gap-1 cursor-pointer"
                title={isSlugLocked ? 'Unlock to edit slug manually' : 'Lock to auto-generate from title'}
              >
                {isSlugLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3 text-[#dc2626]" />}
                <span>{isSlugLocked ? 'Auto-synced' : 'Manual'}</span>
              </button>
            </label>
            {fieldErrors.slug && (
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                {fieldErrors.slug}
              </span>
            )}
          </div>
          <div className="flex items-center rounded-lg bg-[var(--card-bg)] border border-[var(--border-light)] px-3 py-2 text-xs font-mono text-[var(--text-muted)]">
            <span className="shrink-0 select-none opacity-60">/news/</span>
            <input
              type="text"
              required
              value={slug}
              disabled={isSlugLocked}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="article-headline-slug"
              className="w-full bg-transparent text-[var(--text-primary)] focus:outline-none ml-1 disabled:opacity-75 font-mono"
            />
          </div>
        </div>

        {/* Category & Type Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                Category Desk *
              </label>
              {fieldErrors.category_id && (
                <span className="text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.category_id}
                </span>
              )}
            </div>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-[var(--card-bg)] border border-[var(--border-light)] focus:border-[#dc2626] focus:outline-none transition-colors"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Article Classification
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'news' | 'article')}
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-[var(--card-bg)] border border-[var(--border-light)] focus:border-[#dc2626] focus:outline-none transition-colors"
            >
              <option value="news">News Dispatch (Wire / Breaking)</option>
              <option value="article">In-Depth Editorial Feature</option>
            </select>
          </div>
        </div>

        {/* Excerpt Synopsis */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">
              Lead Synopsis / Excerpt
            </label>
            {fieldErrors.excerpt && (
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                {fieldErrors.excerpt}
              </span>
            )}
          </div>
          <textarea
            rows={3}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Lead synopsis or summary (write as much as you want)..."
            className={`w-full p-3 text-sm rounded-lg bg-[var(--card-bg)] border ${
              fieldErrors.excerpt ? 'border-red-500' : 'border-[var(--border-light)]'
            } focus:border-[#dc2626] focus:outline-none transition-colors`}
          />
        </div>

        {/* Cover Photo Upload & Preview */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Cover Photograph
            </span>
            {fieldErrors.cover_image_url && (
              <span className="text-xs text-red-600 dark:text-red-400">
                {fieldErrors.cover_image_url}
              </span>
            )}
          </label>

          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="flex-1 w-full space-y-2">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="Paste image URL (e.g. Unsplash) or upload file &rarr;"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--card-bg)] border border-[var(--border-light)] focus:border-[#dc2626] focus:outline-none transition-colors"
                />

                <label className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-light)] hover:border-[#dc2626] text-xs font-semibold text-[var(--text-primary)] transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer">
                  <Upload className={`w-3.5 h-3.5 ${uploadingImage ? 'animate-spin' : ''}`} />
                  <span>{uploadingImage ? 'Uploading...' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingImage}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                High-resolution 16:9 banner photo recommended. Uploads directly to Supabase storage.
              </p>
            </div>

            {/* Thumbnail Preview */}
            {coverImageUrl && (
              <div className="relative w-32 aspect-[16/10] rounded-lg overflow-hidden border border-[var(--border-light)] shrink-0 group">
                <img
                  src={coverImageUrl}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setCoverImageUrl('')}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
                  title="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tags input */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Tags & Desks
          </label>
          <div className="p-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border-light)] flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-secondary)]"
              >
                <span>#{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Type tag and press Enter..."
              className="flex-1 min-w-[140px] text-xs bg-transparent focus:outline-none p-1"
            />
          </div>
        </div>

        {/* TipTap Rich-Text Editor */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Article Content Body
            </label>
            {fieldErrors.content && (
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                {fieldErrors.content}
              </span>
            )}
          </div>
          <RichTextEditor content={content} onChange={setContent} />
        </div>

        {/* Optional Upload Video Section under Article Text */}
        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--card-bg)] p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-3 border-b border-[var(--border-light)]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/60 text-[#dc2626] flex items-center justify-center shrink-0">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Upload Video <span className="font-normal text-[var(--text-muted)] lowercase">(optional)</span>
                </label>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Attach one video dispatch to this news story.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-secondary)]">
                Max {MAX_VIDEO_SIZE_MB} MB &bull; MP4, WebM, MOV
              </span>
            </div>
          </div>

          {/* Validation or Upload Error Notice */}
          {videoError && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#dc2626] shrink-0 mt-0.5" />
                <span className="font-medium">{videoError}</span>
              </div>
              <button
                type="button"
                onClick={() => setVideoError(null)}
                className="text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer shrink-0"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 1. Uploaded Video Preview with File Meta & Remove Button */}
          {videoUrl && !uploadingVideo ? (
            <div className="space-y-3">
              {/* Responsive Video Preview Player */}
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-[var(--border-light)] shadow-sm">
                <video
                  src={videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-contain mx-auto"
                >
                  Your browser does not support HTML5 video preview.
                </video>
              </div>

              {/* File Meta and Remove Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-light)]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-xs sm:max-w-md">
                      {videoMeta?.name || 'news-video.mp4'}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono">
                      {videoMeta?.size || 'Attached video'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveVideo}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-xs font-semibold text-[#dc2626] hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors self-end sm:self-auto cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </div>
          ) : uploadingVideo ? (
            /* 2. Upload Progress Bar with File Name and Size */
            <div className="p-5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/60 space-y-3">
              <div className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/60 text-[#dc2626] flex items-center justify-center shrink-0 animate-pulse">
                    <Upload className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] truncate max-w-xs sm:max-w-md">
                      {videoMeta?.name || 'Uploading video file...'}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono">
                      {videoMeta?.size ? `${videoMeta.size} &bull; ` : ''}Uploading to news-videos...
                    </p>
                  </div>
                </div>

                <span className="font-mono text-sm font-bold text-[#dc2626] shrink-0">
                  {videoUploadProgress}%
                </span>
              </div>

              {/* Progress Bar (White + Red Theme) */}
              <div className="w-full bg-gray-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden border border-[var(--border-light)]">
                <div
                  className="bg-[#dc2626] h-full transition-all duration-200 ease-out rounded-full"
                  style={{ width: `${videoUploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            /* 3. Drag-and-Drop Zone + Choose File Button */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processVideoFile(file);
              }}
              onClick={() => videoInputRef.current?.click()}
              className={`rounded-xl border-2 border-dashed p-6 sm:p-8 text-center transition-all cursor-pointer ${
                isDragOver
                  ? 'border-[#dc2626] bg-red-50/80 dark:bg-red-950/30 scale-[1.005]'
                  : 'border-gray-300 dark:border-zinc-700 bg-[var(--bg-secondary)]/30 hover:border-[#dc2626] hover:bg-red-50/20 dark:hover:bg-red-950/10'
              }`}
            >
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                onChange={handleVideoInputChange}
                className="hidden"
              />

              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-950/60 text-[#dc2626] flex items-center justify-center shadow-sm">
                <UploadCloud className="w-6 h-6" />
              </div>

              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Drag and drop your news video here
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
                or click below to choose a file from your computer or phone
              </p>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  videoInputRef.current?.click();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Choose file</span>
              </button>

              <p className="text-[11px] text-[var(--text-muted)] mt-4">
                Supported formats: <strong>MP4, WebM, MOV</strong> &bull; Maximum file size: <strong>{MAX_VIDEO_SIZE_MB} MB</strong>
              </p>
            </div>
          )}
        </div>

        {/* Breaking / Featured Checkboxes for writers & admins */}
        {isWriter && (
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] flex flex-wrap gap-6 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isBreaking}
                onChange={(e) => setIsBreaking(e.target.checked)}
                className="rounded text-[#dc2626] focus:ring-[#dc2626]"
              />
              <span className="font-semibold text-[#dc2626]">Mark as Breaking News</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="rounded text-[#dc2626] focus:ring-[#dc2626]"
              />
              <span className="font-semibold">Feature on Front Page Hero</span>
            </label>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[var(--border-light)]">
          <div className="text-xs text-[var(--text-muted)]">
            <span>Clicking &ldquo;Publish Live&rdquo; makes this article immediately visible to the public.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('draft')}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg border border-[var(--border-light)] text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-4 h-4 text-[var(--text-muted)]" />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('submit')}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-semibold tracking-wide uppercase transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{saving ? 'Publishing...' : 'Publish Live'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WritePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<div className="p-12 text-center text-xs text-[var(--text-muted)]">Loading writing desk...</div>}>
          <WriteForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
