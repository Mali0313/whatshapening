'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Helper to authenticate user and verify article ownership or admin privilege
 */
async function getAuthAndArticle(articleId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be logged in to manage videos.');
  }

  // Fetch article
  const adminClient = createAdminClient();
  const { data: article, error: artError } = await adminClient
    .from('articles')
    .select('id, title, author_id, video_url, video_path, is_approved')
    .eq('id', articleId)
    .single();

  if (artError || !article) {
    throw new Error('Article not found.');
  }

  // Check role
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';
  const isOwner = article.author_id === user.id;

  if (!isAdmin && !isOwner) {
    throw new Error('Permission denied: You can only modify videos on your own articles.');
  }

  return { user, profile, isAdmin, isOwner, article, adminClient };
}

/**
 * Remove/delete a video from an article and clean up Supabase Storage
 */
export async function deleteArticleVideoAction(articleId: string) {
  const { article, adminClient } = await getAuthAndArticle(articleId);

  // Delete from Supabase Storage if path exists
  if (article.video_path) {
    try {
      await adminClient.storage.from('news-videos').remove([article.video_path]);
    } catch (storageErr) {
      console.warn('Failed to delete file from news-videos storage:', storageErr);
    }
  }

  // Clear video fields in database
  const { error } = await adminClient
    .from('articles')
    .update({
      video_url: null,
      video_path: null,
      video_thumbnail_url: null,
      video_duration: null,
      is_approved: false,
    })
    .eq('id', articleId);

  if (error) {
    throw new Error(error.message);
  }

  return { success: true, message: 'Video removed and storage file deleted.' };
}

/**
 * Replace an article's video and delete the old storage file
 */
export async function replaceArticleVideoAction(
  articleId: string,
  newVideoUrl: string,
  newVideoPath: string,
  duration?: number
) {
  const { article, isAdmin, adminClient } = await getAuthAndArticle(articleId);

  // Server-side video format verification
  if (!/\.(mp4|webm|mov)$/i.test(newVideoPath) || !/\.(mp4|webm|mov)(\?.*)?$/i.test(newVideoUrl)) {
    throw new Error('Security rejection: Only .mp4, .webm, and .mov video formats are allowed.');
  }

  // If there was an existing video file different from the new one, remove it from storage
  if (article.video_path && article.video_path !== newVideoPath) {
    try {
      await adminClient.storage.from('news-videos').remove([article.video_path]);
    } catch (e) {
      console.warn('Failed to delete old video from storage:', e);
    }
  }

  // Admins get auto-approved videos; writers require review
  const isApproved = isAdmin ? true : false;

  const { error } = await adminClient
    .from('articles')
    .update({
      video_url: newVideoUrl,
      video_path: newVideoPath,
      video_duration: duration || null,
      is_approved: isApproved,
    })
    .eq('id', articleId);

  if (error) {
    throw new Error(error.message);
  }

  return {
    success: true,
    is_approved: isApproved,
    message: isApproved
      ? 'Video replaced and published live!'
      : 'Video replaced. It will be public once approved by an editor.',
  };
}

/**
 * Toggle Video Approval flag (Admin only)
 */
export async function toggleVideoApprovalAction(articleId: string, isApproved: boolean) {
  const { isAdmin, article, adminClient } = await getAuthAndArticle(articleId);

  if (!isAdmin) {
    throw new Error('Only administrators can approve or reject videos.');
  }

  const { error } = await adminClient
    .from('articles')
    .update({ is_approved: isApproved })
    .eq('id', articleId);

  if (error) {
    throw new Error(error.message);
  }

  // Notify author
  if (article.author_id) {
    await adminClient.from('notifications').insert([
      {
        user_id: article.author_id,
        article_id: article.id,
        title: isApproved ? 'Video Approved & Live!' : 'Video Placed Under Review',
        message: isApproved
          ? `The video attached to your story "${article.title}" has been approved by the editorial board.`
          : `The video attached to your story "${article.title}" has been set to pending editorial review.`,
      },
    ]);
  }

  return {
    success: true,
    is_approved: isApproved,
    message: isApproved ? 'Video approved and live on public site!' : 'Video hidden and set to pending review.',
  };
}

/**
 * Delete an article along with any attached video in Supabase Storage
 */
export async function deleteArticleWithMediaAction(articleId: string) {
  const { article, adminClient } = await getAuthAndArticle(articleId);

  // 1. Remove video file from news-videos storage
  if (article.video_path) {
    try {
      await adminClient.storage.from('news-videos').remove([article.video_path]);
    } catch (e) {
      console.warn('Failed to delete video file during article deletion:', e);
    }
  }

  // 2. Delete article row from database
  const { error } = await adminClient.from('articles').delete().eq('id', articleId);
  if (error) {
    throw new Error(error.message);
  }

  return { success: true, message: 'Article and attached video file deleted permanently.' };
}

