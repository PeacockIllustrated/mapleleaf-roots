'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PromoSectionSummary } from '@/lib/configurator/types';
import type { UnitWithShelves } from '@/lib/shelf/types';
import { displayShelfLabel } from '@/lib/shelf/types';

interface Props {
  unit: UnitWithShelves;
  canEdit: boolean;
  promoSections: PromoSectionSummary[];
  onUpdate: (patch: {
    label?: string;
    promo_section_id?: string | null;
    notes?: string | null;
  }) => void;
  onAdjustShelfClearance: (shelfId: string, delta: 20 | -20) => void;
}

/**
 * Unit-level inspector — shown when nothing (slot, shelf) is selected.
 * Gives the user a landing spot to rename the unit, set its default promo
 * section, scan the shelves at a glance, and leave notes.
 */
export function UnitSummaryInspector({
  unit,
  canEdit,
  promoSections,
  onUpdate,
  onAdjustShelfClearance,
}: Props) {
  const [labelDraft, setLabelDraft] = useState(unit.label);
  const [notesDraft, setNotesDraft] = useState(unit.notes ?? '');

  useEffect(() => {
    setLabelDraft(unit.label);
  }, [unit.id, unit.label]);

  useEffect(() => {
    setNotesDraft(unit.notes ?? '');
  }, [unit.id, unit.notes]);

  useEffect(() => {
    if (labelDraft === unit.label) return;
    const t = setTimeout(() => {
      if (labelDraft.trim()) onUpdate({ label: labelDraft.trim() });
    }, 500);
    return () => clearTimeout(t);
  }, [labelDraft, unit.label, onUpdate]);

  useEffect(() => {
    const trimmed = notesDraft;
    if ((unit.notes ?? '') === trimmed) return;
    const t = setTimeout(() => {
      onUpdate({ notes: trimmed || null });
    }, 600);
    return () => clearTimeout(t);
  }, [notesDraft, unit.notes, onUpdate]);

  const setPromo = (id: string | null) => {
    onUpdate({ promo_section_id: id });
  };

  const slotCount = useMemo(
    () => unit.shelves.reduce((acc, s) => acc + s.slots.length, 0),
    [unit.shelves]
  );
  const productCount = useMemo(
    () =>
      unit.shelves.reduce(
        (acc, s) =>
          acc +
          s.slots.reduce(
            (a, sl) =>
              a +
              ((sl.assignment?.main ? 1 : 0) +
                (sl.assignment?.sub_a ? 1 : 0) +
                (sl.assignment?.sub_b ? 1 : 0)),
            0
          ),
        0
      ),
    [unit.shelves]
  );
  const plannedClearance = unit.shelves.reduce(
    (acc, s) => acc + s.clearance_mm,
    0
  );

  return (
    <aside style={panel}>
      <div style={headerBlock}>
        <span style={sectionLabel}>Unit overview</span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--ml-text-muted)',
            fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
          }}
        >
          {unit.unit_type_code} · {unit.width_mm} × {unit.height_mm} × {unit.depth_mm} mm
        </span>
      </div>

      <div style={body}>
        <Field label="Label">
          <input
            type="text"
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            disabled={!canEdit}
            style={input}
          />
        </Field>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8,
          }}
        >
          <Stat value={unit.shelves.length} label="Shelves" />
          <Stat value={slotCount} label="Slots" />
          <Stat value={productCount} label="Products" />
        </div>

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
          <span style={hint}>
            Shelves without their own promo inherit this.
          </span>
        </Field>

        <SectionHeader title="Shelves" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {unit.shelves.map((s) => {
            const label = displayShelfLabel(s.shelf_order, unit.shelves.length);
            const fill = s.slots.reduce(
              (acc, sl) => acc + sl.width_mm,
              0
            );
            return (
              <div
                key={s.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '26px 1fr auto auto',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  background: 'var(--ml-off-white)',
                  borderRadius: 'var(--ml-radius-sm)',
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--ml-text-primary)',
                    fontFamily:
                      'ui-monospace, "SFMono-Regular", Menlo, monospace',
                  }}
                >
                  {label}
                </span>
                <span style={{ color: 'var(--ml-text-muted)' }}>
                  {s.clearance_mm} mm high · {s.slots.length} slot
                  {s.slots.length === 1 ? '' : 's'} · {fill}/{unit.width_mm} mm
                </span>
                <MiniStep
                  aria="Reduce clearance"
                  label="−"
                  disabled={!canEdit || s.clearance_mm <= 80}
                  onClick={() => onAdjustShelfClearance(s.id, -20)}
                />
                <MiniStep
                  aria="Increase clearance"
                  label="+"
                  disabled={!canEdit}
                  onClick={() => onAdjustShelfClearance(s.id, 20)}
                />
              </div>
            );
          })}
        </div>
        <span style={hint}>
          Unit is {unit.height_mm} mm tall. Clearances sum to {plannedClearance} mm
          — the rest is header, shelf plates, and plinth.
        </span>

        <SectionHeader title="Notes" />
        <textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          disabled={!canEdit}
          rows={4}
          placeholder="Briefing notes for HQ or your team. Saved automatically."
          style={{ ...input, height: 'auto', padding: 10, resize: 'vertical' }}
        />
      </div>

      <div style={footer}>
        <span style={{ fontSize: 11, color: 'var(--ml-text-muted)' }}>
          Pick a slot on the canvas to edit its products.
        </span>
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

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div
      style={{
        padding: '8px 10px',
        background: 'var(--ml-off-white)',
        borderRadius: 'var(--ml-radius-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <span
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--ml-text-primary)',
          letterSpacing: '-0.02em',
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
        {label}
      </span>
    </div>
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

function MiniStep({
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
        width: 24,
        height: 24,
        borderRadius: 'var(--ml-radius-sm)',
        background: 'var(--ml-surface-panel)',
        color: 'var(--ml-charcoal)',
        border: '0.5px solid var(--ml-border-default)',
        fontSize: 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        fontFamily: 'inherit',
        lineHeight: 1,
      }}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------

const panel: React.CSSProperties = {
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
  padding: '10px 16px',
  borderTop: '0.5px solid var(--ml-border-default)',
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--ml-text-muted)',
};

const input: React.CSSProperties = {
  height: 36,
  padding: '0 10px',
  border: '1px solid var(--ml-border-default)',
  borderRadius: 'var(--ml-radius-md)',
  background: 'var(--ml-off-white)',
  fontSize: 13,
  fontFamily: 'inherit',
  color: 'var(--ml-text-primary)',
};

const hint: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--ml-text-muted)',
  fontStyle: 'italic',
};
