/**
 * Open Pet Food Facts — single-product image fetcher.
 *
 * Covers dog / cat / small-animal food and treats. Useful for forecourt
 * sites that carry a pet-food fixture.
 */

import { FACTS_FAMILY } from './shared/facts-family-config';
import { fetchProductByGtin } from './shared/facts-family-client';

export interface OffLikeImages {
  imageUrl: string | null;
  thumbnailUrl: string | null;
}

export async function fetchOpffImagesForGtin(
  gtin: string,
  fetchImpl: typeof fetch = fetch
): Promise<OffLikeImages> {
  const product = await fetchProductByGtin(FACTS_FAMILY.opff, gtin, fetchImpl);
  if (!product) return { imageUrl: null, thumbnailUrl: null };
  return {
    imageUrl: product.image_front_url ?? product.image_url ?? null,
    thumbnailUrl:
      product.image_front_small_url ?? product.image_small_url ?? null,
  };
}
