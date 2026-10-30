import pg from 'pg';

const client = new pg.Client({
  host: 'db.camesukdbjyqzwhngvoa.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '03139505103@#$',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL database.');

  // Update RLS policies to allow authors to directly insert/update with 'published' status
  await client.query(`
    DROP POLICY IF EXISTS "Users and writers can create articles" ON public.articles;
    CREATE POLICY "Users and writers can create articles"
      ON public.articles FOR INSERT
      WITH CHECK (
        author_id = auth.uid()
        AND status IN ('draft', 'pending', 'published')
      );

    DROP POLICY IF EXISTS "Authors can update own drafts; Admins can update any" ON public.articles;
    CREATE POLICY "Authors can update own drafts; Admins can update any"
      ON public.articles FOR UPDATE
      USING (
        author_id = auth.uid() OR public.is_admin()
      )
      WITH CHECK (
        author_id = auth.uid() OR public.is_admin()
      );
  `);

  console.log('Successfully updated RLS policies to allow direct publishing!');
  await client.end();
}

run().catch((err) => {
  console.error('Error updating RLS:', err);
  process.exit(1);
});
