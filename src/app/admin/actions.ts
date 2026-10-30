'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { FALLBACK_ARTICLES, FALLBACK_CATEGORIES, FALLBACK_AUTHORS } from '@/lib/data/mockArticles';

/**
 * Server-Side Admin Authorization Guard
 * Ensures the requesting user is authenticated AND has the role 'admin' in profiles table.
 */
async function verifyAdminAuth() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isConfigured = Boolean(
    url && key && !url.includes('[paste') && !key.includes('[paste')
  );

  if (!isConfigured) {
    // In local demo mode before Supabase credentials are wired up, allow authorized inspection
    return { authorized: true, user: { id: 'demo-admin' }, isMock: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    throw new Error('Forbidden: Elevated administrator role required.');
  }

  return { authorized: true, user, isMock: false };
}

// 1. OVERVIEW METRICS
export async function getAdminOverview() {
  const { isMock } = await verifyAdminAuth();

  if (isMock) {
    const totalArticles = FALLBACK_ARTICLES.length;
    const pendingApprovals = FALLBACK_ARTICLES.filter((a) => a.status === 'pending').length;
    const totalViews = FALLBACK_ARTICLES.reduce((acc, curr) => acc + (curr.views || 0), 0);
    return {
      success: true,
      data: {
        totalArticles: totalArticles + 4,
        pendingApprovals: 3,
        totalUsers: 24,
        totalWriters: 7,
        totalViews: totalViews + 54000,
      },
    };
  }

  const adminClient = createAdminClient();

  const [articlesRes, pendingRes, profilesRes, writersRes, viewsRes] = await Promise.all([
    adminClient.from('articles').select('id', { count: 'exact', head: true }),
    adminClient.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    adminClient.from('profiles').select('id', { count: 'exact', head: true }),
    adminClient.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['writer', 'admin']),
    adminClient.from('articles').select('views'),
  ]);

  const totalViews = (viewsRes.data || []).reduce((acc, curr) => acc + (curr.views || 0), 0);

  return {
    success: true,
    data: {
      totalArticles: articlesRes.count || 0,
      pendingApprovals: pendingRes.count || 0,
      totalUsers: profilesRes.count || 0,
      totalWriters: writersRes.count || 0,
      totalViews,
    },
  };
}

// 2. PENDING ARTICLES
export async function getAdminPendingArticles() {
  const { isMock } = await verifyAdminAuth();

  if (isMock) {
    return {
      success: true,
      data: [
        {
          id: 'mock-pending-1',
          title: 'Proposed Hydroelectric Expansion in Northern Mountain Valleys',
          slug: 'proposed-hydroelectric-expansion-mountain-valleys',
          excerpt: 'Provincial engineers outline feasibility reports for 12 micro-hydro dams.',
          content: 'Detailed environmental impact analysis of mountain river flows...',
          cover_image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
          category_id: 'cat-pakistan',
          category: { name: 'Pakistan', slug: 'pakistan' },
          author_id: 'user-101',
          author: { full_name: 'Zainab Qazi', role: 'user', avatar_url: null },
          created_at: '2026-10-28T06:00:00.000Z',
        },
        {
          id: 'mock-pending-2',
          title: 'Decentralized Identity Verification Standards Adopted by Banking Council',
          slug: 'decentralized-identity-verification-banking-council',
          excerpt: 'Commercial banks pilot zero-knowledge proof credentials for account opening.',
          content: 'Cryptographic identity protocols tested across 4 million mobile banking users...',
          cover_image_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80',
          category_id: 'cat-tech',
          category: { name: 'Technology', slug: 'technology' },
          author_id: 'user-102',
          author: { full_name: 'Bilal Chaudhry', role: 'user', avatar_url: null },
          created_at: '2026-10-28T05:00:00.000Z',
        },
      ],
    };
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('articles')
    .select('*, category:categories(id, name, slug), author:profiles(id, full_name, avatar_url, role)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return { success: true, data };
}

// 3. APPROVE ARTICLE
export async function approveArticle(articleId: string) {
  const { isMock } = await verifyAdminAuth();
  if (isMock) {
    return { success: true, message: 'Article approved and published live!' };
  }

  const adminClient = createAdminClient();

  // 1. Update article to published
  const { data: article, error: updateError } = await adminClient
    .from('articles')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq('id', articleId)
    .select('id, title, author_id')
    .single();

  if (updateError) throw new Error(updateError.message);

  // 2. Notify author
  if (article) {
    await adminClient.from('notifications').insert([
      {
        user_id: article.author_id,
        article_id: article.id,
        title: 'Article Approved & Published!',
        message: `Your story "${article.title}" has been reviewed by the editors and is now live on the platform.`,
      },
    ]);
  }

  return { success: true, message: 'Article approved and published live!' };
}

// 4. REJECT ARTICLE
export async function rejectArticle(articleId: string, reason: string) {
  const { isMock } = await verifyAdminAuth();
  const cleanReason = reason.trim() || 'Does not align with current editorial guidelines.';

  if (isMock) {
    return { success: true, message: 'Article rejected with notification sent to author.' };
  }

  const adminClient = createAdminClient();

  // 1. Update article to rejected
  const { data: article, error: updateError } = await adminClient
    .from('articles')
    .update({
      status: 'rejected',
      rejection_reason: cleanReason,
    })
    .eq('id', articleId)
    .select('id, title, author_id')
    .single();

  if (updateError) throw new Error(updateError.message);

  // 2. Notify author with rejection reason
  if (article) {
    await adminClient.from('notifications').insert([
      {
        user_id: article.author_id,
        article_id: article.id,
        title: 'Editorial Review Feedback',
        message: `Your story "${article.title}" requires revisions. Editor's note: ${cleanReason}`,
      },
    ]);
  }

  return { success: true, message: 'Article rejected and author notified.' };
}

// 5. ALL ARTICLES (with search and filters)
export async function getAllAdminArticles(filters?: {
  search?: string;
  status?: string;
  categoryId?: string;
}) {
  const { isMock } = await verifyAdminAuth();

  if (isMock) {
    let result = [...FALLBACK_ARTICLES];
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (a) => a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q)
      );
    }
    if (filters?.status && filters.status !== 'all') {
      result = result.filter((a) => a.status === filters.status);
    }
    if (filters?.categoryId && filters.categoryId !== 'all') {
      result = result.filter((a) => a.category_id === filters.categoryId || a.category?.slug === filters.categoryId);
    }
    return { success: true, data: result };
  }

  const adminClient = createAdminClient();
  let query = adminClient
    .from('articles')
    .select('*, category:categories(id, name, slug), author:profiles(id, full_name, avatar_url, role)')
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.categoryId && filters.categoryId !== 'all') {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search.trim()}%,excerpt.ilike.%${filters.search.trim()}%`);
  }

  const { data, error } = await query.limit(50);
  if (error) throw new Error(error.message);

  return { success: true, data };
}

// 6. TOGGLE BREAKING / FEATURED
export async function toggleArticleFlag(
  articleId: string,
  flag: 'is_breaking' | 'is_featured',
  value: boolean
) {
  const { isMock } = await verifyAdminAuth();
  if (isMock) return { success: true };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('articles')
    .update({ [flag]: value })
    .eq('id', articleId);

  if (error) throw new Error(error.message);
  return { success: true };
}

// 7. DELETE ARTICLE (Deletes both database row and storage files)
export async function deleteArticleAdmin(articleId: string) {
  const { isMock } = await verifyAdminAuth();
  if (isMock) return { success: true, message: 'Article deleted.' };

  const adminClient = createAdminClient();

  // Clean up attached video file from Supabase Storage
  try {
    const { data: art } = await adminClient
      .from('articles')
      .select('video_path')
      .eq('id', articleId)
      .single();

    if (art?.video_path) {
      await adminClient.storage.from('news-videos').remove([art.video_path]);
    }
  } catch (storageErr) {
    console.warn('Storage cleanup warning during admin article deletion:', storageErr);
  }

  const { error } = await adminClient.from('articles').delete().eq('id', articleId);
  if (error) throw new Error(error.message);
  return { success: true, message: 'Article and associated media permanently deleted.' };
}

// 7b. TOGGLE VIDEO APPROVAL (Admin Review Option)
export async function toggleVideoApproval(articleId: string, isApproved: boolean) {
  const { isMock } = await verifyAdminAuth();
  if (isMock) {
    return {
      success: true,
      is_approved: isApproved,
      message: isApproved ? 'Video approved and live!' : 'Video set to pending review.',
    };
  }

  const adminClient = createAdminClient();
  const { data: article, error } = await adminClient
    .from('articles')
    .update({ is_approved: isApproved })
    .eq('id', articleId)
    .select('id, title, author_id, video_url')
    .single();

  if (error) throw new Error(error.message);

  // Notify author of editorial video review decision
  if (article?.author_id) {
    try {
      await adminClient.from('notifications').insert([
        {
          user_id: article.author_id,
          article_id: article.id,
          title: isApproved ? 'Video Dispatch Approved & Live!' : 'Video Placed Under Editorial Review',
          message: isApproved
            ? `The video attached to your story "${article.title}" was approved by an editor and is now visible publicly.`
            : `The video attached to your story "${article.title}" has been set to pending editorial clearance.`,
        },
      ]);
    } catch {
      // Safe ignore notification errors
    }
  }

  return {
    success: true,
    is_approved: isApproved,
    message: isApproved ? 'Video approved and live on public site!' : 'Video marked as pending approval.',
  };
}

// 7c. DELETE / REMOVE VIDEO FROM ARTICLE (Admin)
export async function deleteArticleVideoAdmin(articleId: string) {
  const { isMock } = await verifyAdminAuth();
  if (isMock) {
    return { success: true, message: 'Video removed.' };
  }

  const adminClient = createAdminClient();

  // 1. Fetch video_path
  const { data: article, error: fetchErr } = await adminClient
    .from('articles')
    .select('id, video_path')
    .eq('id', articleId)
    .single();

  if (fetchErr) throw new Error(fetchErr.message);

  // 2. Remove file from Supabase Storage
  if (article?.video_path) {
    try {
      await adminClient.storage.from('news-videos').remove([article.video_path]);
    } catch (e) {
      console.warn('Admin storage removal warning:', e);
    }
  }

  // 3. Clear video columns in articles table
  const { error: updateErr } = await adminClient
    .from('articles')
    .update({
      video_url: null,
      video_path: null,
      video_thumbnail_url: null,
      video_duration: null,
      is_approved: false,
    })
    .eq('id', articleId);

  if (updateErr) throw new Error(updateErr.message);

  return { success: true, message: 'Video permanently removed from post and storage.' };
}

// 7d. REPLACE VIDEO ON ARTICLE (Admin)
export async function replaceArticleVideoAdmin(
  articleId: string,
  newVideoUrl: string,
  newVideoPath: string,
  newDuration?: number
) {
  const { isMock } = await verifyAdminAuth();
  if (isMock) {
    return { success: true, message: 'Video replaced.' };
  }

  // Server-side video format verification
  if (!/\.(mp4|webm|mov)$/i.test(newVideoPath) || !/\.(mp4|webm|mov)(\?.*)?$/i.test(newVideoUrl)) {
    throw new Error('Security rejection: Only .mp4, .webm, and .mov video formats are allowed.');
  }

  const adminClient = createAdminClient();

  // 1. Fetch current video_path to delete previous file
  const { data: current } = await adminClient
    .from('articles')
    .select('id, video_path')
    .eq('id', articleId)
    .single();

  if (current?.video_path && current.video_path !== newVideoPath) {
    try {
      await adminClient.storage.from('news-videos').remove([current.video_path]);
    } catch (e) {
      console.warn('Failed to delete old video from storage:', e);
    }
  }

  // 2. Update with new video and approve it directly
  const { error } = await adminClient
    .from('articles')
    .update({
      video_url: newVideoUrl,
      video_path: newVideoPath,
      video_duration: newDuration || null,
      is_approved: true, // admin replacement is approved
    })
    .eq('id', articleId);

  if (error) throw new Error(error.message);

  return { success: true, message: 'Video replaced and approved live.' };
}

// 8. USERS MANAGEMENT
export async function getAdminUsers() {
  const { isMock } = await verifyAdminAuth();

  if (isMock) {
    const authors = Object.values(FALLBACK_AUTHORS).map((a) => ({
      id: a.id,
      full_name: a.full_name,
      avatar_url: a.avatar_url,
      role: a.role,
      bio: a.bio,
      created_at: '2026-09-28T00:00:00.000Z',
    }));
    authors.push({
      id: 'demo-user-1',
      full_name: 'Zainab Qazi',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      role: 'user',
      bio: 'Community contributor.',
      created_at: '2026-10-23T00:00:00.000Z',
    });
    return { success: true, data: authors };
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return { success: true, data };
}

export async function updateUserRole(userId: string, newRole: 'user' | 'writer' | 'admin') {
  const { isMock } = await verifyAdminAuth();
  if (isMock) return { success: true, message: `User role updated to ${newRole}.` };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) throw new Error(error.message);
  return { success: true, message: `User role updated to ${newRole}.` };
}

export async function deleteUserAdmin(userId: string) {
  const { isMock } = await verifyAdminAuth();
  if (isMock) return { success: true, message: 'User account removed.' };

  const adminClient = createAdminClient();
  // Delete from profiles and auth.users
  const { error: profileError } = await adminClient.from('profiles').delete().eq('id', userId);
  if (profileError) throw new Error(profileError.message);

  try {
    await adminClient.auth.admin.deleteUser(userId);
  } catch {
    // If user was already deleted from auth, proceed
  }

  return { success: true, message: 'User deleted and revoked.' };
}

// 9. CATEGORIES MANAGEMENT
export async function getAdminCategories() {
  const { isMock } = await verifyAdminAuth();
  if (isMock) return { success: true, data: FALLBACK_CATEGORIES };

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.from('categories').select('*').order('name');
  if (error) throw new Error(error.message);
  return { success: true, data };
}

export async function createCategoryAdmin(name: string, description: string) {
  const { isMock } = await verifyAdminAuth();
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (isMock) return { success: true, message: `Category "${name}" created.` };

  const adminClient = createAdminClient();
  const { error } = await adminClient.from('categories').insert([
    {
      name: name.trim(),
      slug,
      description: description.trim() || null,
    },
  ]);

  if (error) throw new Error(error.message);
  return { success: true, message: `Category "${name}" created.` };
}

export async function updateCategoryAdmin(
  categoryId: string,
  name: string,
  description: string
) {
  const { isMock } = await verifyAdminAuth();
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (isMock) return { success: true, message: 'Category updated.' };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('categories')
    .update({
      name: name.trim(),
      slug,
      description: description.trim() || null,
    })
    .eq('id', categoryId);

  if (error) throw new Error(error.message);
  return { success: true, message: 'Category updated successfully.' };
}

export async function deleteCategoryAdmin(categoryId: string) {
  const { isMock } = await verifyAdminAuth();
  if (isMock) return { success: true, message: 'Category deleted.' };

  const adminClient = createAdminClient();
  const { error } = await adminClient.from('categories').delete().eq('id', categoryId);
  if (error) throw new Error(error.message);
  return { success: true, message: 'Category deleted.' };
}

export async function getAdminSubscribers() {
  const { isMock } = await verifyAdminAuth();
  if (isMock) {
    return {
      success: true,
      data: [
        { id: 'sub-1', email: 'editor@whatshappening.news', created_at: '2026-10-25T10:00:00Z' },
        { id: 'sub-2', email: 'reader.daily@gmail.com', created_at: '2026-10-26T14:30:00Z' },
        { id: 'sub-3', email: 'investor.capital@outlook.com', created_at: '2026-10-27T08:15:00Z' },
      ],
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('subscribers')
      .select('id, email, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      return { success: true, data };
    }
  } catch {
    // fallback
  }

  return {
    success: true,
    data: [
      { id: 'sub-1', email: 'editor@whatshappening.news', created_at: '2026-10-25T10:00:00Z' },
      { id: 'sub-2', email: 'reader.daily@gmail.com', created_at: '2026-10-26T14:30:00Z' },
    ],
  };
}
