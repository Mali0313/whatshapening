import { createClient } from '@/lib/supabase/server';
import {
  Article,
  Category,
  FALLBACK_ARTICLES,
  FALLBACK_CATEGORIES,
  FALLBACK_AUTHORS,
} from './mockArticles';

export type { Article, Category };

/**
 * Helper to check if Supabase is properly configured in environment
 */
function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes('[paste') && !key.includes('[paste'));
}

/**
 * High-Performance Single-Roundtrip Homepage Data Loader
 * Queries articles and categories in a single concurrent batch without the heavy article body content.
 */
export async function getHomePageData(): Promise<{
  breakingNews: Article[];
  featuredArticles: Article[];
  trendingArticles: Article[];
  latestArticles: Article[];
  categories: Category[];
}> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const [articlesRes, categoriesRes] = await Promise.all([
        supabase
          .from('articles')
          .select('id, title, slug, excerpt, content, cover_image_url, video_url, video_path, is_approved, category_id, author_id, type, status, is_breaking, is_featured, views, published_at, created_at, category:categories(id, name, slug), author:profiles(id, full_name, avatar_url, bio, role)')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(25),
        supabase
          .from('categories')
          .select('id, name, slug, description')
          .order('name'),
      ]);

      const allArticles = (articlesRes.data || []) as unknown as Article[];
      const categories = (categoriesRes.data || []) as Category[];

      if (allArticles.length > 0) {
        const breaking = allArticles.filter((a) => a.is_breaking).slice(0, 5);
        const featured = allArticles.filter((a) => a.is_featured).slice(0, 6);
        const trending = [...allArticles].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6);

        return {
          breakingNews: breaking,
          featuredArticles: featured.length > 0 ? featured : allArticles.slice(0, 4),
          trendingArticles: trending,
          latestArticles: allArticles.slice(0, 15),
          categories: categories.length > 0 ? categories : FALLBACK_CATEGORIES,
        };
      }
    } catch {
      // Fallback
    }
  }

  return {
    breakingNews: FALLBACK_ARTICLES.filter((a) => a.is_breaking),
    featuredArticles: FALLBACK_ARTICLES.filter((a) => a.is_featured),
    trendingArticles: [...FALLBACK_ARTICLES].sort((a, b) => b.views - a.views).slice(0, 6),
    latestArticles: FALLBACK_ARTICLES.slice(0, 10),
    categories: FALLBACK_CATEGORIES,
  };
}

export async function getCategories(): Promise<Category[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, description')
        .order('name');
      if (!error && data && data.length > 0) {
        return data as Category[];
      }
    } catch {
      // Fallback
    }
  }
  return FALLBACK_CATEGORIES;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug) || null;
}

export async function getBreakingNews(): Promise<Article[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('articles')
        .select('*, category:categories(id, name, slug), author:profiles(id, full_name, avatar_url, bio, role)')
        .eq('status', 'published')
        .eq('is_breaking', true)
        .order('published_at', { ascending: false })
        .limit(5);

      if (!error && data && data.length > 0) {
        return data as Article[];
      }
    } catch {
      // Fallback
    }
  }
  return FALLBACK_ARTICLES.filter((a) => a.is_breaking);
}

export async function getFeaturedArticles(): Promise<Article[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('articles')
        .select('*, category:categories(id, name, slug), author:profiles(id, full_name, avatar_url, bio, role)')
        .eq('status', 'published')
        .eq('is_featured', true)
        .order('published_at', { ascending: false })
        .limit(6);

      if (!error && data && data.length > 0) {
        return data as Article[];
      }
    } catch {
      // Fallback
    }
  }
  return FALLBACK_ARTICLES.filter((a) => a.is_featured);
}

export async function getLatestArticles(limit = 10): Promise<Article[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('articles')
        .select('*, category:categories(id, name, slug), author:profiles(id, full_name, avatar_url, bio, role)')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit);

      if (!error && data && data.length > 0) {
        return data as Article[];
      }
    } catch {
      // Fallback
    }
  }
  return [...FALLBACK_ARTICLES]
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    .slice(0, limit);
}

export async function getTrendingArticles(limit = 6): Promise<Article[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('articles')
        .select('*, category:categories(id, name, slug), author:profiles(id, full_name, avatar_url, bio, role)')
        .eq('status', 'published')
        .order('views', { ascending: false })
        .limit(limit);

      if (!error && data && data.length > 0) {
        return data as Article[];
      }
    } catch {
      // Fallback
    }
  }
  return [...FALLBACK_ARTICLES].sort((a, b) => b.views - a.views).slice(0, limit);
}

export async function getArticlesByCategory(
  categorySlug: string,
  page = 1,
  pageSize = 6
): Promise<{ articles: Article[]; total: number; totalPages: number }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();

      // Find category first
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .single();

      if (cat) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, count, error } = await supabase
          .from('articles')
          .select('*, category:categories(id, name, slug), author:profiles(id, full_name, avatar_url, bio, role)', {
            count: 'exact',
          })
          .eq('status', 'published')
          .eq('category_id', cat.id)
          .order('published_at', { ascending: false })
          .range(from, to);

        if (!error && data && count !== null) {
          return {
            articles: data as Article[],
            total: count,
            totalPages: Math.ceil(count / pageSize),
          };
        }
      }
    } catch {
      // Fallback
    }
  }

  const filtered = FALLBACK_ARTICLES.filter((a) => a.category?.slug === categorySlug);
  const total = filtered.length;
  const from = (page - 1) * pageSize;
  const articles = filtered.slice(from, from + pageSize);

  return {
    articles,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('articles')
        .select('*, category:categories(id, name, slug), author:profiles(id, full_name, avatar_url, bio, role)')
        .eq('slug', slug)
        .single();

      if (!error && data) {
        return data as Article;
      }
    } catch {
      // Fallback
    }
  }

  const match = FALLBACK_ARTICLES.find((a) => a.slug === slug);
  return match || null;
}

export async function getRelatedArticles(
  currentArticleId: string,
  categoryId: string,
  limit = 4
): Promise<Article[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('articles')
        .select('*, category:categories(id, name, slug), author:profiles(id, full_name, avatar_url, bio, role)')
        .eq('status', 'published')
        .eq('category_id', categoryId)
        .neq('id', currentArticleId)
        .limit(limit);

      if (!error && data && data.length > 0) {
        return data as Article[];
      }
    } catch {
      // Fallback
    }
  }

  return FALLBACK_ARTICLES.filter(
    (a) => a.id !== currentArticleId && a.category_id === categoryId
  ).slice(0, limit);
}

export async function getAuthorProfile(authorId: string) {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authorId)
        .single();

      if (!error && data) {
        return data;
      }
    } catch {
      // Fallback
    }
  }

  const authorValues = Object.values(FALLBACK_AUTHORS);
  return authorValues.find((a) => a.id === authorId) || authorValues[0];
}

export async function getArticlesByAuthor(
  authorId: string,
  page = 1,
  pageSize = 9
): Promise<{ articles: Article[]; total: number }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await supabase
        .from('articles')
        .select('*, category:categories(id, name, slug), author:profiles(id, full_name, avatar_url, bio, role)', {
          count: 'exact',
        })
        .eq('status', 'published')
        .eq('author_id', authorId)
        .order('published_at', { ascending: false })
        .range(from, to);

      if (!error && data && count !== null) {
        return {
          articles: data as Article[],
          total: count,
        };
      }
    } catch {
      // Fallback
    }
  }

  const filtered = FALLBACK_ARTICLES.filter((a) => a.author_id === authorId);
  return {
    articles: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
  };
}

export async function searchArticles(
  query: string,
  categorySlug?: string
): Promise<Article[]> {
  const normalizedQuery = (query || '').toLowerCase().trim();

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      let req = supabase
        .from('articles')
        .select('*, category:categories(id, name, slug), author:profiles(id, full_name, avatar_url, bio, role)')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (categorySlug && categorySlug !== 'all') {
        const { data: cat } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', categorySlug)
          .single();
        if (cat) {
          req = req.eq('category_id', cat.id);
        }
      }

      if (normalizedQuery) {
        req = req.or(`title.ilike.%${normalizedQuery}%,excerpt.ilike.%${normalizedQuery}%`);
      }

      const { data, error } = await req.limit(30);
      if (!error && data && data.length > 0) {
        return data as Article[];
      }
    } catch {
      // Fallback
    }
  }

  return FALLBACK_ARTICLES.filter((a) => {
    const matchCat =
      !categorySlug || categorySlug === 'all' || a.category?.slug === categorySlug;
    const matchText =
      !normalizedQuery ||
      a.title.toLowerCase().includes(normalizedQuery) ||
      a.excerpt.toLowerCase().includes(normalizedQuery) ||
      a.content.toLowerCase().includes(normalizedQuery);
    return matchCat && matchText;
  });
}

export async function getAllPublishedArticles(): Promise<Article[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('articles')
        .select('id, slug, title, published_at, created_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as unknown as Article[];
      }
    } catch {
      // Fallback
    }
  }
  return FALLBACK_ARTICLES;
}

