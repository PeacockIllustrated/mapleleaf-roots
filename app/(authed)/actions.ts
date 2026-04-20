'use server';

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Sign the current user out.
 *
 * Clears the session cookie via Supabase Auth, then redirects to /login.
 * Bound to the sign-out button in the app bar.
 */
export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
