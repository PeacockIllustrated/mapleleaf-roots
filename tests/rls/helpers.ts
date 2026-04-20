import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared test helpers for RLS integration tests.
 *
 * `adminClient()` returns a service-role client — bypasses RLS. Used for
 * seeding and cleanup, never for asserting.
 *
 * `userClient(jwt)` returns a client whose Authorization header carries a
 * specific user's JWT — this is the client whose reads/writes must pass RLS.
 */

const url = process.env.TEST_SUPABASE_URL;
const serviceKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;

export function testEnvReady(): boolean {
  return Boolean(url && serviceKey && anonKey);
}

export function adminClient(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error('TEST_SUPABASE_URL / TEST_SUPABASE_SERVICE_ROLE_KEY missing');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function userClient(accessToken: string): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error('TEST_SUPABASE_URL / TEST_SUPABASE_ANON_KEY missing');
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

/**
 * Create a throwaway auth.users row and sign in, returning the access token.
 * The caller is responsible for promoting the user_profiles row to the
 * correct role and adding any assignments.
 */
export async function createTestUser(
  admin: SupabaseClient,
  emailPrefix: string
): Promise<TestUser> {
  const email = `${emailPrefix}+${Date.now()}@roots-tests.invalid`;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: crypto.randomUUID(),
  });
  if (createErr || !created.user) {
    throw createErr ?? new Error('createUser returned no user');
  }

  // Sign in as this user to get an access token for RLS-scoped reads.
  const anon = createClient(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: session, error: signInErr } = await anon.auth.signInWithPassword({
    email,
    password: '', // fallback — we don't actually know the random password
  });

  // signInWithPassword won't work without the password. Use admin to generate
  // a session via magic-link hash verification instead.
  if (signInErr || !session?.session) {
    // Fall back: generate a magic-link token and exchange it.
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    if (linkErr || !link) throw linkErr ?? new Error('generateLink failed');
    // The hashed token is in link.properties?.hashed_token
    const hashed = (link.properties as { hashed_token?: string } | undefined)
      ?.hashed_token;
    if (!hashed) throw new Error('generateLink returned no hashed_token');
    const { data: verify, error: verifyErr } = await anon.auth.verifyOtp({
      type: 'magiclink',
      token_hash: hashed,
    });
    if (verifyErr || !verify.session) {
      throw verifyErr ?? new Error('verifyOtp returned no session');
    }
    return { id: created.user.id, email, accessToken: verify.session.access_token };
  }

  return { id: created.user.id, email, accessToken: session.session.access_token };
}

export async function deleteTestUser(admin: SupabaseClient, userId: string) {
  await admin.auth.admin.deleteUser(userId);
}
