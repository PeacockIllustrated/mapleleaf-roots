/**
 * Supabase server client
 *
 * Used from Server Components, Server Actions, Route Handlers, and Middleware.
 * Reads and writes session cookies via Next.js's cookies() helper.
 *
 * The session drives RLS — every query from this client is scoped to the
 * authenticated user's permissions. If you need to bypass RLS (migrations,
 * cron jobs, administrative backfills), use createServiceClient below.
 *
 * SECURITY: Never send the raw client back to the browser. Never expose the
 * service_role key to any code that runs on the client.
 */

import { createServerClient as createSSRClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Standard server client — respects RLS via the authenticated session.
 * Use this 99% of the time.
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — can be ignored if middleware
            // is refreshing user sessions.
          }
        },
      },
    }
  );
}

/**
 * Service-role client — BYPASSES RLS entirely.
 *
 * Only use for:
 *   - Migrations (happen via the Supabase CLI, not via this client)
 *   - Cron jobs (OFF sync, campaign materialisation)
 *   - Administrative scripts
 *
 * NEVER use this in response to a user request without extremely explicit
 * reason, and never expose its results directly back to the user without
 * a separate permission check in the calling code.
 */
export function createServiceClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createServiceClient must never be called in the browser');
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
