/**
 * One-shot bulk seed from Facts-family JSONL dumps.
 *
 * Streams the nightly gzipped dump line-by-line, filters to UK, maps to
 * our ProductUpsert shape, and upserts in batches. Safe to re-run — the
 * partial unique index on products(gtin) makes this idempotent.
 *
 * Usage:
 *   pnpm products:seed                      # all four sources
 *   pnpm products:seed off                  # one source
 *   pnpm products:seed off obf opff
 *
 * Environment (loaded from .env.local via tsx --env-file):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import {
  FACTS_FAMILY,
  USER_AGENT,
  type FactsFamilySource,
} from '@/lib/products/shared/facts-family-config';
import {
  mapFactsRow,
  type FactsFamilyRow,
  type ProductUpsert,
} from '@/lib/products/shared/facts-family-mapper';
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

const BATCH_SIZE = 500;
const PROGRESS_EVERY = 10_000;

async function seedSource(source: FactsFamilySource): Promise<void> {
  const prefix = sourcePrefix(source.dataSource);
  const runStart = new Date().toISOString();

  // Record a sync run row so HQ can see what's happened.
  const { data: run } = await supabase
    .from('product_sync_runs')
    .insert({
      source: source.dataSource,
      mode: 'BULK_SEED',
      started_at: runStart,
      status: 'RUNNING',
    })
    .select('id')
    .single();

  const runId = run?.id as string | undefined;

  console.log(`[${prefix}] fetching ${source.dumpUrl}`);

  const resp = await fetch(source.dumpUrl, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!resp.ok || !resp.body) {
    const msg = `dump fetch failed: HTTP ${resp.status}`;
    await finishRun(runId, 'FAILED', 0, 0, msg);
    throw new Error(`[${prefix}] ${msg}`);
  }

  // Node fetch returns a Web ReadableStream — bridge to Node stream so
  // we can pipe through zlib.
  const nodeStream = Readable.fromWeb(
    resp.body as unknown as import('node:stream/web').ReadableStream
  );
  const gunzipped = nodeStream.pipe(createGunzip());
  const rl = createInterface({ input: gunzipped, crlfDelay: Infinity });

  let read = 0;
  let batch: ProductUpsert[] = [];
  let upserted = 0;
  let skipped = 0;

  for await (const line of rl) {
    read += 1;
    if (read % PROGRESS_EVERY === 0) {
      console.log(
        `[${prefix}] read ${read.toLocaleString()} · upserted ${upserted.toLocaleString()} · skipped ${skipped.toLocaleString()}`
      );
    }

    let raw: FactsFamilyRow;
    try {
      raw = JSON.parse(line) as FactsFamilyRow;
    } catch {
      skipped += 1;
      continue;
    }

    const mapped = mapFactsRow(raw, source.dataSource, { ukOnly: true });
    if (!mapped) {
      skipped += 1;
      continue;
    }

    batch.push(mapped);
    if (batch.length >= BATCH_SIZE) {
      const res = await upsertProducts(supabase, batch);
      upserted += res.upserted;
      skipped += res.skipped;
      if (res.errors.length) {
        console.warn(`[${prefix}] batch errors:`, res.errors.slice(0, 3));
      }
      batch = [];
    }
  }

  if (batch.length > 0) {
    const res = await upsertProducts(supabase, batch);
    upserted += res.upserted;
    skipped += res.skipped;
  }

  console.log(
    `[${prefix}] done · read ${read.toLocaleString()} · upserted ${upserted.toLocaleString()} · skipped ${skipped.toLocaleString()}`
  );
  await finishRun(runId, 'SUCCESS', upserted, skipped, null);
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
  const argv = process.argv.slice(2);
  const keys = argv.length > 0 ? argv : Object.keys(FACTS_FAMILY);
  for (const key of keys) {
    const source = FACTS_FAMILY[key as keyof typeof FACTS_FAMILY];
    if (!source) {
      console.error(`Unknown source '${key}' — valid: off obf opf opff`);
      process.exit(1);
    }
    await seedSource(source);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
