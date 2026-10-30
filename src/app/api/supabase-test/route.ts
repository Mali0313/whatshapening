import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const isUrlConfigured = Boolean(url && !url.includes('[paste') && url.startsWith('http'));
  const isAnonConfigured = Boolean(anonKey && !anonKey.includes('[paste') && anonKey.length > 20);
  const isServiceRoleConfigured = Boolean(
    serviceRoleKey && !serviceRoleKey.includes('[paste') && serviceRoleKey.length > 20
  );

  const status = {
    configured: {
      supabaseUrl: isUrlConfigured,
      anonKey: isAnonConfigured,
      serviceRoleKey: isServiceRoleConfigured,
    },
    clientConnection: 'untested',
    adminConnection: 'untested',
    message: '',
    timestamp: new Date().toISOString(),
  };

  if (!isUrlConfigured || !isAnonConfigured) {
    status.message =
      'Supabase credentials not fully configured in .env.local. Please replace [paste URL], [paste anon key], and [paste service role key].';
    return NextResponse.json({ success: false, status }, { status: 200 });
  }

  // Test client connection
  try {
    const supabase = await createClient();
    const { error: clientError } = await supabase.auth.getSession();
    if (clientError) {
      status.clientConnection = `Error: ${clientError.message}`;
    } else {
      status.clientConnection = 'connected';
    }
  } catch (err: unknown) {
    status.clientConnection = `Failed: ${err instanceof Error ? err.message : String(err)}`;
  }

  // Test admin connection if service role key is present
  if (isServiceRoleConfigured) {
    try {
      const adminClient = createAdminClient();
      const { error: adminError } = await adminClient.from('profiles').select('id').limit(1);
      if (adminError) {
        status.adminConnection = `Error: ${adminError.message}`;
      } else {
        status.adminConnection = 'connected';
      }
    } catch (err: unknown) {
      status.adminConnection = `Failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  } else {
    status.adminConnection = 'service_role_key_missing_or_placeholder';
  }

  const isConnected =
    status.clientConnection === 'connected' || status.clientConnection.includes('connected');

  status.message = isConnected
    ? 'Supabase connection verified successfully!'
    : 'Supabase credentials found but server test had an issue. Check Supabase URL / API keys.';

  return NextResponse.json({
    success: isConnected,
    status,
  });
}
