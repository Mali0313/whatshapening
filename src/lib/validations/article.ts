import { z } from 'zod';

export const articleSchema = z.object({
  title: z
    .string()
    .min(1, { message: 'Title must be at least 1 character long.' })
    .max(5000, { message: 'Title is too long.' }),
  slug: z
    .string()
    .min(1, { message: 'Slug is required.' })
    .max(5000, { message: 'Slug is too long.' }),
  excerpt: z
    .string()
    .optional()
    .or(z.literal('')),
  content: z
    .string()
    .optional()
    .or(z.literal('')),
  category_id: z
    .string()
    .min(1, { message: 'Please select an editorial category desk.' }),
  type: z.enum(['news', 'article']),
  cover_image_url: z
    .string()
    .url({ message: 'Cover image must be a valid URL.' })
    .optional()
    .or(z.literal('')),
  video_url: z
    .string()
    .url({ message: 'Video URL must be a valid URL.' })
    .refine(
      (url) => !url || /\.(mp4|webm|mov)(\?.*)?$/i.test(url),
      { message: 'Video URL must point to a supported format (.mp4, .webm, .mov).' }
    )
    .optional()
    .or(z.literal(''))
    .nullable(),
  video_path: z
    .string()
    .refine(
      (path) => !path || /\.(mp4|webm|mov)$/i.test(path),
      { message: 'Video storage path must end with .mp4, .webm, or .mov.' }
    )
    .optional()
    .or(z.literal(''))
    .nullable(),
  video_thumbnail_url: z.string().optional().or(z.literal('')).nullable(),
  video_duration: z.number().int().optional().nullable(),
  tags: z.array(z.string()).default([]),
});

export type ArticleFormData = z.infer<typeof articleSchema>;
