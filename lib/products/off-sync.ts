/**
 * Open Food Facts image sync — single-product fetcher.
 *
 * Hits the OFF v2 product endpoint and extracts the front-image URLs.
 * Designed for on-demand enrichment (admin "sync images" button) rather
 * than a full catalogue ingest — that heavier pipeline will arrive in
 * Phase 2 via a scheduled job.
 *
 * Reference: https://world.openfoodfacts.org/data
 * API:       https://world.openfoodfacts.org/api/v2/product/{gtin}.json
 */

const OFF_ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product';

const USER_AGENT =
  'Mapleleaf-Roots/1.0 (+https://mapleleaf-roots.vercel.app) on-demand image sync';

export interface OffImages {
  imageUrl: string | null;
  thumbnailUrl: string | null;
}

export async function fetchOffImagesForGtin(
  gtin: string,
  fetchImpl: typeof fetch = fetch
): Promise<OffImages> {
  if (!gtin) return { imageUrl: null, thumbnailUrl: null };

  const url = `${OFF_ENDPOINT}/${encodeURIComponent(gtin)}.json?fields=code,image_front_url,image_front_small_url,image_url,image_small_url`;

  try {
    const resp = await fetchImpl(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!resp.ok) return { imageUrl: null, thumbnailUrl: null };
    const json = (await resp.json()) as {
      status?: number;
      product?: {
        image_front_url?: string;
        image_front_small_url?: string;
        image_url?: string;
        image_small_url?: string;
      };
    };
    const product = json?.product;
    if (!product) return { imageUrl: null, thumbnailUrl: null };

    return {
      imageUrl: product.image_front_url ?? product.image_url ?? null,
      thumbnailUrl:
        product.image_front_small_url ?? product.image_small_url ?? null,
    };
  } catch {
    return { imageUrl: null, thumbnailUrl: null };
  }
}
