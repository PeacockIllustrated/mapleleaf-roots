'use client';

import { useEffect, useState } from 'react';
import type { PromoSectionSummary } from '@/lib/configurator/types';
import type {
  ProductSummary,
  ShelfRow,
  ShelfSlot,
  SlotStockingState,
} from '@/lib/shelf/types';

interface Props {
  unitLabel: string;
  shelf: ShelfRow | null;
  slot: ShelfSlot | null;
  canEdit: boolean;
  promoSections: PromoSectionSummary[];
  onUpdate:
    | ((patch: {
        widthMm?: number;
        facingCount?: number;
        currentlyStocking?: SlotStockingState;
      }) => void)
    | undefined;
  onDelete: (() => void) | undefined;
  onPickProduct: (slotId: string, kind: 'main' | 'sub_a' | 'sub_b') => void;
  onClose: () => void;
}

const stockingLabels: Record<SlotStockingState, string> = {
  MAIN: 'Main',
  SUB_A: 'Sub A',
  SUB_B: 'Sub B',
  EMPTY: 'Empty',
  OUT_OF_SPEC: 'Out of spec',
};

const stockingOrder: SlotStockingState[] = [
  'MAIN',
  'SUB_A',
  'SUB_B',
  'EMPTY',
  'OUT_OF_SPEC',
];

export function SlotInspector({
  unitLabel,
  shelf,
  slot,
  canEdit,
  onUpdate,
  onDelete,
  onPickProduct,
  onClose,
}: Props) {
  const [width, setWidth] = useState(slot ? String(slot.width_mm) : '');
  const [facings, setFacings] = useState(
    slot ? String(slot.facing_count) : ''
  );

  useEffect(() => {
    if (slot) {
      setWidth(String(slot.width_mm));
      setFacings(String(slot.facing_count));
    }
  }, [slot?.id, slot?.width_mm, slot?.facing_count]);

  if (!slot || !shelf) {
    return (
      <aside style={panel}>
        <div
          style={{
            padding: 24,
            color: 'var(--ml-text-muted)',
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          Click a slot to edit, or click an empty shelf area to add one.
        </div>
      </aside>
    );
  }

  function commitWidth() {
    const parsed = Number.parseInt(width, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setWidth(String(slot!.width_mm));
      return;
    }
    if (parsed === slot!.width_mm) return;
    onUpdate?.({ widthMm: parsed });
  }

  function commitFacings() {
    const parsed = Number.parseInt(facings, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFacings(String(slot!.facing_count));
      return;
    }
    if (parsed === slot!.facing_count) return;
    onUpdate?.({ facingCount: parsed });
  }

  const mainProduct = slot.assignment?.main ?? null;
  const subAProduct = slot.assignment?.sub_a ?? null;
  const subBProduct = slot.assignment?.sub_b ?? null;

  return (
    <aside style={panel}>
      <div style={headerBlock}>
        <span style={sectionLabel}>
          Slot #{slot.slot_order} · shelf {shelf.shelf_order}
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--ml-text-muted)',
            fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
          }}
        >
          {unitLabel}
        </span>
      </div>

      <div style={body}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Width (mm)">
            <input
              type="number"
              inputMode="numeric"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              onBlur={commitWidth}
              disabled={!canEdit}
              style={input}
            />
          </Field>
          <Field label="Facings">
            <input
              type="number"
              inputMode="numeric"
              value={facings}
              onChange={(e) => setFacings(e.target.value)}
              onBlur={commitFacings}
              disabled={!canEdit}
              style={input}
            />
          </Field>
        </div>

        <SectionHeader title="Products" />
        <ProductPick
          label="Main"
          product={mainProduct}
          canEdit={canEdit}
          onOpen={() => onPickProduct(slot.id, 'main')}
          onClear={() => onPickProduct(slot.id, 'main')}
        />
        <ProductPick
          label="Sub A"
          product={subAProduct}
          canEdit={canEdit}
          onOpen={() => onPickProduct(slot.id, 'sub_a')}
          onClear={() => onPickProduct(slot.id, 'sub_a')}
        />
        <ProductPick
          label="Sub B"
          product={subBProduct}
          canEdit={canEdit}
          onOpen={() => onPickProduct(slot.id, 'sub_b')}
          onClear={() => onPickProduct(slot.id, 'sub_b')}
        />

        <SectionHeader title="Currently stocking" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
            gap: 6,
          }}
        >
          {stockingOrder.map((state) => {
            const active = slot.currently_stocking === state;
            return (
              <button
                key={state}
                type="button"
                disabled={!canEdit}
                onClick={() => onUpdate?.({ currentlyStocking: state })}
                style={{
                  padding: '6px 8px',
                  borderRadius: 'var(--ml-radius-md)',
                  border: active
                    ? '1.5px solid var(--ml-charcoal)'
                    : '0.5px solid var(--ml-border-default)',
                  background: active
                    ? 'var(--ml-charcoal)'
                    : 'var(--ml-surface-panel)',
                  color: active ? '#FFFFFF' : 'var(--ml-charcoal)',
                  fontFamily: 'inherit',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: canEdit ? 'pointer' : 'not-allowed',
                  opacity: canEdit ? 1 : 0.6,
                }}
              >
                {stockingLabels[state]}
              </button>
            );
          })}
        </div>
      </div>

      <div style={footer}>
        <button type="button" onClick={onClose} style={outlineButton}>
          Close
        </button>
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              if (
                confirm(`Delete slot #${slot.slot_order}? This can’t be undone.`)
              ) {
                onDelete?.();
              }
            }}
            style={destructiveButton}
          >
            Delete slot
          </button>
        )}
      </div>
    </aside>
  );
}

function ProductPick({
  label,
  product,
  canEdit,
  onOpen,
  onClear,
}: {
  label: string;
  product: ProductSummary | null;
  canEdit: boolean;
  onOpen: () => void;
  onClear: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: 10,
        background: 'var(--ml-off-white)',
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-md)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ml-text-muted)',
          }}
        >
          {label}
        </span>
        {canEdit && (
          <button
            type="button"
            onClick={onOpen}
            style={{
              background: 'transparent',
              border: 0,
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--ml-charcoal)',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {product ? 'Change' : 'Pick'}
          </button>
        )}
      </div>
      {product ? (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ml-text-primary)' }}>
            {product.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ml-text-muted)' }}>
            {product.brand ?? '—'}
            {product.width_mm
              ? ` · ${product.width_mm} × ${product.height_mm} × ${product.depth_mm} mm`
              : ''}
          </div>
        </div>
      ) : (
        <span style={{ fontSize: 12, color: 'var(--ml-text-muted)' }}>
          Not assigned.
        </span>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--ml-text-muted)',
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <span
      style={{
        ...sectionLabel,
        paddingTop: 10,
        borderTop: '0.5px solid var(--ml-border-default)',
      }}
    >
      {title}
    </span>
  );
}

const panel: React.CSSProperties = {
  width: 320,
  flexShrink: 0,
  background: 'var(--ml-surface-panel)',
  border: '0.5px solid var(--ml-border-default)',
  borderRadius: 'var(--ml-radius-lg)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const headerBlock: React.CSSProperties = {
  padding: '14px 16px',
  borderBottom: '0.5px solid var(--ml-border-default)',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const body: React.CSSProperties = {
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  flex: 1,
  overflowY: 'auto',
};

const footer: React.CSSProperties = {
  padding: 14,
  borderTop: '0.5px solid var(--ml-border-default)',
  display: 'flex',
  gap: 8,
  justifyContent: 'space-between',
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--ml-text-muted)',
};

const input: React.CSSProperties = {
  height: 34,
  padding: '0 10px',
  border: '1px solid var(--ml-border-default)',
  borderRadius: 'var(--ml-radius-md)',
  background: 'var(--ml-surface-panel)',
  fontSize: 13,
  fontFamily: 'inherit',
  color: 'var(--ml-text-primary)',
};

const outlineButton: React.CSSProperties = {
  height: 34,
  padding: '0 14px',
  background: 'transparent',
  color: 'var(--ml-charcoal)',
  border: '1px solid var(--ml-charcoal)',
  borderRadius: 'var(--ml-radius-md)',
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};

const destructiveButton: React.CSSProperties = {
  height: 34,
  padding: '0 14px',
  background: 'var(--ml-red)',
  color: '#FFFFFF',
  border: 0,
  borderRadius: 'var(--ml-radius-md)',
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};
