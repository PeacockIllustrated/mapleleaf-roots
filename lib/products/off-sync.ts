/**
 * Open Food Facts image sync — single-product fetcher.
 *
 * Hits the OFF v2 product endpoint and extracts the front-image URLs.
 * Designed for on-demand enrichment (admin "sync images" button).
 *
 * The full bulk + nightly-delta pipeline lives in `scripts/products/` and
 * `lib/products/orchestrator.ts`; this module is the narrow single-row
 * helper that existed before and is still used by the admin UI.
 */

import { FACTS_FAMILY } from './shared/facts-family-config';
import { fetchProductByGtin } from './shared/facts-family-client';

export interface OffImages {
  imageUrl: string | null;
  thumbnailUrl: string | null;
}

export async function fetchOffImagesForGtin(
  gtin: string,
  fetchImpl: typeof fetch = fetch
): Promise<OffImages> {
  const product = await fetchProductByGtin(FACTS_FAMILY.off, gtin, fetchImpl);
  if (!product) return { imageUrl: null, thumbnailUrl: null };

  return {
    imageUrl: product.image_front_url ?? product.image_url ?? null,
    thumbnailUrl:
      product.image_front_small_url ?? product.image_small_url ?? null,
  };
}
