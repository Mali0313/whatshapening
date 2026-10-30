-- ==============================================================================
-- "WHAT'S HAPPENING" NEWS PLATFORM - SUPABASE SCHEMA & RLS POLICIES
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'writer', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE article_type AS ENUM ('news', 'article');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE article_status AS ENUM ('draft', 'pending', 'published', 'rejected');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE
-- Linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  role user_role DEFAULT 'user'::user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. ARTICLES TABLE
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  video_url TEXT,
  video_path TEXT,
  video_thumbnail_url TEXT,
  video_duration INTEGER,
  is_approved BOOLEAN DEFAULT false NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type article_type DEFAULT 'news'::article_type NOT NULL,
  status article_status DEFAULT 'draft'::article_status NOT NULL,
  is_breaking BOOLEAN DEFAULT false NOT NULL,
  is_featured BOOLEAN DEFAULT false NOT NULL,
  views BIGINT DEFAULT 0 NOT NULL,
  rejection_reason TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. TAGS & ARTICLE_TAGS TABLES
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.article_tags (
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- 7. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 8. BOOKMARKS TABLE
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, article_id)
);

-- 9. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status ON public.articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category_id ON public.articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON public.articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON public.articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_is_breaking ON public.articles(is_breaking) WHERE is_breaking = true;
CREATE INDEX IF NOT EXISTS idx_articles_is_featured ON public.articles(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON public.tags(slug);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON public.bookmarks(user_id);

-- 10. HELPER FUNCTIONS FOR RLS (Security Definer to prevent policy recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles
  WHERE id = auth.uid();
$$;

-- 11. TRIGGER: AUTO-CREATE PROFILE ON USER SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    'user'::user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. TRIGGER: AUTOMATIC UPDATED_AT TIMESTAMP
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_articles_updated_at ON public.articles;
CREATE TRIGGER trg_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. PROFILES POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view all profiles" ON public.profiles;
CREATE POLICY "Public can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile fields (except role)" ON public.profiles;
CREATE POLICY "Users can update own profile fields (except role)"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) OR public.is_admin())
  );

DROP POLICY IF EXISTS "Admins can manage any profile and change roles" ON public.profiles;
CREATE POLICY "Admins can manage any profile and change roles"
  ON public.profiles FOR ALL
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- B. CATEGORIES POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories"
  ON public.categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admin can manage categories" ON public.categories;
CREATE POLICY "Only admin can manage categories"
  ON public.categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- C. TAGS & ARTICLE_TAGS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view tags" ON public.tags;
CREATE POLICY "Public can view tags"
  ON public.tags FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create tags" ON public.tags;
CREATE POLICY "Authenticated users can create tags"
  ON public.tags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Only admins can update or delete tags" ON public.tags;
CREATE POLICY "Only admins can update or delete tags"
  ON public.tags FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public can view article_tags" ON public.article_tags;
CREATE POLICY "Public can view article_tags"
  ON public.article_tags FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authors and admins can manage article tags" ON public.article_tags;
CREATE POLICY "Authors and admins can manage article tags"
  ON public.article_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.articles a
      WHERE a.id = article_tags.article_id
      AND (a.author_id = auth.uid() OR public.is_admin())
    )
  );

-- ------------------------------------------------------------------------------
-- D. ARTICLES POLICIES
-- ------------------------------------------------------------------------------
-- 1. Read: Public can read published articles; authors can read own articles; admins can read all
DROP POLICY IF EXISTS "Public can view published articles" ON public.articles;
CREATE POLICY "Public can view published articles"
  ON public.articles FOR SELECT
  USING (
    status = 'published'
    OR author_id = auth.uid()
    OR public.is_admin()
  );

-- 2. Insert: Users and writers can create articles
-- Users' articles must be saved as "pending" or "draft". Writers can set "published".
DROP POLICY IF EXISTS "Users and writers can create articles" ON public.articles;
CREATE POLICY "Users and writers can create articles"
  ON public.articles FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND author_id = auth.uid()
    AND (
      -- Regular users can only submit as draft or pending
      (public.get_user_role() = 'user' AND status IN ('draft', 'pending'))
      -- Writers can set draft, pending, or published
      OR (public.get_user_role() = 'writer' AND status IN ('draft', 'pending', 'published'))
      -- Admins can set any status
      OR public.is_admin()
    )
  );

-- 3. Update: Users and writers can edit only their own drafts; writers can publish their own; admins can approve/reject any
DROP POLICY IF EXISTS "Authors can update own drafts; Admins can update any" ON public.articles;
CREATE POLICY "Authors can update own drafts; Admins can update any"
  ON public.articles FOR UPDATE
  USING (
    (author_id = auth.uid() AND status IN ('draft', 'pending'))
    OR public.is_admin()
  )
  WITH CHECK (
    (
      author_id = auth.uid()
      AND (
        (public.get_user_role() = 'user' AND status IN ('draft', 'pending'))
        OR (public.get_user_role() = 'writer' AND status IN ('draft', 'pending', 'published'))
      )
    )
    OR public.is_admin()
  );

-- 4. Delete: Authors can delete only their own drafts; Admins can delete any
DROP POLICY IF EXISTS "Authors can delete own drafts; Admins can delete any" ON public.articles;
CREATE POLICY "Authors can delete own drafts; Admins can delete any"
  ON public.articles FOR DELETE
  USING (
    (author_id = auth.uid() AND status = 'draft')
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- E. NOTIFICATIONS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "System and admins can insert notifications" ON public.notifications;
CREATE POLICY "System and admins can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- F. BOOKMARKS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view own bookmarks"
  ON public.bookmarks FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can create own bookmarks"
  ON public.bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete own bookmarks"
  ON public.bookmarks FOR DELETE
  USING (user_id = auth.uid());

-- ==============================================================================
-- STORAGE BUCKET: article-images
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-images', 'article-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies
DROP POLICY IF EXISTS "Public can view article images" ON storage.objects;
CREATE POLICY "Public can view article images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'article-images');

DROP POLICY IF EXISTS "Authenticated users can upload article images" ON storage.objects;
CREATE POLICY "Authenticated users can upload article images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'article-images'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can update own article images" ON storage.objects;
CREATE POLICY "Users can update own article images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'article-images' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can delete own article images" ON storage.objects;
CREATE POLICY "Users can delete own article images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'article-images' AND (auth.uid() = owner OR public.is_admin()));

-- ==============================================================================
-- STORAGE BUCKET: news-videos
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('news-videos', 'news-videos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies for news-videos
DROP POLICY IF EXISTS "Public can view news videos" ON storage.objects;
CREATE POLICY "Public can view news videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'news-videos');

DROP POLICY IF EXISTS "Authenticated users can upload news videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload news videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'news-videos'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can update own news videos" ON storage.objects;
CREATE POLICY "Users can update own news videos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'news-videos' AND auth.uid()::text = owner::text);

DROP POLICY IF EXISTS "Users can delete own news videos" ON storage.objects;
CREATE POLICY "Users can delete own news videos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'news-videos' AND (auth.uid()::text = owner::text OR public.is_admin()));

-- ==============================================================================
-- INSERT CATEGORIES (Idempotent)
-- ==============================================================================
INSERT INTO public.categories (name, slug, description)
VALUES
  ('Pakistan', 'pakistan', 'Comprehensive coverage of political, economic, and social developments across Pakistan.'),
  ('World', 'world', 'Global affairs, international treaties, geopolitics, and foreign relations.'),
  ('Politics', 'politics', 'National legislation, governance, election cycles, and constitutional debates.'),
  ('Sports', 'sports', 'Cricket, football, Olympics, athletic championships, and athlete profiles.'),
  ('Business', 'business', 'Financial markets, banking policy, startups, trade, and economic analysis.'),
  ('Technology', 'technology', 'Artificial intelligence, semiconductors, software, cybersecurity, and space tech.'),
  ('Entertainment', 'entertainment', 'Cinema, television, performing arts, literature, and cultural festivals.'),
  ('Health', 'health', 'Medical discoveries, public healthcare policy, epidemiology, and wellness.'),
  ('Education', 'education', 'University research, primary schooling, vocational education, and pedagogy.'),
  ('Science', 'science', 'Astronomy, quantum physics, climate science, geology, and evolutionary biology.'),
  ('Opinion', 'opinion', 'Essays, columns, guest perspectives, and positions of The Editorial Board.')
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description;
