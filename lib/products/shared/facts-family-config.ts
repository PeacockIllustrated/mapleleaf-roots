/**
 * Facts-family sync — per-source configuration.
 *
 * OFF, OBF, OPF, OPFF all expose the same API shape and JSONL dump format
 * — only the host, product count, and attribution string differ. Keep all
 * four configs side-by-side so adding a new Facts-family project is just
 * another entry in this object.
 */

/** Mirrors the public.product_data_source Postgres enum. */
export type DataSourceEnum =
  | 'OPEN_FOOD_FACTS'
  | 'OPEN_PRODUCTS_FACTS'
  | 'OPEN_BEAUTY_FACTS'
  | 'OPEN_PET_FOOD_FACTS'
  | 'INTERNAL_CATALOGUE'
  | 'FRANCHISEE_SUBMITTED';

export interface FactsFamilySource {
  /** Matches the product_data_source enum value. */
  dataSource: DataSourceEnum;
  /** Short lowercase key used in logs and URLs. */
  key: 'off' | 'obf' | 'opf' | 'opff';
  /** Human-readable name for UI + attribution strings. */
  displayName: string;
  /** Project homepage used in attribution links. */
  homepage: string;
  /** Base URL for the API (v2 product + CGI search). */
  apiBase: string;
  /** Nightly gzipped JSONL dump URL. */
  dumpUrl: string;
  /** ODbL attribution line shown in the UI. */
  attribution: string;
}

export const FACTS_FAMILY: Record<FactsFamilySource['key'], FactsFamilySource> =
  {
    off: {
      dataSource: 'OPEN_FOOD_FACTS',
      key: 'off',
      displayName: 'Open Food Facts',
      homepage: 'https://world.openfoodfacts.org',
      apiBase: 'https://world.openfoodfacts.org',
      dumpUrl:
        'https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz',
      attribution:
        'Product data © Open Food Facts contributors, Open Database Licence (ODbL).',
    },
    obf: {
      dataSource: 'OPEN_BEAUTY_FACTS',
      key: 'obf',
      displayName: 'Open Beauty Facts',
      homepage: 'https://world.openbeautyfacts.org',
      apiBase: 'https://world.openbeautyfacts.org',
      dumpUrl:
        'https://static.openbeautyfacts.org/data/openbeautyfacts-products.jsonl.gz',
      attribution:
        'Product data © Open Beauty Facts contributors, Open Database Licence (ODbL).',
    },
    opf: {
      dataSource: 'OPEN_PRODUCTS_FACTS',
      key: 'opf',
      displayName: 'Open Products Facts',
      homepage: 'https://world.openproductsfacts.org',
      apiBase: 'https://world.openproductsfacts.org',
      dumpUrl:
        'https://static.openproductsfacts.org/data/openproductsfacts-products.jsonl.gz',
      attribution:
        'Product data © Open Products Facts contributors, Open Database Licence (ODbL).',
    },
    opff: {
      dataSource: 'OPEN_PET_FOOD_FACTS',
      key: 'opff',
      displayName: 'Open Pet Food Facts',
      homepage: 'https://world.openpetfoodfacts.org',
      apiBase: 'https://world.openpetfoodfacts.org',
      dumpUrl:
        'https://static.openpetfoodfacts.org/data/openpetfoodfacts-products.jsonl.gz',
      attribution:
        'Product data © Open Pet Food Facts contributors, Open Database Licence (ODbL).',
    },
  };

/** Identifies us to the Facts-family projects. Required by their ToS. */
export const USER_AGENT =
  'Mapleleaf-Roots/1.0 (+https://mapleleaf-roots.vercel.app) product sync';

/** Throttle between API calls — OFF asks for ~100 req/min max. */
export const API_THROTTLE_MS = 120;
