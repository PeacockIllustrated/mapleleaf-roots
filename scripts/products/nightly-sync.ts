/**
 * Nightly delta sync — pulls UK products modified since the last
 * successful run for each Facts-family source.
 *
 * Runs from a GitHub Actions schedule. Expected volume is 5–20k rows
 * per day across all four sources, so this finishes in well under five
 * minutes even on the free tier.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  FACTS_FAMILY,
  type FactsFamilySource,
} from '@/lib/products/shared/facts-family-config';
import { searchUkDelta } from '@/lib/products/shared/facts-family-client';
import { mapFactsRow } from '@/lib/products/shared/facts-family-mapper';
import { upsertProducts } from '@/lib/products/shared/upsert';
import { sourcePrefix } from '@/lib/products/shared/normalise';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

/** Where to start the delta from if we've never successfully run. */
const BACKFILL_DAYS = 3;

async function lastSuccessUnix(
  supabase: SupabaseClient,
  source: FactsFamilySource
): Promise<number> {
  const { data } = await supabase
    .from('product_sync_runs')
    .select('started_at')
    .eq('source', source.dataSource)
    .eq('status', 'SUCCESS')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.started_at) {
    return Math.floor(new Date(data.started_at as string).getTime() / 1000);
  }
  return Math.floor(Date.now() / 1000) - BACKFILL_DAYS * 86400;
}

async function syncSource(source: FactsFamilySource): Promise<void> {
  const prefix = sourcePrefix(source.dataSource);
  const since = await lastSuccessUnix(supabase, source);
  console.log(`[${prefix}] delta since ${new Date(since * 1000).toISOString()}`);

  const { data: run } = await supabase
    .from('product_sync_runs')
    .insert({
      source: source.dataSource,
      mode: 'NIGHTLY_DELTA',
      status: 'RUNNING',
    })
    .select('id')
    .single();
  const runId = run?.id as string | undefined;

  let upserted = 0;
  let skipped = 0;

  try {
    for await (const page of searchUkDelta(source, since)) {
      const mapped = page.products
        .map((r) => mapFactsRow(r, source.dataSource, { ukOnly: true }))
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (mapped.length > 0) {
        const res = await upsertProducts(supabase, mapped);
        upserted += res.upserted;
        skipped += res.skipped + (page.products.length - mapped.length);
        if (res.errors.length) {
          console.warn(`[${prefix}] errors:`, res.errors.slice(0, 3));
        }
      } else {
        skipped += page.products.length;
      }

      console.log(
        `[${prefix}] page ${page.page}/${page.pageCount} · upserted ${upserted} · skipped ${skipped}`
      );
    }

    await finishRun(runId, 'SUCCESS', upserted, skipped, null);
    console.log(`[${prefix}] done · upserted ${upserted} · skipped ${skipped}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await finishRun(runId, 'FAILED', upserted, skipped, msg);
    throw err;
  }
}

async function finishRun(
  runId: string | undefined,
  status: 'SUCCESS' | 'FAILED',
  upserted: number,
  skipped: number,
  errorText: string | null
): Promise<void> {
  if (!runId) return;
  await supabase
    .from('product_sync_runs')
    .update({
      finished_at: new Date().toISOString(),
      status,
      rows_upserted: upserted,
      rows_skipped: skipped,
      error_text: errorText,
    })
    .eq('id', runId);
}

async function main(): Promise<void> {
  let failures = 0;
  // Failure isolation — one source erroring shouldn't block the others.
  for (const source of Object.values(FACTS_FAMILY)) {
    try {
      await syncSource(source);
    } catch (err) {
      failures += 1;
      console.error(`[${sourcePrefix(source.dataSource)}] failed:`, err);
    }
  }
  if (failures > 0) {
    console.error(`${failures} source(s) failed — see logs above`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
