/**
 * Open Products Facts — single-product image fetcher.
 *
 * Covers non-food consumer goods — household cleaning, stationery,
 * miscellaneous forecourt SKUs that don't fit OFF / OBF / OPFF.
 */

import { FACTS_FAMILY } from './shared/facts-family-config';
import { fetchProductByGtin } from './shared/facts-family-client';

export interface OffLikeImages {
  imageUrl: string | null;
  thumbnailUrl: string | null;
}

export async function fetchOpfImagesForGtin(
  gtin: string,
  fetchImpl: typeof fetch = fetch
): Promise<OffLikeImages> {
  const product = await fetchProductByGtin(FACTS_FAMILY.opf, gtin, fetchImpl);
  if (!product) return { imageUrl: null, thumbnailUrl: null };
  return {
    imageUrl: product.image_front_url ?? product.image_url ?? null,
    thumbnailUrl:
      product.image_front_small_url ?? product.image_small_url ?? null,
  };
}
