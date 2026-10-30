-- ==============================================================================
-- "WHAT'S HAPPENING" NEWS PLATFORM - COMPLETE DATABASE SETUP & SEED
-- Copy and paste this entire script directly into your Supabase SQL Editor.
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

-- 10. RLS HELPER FUNCTIONS
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- PROFILES
DROP POLICY IF EXISTS "Public can view all profiles" ON public.profiles;
CREATE POLICY "Public can view all profiles"
  ON public.profiles FOR SELECT USING (true);

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
  ON public.profiles FOR ALL USING (public.is_admin());

-- CATEGORIES
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories"
  ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admin can manage categories" ON public.categories;
CREATE POLICY "Only admin can manage categories"
  ON public.categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- TAGS & ARTICLE_TAGS
DROP POLICY IF EXISTS "Public can view tags" ON public.tags;
CREATE POLICY "Public can view tags"
  ON public.tags FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create tags" ON public.tags;
CREATE POLICY "Authenticated users can create tags"
  ON public.tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Only admins can update or delete tags" ON public.tags;
CREATE POLICY "Only admins can update or delete tags"
  ON public.tags FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public can view article_tags" ON public.article_tags;
CREATE POLICY "Public can view article_tags"
  ON public.article_tags FOR SELECT USING (true);

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

-- ARTICLES
DROP POLICY IF EXISTS "Public can view published articles" ON public.articles;
CREATE POLICY "Public can view published articles"
  ON public.articles FOR SELECT
  USING (
    status = 'published'
    OR author_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users and writers can create articles" ON public.articles;
CREATE POLICY "Users and writers can create articles"
  ON public.articles FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND author_id = auth.uid()
    AND (
      (public.get_user_role() = 'user' AND status IN ('draft', 'pending'))
      OR (public.get_user_role() = 'writer' AND status IN ('draft', 'pending', 'published'))
      OR public.is_admin()
    )
  );

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

DROP POLICY IF EXISTS "Authors can delete own drafts; Admins can delete any" ON public.articles;
CREATE POLICY "Authors can delete own drafts; Admins can delete any"
  ON public.articles FOR DELETE
  USING (
    (author_id = auth.uid() AND status = 'draft')
    OR public.is_admin()
  );

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "System and admins can insert notifications" ON public.notifications;
CREATE POLICY "System and admins can insert notifications"
  ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE USING (user_id = auth.uid());

-- BOOKMARKS
DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view own bookmarks"
  ON public.bookmarks FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can create own bookmarks"
  ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete own bookmarks"
  ON public.bookmarks FOR DELETE USING (user_id = auth.uid());

-- ==============================================================================
-- STORAGE BUCKET: article-images
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-images', 'article-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

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
-- INSERT CATEGORIES
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

-- ==============================================================================
-- INSERT EDITORIAL AUTHORS & 15 SAMPLE PUBLISHED ARTICLES
-- ==============================================================================
DO $$
DECLARE
  author1_id UUID := 'a0000000-0000-0000-0000-000000000001';
  author2_id UUID := 'a0000000-0000-0000-0000-000000000002';
  author3_id UUID := 'a0000000-0000-0000-0000-000000000003';

  cat_pakistan UUID;
  cat_world UUID;
  cat_politics UUID;
  cat_sports UUID;
  cat_business UUID;
  cat_tech UUID;
  cat_entertainment UUID;
  cat_health UUID;
  cat_education UUID;
  cat_science UUID;
  cat_opinion UUID;
BEGIN
  -- 1. Create editorial users in auth.users if not present
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = author1_id) THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (author1_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tariq.mansoor@whatshappening.news', crypt('EditorSecret2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Tariq Mansoor"}', now(), now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = author2_id) THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (author2_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ayesha.siddiqui@whatshappening.news', crypt('EditorSecret2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dr. Ayesha Siddiqui"}', now(), now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = author3_id) THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (author3_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'arthur.vance@whatshappening.news', crypt('EditorSecret2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Arthur Vance"}', now(), now());
  END IF;

  -- 2. Upsert profiles
  INSERT INTO public.profiles (id, full_name, bio, role, avatar_url)
  VALUES
    (author1_id, 'Tariq Mansoor', 'Senior Diplomatic and South Asian Affairs Correspondent.', 'writer', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80'),
    (author2_id, 'Dr. Ayesha Siddiqui', 'Chief Science, Energy, and Technology Editor.', 'writer', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80'),
    (author3_id, 'Arthur Vance', 'Lead Editorial Board Member and Geopolitics Essayist.', 'admin', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80')
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name, bio = EXCLUDED.bio, role = EXCLUDED.role, avatar_url = EXCLUDED.avatar_url;

  -- 3. Resolve Category IDs
  SELECT id INTO cat_pakistan FROM public.categories WHERE slug = 'pakistan';
  SELECT id INTO cat_world FROM public.categories WHERE slug = 'world';
  SELECT id INTO cat_politics FROM public.categories WHERE slug = 'politics';
  SELECT id INTO cat_sports FROM public.categories WHERE slug = 'sports';
  SELECT id INTO cat_business FROM public.categories WHERE slug = 'business';
  SELECT id INTO cat_tech FROM public.categories WHERE slug = 'technology';
  SELECT id INTO cat_entertainment FROM public.categories WHERE slug = 'entertainment';
  SELECT id INTO cat_health FROM public.categories WHERE slug = 'health';
  SELECT id INTO cat_education FROM public.categories WHERE slug = 'education';
  SELECT id INTO cat_science FROM public.categories WHERE slug = 'science';
  SELECT id INTO cat_opinion FROM public.categories WHERE slug = 'opinion';

  -- 4. Insert 15 Articles
  -- Article 1: Pakistan
  INSERT INTO public.articles (title, slug, excerpt, content, cover_image_url, category_id, author_id, type, status, is_breaking, is_featured, views, published_at)
  VALUES (
    'Pakistan Unveils National Semiconductor & IT Corridor in Islamabad Special Economic Zone',
    'pakistan-unveils-national-semiconductor-it-corridor',
    'A landmark $3.5 billion public-private technology initiative aims to position Pakistan as a regional hub for microchip testing, assembly, and AI software engineering.',
    'ISLAMABAD — In a pivotal economic milestone, federal authorities and global tech consortiums on Wednesday inaugurated the National Semiconductor and Advanced Computing Park. The facility will train 50,000 chip design engineers over five years and provide zero-duty clean room infrastructure.

Officials emphasized that diversifying national exports into silicon fabrication and software architecture will yield long-term macroeconomic stability and high-wage technological employment.',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    cat_pakistan, author1_id, 'news', 'published', true, true, 24820, now() - interval '2 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 2: World
  INSERT INTO public.articles (title, slug, excerpt, content, cover_image_url, category_id, author_id, type, status, is_breaking, is_featured, views, published_at)
  VALUES (
    'The Geneva Accord: 52 Nations Sign Framework on Global Quantum Encryption Protocols',
    'geneva-accord-52-nations-sign-quantum-framework',
    'Delegates conclude marathon diplomatic sessions to codify cross-border cryptography standards before next-generation quantum computing clusters reach decryption parity.',
    'GENEVA — Following fourteen months of closed-door deliberations, diplomats from fifty-two states formally signed the Geneva Quantum Governance Treaty. The agreement guarantees non-offensive verification mechanisms and open algorithmic registries.

"We stand at the threshold of a computational epoch where sovereignty must be codified in code, not just physical boundaries," the UN Special Rapporteur declared during the plenary vote.',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    cat_world, author3_id, 'article', 'published', false, true, 19430, now() - interval '4 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 3: Politics
  INSERT INTO public.articles (title, slug, excerpt, content, cover_image_url, category_id, author_id, type, status, is_breaking, is_featured, views, published_at)
  VALUES (
    'Parliament Passes Comprehensive Electoral Decentralization and Campaign Transparency Act',
    'parliament-passes-electoral-decentralization-act',
    'New legislation mandates real-time digital disclosure of campaign funding sources and devolves municipal governance authority to local councils.',
    'The historic parliamentary reform bill passed with a decisive two-thirds majority. The statute establishes independent auditing bodies, caps private donor matching, and sets automated balloting benchmarks for all district elections starting next cycle.',
    'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80',
    cat_politics, author1_id, 'news', 'published', false, false, 8740, now() - interval '6 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 4: Technology
  INSERT INTO public.articles (title, slug, excerpt, content, cover_image_url, category_id, author_id, type, status, is_breaking, is_featured, views, published_at)
  VALUES (
    'Photonic Interconnect Breakthrough Reduces AI Data Center Power Demands by 70%',
    'photonic-interconnect-breakthrough-ai-power',
    'Silicon photonics researchers replace copper traces with sub-nanometer laser waveguides, solving the severe electricity bottleneck confronting massive reasoning clusters.',
    'SAN FRANCISCO — Computing hardware engineers have achieved a long-sought holy grail: replacing resistive copper interconnects with low-loss optical waveguides across server racks. In field trials, power efficiency improved fourfold while latency dropped below 20 picoseconds.

The breakthrough is expected to dramatically ease the environmental and grid burdens imposed by rapidly expanding artificial intelligence infrastructures.',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    cat_tech, author2_id, 'news', 'published', true, true, 31200, now() - interval '7 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 5: Business
  INSERT INTO public.articles (title, slug, excerpt, content, cover_image_url, category_id, author_id, type, status, is_breaking, is_featured, views, published_at)
  VALUES (
    'Central Banks Complete First Multi-Currency Atomic Settlement via Sovereign Digital Ledgers',
    'central-banks-multi-currency-atomic-settlement',
    'Financial authorities in Tokyo, London, and Zurich finalize instant cross-border payments with zero intermediary counterparty exposure.',
    'The successful execution of Project Meridian demonstrates that atomic settlement algorithms can eliminate the traditional two-day lag in foreign exchange transactions, unlocking an estimated $1.2 trillion in tied-up reserve liquidity worldwide.',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80',
    cat_business, author3_id, 'news', 'published', false, false, 14210, now() - interval '9 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 6: Sports
  INSERT INTO public.articles (title, slug, excerpt, content, cover_image_url, category_id, author_id, type, status, is_breaking, is_featured, views, published_at)
  VALUES (
    'Lahore and Rawalpindi Stadiums Complete State-of-the-Art Upgrades for ICC Champions Trophy',
    'lahore-rawalpindi-stadiums-icc-trophy-upgrades',
    'New LED broadcast canopies, sub-air drainage, and expanded international pavilions unveiled ahead of the premier cricket tournament.',
    'LAHORE — Cricket enthusiasts celebrated today as the PCB formally showcased the completed renovations of Gaddafi Stadium and the Rawalpindi Cricket Stadium. The high-capacity venues now feature world-class sub-air drainage systems capable of clearing monsoon rainwater in under fifteen minutes.',
    'https://images.unsplash.com/photo-1531415074868-036b1c57e359?auto=format&fit=crop&w=1200&q=80',
    cat_sports, author1_id, 'news', 'published', false, false, 28940, now() - interval '11 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 7: Science
  INSERT INTO public.articles (title, slug, excerpt, content, cover_image_url, category_id, author_id, type, status, is_breaking, is_featured, views, published_at)
  VALUES (
    'Orbital Radar Telemetry Discovers Massive Subterranean Freshwater Aquifer in Thar Desert',
    'orbital-radar-subterranean-freshwater-aquifer-thar',
    'Satellite radar sounding confirms deep geological basin containing an estimated 800 billion cubic meters of pristine potable water.',
    'Geophysicists analyzing radar topography data have confirmed an immense fossil water aquifer buried beneath the sands of the Thar Desert. Hydrologists are drafting sustainable extraction protocols that could supply drought-resilient agriculture for generations.',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    cat_science, author2_id, 'article', 'published', false, true, 21300, now() - interval '13 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 8: Health
  INSERT INTO public.articles (title, slug, excerpt, content, cover_image_url, category_id, author_id, type, status, is_breaking, is_featured, views, published_at)
  VALUES (
    'WHO Approves Next-Generation Universal Malaria Vaccine with 94% Efficacy in Field Trials',
    'who-approves-universal-malaria-vaccine-94-percent',
    'Production scale-up to deliver 120 million doses annually across tropical regions, marking a decisive victory against the mosquito-borne disease.',
    'GENEVA — In what health experts are describing as the most significant epidemiologic triumph of the decade, the World Health Organization has certified the R22-Matrix vaccine for general pediatric distribution. Clinical trials showed unprecedented protection lasting through multiple wet seasons.',
    'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&q=80',
    cat_health, author2_id, 'news', 'published', false, false, 16750, now() - interval '15 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 9: Education
  INSERT INTO public.articles (title, slug, excerpt, content, cover_image_url, category_id, author_id, type, status, is_breaking, is_featured, views, published_at)
  VALUES (
    'Nationwide Digital Curriculum Overhaul Integrates Critical Thinking and Python in Primary Schools',
    'nationwide-digital-curriculum-critical-thinking-python',
    'Education ministry replaces rote memorization exams with project-based computational literacy and logical debate across 14,000 public academies.',
    'The National Curriculum Council on Tuesday revealed its finalized syllabi for grades 1 through 8. By introducing interactive coding simulations alongside debate ethics, the reform seeks to foster indigenous problem solvers ready for tomorrow’s global knowledge economy.',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80',
    cat_education, author1_id, 'article', 'published', false, false, 11200, now() - interval '17 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 10: Entertainment
  INSERT INTO public.articles (title, slug, excerpt, content, cover_image_url, category_id, author_id, type, status, is_breaking, is_featured, views, published_at)
  VALUES (
    'Independent South Asian Cinema Dominates European Festival Circuit with Unflinching Realism',
    'south-asian-cinema-dominates-european-festival-circuit',
    'A renaissance of young directors sweeps Cannes and Venice with intimate, visually striking portraits of modern urban metamorphosis.',
    'Film critics in Berlin and Cannes have hailed the bold wave of independent cinematic storytelling emerging from Lahore, Karachi, and Mumbai. Embracing natural lighting and authentic linguistic dialects, these productions have resonated deeply with international juries.',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
    cat_entertainment, author1_id, 'article', 'published', false, false, 9830, now() - interval '20 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 11: Opinion
  INSERT INTO public.articles (title, slug, excerpt, content, cover_image_url, category_id, author_id, type, status, is_breaking, is_featured, views, published_at)
  VALUES (
    'The Editorial Board: Why Human Verification Remains The Ultimate Bulwark in The Generative Era',
    'editorial-board-human-verification-generative-era',
    'When generating synthetic plausible narratives costs fractions of a cent, institutional journalism’s greatest duty is forensic confirmation.',
    'The proliferation of automated text generation has democratized speech, but it has simultaneously industrialized disinformation. Society now faces not a scarcity of information, but a severe drought of dependable veracity.

At "What''s Happening", we reiterate our foundational pledge: every dispatch, every data graphic, and every investigative piece is anchored by on-the-ground human inquiry and rigorous independent fact-checking.',
    'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80',
    cat_opinion, author3_id, 'article', 'published', false, false, 18450, now() - interval '22 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 12: Pakistan
  INSERT INTO public.articles (title, slug, excerpt, content, cover_image_url, category_id, author_id, type, status, is_breaking, is_featured, views, published_at)
  VALUES (
    'Karakoram Green Highway Transition: Electric Heavy Freight Stations Inaugurated',
    'karakoram-green-highway-electric-freight-stations',
    'High-altitude mega-chargers powered by snow-melt micro-hydro turbines enable commercial zero-emission freight transit between Gilgit and China.',
    'GILGIT — Heavy transport trucks running entirely on lithium-iron-phosphate battery packs traversed the Khunjerab Pass today, inaugurating the world’s highest electrified transit artery. The route reduces transit emissions by 92% and cuts logistical freight fees by nearly a third.',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    cat_pakistan, author1_id, 'news', 'published', false, false, 13780, now() - interval '26 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 13: Technology
  INSERT INTO public.articles (title, slug, excerpt, content, cover_image_url, category_id, author_id, type, status, is_breaking, is_featured, views, published_at)
  VALUES (
    'Open Weights vs. Walled Gardens: The Strategic Battle for Public Computational Sovereignty',
    'open-weights-vs-walled-gardens-computational-sovereignty',
    'Why democratic states are mandating open neural weights for public health and judicial systems to eliminate proprietary cloud monopolies.',
    'Municipalities and national courts around the world are increasingly passing legislation requiring high-stakes decision assistance systems to use verifiable open-weight algorithms. Public advocates argue that proprietary black-box APIs present unacceptable democratic vulnerabilities.',
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
    cat_tech, author2_id, 'article', 'published', false, false, 17290, now() - interval '29 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 14: Sports
  INSERT INTO public.articles (title, slug, excerpt, content, cover_image_url, category_id, author_id, type, status, is_breaking, is_featured, views, published_at)
  VALUES (
    'World Athletics Championship: Decathlon World Record Shattered in Thrilling Night Session',
    'world-athletics-championship-decathlon-record-shattered',
    'A stunning 1,500m personal best caps a historic two-day performance in Budapest, crossing 9,200 points for the first time in athletic history.',
    'BUDAPEST — Amid deafening cheers from a packed stadium, the decathlon gold medalist crossed the finish line in 4:08.12, setting a scintillating new world scoring record that had stood unbroken for eight years.',
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80',
    cat_sports, author1_id, 'news', 'published', false, false, 12640, now() - interval '32 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 15: Business
  INSERT INTO public.articles (title, slug, excerpt, content, cover_image_url, category_id, author_id, type, status, is_breaking, is_featured, views, published_at)
  VALUES (
    'Solar-Battery Microgrids Revitalize Rural Manufacturing and Textile Clusters',
    'solar-battery-microgrids-rural-manufacturing-textile',
    'Decentralized community power collectives insulate industrial exporters from national tariff spikes and power cuts, boosting export margins.',
    'FAISALABAD — Over forty mid-sized spinning and apparel mills have formed autonomous solar-plus-storage energy cooperatives. The localized microgrids guarantee 24/7 continuous electricity at predictable levelized costs, revitalizing European export orders.',
    'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
    cat_business, author3_id, 'news', 'published', false, false, 15120, now() - interval '36 hours'
  ) ON CONFLICT (slug) DO NOTHING;

END $$;

-- ==============================================================================
-- AUTOMATIC NOTIFICATIONS TRIGGER & REALTIME PUBLICATION
-- ==============================================================================

-- 1. Enable Supabase Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 2. Function: Notify all users on article publication, and notify author on review changes
CREATE OR REPLACE FUNCTION public.handle_article_publication_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- When article becomes published: notify all platform users + notify author specifically
  IF (TG_OP = 'INSERT' AND NEW.status = 'published') OR
     (TG_OP = 'UPDATE' AND NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published')) THEN

    -- Insert notification for all registered users (excluding author to avoid duplicate)
    INSERT INTO public.notifications (user_id, article_id, title, message, is_read, created_at)
    SELECT
      p.id,
      NEW.id,
      'New Story: ' || NEW.title,
      COALESCE(NEW.excerpt, 'A new story has just been published on What''s Happening.'),
      false,
      now()
    FROM public.profiles p
    WHERE p.id <> NEW.author_id;

    -- Send specialized confirmation to the author
    IF NEW.author_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, article_id, title, message, is_read, created_at)
      VALUES (
        NEW.author_id,
        NEW.id,
        'Your Story is Live!',
        'Congratulations! Your story "' || NEW.title || '" has been approved and published on What''s Happening.',
        false,
        now()
      );
    END IF;

  -- When article is rejected: notify author with reason
  ELSIF (TG_OP = 'UPDATE' AND NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected')) THEN
    IF NEW.author_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, article_id, title, message, is_read, created_at)
      VALUES (
        NEW.author_id,
        NEW.id,
        'Editorial Review Update',
        'Your article "' || NEW.title || '" requires revisions. Editor note: ' || COALESCE(NEW.rejection_reason, 'Please align with current editorial guidelines.'),
        false,
        now()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger attached to articles table
DROP TRIGGER IF EXISTS tr_article_publication_notifications ON public.articles;
CREATE TRIGGER tr_article_publication_notifications
  AFTER INSERT OR UPDATE OF status ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_article_publication_notifications();
