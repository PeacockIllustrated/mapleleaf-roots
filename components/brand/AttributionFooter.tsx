import {
  attributionsFor,
  type AttributionLine,
} from '@/lib/products/shared/attribution';
import type { DataSourceEnum } from '@/lib/products/shared/facts-family-config';

interface Props {
  /** The distinct `data_source` values currently visible on the page. */
  dataSources: Iterable<DataSourceEnum>;
}

/**
 * Attribution footer — satisfies ODbL's "visible attribution" clause for
 * any page rendering products sourced from the Open*Facts family.
 *
 * Renders nothing when no Facts-family sources are present (e.g. a page
 * showing only INTERNAL_CATALOGUE rows).
 */
export function AttributionFooter({ dataSources }: Props) {
  const lines: AttributionLine[] = attributionsFor(dataSources);
  if (lines.length === 0) return null;

  return (
    <footer
      style={{
        marginTop: 20,
        padding: '10px 16px',
        borderTop: '0.5px solid var(--ml-border-default)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {lines.map((l) => (
        <a
          key={l.source}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 11,
            color: 'var(--ml-text-muted)',
            textDecoration: 'none',
            letterSpacing: '0.02em',
          }}
        >
          {l.label}
        </a>
      ))}
    </footer>
  );
}
