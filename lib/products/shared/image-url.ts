/**
 * Facts-family image URL resolution.
 *
 * The Facts-family **API** (`/api/v2/product/{gtin}`) returns pre-resolved
 * absolute URLs in `image_front_url`, `image_front_small_url`, etc. Easy
 * to use — just read the string.
 *
 * The nightly **JSONL dump** omits those resolved strings. Instead it
 * ships the raw `images` object keyed by role (`front_en`, `1`, `2`, …)
 * with `rev` numbers. We have to construct the URL ourselves from
 * `code + role + rev + size` using OFF's CDN path convention:
 *
 *   https://images.openfoodfacts.org/images/products/{folder}/{role}.{rev}.{size}.jpg
 *
 *   folder = 13-digit code split into 3/3/3/rest (e.g. 3017620422003 →
 *   "301/762/042/2003"). 8-digit codes are used unsplit.
 *
 * Each Facts-family project has its own image CDN:
 *   OFF   → images.openfoodfacts.org
 *   OBF   → images.openbeautyfacts.org
 *   OPF   → images.openproductsfacts.org
 *   OPFF  → images.openpetfoodfacts.org
 *
 * For on-demand API fetches we still prefer the pre-resolved `*_url`
 * fields when present. For JSONL seeds we fall through to the `images`
 * map. The return type is always two possibly-null strings so the
 * caller doesn't care which path was taken.
 */

import type { DataSourceEnum } from './facts-family-config';
import type { FactsFamilyRow, FactsFamilyImageEntry } from './facts-family-mapper';

const IMAGE_HOST: Record<DataSourceEnum, string | null> = {
  OPEN_FOOD_FACTS: 'https://images.openfoodfacts.org',
  OPEN_BEAUTY_FACTS: 'https://images.openbeautyfacts.org',
  OPEN_PRODUCTS_FACTS: 'https://images.openproductsfacts.org',
  OPEN_PET_FOOD_FACTS: 'https://images.openpetfoodfacts.org',
  INTERNAL_CATALOGUE: null,
  FRANCHISEE_SUBMITTED: null,
};

/** Size used for the main image_url — still small enough to load quick. */
const MAIN_SIZE = 400;

/** Size used for the thumbnail_url. */
const THUMB_SIZE = 200;

/**
 * Split an EAN-13-style code into the 3/3/3/rest folder layout OFF's CDN
 * expects. Codes ≤ 8 digits are not split.
 */
function codeFolder(code: string): string {
  const digits = code.replace(/\D/g, '');
  if (digits.length <= 8) return digits;
  const padded = digits.padStart(13, '0');
  return `${padded.slice(0, 3)}/${padded.slice(3, 6)}/${padded.slice(6, 9)}/${padded.slice(9)}`;
}

/**
 * Pick the best front-facing image entry from a Facts-family `images`
 * map. Roles are tried in order of specificity — English front first,
 * then any language front, then the first numeric upload.
 */
function pickFrontEntry(
  images: Record<string, FactsFamilyImageEntry> | undefined
): { role: string; rev: number } | null {
  if (!images) return null;

  const candidateRoles = [
    'front_en',
    'front_fr',
    'front_de',
    'front_es',
    'front_it',
    'front',
  ];
  for (const role of candidateRoles) {
    const entry = images[role];
    const rev = coerceRev(entry?.rev);
    if (rev !== null) return { role, rev };
  }

  // Fallback: first numeric-keyed upload.
  const numericKeys = Object.keys(images)
    .filter((k) => /^\d+$/.test(k))
    .sort((a, b) => Number(a) - Number(b));
  for (const k of numericKeys) {
    const rev = coerceRev(images[k]?.rev);
    if (rev !== null) return { role: k, rev };
  }

  return null;
}

function coerceRev(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export interface ResolvedImages {
  imageUrl: string | null;
  thumbnailUrl: string | null;
}

/**
 * Resolve a (main_url, thumbnail_url) pair for a Facts-family row. Prefers
 * the API-shape pre-resolved fields; falls back to constructing from
 * `images` + `code`.
 */
export function resolveImageUrls(
  raw: FactsFamilyRow,
  dataSource: DataSourceEnum
): ResolvedImages {
  // 1. Pre-resolved URLs from the API — just use them.
  const apiMain = cleanUrl(raw.image_front_url) ?? cleanUrl(raw.image_url);
  const apiThumb =
    cleanUrl(raw.image_front_small_url) ?? cleanUrl(raw.image_small_url);
  if (apiMain || apiThumb) {
    return {
      imageUrl: apiMain ?? apiThumb ?? null,
      thumbnailUrl: apiThumb ?? apiMain ?? null,
    };
  }

  // 2. JSONL-dump path: construct from `images` + `code`.
  const host = IMAGE_HOST[dataSource];
  if (!host || !raw.code) return { imageUrl: null, thumbnailUrl: null };

  const pick = pickFrontEntry(raw.images);
  if (!pick) return { imageUrl: null, thumbnailUrl: null };

  const folder = codeFolder(raw.code);
  const base = `${host}/images/products/${folder}/${pick.role}.${pick.rev}`;
  return {
    imageUrl: `${base}.${MAIN_SIZE}.jpg`,
    thumbnailUrl: `${base}.${THUMB_SIZE}.jpg`,
  };
}

function cleanUrl(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  return t.startsWith('http') ? t : null;
}
