/**
 * Facts-family HTTP client — shared between OFF, OBF, OPF, OPFF.
 *
 * Two entry points:
 *   - `fetchProductByGtin` — single-product v2 endpoint for on-demand
 *     enrichment (e.g. admin "sync this row now" button).
 *   - `searchUkDelta` — CGI search page iterator for the nightly cron.
 *     Filters to UK + last_modified_t > since.
 *
 * Bulk seeding from the nightly gzipped JSONL dumps lives in
 * `scripts/products/seed-from-dump.ts` — it's a Node script rather than
 * a library helper because it's stream-heavy and wants its own process.
 */

import {
  API_THROTTLE_MS,
  USER_AGENT,
  type FactsFamilySource,
} from './facts-family-config';
import type { FactsFamilyRow } from './facts-family-mapper';

async function throttle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, API_THROTTLE_MS));
}

/** Single-product lookup via the v2 API. Returns null on any failure. */
export async function fetchProductByGtin(
  source: FactsFamilySource,
  gtin: string,
  fetchImpl: typeof fetch = fetch
): Promise<FactsFamilyRow | null> {
  if (!gtin) return null;
  const url = `${source.apiBase}/api/v2/product/${encodeURIComponent(gtin)}.json`;
  try {
    const resp = await fetchImpl(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as {
      status?: number;
      product?: FactsFamilyRow;
    };
    return json?.product ?? null;
  } catch {
    return null;
  }
}

interface DeltaPage {
  products: FactsFamilyRow[];
  page: number;
  pageCount: number;
}

/**
 * Iterate UK-modified products since a given timestamp, one page at a
 * time. The caller owns the upsert loop.
 *
 * OFF's CGI search is the only widely-supported delta endpoint across
 * the Facts family — it returns the same schema as the bulk dump.
 */
export async function* searchUkDelta(
  source: FactsFamilySource,
  sinceUnix: number,
  pageSize = 1000,
  fetchImpl: typeof fetch = fetch
): AsyncGenerator<DeltaPage> {
  let page = 1;
  while (true) {
    const url =
      `${source.apiBase}/cgi/search.pl` +
      `?action=process` +
      `&countries_tags_en=united-kingdom` +
      `&tagtype_0=last_modified_t` +
      `&tag_contains_0=greater_than` +
      `&tag_0=${sinceUnix}` +
      `&page=${page}` +
      `&page_size=${pageSize}` +
      `&json=1`;

    const resp = await fetchImpl(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!resp.ok) {
      throw new Error(
        `${source.key} delta fetch failed (HTTP ${resp.status}) on page ${page}`
      );
    }
    const json = (await resp.json()) as {
      products?: FactsFamilyRow[];
      count?: number;
      page?: number;
      page_count?: number;
      page_size?: number;
    };

    const products = json.products ?? [];
    const pageCount = json.page_count ?? 1;

    yield { products, page, pageCount };

    if (page >= pageCount || products.length === 0) return;
    page += 1;
    await throttle();
  }
}
