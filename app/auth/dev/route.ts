import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Dev-only sign-in bridge.
 *
 * Takes a magic-link `token_hash` (from scripts/dev-login.ts), verifies it
 * via Supabase, and writes the session cookies. This sidesteps the browser
 * redirect whitelist so we can test authed pages before we've configured
 * allowed redirect URLs in the Supabase project.
 *
 * 404 in production, full stop.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }

  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const next = url.searchParams.get('next') ?? '/sites';

  if (!tokenHash) {
    return new NextResponse('missing token_hash', { status: 400 });
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: tokenHash,
  });

  if (error) {
    return new NextResponse(`verify failed: ${error.message}`, { status: 400 });
  }

  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/sites';
  return NextResponse.redirect(new URL(safeNext, request.url));
}
