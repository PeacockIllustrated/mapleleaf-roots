import { redirect } from 'next/navigation';
import { Sidenav } from '@/components/brand/Sidenav';
import { UserMenu } from '@/components/brand/UserMenu';
import { currentProfile } from '@/lib/auth/require-role';
import { signOut } from './actions';

/**
 * Auth-gated shell.
 *
 * A persistent dashboard chrome: charcoal sidenav on the left, thin content
 * frame on the right. Middleware already redirects unauthenticated users to
 * /login; currentProfile here is the belt-and-braces check for the rare
 * case where a session exists but no user_profiles row does (trigger didn't
 * fire + callback upsert didn't fire).
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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'var(--ml-off-white)',
      }}
    >
      <Sidenav
        profile={profile}
        userActions={<UserMenu signOutAction={signOut} />}
      />
      <main
        style={{
          flex: 1,
          minWidth: 0,
          overflowX: 'hidden',
        }}
      >
        {children}
      </main>
    </div>
  );
}
