/**
 * Facts-family row → Mapleleaf product shape.
 *
 * Pulls the fields our `products` table actually cares about out of a
 * Facts-family JSONL row. Deliberately permissive with typing — the
 * upstream feed schema is loose and evolving.
 */

import type { DataSourceEnum } from './facts-family-config';
import {
  canonicaliseGtin,
  cleanString,
  firstBrand,
  inferTemperatureZone,
  isStub,
  isUkMarket,
  mapCountryMarkets,
} from './normalise';
import { resolveImageUrls } from './image-url';

/**
 * Raw image entry from the Facts-family JSONL. The top-level `images`
 * field is an object keyed by role (`front_en`, `ingredients_en`, `1`,
 * `2`, …). We only care about the front-image entry — every other role
 * is uninteresting for the picker.
 */
export interface FactsFamilyImageEntry {
  rev?: number | string;
  sizes?: Record<string, unknown>;
  imgid?: number | string;
  uploaded_t?: number | string;
  uploader?: string;
}

/** The subset of Facts-family JSONL fields we read. */
export interface FactsFamilyRow {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  categories_tags?: string[];
  countries_tags?: string[];
  // API-shape fields — present when fetched via /api/v2/product/{gtin}.
  // Absent in the JSONL dump.
  image_front_url?: string;
  image_front_small_url?: string;
  image_url?: string;
  image_small_url?: string;
  // JSONL-shape: lookup of image roles → revision info. Present in the
  // bulk dump; the API flattens this into the *_url fields above.
  images?: Record<string, FactsFamilyImageEntry>;
  last_modified_t?: number;
  // Packaging / quantity — only loosely useful today but worth keeping.
  product_quantity?: string | number;
  quantity?: string;
}

/** The shape we upsert into public.products. */
export interface ProductUpsert {
  gtin: string;
  name: string;
  brand: string | null;
  temperature_zone: 'AMBIENT' | 'CHILLED' | 'FROZEN';
  image_url: string | null;
  thumbnail_url: string | null;
  data_source: DataSourceEnum;
  external_ref: string;
  country_markets: string[];
  needs_review: boolean;
  last_synced_at: string;
}

/**
 * Map a Facts-family raw row to a ProductUpsert.
 * Returns null when the row is unusable (no GTIN, no name).
 */
export function mapFactsRow(
  raw: FactsFamilyRow,
  dataSource: DataSourceEnum,
  opts: { ukOnly: boolean } = { ukOnly: true }
): ProductUpsert | null {
  const gtin = canonicaliseGtin(raw.code);
  if (!gtin) return null;

  const name =
    cleanString(raw.product_name_en) ?? cleanString(raw.product_name);
  if (!name) return null;

  const markets = mapCountryMarkets(raw.countries_tags);
  if (opts.ukOnly && !isUkMarket(raw.countries_tags)) return null;

  const brand = firstBrand(raw.brands);
  const categoryTags = raw.categories_tags ?? [];
  const { imageUrl, thumbnailUrl } = resolveImageUrls(raw, dataSource);

  return {
    gtin,
    name,
    brand,
    temperature_zone: inferTemperatureZone(categoryTags),
    image_url: imageUrl,
    thumbnail_url: thumbnailUrl,
    data_source: dataSource,
    external_ref: raw.code ?? gtin,
    country_markets: markets,
    needs_review: isStub({ name, brand, categoryTags }),
    last_synced_at: new Date().toISOString(),
  };
}
