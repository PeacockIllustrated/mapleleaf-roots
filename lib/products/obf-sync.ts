/**
 * Open Beauty Facts — single-product image fetcher.
 *
 * Thin wrapper over the shared Facts-family client. Used by the admin
 * "sync images" button for toiletries / personal care products whose
 * GTIN lands in OBF rather than OFF.
 */

import { FACTS_FAMILY } from './shared/facts-family-config';
import { fetchProductByGtin } from './shared/facts-family-client';

export interface OffLikeImages {
  imageUrl: string | null;
  thumbnailUrl: string | null;
}

export async function fetchObfImagesForGtin(
  gtin: string,
  fetchImpl: typeof fetch = fetch
): Promise<OffLikeImages> {
  const product = await fetchProductByGtin(FACTS_FAMILY.obf, gtin, fetchImpl);
  if (!product) return { imageUrl: null, thumbnailUrl: null };
  return {
    imageUrl: product.image_front_url ?? product.image_url ?? null,
    thumbnailUrl:
      product.image_front_small_url ?? product.image_small_url ?? null,
  };
}
