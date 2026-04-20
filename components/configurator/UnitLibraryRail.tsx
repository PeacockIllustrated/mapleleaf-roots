'use client';

import { useMemo, useState } from 'react';
import type {
  UnitCategory,
  UnitTypeSummary,
} from '@/lib/configurator/types';

interface Props {
  units: UnitTypeSummary[];
}

const categoryOrder: UnitCategory[] = [
  'DRY_SHELVING',
  'CHILLED_FROZEN',
  'PROMO_SEASONAL',
  'COUNTER_TILL',
  'FORECOURT',
  'WINDOWS_POS_ONLY',
];

const categoryLabels: Record<UnitCategory, string> = {
  DRY_SHELVING: 'Dry shelving',
  CHILLED_FROZEN: 'Chilled and frozen',
  PROMO_SEASONAL: 'Promo and seasonal',
  COUNTER_TILL: 'Counter and till',
  FORECOURT: 'Forecourt',
  WINDOWS_POS_ONLY: 'Windows and POS',
};

/**
 * UnitLibraryRail — the draggable source of unit types.
 * Drag a card onto the canvas to place it. Filters by search; collapsible
 * section headers per category.
 */
export function UnitLibraryRail({ units }: Props) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return units;
    return units.filter(
      (u) =>
        u.display_name.toLowerCase().includes(q) ||
        u.code.toLowerCase().includes(q)
    );
  }, [units, query]);

  const grouped = useMemo(() => {
    const map = new Map<UnitCategory, UnitTypeSummary[]>();
    for (const cat of categoryOrder) map.set(cat, []);
    for (const u of filtered) map.get(u.category)?.push(u);
    return map;
  }, [filtered]);

  return (
    <aside
      style={{
        width: 280,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        background: 'var(--ml-surface-panel)',
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-lg)',
        padding: 14,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ml-text-muted)',
          }}
        >
          Unit library
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          style={{
            height: 32,
            padding: '0 10px',
            border: '1px solid var(--ml-border-default)',
            borderRadius: 'var(--ml-radius-md)',
            background: 'var(--ml-off-white)',
            fontSize: 13,
            fontFamily: 'inherit',
            color: 'var(--ml-text-primary)',
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          paddingRight: 2,
        }}
      >
        {categoryOrder.map((cat) => {
          const rows = grouped.get(cat) ?? [];
          if (rows.length === 0) return null;
          return (
            <section
              key={cat}
              style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              <header
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--ml-text-muted)',
                  paddingBottom: 4,
                  borderBottom: '0.5px solid var(--ml-border-default)',
                }}
              >
                {categoryLabels[cat]}
              </header>
              {rows.map((u) => (
                <LibraryCard key={u.id} unit={u} />
              ))}
            </section>
          );
        })}

        {filtered.length === 0 && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--ml-text-muted)',
              textAlign: 'center',
              padding: '24px 8px',
            }}
          >
            No units match “{query}”.
          </div>
        )}
      </div>
    </aside>
  );
}

function LibraryCard({ unit }: { unit: UnitTypeSummary }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-unit-type-id', unit.id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      style={{
        padding: '10px 12px',
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-md)',
        background: 'var(--ml-off-white)',
        cursor: 'grab',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        transition:
          'border-color var(--ml-motion-fast) var(--ml-ease-out), transform var(--ml-motion-fast) var(--ml-ease-out)',
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--ml-text-primary)',
        }}
      >
        {unit.display_name}
      </span>
      <span
        style={{
          fontSize: 11,
          color: 'var(--ml-text-muted)',
          letterSpacing: '0.02em',
        }}
      >
        {unit.width_mm} × {unit.depth_mm} mm
        {unit.is_refrigerated ? ' · chilled' : ''}
      </span>
    </div>
  );
}
