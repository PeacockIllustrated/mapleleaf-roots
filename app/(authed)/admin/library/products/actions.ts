'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/require-role';
import { createServiceClient } from '@/lib/supabase/server';
import { fetchOffImagesForGtin } from '@/lib/products/off-sync';

export type SyncImagesResult =
  | {
      ok: true;
      attempted: number;
      updated: number;
      skipped: number;
    }
  | { ok: false; message: string };

/**
 * One-shot OFF image sync for products with a GTIN and no image_url.
 * HQ-only. Uses the service client so the writes land reliably regardless
 * of RLS. We throttle with a small per-request gap so we stay under OFF's
 * informal 100 req/min anon limit on larger future batches.
 */
export async function syncProductImagesFromOff(): Promise<SyncImagesResult> {
  await requireRole(['HQ_ADMIN']);

  const admin = createServiceClient();

  const { data, error } = await admin
    .from('products')
    .select('id, gtin')
    .is('image_url', null)
    .not('gtin', 'is', null)
    .eq('is_active', true)
    .limit(100);

  if (error) {
    return { ok: false, message: error.message };
  }

  const rows = (data ?? []) as Array<{ id: string; gtin: string | null }>;

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.gtin) {
      skipped += 1;
      continue;
    }

    const { imageUrl, thumbnailUrl } = await fetchOffImagesForGtin(row.gtin);

    if (!imageUrl && !thumbnailUrl) {
      skipped += 1;
    } else {
      const { error: updErr } = await admin
        .from('products')
        .update({
          image_url: imageUrl,
          thumbnail_url: thumbnailUrl,
          data_source: 'OPEN_FOOD_FACTS',
          external_ref: row.gtin,
        })
        .eq('id', row.id);
      if (updErr) {
        skipped += 1;
      } else {
        updated += 1;
      }
    }

    // Gentle throttle — 120ms between requests keeps us well under 100/min
    // and avoids hammering the OFF API on larger runs.
    await new Promise((r) => setTimeout(r, 120));
  }

  revalidatePath('/admin/library/products');
  return { ok: true, attempted: rows.length, updated, skipped };
}
