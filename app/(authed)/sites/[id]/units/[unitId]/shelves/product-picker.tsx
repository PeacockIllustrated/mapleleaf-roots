'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProductSummary, ShelfRow } from '@/lib/shelf/types';
import { searchProducts } from '@/lib/products/actions';

interface Props {
  /**
   * A small alphabetical starter set (≤200 rows) shipped from the server
   * component. Used as an initial browse list and as a fallback if the
   * search action errors. Live queries go through `searchProducts`.
   */
  products: ProductSummary[];
  targetShelf: ShelfRow | null;
  mode: 'add' | 'assign';
  kind: 'main' | 'sub_a' | 'sub_b';
  filterCategoryId?: string | null;
  onClose: () => void;
  onChoose: (product: ProductSummary | null) => void;
}

const kindLabels: Record<Props['kind'], string> = {
  main: 'Main product',
  sub_a: 'Substitute A',
  sub_b: 'Substitute B',
};

const SEARCH_DEBOUNCE_MS = 180;
const RESULT_CAP = 60;

type SearchState = {
  status: 'idle' | 'loading' | 'done' | 'error';
  items: ProductSummary[];
  total: number | null;
  errorMsg: string | null;
};

export function ProductPicker({
  products,
  targetShelf,
  mode,
  kind,
  filterCategoryId,
  onClose,
  onChoose,
}: Props) {
  const [query, setQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState<
    'ALL' | 'AMBIENT' | 'CHILLED' | 'FROZEN'
  >('ALL');
  const [fitOnly, setFitOnly] = useState(false);
  const [search, setSearch] = useState<SearchState>({
    status: 'idle',
    items: [],
    total: null,
    errorMsg: null,
  });

  const shelfClearance = targetShelf?.clearance_mm ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Debounced server search — only fires when the user has typed at
  // least two characters, so early keystrokes don't slam the DB.
  const reqIdRef = useRef(0);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearch({ status: 'idle', items: [], total: null, errorMsg: null });
      return;
    }
    setSearch((s) => ({ ...s, status: 'loading', errorMsg: null }));

    const myId = ++reqIdRef.current;
    const timer = setTimeout(async () => {
      const res = await searchProducts({
        query: q,
        categoryId: filterCategoryId ?? null,
        temperatureZone: zoneFilter === 'ALL' ? null : zoneFilter,
        limit: RESULT_CAP,
      });
      if (reqIdRef.current !== myId) return; // stale response
      if (res.ok) {
        setSearch({
          status: 'done',
          items: res.data.products,
          total: res.data.total,
          errorMsg: null,
        });
      } else {
        setSearch({
          status: 'error',
          items: [],
          total: null,
          errorMsg: res.message,
        });
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, filterCategoryId, zoneFilter]);

  // What gets shown in the grid. Three modes:
  //   1. Live query (≥2 chars): server-side `searchProducts` results.
  //   2. Category filter only: filter the starter set by category.
  //   3. Neither: show a "search to find products" empty state — the
  //      starter 200 rows get rendered below as a "while you decide"
  //      browse list, filtered by zone/fit client-side.
  const usingSearch = query.trim().length >= 2;

  const browseList = useMemo(() => {
    return products.filter((p) => {
      if (filterCategoryId && p.category_id !== filterCategoryId) return false;
      if (zoneFilter !== 'ALL' && p.temperature_zone !== zoneFilter)
        return false;
      if (
        fitOnly &&
        shelfClearance != null &&
        p.height_mm != null &&
        p.height_mm > shelfClearance
      )
        return false;
      return true;
    });
  }, [products, filterCategoryId, zoneFilter, fitOnly, shelfClearance]);

  const visible = usingSearch ? search.items : browseList;
  const resultTotalLabel = usingSearch
    ? search.total != null
      ? `${Math.min(search.items.length, search.total)} of ${search.total}`
      : `${search.items.length}`
    : `${browseList.length} starter · search for more`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(65, 64, 66, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 80,
        padding: 24,
      }}
    >
      <div
        style={{
          background: 'var(--ml-surface-panel)',
          border: '0.5px solid var(--ml-border-default)',
          borderRadius: 'var(--ml-radius-lg)',
          width: '100%',
          maxWidth: 720,
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(65, 64, 66, 0.3)',
        }}
      >
        <header
          style={{
            padding: '18px 20px 12px',
            borderBottom: '0.5px solid var(--ml-border-default)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--ml-text-muted)',
                }}
              >
                {mode === 'add'
                  ? `Add slot${targetShelf ? ` · shelf ${targetShelf.shelf_order}` : ''}`
                  : kindLabels[kind]}
              </span>
              <h2
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 500,
                  color: 'var(--ml-text-primary)',
                }}
              >
                {mode === 'add' ? 'What goes in this slot?' : 'Pick a product'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 0,
                fontSize: 13,
                color: 'var(--ml-text-muted)',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>

          <input
            type="search"
            placeholder="Search 150k+ products by name, brand, or GTIN…"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              height: 40,
              padding: '0 12px',
              border: '1px solid var(--ml-border-default)',
              borderRadius: 'var(--ml-radius-md)',
              background: 'var(--ml-off-white)',
              fontSize: 14,
              fontFamily: 'inherit',
              color: 'var(--ml-text-primary)',
            }}
          />

          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {(['ALL', 'AMBIENT', 'CHILLED', 'FROZEN'] as const).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoneFilter(z)}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 500,
                  borderRadius: 9999,
                  border:
                    zoneFilter === z
                      ? '1px solid var(--ml-charcoal)'
                      : '0.5px solid var(--ml-border-default)',
                  background:
                    zoneFilter === z ? 'var(--ml-charcoal)' : 'transparent',
                  color: zoneFilter === z ? '#FFFFFF' : 'var(--ml-charcoal)',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {z === 'ALL' ? 'Any zone' : z.toLowerCase()}
              </button>
            ))}
            {shelfClearance != null && (
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  color: 'var(--ml-text-muted)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={fitOnly}
                  onChange={(e) => setFitOnly(e.target.checked)}
                />
                Only products that fit this shelf ({shelfClearance} mm
                clearance)
              </label>
            )}
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 11,
                color: 'var(--ml-text-muted)',
              }}
            >
              {search.status === 'loading' ? 'Searching…' : resultTotalLabel}
            </span>
          </div>
        </header>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 14,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
            gap: 10,
            background: 'var(--ml-off-white)',
          }}
        >
          {search.status === 'error' ? (
            <EmptyState
              title="Search failed"
              body={search.errorMsg ?? 'Try again.'}
              tone="error"
            />
          ) : usingSearch && visible.length === 0 && search.status !== 'loading' ? (
            <EmptyState
              title="No products match"
              body="Try a different search term, or drop the zone filter."
            />
          ) : !usingSearch && query.trim().length === 1 ? (
            <EmptyState
              title="Keep typing…"
              body="At least two characters to search the full catalogue."
            />
          ) : !usingSearch && !filterCategoryId && products.length === 0 ? (
            <EmptyState
              title="Catalogue is empty"
              body="No products have been synced yet. Ask HQ to trigger the nightly sync."
            />
          ) : (
            visible.slice(0, RESULT_CAP).map((p) => {
              const overHeight =
                shelfClearance != null &&
                p.height_mm != null &&
                p.height_mm > shelfClearance;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChoose(p)}
                  style={{
                    padding: 12,
                    background: 'var(--ml-surface-panel)',
                    border: '0.5px solid var(--ml-border-default)',
                    borderRadius: 'var(--ml-radius-md)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    transition:
                      'border-color var(--ml-motion-fast) var(--ml-ease-out)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--ml-text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.name}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--ml-text-muted)',
                    }}
                  >
                    {p.brand ?? '—'}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      flexWrap: 'wrap',
                      marginTop: 4,
                    }}
                  >
                    {p.width_mm && (
                      <Chip
                        label={`${p.width_mm} × ${p.height_mm} × ${p.depth_mm} mm`}
                      />
                    )}
                    {p.temperature_zone !== 'AMBIENT' && (
                      <Chip label={p.temperature_zone.toLowerCase()} />
                    )}
                    {overHeight && <Chip label="Won’t fit" danger />}
                  </div>
                </button>
              );
            })
          )}

          {usingSearch &&
            search.total != null &&
            search.total > search.items.length && (
              <div
                style={{
                  gridColumn: '1 / -1',
                  padding: '10px 12px',
                  fontSize: 11,
                  color: 'var(--ml-text-muted)',
                  fontStyle: 'italic',
                  textAlign: 'center',
                }}
              >
                Showing the first {search.items.length} of {search.total}{' '}
                matches. Refine your search to narrow further.
              </div>
            )}
        </div>

        <footer
          style={{
            padding: '10px 20px',
            borderTop: '0.5px solid var(--ml-border-default)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={() => onChoose(null)}
            style={{
              background: 'transparent',
              border: 0,
              fontSize: 12,
              fontWeight: 500,
              color: mode === 'add' ? 'var(--ml-charcoal)' : 'var(--ml-red)',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {mode === 'add'
              ? 'Add slot without a product'
              : 'Clear this assignment'}
          </button>
          <span style={{ fontSize: 11, color: 'var(--ml-text-muted)' }}>
            Esc to close
          </span>
        </footer>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  body,
  tone = 'default',
}: {
  title: string;
  body: string;
  tone?: 'default' | 'error';
}) {
  return (
    <div
      style={{
        gridColumn: '1 / -1',
        padding: 32,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: tone === 'error' ? 'var(--ml-red)' : 'var(--ml-text-primary)',
        }}
      >
        {title}
      </span>
      <span style={{ fontSize: 12, color: 'var(--ml-text-muted)' }}>
        {body}
      </span>
    </div>
  );
}

function Chip({ label, danger }: { label: string; danger?: boolean }) {
  return (
    <span
      style={{
        padding: '2px 8px',
        fontSize: 10,
        fontWeight: 500,
        borderRadius: 9999,
        letterSpacing: '0.02em',
        background: danger ? 'rgba(225, 40, 40, 0.1)' : 'var(--ml-surface-muted)',
        color: danger ? 'var(--ml-red)' : 'var(--ml-charcoal)',
      }}
    >
      {label}
    </span>
  );
}
