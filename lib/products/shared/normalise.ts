/**
 * Facts-family row normalisation — GTIN, strings, temperature inference.
 *
 * Kept source-agnostic so all four Open*Facts projects run through the
 * same sanitiser before upsert.
 */

import type { DataSourceEnum } from './facts-family-config';

/**
 * Canonicalise a GTIN to 13-digit EAN-13 form where possible.
 *
 * Open Food Facts stores `code` as a free-form digit string that can be
 * 8, 12, 13, or 14 characters. UPC-A (12) → EAN-13 by left-pad with 0.
 * GTIN-8 is left as-is. GTIN-14 (ITF-14 / case codes) is rare on the
 * retail shelf so we keep it but flag length for the caller to decide.
 */
export function canonicaliseGtin(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 12) return `0${digits}`;
  if (digits.length === 13 || digits.length === 8 || digits.length === 14) {
    return digits;
  }
  // Out-of-spec length — return as-is and let `needs_review` catch it.
  return digits;
}

/** Trim + collapse whitespace + strip empty → null. */
export function cleanString(s: string | null | undefined): string | null {
  if (!s) return null;
  const trimmed = s.replace(/\s+/g, ' ').trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Brand is often a comma-separated list in the Facts-family raw feed
 * ("Cadbury, Mondelez"). Take the first segment; that's usually the
 * consumer-facing brand.
 */
export function firstBrand(raw: string | null | undefined): string | null {
  const cleaned = cleanString(raw);
  if (!cleaned) return null;
  return cleanString(cleaned.split(',')[0] ?? null);
}

/** Convert the Facts-family `countries_tags` array into ISO-like codes. */
export function mapCountryMarkets(
  tags: string[] | null | undefined
): string[] {
  if (!tags) return [];
  return tags
    .map((t) => t.replace(/^en:/, '').toLowerCase())
    .filter((t) => t.length > 0);
}

/** Does the product market to the UK? */
export function isUkMarket(tags: string[] | null | undefined): boolean {
  if (!tags) return false;
  return tags.some(
    (t) => t === 'en:united-kingdom' || t === 'united-kingdom' || t === 'uk'
  );
}

/**
 * Guess the temperature zone from category tags. OFF doesn't carry this
 * field directly; we approximate from the category hierarchy. Default is
 * AMBIENT — that's the majority of the feed.
 */
export function inferTemperatureZone(
  categoryTags: string[] | null | undefined
): 'AMBIENT' | 'CHILLED' | 'FROZEN' {
  if (!categoryTags) return 'AMBIENT';
  const joined = categoryTags.join(' ').toLowerCase();
  if (joined.includes('frozen')) return 'FROZEN';
  if (
    joined.includes('chilled') ||
    joined.includes('refrigerated') ||
    joined.includes('dairy') ||
    joined.includes('yogurts') ||
    joined.includes('fresh-milk') ||
    joined.includes('cheeses')
  ) {
    return 'CHILLED';
  }
  return 'AMBIENT';
}

/**
 * Flag rows that made it past the filter but look like stubs — no
 * meaningful name, no brand, no category. These get inserted with
 * `needs_review = true` so HQ can triage them before they appear in
 * the franchisee picker.
 */
export function isStub(row: {
  name: string | null;
  brand: string | null;
  categoryTags: string[];
}): boolean {
  if (!row.name) return true;
  if (row.name.length < 3) return true;
  if (!row.brand && row.categoryTags.length === 0) return true;
  return false;
}

/** Short per-source prefix for log lines. */
export function sourcePrefix(source: DataSourceEnum): string {
  switch (source) {
    case 'OPEN_FOOD_FACTS':
      return 'OFF';
    case 'OPEN_BEAUTY_FACTS':
      return 'OBF';
    case 'OPEN_PRODUCTS_FACTS':
      return 'OPF';
    case 'OPEN_PET_FOOD_FACTS':
      return 'OPFF';
    default:
      return source;
  }
}
