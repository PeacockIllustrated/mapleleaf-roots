'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ProductSummary, ShelfRow } from '@/lib/shelf/types';

interface Props {
  products: ProductSummary[];
  targetShelf: ShelfRow | null;
  kind: 'main' | 'sub_a' | 'sub_b';
  onClose: () => void;
  onChoose: (product: ProductSummary | null) => void;
}

const kindLabels: Record<Props['kind'], string> = {
  main: 'Main product',
  sub_a: 'Substitute A',
  sub_b: 'Substitute B',
};

export function ProductPicker({
  products,
  targetShelf,
  kind,
  onClose,
  onChoose,
}: Props) {
  const [query, setQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState<
    'ALL' | 'AMBIENT' | 'CHILLED' | 'FROZEN'
  >('ALL');
  const [fitOnly, setFitOnly] = useState(false);

  // If the shelf has a clearance limit, products with height_mm > clearance
  // are flagged as over-height.
  const shelfClearance = targetShelf?.clearance_mm ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (zoneFilter !== 'ALL' && p.temperature_zone !== zoneFilter)
        return false;
      if (
        fitOnly &&
        shelfClearance != null &&
        p.height_mm != null &&
        p.height_mm > shelfClearance
      )
        return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.brand ?? '').toLowerCase().includes(q) ||
        (p.gtin ?? '').includes(q)
      );
    });
  }, [products, query, zoneFilter, fitOnly, shelfClearance]);

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
                {kindLabels[kind]}
              </span>
              <h2
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 500,
                  color: 'var(--ml-text-primary)',
                }}
              >
                Pick a product
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
            placeholder="Search by name, brand, or GTIN…"
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

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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
                  color:
                    zoneFilter === z ? '#FFFFFF' : 'var(--ml-charcoal)',
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
              {filtered.length} of {products.length}
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
          {filtered.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: 32,
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--ml-text-muted)',
              }}
            >
              No products match those filters.
            </div>
          ) : (
            filtered.map((p) => {
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
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
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
              color: 'var(--ml-red)',
              cursor: 'pointer',
            }}
          >
            Clear this assignment
          </button>
          <span style={{ fontSize: 11, color: 'var(--ml-text-muted)' }}>
            Esc to close
          </span>
        </footer>
      </div>
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
