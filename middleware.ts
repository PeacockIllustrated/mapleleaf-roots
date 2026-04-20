import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware
 *
 * Two jobs:
 *   1. Keep the Supabase session cookie fresh on every request. Without this,
 *      long idle sessions silently expire and the user gets RLS failures they
 *      can't debug.
 *   2. Gate the authed route group. Unauthenticated users trying to reach
 *      anything other than /login, /auth/callback, or public assets get
 *      redirected to /login.
 *
 * This file is the ONLY place where middleware runs. Do not add a second
 * middleware file elsewhere — Next.js only picks up one.
 */

const PUBLIC_PATHS = ['/login', '/auth/callback'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the session if needed. Result is discarded — the side effect
  // on cookies is the point.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon, icons, manifest
     * - public assets with an extension
     */
    '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest|.*\\..*$).*)',
  ],
};
