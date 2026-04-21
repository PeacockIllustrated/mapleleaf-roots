'use server';

import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { currentProfile } from '@/lib/auth/require-role';
import type { ProductSummary } from '@/lib/shelf/types';

/**
 * searchProducts — server-side search across the product catalogue.
 *
 * Once the Facts-family sync lands there can be 150k+ UK products in
 * this table; shipping all of them to the client was fine at 1k but
 * would crash the picker at that scale. This action runs an ILIKE
 * match on name + brand + gtin with a LIMIT so the picker only pulls
 * matching rows on demand.
 *
 * The existing GIN index `idx_products_name` accelerates `name ILIKE`
 * queries with a leading literal; trigram would be nicer but isn't
 * available without the pg_trgm extension. In practice most searches
 * are "starts with brand" or "contains product name" which work fine.
 */

const searchSchema = z.object({
  query: z.string().max(200),
  categoryId: z.string().uuid().nullable().optional(),
  temperatureZone: z
    .enum(['AMBIENT', 'CHILLED', 'FROZEN'])
    .nullable()
    .optional(),
  limit: z.number().int().min(1).max(200).default(60),
});

export type SearchProductsResult =
  | { ok: true; data: { products: ProductSummary[]; total: number | null } }
  | { ok: false; message: string };

export async function searchProducts(
  input: unknown
): Promise<SearchProductsResult> {
  // Any authenticated user may search — RLS on `products` is public-read.
  const profile = await currentProfile();
  if (!profile) return { ok: false, message: 'Not signed in' };

  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'Bad input',
    };
  }
  const { query, categoryId, temperatureZone, limit } = parsed.data;

  const supabase = await createServerClient();

  let q = supabase
    .from('products')
    .select(
      `id, name, brand, category_id,
       width_mm, height_mm, depth_mm,
       shipper_width_mm, shipper_height_mm, shipper_depth_mm, units_per_shipper,
       gtin, image_url, thumbnail_url, temperature_zone`,
      { count: 'exact' }
    )
    .eq('is_active', true);

  if (categoryId) q = q.eq('category_id', categoryId);
  if (temperatureZone) q = q.eq('temperature_zone', temperatureZone);

  const trimmed = query.trim();
  if (trimmed.length > 0) {
    // Postgres `or` filter — matches name or brand or gtin. ILIKE with
    // leading/trailing % is case-insensitive substring search.
    const pattern = `%${trimmed.replace(/[%_]/g, (c) => `\\${c}`)}%`;
    q = q.or(
      `name.ilike.${pattern},brand.ilike.${pattern},gtin.ilike.${pattern}`
    );
  }

  q = q.order('brand').order('name').limit(limit);

  const { data, error, count } = await q;
  if (error) return { ok: false, message: error.message };

  return {
    ok: true,
    data: {
      products: (data ?? []) as ProductSummary[],
      total: count ?? null,
    },
  };
}
