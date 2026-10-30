import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Supabase Middleware:
 * 1. Synchronizes auth tokens and session cookies.
 * 2. Enforces route protections:
 *    - /dashboard and /write require authenticated login.
 *    - /admin requires user to have role 'admin' in profiles table.
 *    - /login, /signup, /forgot-password redirect to /dashboard if already logged in.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Gracefully skip if credentials are still placeholder templates
  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl.includes('[paste') ||
    supabaseKey.includes('[paste')
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  let user = null;
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
  } catch {
    // Session token invalid or network issue
  }

  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isWriteRoute = pathname.startsWith('/write');
  const isAdminRoute = pathname.startsWith('/admin');
  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password';

  // 1. Protect /dashboard and /write: redirect to login if unauthenticated
  if (!user && (isDashboardRoute || isWriteRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // 2. Protect /admin: redirect to login if unauthenticated, or to /dashboard if role is not admin
  if (isAdminRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirectTo', '/admin');
      return NextResponse.redirect(url);
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        url.searchParams.set('error', 'admin_required');
        return NextResponse.redirect(url);
      }
    } catch {
      // In case of query failure, redirect away from admin safely
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.searchParams.set('error', 'admin_required');
      return NextResponse.redirect(url);
    }
  }

  // 3. If authenticated user visits login/signup/forgot-password, redirect to dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
