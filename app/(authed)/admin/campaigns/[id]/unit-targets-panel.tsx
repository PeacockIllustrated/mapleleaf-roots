'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addUnitTarget, removeUnitTarget } from '@/lib/campaigns/actions';
import type { CampaignUnitTarget } from '@/lib/campaigns/types';

interface UnitType {
  id: string;
  code: string;
  display_name: string;
  category: string;
}

interface PromoSection {
  id: string;
  code: string;
  display_name: string;
  hex_colour: string;
}

interface Props {
  campaignId: string;
  editable: boolean;
  unitTypes: UnitType[];
  promoSections: PromoSection[];
  targets: CampaignUnitTarget[];
}

export function UnitTargetsPanel({
  campaignId,
  editable,
  unitTypes,
  promoSections,
  targets,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedUnitType, setSelectedUnitType] = useState<string>('');
  const [selectedPromo, setSelectedPromo] = useState<string>('');

  const unitTypeById = new Map(unitTypes.map((u) => [u.id, u]));
  const promoById = new Map(promoSections.map((p) => [p.id, p]));

  function onAdd() {
    if (!selectedUnitType) return;
    setError(null);
    startTransition(async () => {
      const res = await addUnitTarget({
        campaign_id: campaignId,
        unit_type_id: selectedUnitType,
        promo_section_id: selectedPromo || null,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setSelectedUnitType('');
      setSelectedPromo('');
      router.refresh();
    });
  }

  function onRemove(targetId: string) {
    setError(null);
    startTransition(async () => {
      const res = await removeUnitTarget({
        campaign_id: campaignId,
        target_id: targetId,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      style={{
        background: 'var(--ml-surface-panel)',
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-lg)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {targets.length === 0 ? (
        <span style={{ fontSize: 13, color: 'var(--ml-text-muted)' }}>
          No targets yet. Pick at least one unit type below.
        </span>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {targets.map((t) => {
            const ut = unitTypeById.get(t.unit_type_id);
            const ps = t.promo_section_id
              ? promoById.get(t.promo_section_id)
              : null;
            return (
              <li
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '8px 12px',
                  background: 'var(--ml-off-white)',
                  border: '0.5px solid var(--ml-border-default)',
                  borderRadius: 'var(--ml-radius-md)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--ml-text-primary)',
                    }}
                  >
                    {ut?.display_name ?? t.unit_type_id}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--ml-text-muted)',
                    }}
                  >
                    {ut?.code}
                    {ps && ` · only ${ps.display_name}`}
                  </span>
                </div>
                {editable && (
                  <button
                    type="button"
                    onClick={() => onRemove(t.id)}
                    disabled={isPending}
                    style={removeButton}
                    aria-label={`Remove ${ut?.display_name ?? 'target'}`}
                  >
                    Remove
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editable && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto',
            gap: 8,
            alignItems: 'end',
            paddingTop: 8,
            borderTop: '0.5px solid var(--ml-border-default)',
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={fieldLabel}>Unit type</span>
            <select
              value={selectedUnitType}
              onChange={(e) => setSelectedUnitType(e.target.value)}
              style={selectStyle}
            >
              <option value="">Pick a unit type…</option>
              {unitTypes.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.display_name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={fieldLabel}>Promo section (optional)</span>
            <select
              value={selectedPromo}
              onChange={(e) => setSelectedPromo(e.target.value)}
              style={selectStyle}
            >
              <option value="">Any section on this unit</option>
              {promoSections.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={onAdd}
            disabled={!selectedUnitType || isPending}
            style={addButton}
          >
            {isPending ? 'Adding…' : 'Add target'}
          </button>
        </div>
      )}

      {error && (
        <div role="alert" style={errorBanner}>
          {error}
        </div>
      )}
    </div>
  );
}

const fieldLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--ml-text-muted)',
};

const selectStyle: React.CSSProperties = {
  padding: '8px 10px',
  fontFamily: 'inherit',
  fontSize: 13,
  color: 'var(--ml-text-primary)',
  background: 'var(--ml-off-white)',
  border: '1px solid var(--ml-border-default)',
  borderRadius: 'var(--ml-radius-md)',
};

const addButton: React.CSSProperties = {
  padding: '8px 14px',
  background: 'var(--ml-charcoal)',
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: 500,
  border: 'none',
  borderRadius: 'var(--ml-radius-md)',
  cursor: 'pointer',
};

const removeButton: React.CSSProperties = {
  padding: '4px 10px',
  background: 'transparent',
  color: 'var(--ml-text-muted)',
  fontSize: 11,
  fontWeight: 500,
  border: '1px solid var(--ml-border-default)',
  borderRadius: 'var(--ml-radius-md)',
  cursor: 'pointer',
};

const errorBanner: React.CSSProperties = {
  padding: 10,
  background: 'rgba(225, 40, 40, 0.06)',
  border: '1px solid rgba(225, 40, 40, 0.35)',
  borderRadius: 'var(--ml-radius-md)',
  fontSize: 12,
  color: 'var(--ml-red)',
};
