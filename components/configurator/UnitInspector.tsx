'use client';

import { useEffect, useState } from 'react';
import { useConfigurator } from '@/lib/configurator/store';
import type { PromoSectionSummary, Rotation } from '@/lib/configurator/types';

interface Props {
  promoSections: PromoSectionSummary[];
  onUpdate: (args: {
    id: string;
    label?: string;
    rotation_degrees?: Rotation;
    promo_section_id?: string | null;
  }) => void;
  onDelete: (id: string) => void;
}

/**
 * UnitInspector — the floating panel for editing the selected unit.
 * Label changes debounce-save as the user types; rotation, promo, and
 * delete commit immediately.
 */
export function UnitInspector({ promoSections, onUpdate, onDelete }: Props) {
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

  // Debounce label saves.
  useEffect(() => {
    if (!unit) return;
    if (labelDraft === unit.label) return;
    const t = setTimeout(() => {
      updateLocal(unit.id, { label: labelDraft });
      onUpdate({ id: unit.id, label: labelDraft });
    }, 450);
    return () => clearTimeout(t);
  }, [labelDraft, unit, onUpdate, updateLocal]);

  if (!selectedId || !unit) {
    return (
      <aside style={panelStyle}>
        <div style={{ padding: 24, color: 'var(--ml-text-muted)', fontSize: 13 }}>
          Select a unit to edit.
        </div>
      </aside>
    );
  }

  const rotate = (delta: 90 | -90) => {
    const next = (((unit.rotation_degrees + delta) % 360) + 360) %
      360 as Rotation;
    updateLocal(unit.id, { rotation_degrees: next });
    onUpdate({ id: unit.id, rotation_degrees: next });
  };

  const setPromo = (id: string | null) => {
    updateLocal(unit.id, { promo_section_id: id });
    onUpdate({ id: unit.id, promo_section_id: id });
  };

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
      </div>

      <div
        style={{
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          flex: 1,
          overflowY: 'auto',
        }}
      >
        <Field label="Label">
          <input
            type="text"
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            style={inputStyle}
          />
        </Field>

        <Field label="Rotation">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => rotate(-90)}
              style={ghostButton}
              aria-label="Rotate 90° counter-clockwise"
            >
              ↺
            </button>
            <span
              style={{
                fontSize: 13,
                fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
                minWidth: 42,
                textAlign: 'center',
                color: 'var(--ml-text-primary)',
              }}
            >
              {unit.rotation_degrees}°
            </span>
            <button
              type="button"
              onClick={() => rotate(90)}
              style={ghostButton}
              aria-label="Rotate 90° clockwise"
            >
              ↻
            </button>
          </div>
        </Field>

        <Field label="Promo section">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
              gap: 6,
            }}
          >
            <SectionChip
              label="None"
              colour="transparent"
              active={unit.promo_section_id === null}
              onClick={() => setPromo(null)}
            />
            {promoSections.map((s) => (
              <SectionChip
                key={s.id}
                label={s.display_name}
                colour={s.hex_colour}
                active={unit.promo_section_id === s.id}
                onClick={() => setPromo(s.id)}
              />
            ))}
          </div>
        </Field>
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
        <button
          type="button"
          onClick={() => {
            if (
              confirm(`Delete ${unit.label}? This can’t be undone.`)
            ) {
              onDelete(unit.id);
            }
          }}
          style={destructiveButton}
        >
          Delete unit
        </button>
      </div>
    </aside>
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
        {label}
      </span>
      {children}
    </div>
  );
}

function SectionChip({
  label,
  colour,
  active,
  onClick,
}: {
  label: string;
  colour: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
        cursor: 'pointer',
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
            colour === 'transparent' ? '1px dashed var(--ml-charcoal)' : 'none',
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

const panelStyle: React.CSSProperties = {
  width: 300,
  flexShrink: 0,
  background: 'var(--ml-surface-panel)',
  border: '0.5px solid var(--ml-border-default)',
  borderRadius: 'var(--ml-radius-lg)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
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

const ghostButton: React.CSSProperties = {
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
  cursor: 'pointer',
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
