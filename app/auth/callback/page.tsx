import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Magic-link callback
 *
 * The magic link Supabase emails to a user looks like:
 *   https://<site>/auth/callback?code=abc123&next=/sites
 *
 * This page exchanges the code for a session cookie, then redirects.
 * If the exchange fails, the user is returned to /login with an error flag.
 */

interface CallbackProps {
  searchParams: Promise<{ code?: string; next?: string; error?: string }>;
}

export default async function AuthCallback({ searchParams }: CallbackProps) {
  const params = await searchParams;
  const code = params.code;
  const next = params.next ?? '/sites';

  if (!code) {
    redirect('/login?error=missing_code');
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // On first login, ensure a user_profiles row exists.
  // (In Phase 1 this is defensive — a DB trigger handles it normally.)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase
      .from('user_profiles')
      .upsert(
        {
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name ?? user.email!.split('@')[0],
          // role defaults to EMPLOYEE — promote via SQL for Phase 1
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );
  }

  redirect(next);
}
