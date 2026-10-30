import { createClient } from '@supabase/supabase-js';

/**
 * Creates an elevated Supabase Admin client using the SUPABASE_SERVICE_ROLE_KEY.
 *
 * CRITICAL SECURITY RULE:
 * This helper must ONLY be imported and called in server-side contexts
 * (Route Handlers, Server Actions, or internal server background jobs).
 * NEVER expose the Service Role key to the browser or public client!
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('FATAL SECURITY ERROR: Supabase Admin Client must never be initialized in the browser.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    supabaseUrl.includes('[paste') ||
    serviceRoleKey.includes('[paste')
  ) {
    throw new Error(
      'Supabase admin credentials are missing or unconfigured. Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
