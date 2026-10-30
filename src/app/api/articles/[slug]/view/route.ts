import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      url &&
      serviceRoleKey &&
      !url.includes('[paste') &&
      !serviceRoleKey.includes('[paste')
    ) {
      const adminClient = createAdminClient();

      // Fetch current views and increment safely
      const { data: article } = await adminClient
        .from('articles')
        .select('id, views')
        .eq('slug', slug)
        .single();

      if (article) {
        await adminClient
          .from('articles')
          .update({ views: (article.views || 0) + 1 })
          .eq('id', article.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error incrementing views' },
      { status: 200 }
    );
  }
}
