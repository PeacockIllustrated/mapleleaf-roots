import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Magic-link callback.
 *
 * Supports two email-link shapes:
 *
 *   1. token_hash (preferred) — e.g.
 *        /auth/callback?token_hash=<hashed>&type=magiclink&next=/sites
 *      The email contains a server-verifiable hashed token. We call
 *      verifyOtp() which sets the session cookies directly. No PKCE
 *      code_verifier required → works when the link is opened in a
 *      different browser or an email client's in-app webview than the
 *      one that requested it.
 *
 *   2. code (legacy / PKCE) — e.g.
 *        /auth/callback?code=<code>&next=/sites
 *      Requires the code_verifier cookie that the browser client stored
 *      when signInWithOtp ran. Only works when the link is opened in
 *      the same browser.
 *
 * The Supabase email template should use the token_hash form — see
 * docs/PHASE1_NOTES.md for the exact template body.
 *
 * This is a Route Handler rather than a Server Component because Next 15
 * blocks cookie mutations from Server Components.
 */

function safeNext(raw: string | null): string {
  if (!raw) return '/sites';
  if (!raw.startsWith('/')) return '/sites';
  if (raw.startsWith('//')) return '/sites';
  return raw;
}

const validOtpTypes = new Set([
  'magiclink',
  'signup',
  'invite',
  'recovery',
  'email_change',
  'email',
]);

type OtpType = 'magiclink' | 'signup' | 'invite' | 'recovery' | 'email_change' | 'email';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const errorDescription = url.searchParams.get('error_description');

  if (errorDescription) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription)}`, request.url)
    );
  }

  const tokenHash = url.searchParams.get('token_hash');
  const typeParam = url.searchParams.get('type');
  const code = url.searchParams.get('code');
  const next = safeNext(url.searchParams.get('next'));

  const supabase = await createServerClient();

  if (tokenHash) {
    const type: OtpType = validOtpTypes.has(typeParam ?? '')
      ? (typeParam as OtpType)
      : 'magiclink';

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
      );
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
      );
    }
  } else {
    return NextResponse.redirect(
      new URL('/login?error=missing_token', request.url)
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
