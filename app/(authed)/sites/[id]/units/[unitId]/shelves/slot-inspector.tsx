'use client';

import { useEffect, useState } from 'react';
import type { PromoSectionSummary } from '@/lib/configurator/types';
import type {
  ProductSummary,
  ShelfRow,
  ShelfSlot,
  SlotStockingState,
} from '@/lib/shelf/types';
import { facingHeightMm } from '@/lib/shelf/types';

interface Props {
  unitLabel: string;
  shelf: ShelfRow | null;
  slot: ShelfSlot | null;
  canEdit: boolean;
  promoSections: PromoSectionSummary[];
  unitWidthMm: number;
  usedOnShelfMm: number;
  onUpdate:
    | ((patch: {
        widthMm?: number;
        facingCount?: number;
        stackCount?: number;
        currentlyStocking?: SlotStockingState;
      }) => void)
    | undefined;
  onAdjustFacings: ((delta: 1 | -1) => void) | undefined;
  onAdjustStack: ((delta: 1 | -1) => void) | undefined;
  onAdjustShelfClearance: ((delta: 20 | -20) => void) | undefined;
  onSpreadShelf: (() => void) | undefined;
  onSuggestSimilar: (() => void) | undefined;
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
  unitWidthMm,
  usedOnShelfMm,
  onUpdate,
  onAdjustFacings,
  onAdjustStack,
  onAdjustShelfClearance,
  onSpreadShelf,
  onSuggestSimilar,
  onDelete,
  onPickProduct,
  onClose,
}: Props) {
  const [width, setWidth] = useState(slot ? String(slot.width_mm) : '');

  useEffect(() => {
    if (slot) setWidth(String(slot.width_mm));
  }, [slot?.id, slot?.width_mm]);

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

  const mainProduct = slot.assignment?.main ?? null;
  const subAProduct = slot.assignment?.sub_a ?? null;
  const subBProduct = slot.assignment?.sub_b ?? null;

  const facingH = facingHeightMm(mainProduct);
  const maxStackByHeight =
    facingH && facingH > 0
      ? Math.min(6, Math.max(1, Math.floor(shelf.clearance_mm / facingH)))
      : 6;
  const canStackUp = slot.stack_count < Math.min(6, maxStackByHeight);
  const canStackDown = slot.stack_count > 1;

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
        <ShelfBudget
          unitWidthMm={unitWidthMm}
          usedMm={usedOnShelfMm}
        />

        <Field label="Facings">
          <FacingControl
            value={slot.facing_count}
            canEdit={canEdit}
            widthMm={slot.width_mm}
            facingWidthMm={
              mainProduct
                ? mainProduct.shipper_width_mm ??
                  mainProduct.width_mm ??
                  null
                : null
            }
            onAdjust={(delta) => onAdjustFacings?.(delta)}
          />
        </Field>

        <Field label="Stack (vertical)">
          <StackControl
            value={slot.stack_count}
            canStackUp={canEdit && canStackUp}
            canStackDown={canEdit && canStackDown}
            clearanceMm={shelf.clearance_mm}
            facingHeightMm={facingH}
            onAdjust={(delta) => onAdjustStack?.(delta)}
          />
        </Field>

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
          <span
            style={{
              fontSize: 10,
              color: 'var(--ml-text-muted)',
              marginTop: 2,
            }}
          >
            Auto-computed from product × facings when a main product is set.
          </span>
        </Field>

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

        <SectionHeader title={`Shelf ${shelf.shelf_order}`} />

        <Field label="Shelf clearance">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StepBtn
              label="−"
              aria="Reduce clearance by 20mm"
              onClick={() => onAdjustShelfClearance?.(-20)}
              disabled={!canEdit || shelf.clearance_mm <= 60}
            />
            <span
              style={{
                fontSize: 13,
                fontFamily:
                  'ui-monospace, "SFMono-Regular", Menlo, monospace',
                minWidth: 74,
                textAlign: 'center',
                color: 'var(--ml-text-primary)',
              }}
            >
              {shelf.clearance_mm} mm
            </span>
            <StepBtn
              label="+"
              aria="Increase clearance by 20mm"
              onClick={() => onAdjustShelfClearance?.(20)}
              disabled={!canEdit}
            />
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 11,
                color: 'var(--ml-text-muted)',
              }}
            >
              {facingH ? `${Math.floor(shelf.clearance_mm / facingH)} fit` : ''}
            </span>
          </div>
        </Field>

        {canEdit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              type="button"
              onClick={onSpreadShelf}
              style={shelfActionButton}
            >
              Spread shelf
              <span style={shelfActionHint}>
                Fill remaining space with more facings of what’s already placed.
              </span>
            </button>
            <button
              type="button"
              onClick={onSuggestSimilar}
              disabled={!mainProduct}
              style={{
                ...shelfActionButton,
                opacity: mainProduct ? 1 : 0.55,
                cursor: mainProduct ? 'pointer' : 'not-allowed',
              }}
            >
              Suggest similar product
              <span style={shelfActionHint}>
                {mainProduct
                  ? 'Open the picker filtered to products like the main on this slot.'
                  : 'Assign a main product first.'}
              </span>
            </button>
          </div>
        )}
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

function ShelfBudget({
  unitWidthMm,
  usedMm,
}: {
  unitWidthMm: number;
  usedMm: number;
}) {
  const remaining = Math.max(0, unitWidthMm - usedMm);
  const pct = Math.min(100, Math.round((usedMm / unitWidthMm) * 100));
  const over = usedMm > unitWidthMm;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span style={sectionLabel}>Shelf fill</span>
        <span
          style={{
            fontSize: 11,
            color: over ? 'var(--ml-red)' : 'var(--ml-text-muted)',
            fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
          }}
        >
          {usedMm}/{unitWidthMm} mm · {remaining} free
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: 'var(--ml-surface-muted)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(100, pct)}%`,
            height: '100%',
            background: over ? 'var(--ml-red)' : 'var(--ml-charcoal)',
            transition: 'width var(--ml-motion-base) var(--ml-ease-out)',
          }}
        />
      </div>
    </div>
  );
}

function StackControl({
  value,
  canStackUp,
  canStackDown,
  clearanceMm,
  facingHeightMm,
  onAdjust,
}: {
  value: number;
  canStackUp: boolean;
  canStackDown: boolean;
  clearanceMm: number;
  facingHeightMm: number | null;
  onAdjust: (delta: 1 | -1) => void;
}) {
  const stackedH =
    facingHeightMm && facingHeightMm > 0 ? facingHeightMm * value : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <StepBtn
        label="−"
        aria="Reduce stack"
        onClick={() => onAdjust(-1)}
        disabled={!canStackDown}
      />
      <div
        style={{
          minWidth: 74,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--ml-text-primary)',
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontSize: 10,
            color: 'var(--ml-text-muted)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          high
        </span>
      </div>
      <StepBtn
        label="+"
        aria="Add stack"
        onClick={() => onAdjust(1)}
        disabled={!canStackUp}
      />
      <span
        style={{
          marginLeft: 'auto',
          fontSize: 11,
          color: 'var(--ml-text-muted)',
          fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
          textAlign: 'right',
        }}
      >
        {stackedH
          ? `${stackedH}/${clearanceMm} mm`
          : `clearance ${clearanceMm} mm`}
      </span>
    </div>
  );
}

function StepBtn({
  label,
  aria,
  onClick,
  disabled,
}: {
  label: string;
  aria: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={aria}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 34,
        height: 34,
        borderRadius: 'var(--ml-radius-md)',
        background: 'var(--ml-off-white)',
        color: 'var(--ml-charcoal)',
        border: '0.5px solid var(--ml-border-default)',
        fontFamily: 'inherit',
        fontSize: 17,
        fontWeight: 500,
        lineHeight: 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background var(--ml-motion-fast) var(--ml-ease-out)',
      }}
    >
      {label}
    </button>
  );
}

const shelfActionButton: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 2,
  padding: '10px 12px',
  border: '0.5px solid var(--ml-border-default)',
  borderRadius: 'var(--ml-radius-md)',
  background: 'var(--ml-off-white)',
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--ml-text-primary)',
  cursor: 'pointer',
  textAlign: 'left',
};

const shelfActionHint: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 400,
  color: 'var(--ml-text-muted)',
};

function FacingControl({
  value,
  canEdit,
  widthMm,
  facingWidthMm,
  onAdjust,
}: {
  value: number;
  canEdit: boolean;
  widthMm: number;
  facingWidthMm: number | null;
  onAdjust: (delta: 1 | -1) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <StepButton
        label="−"
        onClick={() => onAdjust(-1)}
        disabled={!canEdit || value <= 1}
        aria="Remove a facing"
      />
      <div
        style={{
          minWidth: 74,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--ml-text-primary)',
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontSize: 10,
            color: 'var(--ml-text-muted)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {value === 1 ? 'facing' : 'facings'}
        </span>
      </div>
      <StepButton
        label="+"
        onClick={() => onAdjust(1)}
        disabled={!canEdit}
        aria="Add a facing"
      />
      <span
        style={{
          marginLeft: 'auto',
          fontSize: 11,
          color: 'var(--ml-text-muted)',
          fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
        }}
      >
        {facingWidthMm ? `${facingWidthMm} mm/facing` : `${widthMm} mm total`}
      </span>
    </div>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
  aria,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  aria: string;
}) {
  return (
    <button
      type="button"
      aria-label={aria}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 34,
        height: 34,
        borderRadius: 'var(--ml-radius-md)',
        background: 'var(--ml-off-white)',
        color: 'var(--ml-charcoal)',
        border: '0.5px solid var(--ml-border-default)',
        fontFamily: 'inherit',
        fontSize: 17,
        fontWeight: 500,
        lineHeight: 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background var(--ml-motion-fast) var(--ml-ease-out)',
      }}
    >
      {label}
    </button>
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
