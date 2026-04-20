import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Magic-link callback.
 *
 * The link Supabase emails to a user looks like:
 *   https://<site>/auth/callback?code=abc123&next=/sites
 *
 * We exchange the code for a session cookie, then redirect to `next`.
 * `next` is sanitised to avoid open-redirect (the link is emailed, but the
 * query string is still trivially tamperable).
 *
 * Profile creation: handled by the `on_auth_user_created` trigger from
 * migration 20260420_001. The defensive upsert below is a second-line guard
 * for environments where the trigger hasn't been applied yet.
 */

interface CallbackProps {
  searchParams: Promise<{ code?: string; next?: string; error?: string }>;
}

function safeNext(raw: string | undefined): string {
  if (!raw) return '/sites';
  if (!raw.startsWith('/')) return '/sites';
  if (raw.startsWith('//')) return '/sites';
  return raw;
}

export default async function AuthCallback({ searchParams }: CallbackProps) {
  const params = await searchParams;
  const code = params.code;
  const next = safeNext(params.next);

  if (!code) {
    redirect('/login?error=missing_code');
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // Defensive: if the first-login trigger didn't run (older Supabase, or
  // the migration hasn't been applied yet), materialise the profile now.
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

  redirect(next);
}
