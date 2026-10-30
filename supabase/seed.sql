-- ==============================================================================
-- "WHAT'S HAPPENING" NEWS PLATFORM - SEED DATA (15 PUBLISHED ARTICLES)
-- ==============================================================================

-- 1. Ensure Editorial Authors exist in auth.users and public.profiles
DO $$
DECLARE
  author1_id UUID := 'a0000000-0000-0000-0000-000000000001';
  author2_id UUID := 'a0000000-0000-0000-0000-000000000002';
  author3_id UUID := 'a0000000-0000-0000-0000-000000000003';
BEGIN
  -- Insert into auth.users if not present
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = author1_id) THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (
      author1_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'tariq.mansoor@whatshappening.news',
      crypt('EditorSecret2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Tariq Mansoor"}',
      now(),
      now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = author2_id) THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (
      author2_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'ayesha.siddiqui@whatshappening.news',
      crypt('EditorSecret2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Dr. Ayesha Siddiqui"}',
      now(),
      now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = author3_id) THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (
      author3_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'arthur.vance@whatshappening.news',
      crypt('EditorSecret2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Arthur Vance"}',
      now(),
      now()
    );
  END IF;

  -- Upsert profiles
  INSERT INTO public.profiles (id, full_name, bio, role, avatar_url)
  VALUES
    (author1_id, 'Tariq Mansoor', 'Senior Diplomatic and South Asian Affairs Correspondent.', 'writer', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80'),
    (author2_id, 'Dr. Ayesha Siddiqui', 'Chief Science, Energy, and Technology Editor.', 'writer', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80'),
    (author3_id, 'Arthur Vance', 'Lead Editorial Board Member and Geopolitics Essayist.', 'admin', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80')
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name, bio = EXCLUDED.bio, role = EXCLUDED.role, avatar_url = EXCLUDED.avatar_url;
END $$;

-- 2. Insert Standard Tags
INSERT INTO public.tags (name, slug)
VALUES
  ('Breaking News', 'breaking-news'),
  ('Pakistan Economy', 'pakistan-economy'),
  ('Geopolitics', 'geopolitics'),
  ('Artificial Intelligence', 'artificial-intelligence'),
  ('Cricket', 'cricket'),
  ('Public Health', 'public-health'),
  ('Renewable Energy', 'renewable-energy'),
  ('Education Reform', 'education-reform'),
  ('Cinema', 'cinema'),
  ('Editorial', 'editorial')
ON CONFLICT (name) DO NOTHING;

-- 3. Insert 15 Published Articles Across Categories
DO $$
DECLARE
  author_tariq UUID := 'a0000000-0000-0000-0000-000000000001';
  author_ayesha UUID := 'a0000000-0000-0000-0000-000000000002';
  author_arthur UUID := 'a0000000-0000-0000-0000-000000000003';

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
  -- Resolve Category IDs
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

  -- Article 1: Pakistan (Breaking & Featured)
  INSERT INTO public.articles (
    title, slug, excerpt, content, cover_image_url, category_id, author_id,
    type, status, is_breaking, is_featured, views, published_at
  ) VALUES (
    'Pakistan Unveils National Semiconductor & IT Corridor in Islamabad Special Economic Zone',
    'pakistan-unveils-national-semiconductor-it-corridor',
    'A landmark $3.5 billion public-private technology initiative aims to position Pakistan as a regional hub for microchip testing, assembly, and AI software engineering.',
    'ISLAMABAD — In a pivotal economic milestone, federal authorities and global tech consortiums on Wednesday inaugurated the National Semiconductor and Advanced Computing Park. The facility will train 50,000 chip design engineers over five years and provide zero-duty clean room infrastructure.

Officials emphasized that diversifying national exports into silicon fabrication and software architecture will yield long-term macroeconomic stability and high-wage technological employment.',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    cat_pakistan, author_tariq, 'news', 'published', true, true, 24820, now() - interval '2 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 2: World (Featured)
  INSERT INTO public.articles (
    title, slug, excerpt, content, cover_image_url, category_id, author_id,
    type, status, is_breaking, is_featured, views, published_at
  ) VALUES (
    'The Geneva Accord: 52 Nations Sign Framework on Global Quantum Encryption Protocols',
    'geneva-accord-52-nations-sign-quantum-framework',
    'Delegates conclude marathon diplomatic sessions to codify cross-border cryptography standards before next-generation quantum computing clusters reach decryption parity.',
    'GENEVA — Following fourteen months of closed-door deliberations, diplomats from fifty-two states formally signed the Geneva Quantum Governance Treaty. The agreement guarantees non-offensive verification mechanisms and open algorithmic registries.

"We stand at the threshold of a computational epoch where sovereignty must be codified in code, not just physical boundaries," the UN Special Rapporteur declared during the plenary vote.',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    cat_world, author_arthur, 'article', 'published', false, true, 19430, now() - interval '4 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 3: Politics
  INSERT INTO public.articles (
    title, slug, excerpt, content, cover_image_url, category_id, author_id,
    type, status, is_breaking, is_featured, views, published_at
  ) VALUES (
    'Parliament Passes Comprehensive Electoral Decentralization and Campaign Transparency Act',
    'parliament-passes-electoral-decentralization-act',
    'New legislation mandates real-time digital disclosure of campaign funding sources and devolves municipal governance authority to local councils.',
    'The historic parliamentary reform bill passed with a decisive two-thirds majority. The statute establishes independent auditing bodies, caps private donor matching, and sets automated balloting benchmarks for all district elections starting next cycle.',
    'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80',
    cat_politics, author_tariq, 'news', 'published', false, false, 8740, now() - interval '6 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 4: Technology (Breaking)
  INSERT INTO public.articles (
    title, slug, excerpt, content, cover_image_url, category_id, author_id,
    type, status, is_breaking, is_featured, views, published_at
  ) VALUES (
    'Photonic Interconnect Breakthrough Reduces AI Data Center Power Demands by 70%',
    'photonic-interconnect-breakthrough-ai-power',
    'Silicon photonics researchers replace copper traces with sub-nanometer laser waveguides, solving the severe electricity bottleneck confronting massive reasoning clusters.',
    'SAN FRANCISCO — Computing hardware engineers have achieved a long-sought holy grail: replacing resistive copper interconnects with low-loss optical waveguides across server racks. In field trials, power efficiency improved fourfold while latency dropped below 20 picoseconds.

The breakthrough is expected to dramatically ease the environmental and grid burdens imposed by rapidly expanding artificial intelligence infrastructures.',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    cat_tech, author_ayesha, 'news', 'published', true, true, 31200, now() - interval '7 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 5: Business
  INSERT INTO public.articles (
    title, slug, excerpt, content, cover_image_url, category_id, author_id,
    type, status, is_breaking, is_featured, views, published_at
  ) VALUES (
    'Central Banks Complete First Multi-Currency Atomic Settlement via Sovereign Digital Ledgers',
    'central-banks-multi-currency-atomic-settlement',
    'Financial authorities in Tokyo, London, and Zurich finalize instant cross-border payments with zero intermediary counterparty exposure.',
    'The successful execution of Project Meridian demonstrates that atomic settlement algorithms can eliminate the traditional two-day lag in foreign exchange transactions, unlocking an estimated $1.2 trillion in tied-up reserve liquidity worldwide.',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80',
    cat_business, author_arthur, 'news', 'published', false, false, 14210, now() - interval '9 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 6: Sports
  INSERT INTO public.articles (
    title, slug, excerpt, content, cover_image_url, category_id, author_id,
    type, status, is_breaking, is_featured, views, published_at
  ) VALUES (
    'Lahore and Rawalpindi Stadiums Complete State-of-the-Art Upgrades for ICC Champions Trophy',
    'lahore-rawalpindi-stadiums-icc-trophy-upgrades',
    'New LED broadcast canopies, sub-air drainage, and expanded international pavilions unveiled ahead of the premier cricket tournament.',
    'LAHORE — Cricket enthusiasts celebrated today as the PCB formally showcased the completed renovations of Gaddafi Stadium and the Rawalpindi Cricket Stadium. The high-capacity venues now feature world-class sub-air drainage systems capable of clearing monsoon rainwater in under fifteen minutes.',
    'https://images.unsplash.com/photo-1531415074868-036b1c57e359?auto=format&fit=crop&w=1200&q=80',
    cat_sports, author_tariq, 'news', 'published', false, false, 28940, now() - interval '11 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 7: Science
  INSERT INTO public.articles (
    title, slug, excerpt, content, cover_image_url, category_id, author_id,
    type, status, is_breaking, is_featured, views, published_at
  ) VALUES (
    'Orbital Radar Telemetry Discovers Massive Subterranean Freshwater Aquifer in Thar Desert',
    'orbital-radar-subterranean-freshwater-aquifer-thar',
    'Satellite radar sounding confirms deep geological basin containing an estimated 800 billion cubic meters of pristine potable water.',
    'Geophysicists analyzing radar topography data have confirmed an immense fossil water aquifer buried beneath the sands of the Thar Desert. Hydrologists are drafting sustainable extraction protocols that could supply drought-resilient agriculture for generations.',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    cat_science, author_ayesha, 'article', 'published', false, true, 21300, now() - interval '13 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 8: Health
  INSERT INTO public.articles (
    title, slug, excerpt, content, cover_image_url, category_id, author_id,
    type, status, is_breaking, is_featured, views, published_at
  ) VALUES (
    'WHO Approves Next-Generation Universal Malaria Vaccine with 94% Efficacy in Field Trials',
    'who-approves-universal-malaria-vaccine-94-percent',
    'Production scale-up to deliver 120 million doses annually across tropical regions, marking a decisive victory against the mosquito-borne disease.',
    'GENEVA — In what health experts are describing as the most significant epidemiologic triumph of the decade, the World Health Organization has certified the R22-Matrix vaccine for general pediatric distribution. Clinical trials showed unprecedented protection lasting through multiple wet seasons.',
    'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&q=80',
    cat_health, author_ayesha, 'news', 'published', false, false, 16750, now() - interval '15 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 9: Education
  INSERT INTO public.articles (
    title, slug, excerpt, content, cover_image_url, category_id, author_id,
    type, status, is_breaking, is_featured, views, published_at
  ) VALUES (
    'Nationwide Digital Curriculum Overhaul Integrates Critical Thinking and Python in Primary Schools',
    'nationwide-digital-curriculum-critical-thinking-python',
    'Education ministry replaces rote memorization exams with project-based computational literacy and logical debate across 14,000 public academies.',
    'The National Curriculum Council on Tuesday revealed its finalized syllabi for grades 1 through 8. By introducing interactive coding simulations alongside debate ethics, the reform seeks to foster indigenous problem solvers ready for tomorrow’s global knowledge economy.',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80',
    cat_education, author_tariq, 'article', 'published', false, false, 11200, now() - interval '17 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 10: Entertainment
  INSERT INTO public.articles (
    title, slug, excerpt, content, cover_image_url, category_id, author_id,
    type, status, is_breaking, is_featured, views, published_at
  ) VALUES (
    'Independent South Asian Cinema Dominates European Festival Circuit with Unflinching Realism',
    'south-asian-cinema-dominates-european-festival-circuit',
    'A renaissance of young directors sweeps Cannes and Venice with intimate, visually striking portraits of modern urban metamorphosis.',
    'Film critics in Berlin and Cannes have hailed the bold wave of independent cinematic storytelling emerging from Lahore, Karachi, and Mumbai. Embracing natural lighting and authentic linguistic dialects, these productions have resonated deeply with international juries.',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
    cat_entertainment, author_tariq, 'article', 'published', false, false, 9830, now() - interval '20 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 11: Opinion
  INSERT INTO public.articles (
    title, slug, excerpt, content, cover_image_url, category_id, author_id,
    type, status, is_breaking, is_featured, views, published_at
  ) VALUES (
    'The Editorial Board: Why Human Verification Remains The Ultimate Bulwark in The Generative Era',
    'editorial-board-human-verification-generative-era',
    'When generating synthetic plausible narratives costs fractions of a cent, institutional journalism’s greatest duty is forensic confirmation.',
    'The proliferation of automated text generation has democratized speech, but it has simultaneously industrialized disinformation. Society now faces not a scarcity of information, but a severe drought of dependable veracity.

At "What''s Happening", we reiterate our foundational pledge: every dispatch, every data graphic, and every investigative piece is anchored by on-the-ground human inquiry and rigorous independent fact-checking.',
    'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80',
    cat_opinion, author_arthur, 'article', 'published', false, false, 18450, now() - interval '22 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 12: Pakistan (Economic Corridor)
  INSERT INTO public.articles (
    title, slug, excerpt, content, cover_image_url, category_id, author_id,
    type, status, is_breaking, is_featured, views, published_at
  ) VALUES (
    'Karakoram Green Highway Transition: Electric Heavy Freight Stations Inaugurated',
    'karakoram-green-highway-electric-freight-stations',
    'High-altitude mega-chargers powered by snow-melt micro-hydro turbines enable commercial zero-emission freight transit between Gilgit and China.',
    'GILGIT — Heavy transport trucks running entirely on lithium-iron-phosphate battery packs traversed the Khunjerab Pass today, inaugurating the world’s highest electrified transit artery. The route reduces transit emissions by 92% and cuts logistical freight fees by nearly a third.',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    cat_pakistan, author_tariq, 'news', 'published', false, false, 13780, now() - interval '26 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 13: Technology
  INSERT INTO public.articles (
    title, slug, excerpt, content, cover_image_url, category_id, author_id,
    type, status, is_breaking, is_featured, views, published_at
  ) VALUES (
    'Open Weights vs. Walled Gardens: The Strategic Battle for Public Computational Sovereignty',
    'open-weights-vs-walled-gardens-computational-sovereignty',
    'Why democratic states are mandating open neural weights for public health and judicial systems to eliminate proprietary cloud monopolies.',
    'Municipalities and national courts around the world are increasingly passing legislation requiring high-stakes decision assistance systems to use verifiable open-weight algorithms. Public advocates argue that proprietary black-box APIs present unacceptable democratic vulnerabilities.',
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
    cat_tech, author_ayesha, 'article', 'published', false, false, 17290, now() - interval '29 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 14: Sports
  INSERT INTO public.articles (
    title, slug, excerpt, content, cover_image_url, category_id, author_id,
    type, status, is_breaking, is_featured, views, published_at
  ) VALUES (
    'World Athletics Championship: Decathlon World Record Shattered in Thrilling Night Session',
    'world-athletics-championship-decathlon-record-shattered',
    'A stunning 1,500m personal best caps a historic two-day performance in Budapest, crossing 9,200 points for the first time in athletic history.',
    'BUDAPEST — Amid deafening cheers from a packed stadium, the decathlon gold medalist crossed the finish line in 4:08.12, setting a scintillating new world scoring record that had stood unbroken for eight years.',
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80',
    cat_sports, author_tariq, 'news', 'published', false, false, 12640, now() - interval '32 hours'
  ) ON CONFLICT (slug) DO NOTHING;

  -- Article 15: Business
  INSERT INTO public.articles (
    title, slug, excerpt, content, cover_image_url, category_id, author_id,
    type, status, is_breaking, is_featured, views, published_at
  ) VALUES (
    'Solar-Battery Microgrids Revitalize Rural Manufacturing and Textile Clusters',
    'solar-battery-microgrids-rural-manufacturing-textile',
    'Decentralized community power collectives insulate industrial exporters from national tariff spikes and power cuts, boosting export margins.',
    'FAISALABAD — Over forty mid-sized spinning and apparel mills have formed autonomous solar-plus-storage energy cooperatives. The localized microgrids guarantee 24/7 continuous electricity at predictable levelized costs, revitalizing European export orders.',
    'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
    cat_business, author_arthur, 'news', 'published', false, false, 15120, now() - interval '36 hours'
  ) ON CONFLICT (slug) DO NOTHING;

END $$;
