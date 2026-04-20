import { redirect } from 'next/navigation';
import { AppBar } from '@/components/brand/AppBar';
import { PrimaryNav } from '@/components/brand/PrimaryNav';
import { UserMenu } from '@/components/brand/UserMenu';
import { currentProfile } from '@/lib/auth/require-role';
import { signOut } from './actions';

/**
 * Auth-gated shell.
 *
 * Middleware already redirects unauthenticated users to /login, so by the
 * time this layout runs we expect a session. We still call `currentProfile`
 * to fetch the user_profiles row — if it's missing (rare — trigger didn't
 * fire, callback upsert failed), we bail back to /login rather than render
 * a page that RLS will refuse to populate.
 */
export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await currentProfile();

  if (!profile) {
    redirect('/login?error=no_profile');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        userName={profile.full_name}
        userRole={profile.role}
        userActions={<UserMenu signOutAction={signOut} />}
      >
        <PrimaryNav role={profile.role} />
      </AppBar>
      <div style={{ flex: 1, padding: '24px 32px', maxWidth: 1440, width: '100%', margin: '0 auto' }}>
        {children}
      </div>
    </div>
  );
}
