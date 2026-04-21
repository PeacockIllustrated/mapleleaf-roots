/**
 * ODbL attribution — shown anywhere derived product data renders.
 *
 * Open Food Facts (and its sibling projects) are licensed under the Open
 * Database Licence. One of ODbL's conditions is visible attribution
 * wherever the derived database is publicly displayed.
 *
 * We consolidate the copy here so the product picker, slot inspector,
 * and any future catalogue browser all point at the same authoritative
 * wording.
 */

import { FACTS_FAMILY, type DataSourceEnum } from './facts-family-config';

export interface AttributionLine {
  source: DataSourceEnum;
  label: string;
  href: string;
}

/**
 * Returns the attribution lines for the subset of sources currently in
 * use on a given page. Pass in the `data_source` column values of every
 * product visible to the user — the helper dedupes and returns at most
 * one line per source.
 */
export function attributionsFor(
  dataSources: Iterable<DataSourceEnum>
): AttributionLine[] {
  const seen = new Set<DataSourceEnum>();
  const out: AttributionLine[] = [];
  for (const s of dataSources) {
    if (seen.has(s)) continue;
    seen.add(s);
    const entry = Object.values(FACTS_FAMILY).find((f) => f.dataSource === s);
    if (!entry) continue;
    out.push({
      source: s,
      label: entry.attribution,
      href: entry.homepage,
    });
  }
  return out;
}
