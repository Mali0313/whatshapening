import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'db.camesukdbjyqzwhngvoa.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '03139505103@#$',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

const sql = `
-- 1. Create Storage bucket 'news-videos' (public read, 100MB limit, allowed video mime types)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'news-videos',
  'news-videos',
  true,
  104857600,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime'];

-- 2. Storage Policies for 'news-videos'
-- Anyone can view videos (public read)
DROP POLICY IF EXISTS "Public can view news videos" ON storage.objects;
CREATE POLICY "Public can view news videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'news-videos');

-- Only logged-in users can upload to their own user directory, with video extension
DROP POLICY IF EXISTS "Authenticated users can upload news videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload news videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'news-videos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (name ~* '\\.(mp4|webm|mov)$')
  );

-- Users can only replace/update their own videos
DROP POLICY IF EXISTS "Users can update own news videos" ON storage.objects;
CREATE POLICY "Users can update own news videos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'news-videos'
    AND (
      (auth.uid() IS NOT NULL AND ((auth.uid())::text = (owner)::text OR (storage.foldername(name))[1] = auth.uid()::text))
      OR public.is_admin()
    )
  );

-- Users can only delete their own videos (or admin)
DROP POLICY IF EXISTS "Users can delete own news videos" ON storage.objects;
CREATE POLICY "Users can delete own news videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'news-videos'
    AND (
      (auth.uid() IS NOT NULL AND ((auth.uid())::text = (owner)::text OR (storage.foldername(name))[1] = auth.uid()::text))
      OR public.is_admin()
    )
  );

-- 3. Add video columns to news table (public.articles)
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS video_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS video_path TEXT NULL,
  ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS video_duration INTEGER NULL;
`;

async function main() {
  console.log('Connecting to Supabase PostgreSQL database...');
  await client.connect();
  console.log('Connected! Executing migration...');

  await client.query(sql);
  console.log('Migration executed successfully!\n');

  // Verify Bucket
  const bucketRes = await client.query("SELECT id, name, public FROM storage.buckets WHERE id = 'news-videos';");
  console.log('Verified Bucket:', bucketRes.rows);

  // Verify Policies
  const policiesRes = await client.query("SELECT policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%news videos%';");
  console.log('\nVerified Storage Policies:');
  policiesRes.rows.forEach(p => console.log(` - [${p.cmd}] ${p.policyname}`));

  // Verify Columns in articles
  const colRes = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'articles'
      AND column_name IN ('video_url', 'video_path', 'video_thumbnail_url', 'video_duration')
    ORDER BY column_name;
  `);
  console.log('\nVerified Table Columns in articles:');
  colRes.rows.forEach(c => console.log(` - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`));

  // Verify existing posts are unaffected
  const articlesCount = await client.query("SELECT count(*), count(video_url) as with_video FROM public.articles;");
  console.log('\nExisting articles count verification:', articlesCount.rows[0]);

  await client.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

