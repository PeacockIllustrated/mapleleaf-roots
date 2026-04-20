/**
 * dev-login — generate a one-shot sign-in URL for a given email.
 *
 * Usage: pnpm tsx --env-file=.env.local scripts/dev-login.ts tom@example.com
 *
 * Prints a URL you can paste into the browser to acquire a real Supabase
 * session without waiting for a magic-link email. Uses the admin API, so
 * requires SUPABASE_SERVICE_ROLE_KEY.
 *
 * Do not ship this to production. Intended for local dev only.
 */

import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.argv[2];
  const redirectTo =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (!url || !key || !email) {
    console.error('Usage: tsx scripts/dev-login.ts <email>');
    console.error('Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${redirectTo}/auth/callback?next=/sites`,
    },
  });

  if (error || !data) {
    console.error(error?.message ?? 'generateLink failed');
    process.exit(1);
  }

  const link = data.properties?.action_link ?? '(action_link missing)';
  const hashed = data.properties?.hashed_token ?? '';

  console.log('\n--- Dev sign-in for', email, '---\n');
  console.log('Option A (any session, open in browser):');
  console.log(link);
  console.log(
    '\nOption B (inject into an already-open localhost tab via console):'
  );
  console.log(
    `(async () => { const { createBrowserClient } = await import('@supabase/ssr'); const sb = createBrowserClient(${JSON.stringify(
      url
    )}, ${JSON.stringify(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
    )}); const { error } = await sb.auth.verifyOtp({ type: 'magiclink', token_hash: ${JSON.stringify(
      hashed
    )} }); if (error) console.error(error); else location.assign('/sites'); })();`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
