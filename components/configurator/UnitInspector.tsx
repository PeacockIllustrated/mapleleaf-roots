'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useConfigurator } from '@/lib/configurator/store';
import type {
  PromoSectionSummary,
  Rotation,
  SiteUnitShelf,
  UnitTypePosSlotRef,
} from '@/lib/configurator/types';

interface Props {
  siteId: string;
  promoSections: PromoSectionSummary[];
  canEdit: boolean;
  onUpdate: (args: {
    id: string;
    label?: string;
    rotation_degrees?: Rotation;
    promo_section_id?: string | null;
  }) => void;
  onDelete: (id: string) => void;
  onAddShelf: (unitId: string) => Promise<void>;
  onUpdateShelf: (
    unitId: string,
    shelfId: string,
    patch: {
      clearanceMm?: number;
      depthMm?: number | null;
      promoSectionId?: string | null;
    }
  ) => Promise<void>;
  onDeleteShelf: (unitId: string, shelfId: string) => Promise<void>;
}

/**
 * UnitInspector — the floating panel for editing the selected unit.
 *
 * Primary controls (label / rotation / unit-level promo) sit at the top.
 * Below: a Shelves list (clearance, depth, per-shelf promo chip, delete)
 * with an "add shelf" affordance, and a read-only POS positions list.
 */
export function UnitInspector({
  siteId,
  promoSections,
  canEdit,
  onUpdate,
  onDelete,
  onAddShelf,
  onUpdateShelf,
  onDeleteShelf,
}: Props) {
  const selectedId = useConfigurator((s) => s.selectedId);
  const unit = useConfigurator((s) =>
    s.selectedId ? s.units.find((u) => u.id === s.selectedId) : undefined
  );
  const updateLocal = useConfigurator((s) => s.updateUnit);
  const select = useConfigurator((s) => s.select);

  const [labelDraft, setLabelDraft] = useState<string>(unit?.label ?? '');

  useEffect(() => {
    setLabelDraft(unit?.label ?? '');
  }, [unit?.id, unit?.label]);

  useEffect(() => {
    if (!unit) return;
    if (labelDraft === unit.label) return;
    const t = setTimeout(() => {
      updateLocal(unit.id, { label: labelDraft });
      onUpdate({ id: unit.id, label: labelDraft });
    }, 450);
    return () => clearTimeout(t);
  }, [labelDraft, unit, onUpdate, updateLocal]);

  const rotate = useCallback(
    (delta: 90 | -90) => {
      if (!unit) return;
      const next = ((((unit.rotation_degrees + delta) % 360) + 360) %
        360) as Rotation;
      updateLocal(unit.id, { rotation_degrees: next });
      onUpdate({ id: unit.id, rotation_degrees: next });
    },
    [unit, onUpdate, updateLocal]
  );

  const setPromo = useCallback(
    (id: string | null) => {
      if (!unit) return;
      updateLocal(unit.id, { promo_section_id: id });
      onUpdate({ id: unit.id, promo_section_id: id });
    },
    [unit, onUpdate, updateLocal]
  );

  if (!selectedId || !unit) {
    return (
      <aside style={panelStyle}>
        <div
          style={{
            padding: 24,
            color: 'var(--ml-text-muted)',
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          Select a unit to edit.
        </div>
      </aside>
    );
  }

  return (
    <aside style={panelStyle}>
      <div
        style={{
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          borderBottom: '0.5px solid var(--ml-border-default)',
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
          {unit.unit_type.display_name}
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--ml-text-muted)',
            fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
          }}
        >
          {unit.unit_type.code} · {unit.unit_type.width_mm} ×{' '}
          {unit.unit_type.depth_mm} × {unit.unit_type.height_mm} mm
        </span>
        <Link
          href={`/sites/${siteId}/units/${unit.id}/shelves`}
          style={{
            marginTop: 6,
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--ml-red)',
            textDecoration: 'none',
            letterSpacing: '0.01em',
          }}
        >
          Open shelves →
        </Link>
      </div>

      <div
        style={{
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {/* Label */}
        <Field label="Label">
          <input
            type="text"
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            disabled={!canEdit}
            style={inputStyle}
          />
        </Field>

        {/* Rotation */}
        <Field label="Rotation">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconButton
              onClick={() => rotate(-90)}
              disabled={!canEdit}
              aria="Rotate 90° counter-clockwise"
            >
              ↺
            </IconButton>
            <span
              style={{
                fontSize: 13,
                fontFamily:
                  'ui-monospace, "SFMono-Regular", Menlo, monospace',
                minWidth: 42,
                textAlign: 'center',
                color: 'var(--ml-text-primary)',
              }}
            >
              {unit.rotation_degrees}°
            </span>
            <IconButton
              onClick={() => rotate(90)}
              disabled={!canEdit}
              aria="Rotate 90° clockwise"
            >
              ↻
            </IconButton>
          </div>
        </Field>

        {/* Unit-level promo */}
        <Field label="Default promo section">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
              gap: 6,
            }}
          >
            <PromoChip
              label="None"
              colour="transparent"
              active={unit.promo_section_id === null}
              onClick={() => canEdit && setPromo(null)}
              disabled={!canEdit}
            />
            {promoSections.map((s) => (
              <PromoChip
                key={s.id}
                label={s.display_name}
                colour={s.hex_colour}
                active={unit.promo_section_id === s.id}
                onClick={() => canEdit && setPromo(s.id)}
                disabled={!canEdit}
              />
            ))}
          </div>
        </Field>

        {/* Shelves */}
        {unit.shelves && unit.shelves.length >= 0 && (
          <SectionHeader
            title="Shelves"
            count={unit.shelves.length}
            action={
              canEdit
                ? {
                    label: 'Add shelf',
                    onClick: () => onAddShelf(unit.id),
                  }
                : undefined
            }
          />
        )}

        {unit.shelves.length === 0 && (
          <Hint>
            No shelves yet. Add shelves for this unit or choose a shelving
            unit type.
          </Hint>
        )}

        {unit.shelves.map((shelf) => (
          <ShelfRow
            key={shelf.id}
            shelf={shelf}
            promoSections={promoSections}
            canEdit={canEdit}
            onPatch={(patch) =>
              onUpdateShelf(unit.id, shelf.id, patch)
            }
            onDelete={() => onDeleteShelf(unit.id, shelf.id)}
          />
        ))}

        {/* POS positions (read-only) */}
        <SectionHeader
          title="POS positions"
          count={unit.pos_slots.length}
          hint="Inherited from the unit type"
        />
        {unit.pos_slots.length === 0 ? (
          <Hint>None defined for this unit type.</Hint>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {unit.pos_slots.map((p) => (
              <PosRow key={p.id} slot={p} />
            ))}
          </ul>
        )}
      </div>

      <div
        style={{
          padding: 14,
          borderTop: '0.5px solid var(--ml-border-default)',
          display: 'flex',
          gap: 8,
          justifyContent: 'space-between',
        }}
      >
        <button
          type="button"
          onClick={() => select(null)}
          style={outlineButton}
        >
          Close
        </button>
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete ${unit.label}? This can’t be undone.`)) {
                onDelete(unit.id);
              }
            }}
            style={destructiveButton}
          >
            Delete unit
          </button>
        )}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={sectionLabel}>{label}</span>
      {children}
    </div>
  );
}

function SectionHeader({
  title,
  count,
  hint,
  action,
}: {
  title: string;
  count?: number;
  hint?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        paddingTop: 6,
        borderTop: '0.5px solid var(--ml-border-default)',
        marginTop: -4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={sectionLabel}>{title}</span>
        {typeof count === 'number' && (
          <span style={{ fontSize: 11, color: 'var(--ml-text-muted)' }}>
            {count}
          </span>
        )}
        {hint && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--ml-text-muted)',
              fontStyle: 'italic',
            }}
          >
            {hint}
          </span>
        )}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            background: 'transparent',
            color: 'var(--ml-charcoal)',
            border: 0,
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 12,
        color: 'var(--ml-text-muted)',
        fontStyle: 'italic',
      }}
    >
      {children}
    </span>
  );
}

function IconButton({
  onClick,
  disabled,
  aria,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  aria: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={aria}
      style={{
        width: 34,
        height: 34,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--ml-off-white)',
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-md)',
        fontFamily: 'inherit',
        fontSize: 16,
        color: 'var(--ml-charcoal)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

function PromoChip({
  label,
  colour,
  active,
  onClick,
  disabled,
}: {
  label: string;
  colour: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 8px',
        border: active
          ? '1.5px solid var(--ml-charcoal)'
          : '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-md)',
        background: 'var(--ml-surface-panel)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'inherit',
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--ml-text-primary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        textAlign: 'left',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          background: colour === 'transparent' ? 'transparent' : colour,
          border:
            colour === 'transparent'
              ? '1px dashed var(--ml-charcoal)'
              : 'none',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </button>
  );
}

function ShelfRow({
  shelf,
  promoSections,
  canEdit,
  onPatch,
  onDelete,
}: {
  shelf: SiteUnitShelf;
  promoSections: PromoSectionSummary[];
  canEdit: boolean;
  onPatch: (patch: {
    clearanceMm?: number;
    depthMm?: number | null;
    promoSectionId?: string | null;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [clearance, setClearance] = useState(String(shelf.clearance_mm));
  const [depth, setDepth] = useState(
    shelf.depth_mm != null ? String(shelf.depth_mm) : ''
  );

  useEffect(() => {
    setClearance(String(shelf.clearance_mm));
  }, [shelf.clearance_mm]);
  useEffect(() => {
    setDepth(shelf.depth_mm != null ? String(shelf.depth_mm) : '');
  }, [shelf.depth_mm]);

  async function commitClearance() {
    const parsed = parseInt(clearance, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setClearance(String(shelf.clearance_mm));
      return;
    }
    if (parsed === shelf.clearance_mm) return;
    await onPatch({ clearanceMm: parsed });
  }

  async function commitDepth() {
    const trimmed = depth.trim();
    if (trimmed === '') {
      if (shelf.depth_mm != null) await onPatch({ depthMm: null });
      return;
    }
    const parsed = parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setDepth(shelf.depth_mm != null ? String(shelf.depth_mm) : '');
      return;
    }
    if (parsed === shelf.depth_mm) return;
    await onPatch({ depthMm: parsed });
  }

  const activePromo =
    promoSections.find((p) => p.id === shelf.promo_section_id) ?? null;

  return (
    <div
      style={{
        padding: 12,
        background: 'var(--ml-off-white)',
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-md)',
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
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--ml-text-muted)',
          }}
        >
          Shelf {shelf.shelf_order}
          {shelf.is_base_shelf ? ' · base' : ''}
        </span>
        {canEdit && (
          <button
            type="button"
            onClick={onDelete}
            style={{
              background: 'transparent',
              color: 'var(--ml-red)',
              border: 0,
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
            }}
            aria-label={`Delete shelf ${shelf.shelf_order}`}
          >
            Remove
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
        }}
      >
        <InlineField label="Clearance (mm)">
          <input
            type="number"
            inputMode="numeric"
            value={clearance}
            onChange={(e) => setClearance(e.target.value)}
            onBlur={commitClearance}
            disabled={!canEdit}
            style={inlineInputStyle}
          />
        </InlineField>
        <InlineField label="Depth (mm)">
          <input
            type="number"
            inputMode="numeric"
            placeholder="auto"
            value={depth}
            onChange={(e) => setDepth(e.target.value)}
            onBlur={commitDepth}
            disabled={!canEdit}
            style={inlineInputStyle}
          />
        </InlineField>
      </div>

      <PromoSelect
        value={shelf.promo_section_id}
        promoSections={promoSections}
        canEdit={canEdit}
        activePromoLabel={activePromo?.display_name ?? 'Inherit'}
        onChange={(id) => onPatch({ promoSectionId: id })}
      />
    </div>
  );
}

function PromoSelect({
  value,
  promoSections,
  canEdit,
  activePromoLabel,
  onChange,
}: {
  value: string | null;
  promoSections: PromoSectionSummary[];
  canEdit: boolean;
  activePromoLabel: string;
  onChange: (id: string | null) => void;
}) {
  return (
    <label
      style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
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
        Promo on this shelf
      </span>
      <select
        value={value ?? ''}
        onChange={(e) =>
          onChange(e.target.value === '' ? null : e.target.value)
        }
        disabled={!canEdit}
        style={{
          ...inlineInputStyle,
          appearance: 'auto',
          height: 30,
          title: activePromoLabel,
        } as React.CSSProperties}
      >
        <option value="">Inherit from unit</option>
        {promoSections.map((s) => (
          <option key={s.id} value={s.id}>
            {s.display_name}
          </option>
        ))}
      </select>
    </label>
  );
}

function InlineField({
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

function PosRow({ slot }: { slot: UnitTypePosSlotRef }) {
  return (
    <li
      style={{
        padding: '10px 12px',
        background: 'var(--ml-off-white)',
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        marginBottom: 6,
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
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--ml-text-primary)',
          }}
        >
          {slot.pos_slot_type.display_name}
        </span>
        <span
          style={{
            fontSize: 11,
            fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
            color: 'var(--ml-text-muted)',
          }}
        >
          × {slot.quantity}
        </span>
      </div>
      <span style={{ fontSize: 10, color: 'var(--ml-text-muted)' }}>
        {slot.position_label ?? '—'} ·{' '}
        {slot.pos_slot_type.width_mm} × {slot.pos_slot_type.height_mm} mm ·{' '}
        {slot.pos_slot_type.default_material.toLowerCase().replace(/_/g, ' ')}
      </span>
    </li>
  );
}

// ---------------------------------------------------------------------------

const panelStyle: React.CSSProperties = {
  minWidth: 320,
  maxWidth: 400,
  flexShrink: 0,
  background: 'var(--ml-surface-panel)',
  border: '0.5px solid var(--ml-border-default)',
  borderRadius: 'var(--ml-radius-lg)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--ml-text-muted)',
};

const inputStyle: React.CSSProperties = {
  height: 36,
  padding: '0 10px',
  border: '1px solid var(--ml-border-default)',
  borderRadius: 'var(--ml-radius-md)',
  background: 'var(--ml-off-white)',
  fontSize: 13,
  fontFamily: 'inherit',
  color: 'var(--ml-text-primary)',
};

const inlineInputStyle: React.CSSProperties = {
  height: 30,
  padding: '0 8px',
  border: '1px solid var(--ml-border-default)',
  borderRadius: 'var(--ml-radius-sm)',
  background: 'var(--ml-surface-panel)',
  fontSize: 12,
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
