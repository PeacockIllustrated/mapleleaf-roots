import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

type UserRole = 'HQ_ADMIN' | 'AREA_MANAGER' | 'SITE_MANAGER' | 'EMPLOYEE';

interface AuthedProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

/**
 * requireRole — gates a Server Component or Server Action.
 *
 * If the user isn't authenticated → redirect to /login.
 * If the user's role isn't in the allowed list → throw, which Next.js turns
 * into a 500. That's deliberate — it's the app's job to not render buttons
 * to roles that can't use them. A thrown 500 means UX failed upstream; we
 * never want to silently degrade.
 *
 * RLS is the hard wall. This helper is UX — render "not authorised" pages
 * early so users don't see empty data and wonder what's wrong.
 */
export async function requireRole(
  allowedRoles: readonly UserRole[]
): Promise<AuthedProfile> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    throw new Error('Authenticated user has no profile — check user_profiles insert trigger');
  }

  if (!allowedRoles.includes(profile.role as UserRole)) {
    throw new Error(
      `Access denied: role ${profile.role} not in [${allowedRoles.join(', ')}]`
    );
  }

  return profile as AuthedProfile;
}

/**
 * currentProfile — returns the authed user's profile, or null if not signed in.
 * Use when the page/action needs to know "who is this?" but any authenticated
 * user is allowed (e.g., the site list, where RLS does the filtering).
 */
export async function currentProfile(): Promise<AuthedProfile | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .single();

  return (profile as AuthedProfile) ?? null;
}
