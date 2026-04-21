/**
 * Batched upsert for Facts-family product rows.
 *
 * Uses the partial unique index on products(gtin) to resolve conflicts —
 * the later source (or later fetch) wins on shared fields, but we
 * deliberately keep `created_at` untouched so the first-seen timestamp
 * survives rerunning the sync.
 *
 * The caller provides a Supabase client — bulk seed scripts pass a
 * service-role client, the on-demand admin button can pass a regular
 * server client.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProductUpsert } from './facts-family-mapper';

export interface UpsertResult {
  upserted: number;
  skipped: number;
  errors: string[];
}

// Supabase/PostgREST happily accepts batches of 1–2k rows per request.
// 500 was conservative; 2000 halves the round-trip count on the ~150k-row
// seed without hitting any known size limits, and noticeably speeds up
// the upsert phase (typically 2–3 minutes saved on a full re-seed).
const DEFAULT_BATCH_SIZE = 2000;

export async function upsertProducts(
  supabase: SupabaseClient,
  rows: ProductUpsert[],
  batchSize = DEFAULT_BATCH_SIZE
): Promise<UpsertResult> {
  const result: UpsertResult = { upserted: 0, skipped: 0, errors: [] };
  if (rows.length === 0) return result;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const { error, count } = await supabase
      .from('products')
      .upsert(batch, {
        onConflict: 'gtin',
        ignoreDuplicates: false,
        count: 'exact',
      });

    if (error) {
      result.errors.push(error.message);
      result.skipped += batch.length;
    } else {
      result.upserted += count ?? batch.length;
    }
  }

  return result;
}
