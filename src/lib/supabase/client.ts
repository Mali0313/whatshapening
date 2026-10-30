import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for use in browser/client components.
 * Safely handles missing or unconfigured environment variables.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isConfigured = 
    Boolean(supabaseUrl && 
    supabaseKey && 
    !supabaseUrl.includes('[paste') && 
    !supabaseKey.includes('[paste'));

  if (!isConfigured) {
    // Provide fallback mock/safe client or informative notice during initial setup
    return createBrowserClient(
      supabaseUrl && !supabaseUrl.includes('[paste') ? supabaseUrl : 'https://placeholder.supabase.co',
      supabaseKey && !supabaseKey.includes('[paste') ? supabaseKey : 'placeholder-anon-key'
    );
  }

  return createBrowserClient(supabaseUrl!, supabaseKey!);
}
