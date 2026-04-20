import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Magic-link callback.
 *
 * Supabase sends users to this URL after they click the email link, with
 * `?code=<one-time-code>&next=<path>`. We exchange the code for a session,
 * set the session cookies, and redirect to `next` (sanitised).
 *
 * This is a Route Handler rather than a Server Component because Next.js
 * 15 blocks cookie mutations from Server Components — the session would
 * silently fail to persist and the user would loop back to /login. Route
 * Handlers can set cookies via the response, which is what Supabase's
 * `exchangeCodeForSession` needs to do internally.
 *
 * Profile materialisation is handled by the `on_auth_user_created` trigger
 * from migration 20260420_001. The defensive upsert below is a second-line
 * guard for projects where the trigger isn't applied yet.
 */
function safeNext(raw: string | null): string {
  if (!raw) return '/sites';
  if (!raw.startsWith('/')) return '/sites';
  if (raw.startsWith('//')) return '/sites';
  return raw;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeNext(url.searchParams.get('next'));
  const errorDescription = url.searchParams.get('error_description');

  if (errorDescription) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=missing_code', request.url)
    );
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  // Defensive: if the first-login trigger didn't run, materialise the
  // profile now so the first page render doesn't fail RLS.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.from('user_profiles').upsert(
      {
        id: user.id,
        email: user.email!,
        full_name:
          (user.user_metadata?.full_name as string | undefined) ??
          user.email!.split('@')[0],
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
