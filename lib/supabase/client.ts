/**
 * Supabase browser client
 *
 * Used from Client Components ('use client'). Reads session from cookies
 * automatically. Do NOT use this for Server Actions or API routes —
 * use the server client from `./server.ts` there.
 *
 * NEVER import the service_role key into browser code. This client
 * is restricted to anon key + authenticated session.
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
