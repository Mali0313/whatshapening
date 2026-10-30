/**
 * Video Upload Configuration & Utilities for "What's Happening" News Platform
 */

// 1. Single config constant for Maximum File Size: 100 MB
export const MAX_VIDEO_SIZE_MB = 100;
export const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

// 2. Allowed Video Formats
export const ALLOWED_VIDEO_FORMATS = ['mp4', 'webm', 'mov'] as const;
export type AllowedVideoFormat = (typeof ALLOWED_VIDEO_FORMATS)[number];

export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
  'video/x-m4v',
];

export const VIDEO_STORAGE_BUCKET = 'news-videos';

export interface VideoValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates the video file against login status, network, format, and size.
 */
export function validateVideoFile(
  file: File | undefined | null,
  userId: string | undefined | null
): VideoValidationResult {
  // Check 1: User authentication
  if (!userId) {
    return {
      valid: false,
      error: 'Authentication required: You must be logged in to upload a video.',
    };
  }

  // Check 2: File presence
  if (!file) {
    return {
      valid: false,
      error: 'No video file selected.',
    };
  }

  // Check 3: Internet connection
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      valid: false,
      error: 'Network error: No internet connection detected. Please check your network and try again.',
    };
  }

  // Check 4: Allowed format (.mp4, .webm, .mov)
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isAllowedExt = ALLOWED_VIDEO_FORMATS.includes(ext as AllowedVideoFormat);
  const isAllowedMime =
    ALLOWED_VIDEO_MIME_TYPES.includes(file.type.toLowerCase()) ||
    (file.type.startsWith('video/') && (ext === 'mp4' || ext === 'webm' || ext === 'mov'));

  if (!isAllowedExt && !isAllowedMime) {
    return {
      valid: false,
      error: `Invalid file type (.${ext || 'unknown'}). Allowed video formats are: ${ALLOWED_VIDEO_FORMATS.map(
        (f) => f.toUpperCase()
      ).join(', ')} (.mp4, .webm, .mov).`,
    };
  }

  // Check 5: Max file size (100 MB)
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeInMB} MB). Maximum allowed video size is ${MAX_VIDEO_SIZE_MB} MB.`,
    };
  }

  return { valid: true };
}

/**
 * Generates unique path: userId/timestamp-filename
 * Ensures files from different users and times never overwrite each other.
 */
export function generateVideoStoragePath(userId: string, originalFileName: string): string {
  // Sanitize filename to alphanumeric, dots, and hyphens
  const sanitized = originalFileName
    .replace(/[^\w.-]/g, '_')
    .replace(/_+/g, '_');
  const timestamp = Date.now();
  return `${userId}/${timestamp}-${sanitized}`;
}

/**
 * Uploads video to Supabase Storage "news-videos" bucket with byte-level progress reporting.
 */
export async function uploadVideoWithProgress({
  file,
  userId,
  supabaseUrl,
  anonKey,
  accessToken,
  onProgress,
}: {
  file: File;
  userId: string;
  supabaseUrl: string;
  anonKey: string;
  accessToken?: string;
  onProgress: (percent: number) => void;
}): Promise<{ videoUrl: string; videoPath: string }> {
  // Pre-upload connection check
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Network error: No internet connection. Please check your connection and try again.');
  }

  const filePath = generateVideoStoragePath(userId, file.name);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const endpoint = `${supabaseUrl}/storage/v1/object/${VIDEO_STORAGE_BUCKET}/${filePath}`;

    xhr.open('POST', endpoint);
    xhr.setRequestHeader('apikey', anonKey);
    if (accessToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    }
    xhr.setRequestHeader('x-upsert', 'true');

    // Real-time byte progress reporting
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        // Public URL for public bucket news-videos
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${VIDEO_STORAGE_BUCKET}/${filePath}`;
        resolve({ videoUrl: publicUrl, videoPath: filePath });
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          const msg = errRes.message || errRes.error || `Upload failed with status ${xhr.status}`;
          reject(new Error(msg));
        } catch {
          reject(new Error(`Storage server error (HTTP ${xhr.status}).`));
        }
      }
    };

    xhr.onerror = () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        reject(new Error('Network error: Internet connection was lost during upload.'));
      } else {
        reject(new Error('Network error: Failed to connect to video storage server.'));
      }
    };

    xhr.ontimeout = () => {
      reject(new Error('Upload timed out. Please try again with a stable connection.'));
    };

    const formData = new FormData();
    formData.append('cacheControl', '3600');
    formData.append('', file);

    xhr.send(formData);
  });
}

