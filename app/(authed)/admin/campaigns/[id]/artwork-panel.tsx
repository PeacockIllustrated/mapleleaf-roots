'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { upsertCampaignArtwork } from '@/lib/campaigns/actions';
import type {
  CampaignArtwork,
  CampaignUnitTarget,
} from '@/lib/campaigns/types';

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

interface PosSlotType {
  id: string;
  code: string;
  display_name: string;
  width_mm: number;
  height_mm: number;
  default_material: string;
}

interface UnitPosSlot {
  unit_type_id: string;
  pos_slot_type_id: string;
  position_label: string | null;
  quantity: number;
}

interface Props {
  campaignId: string;
  editable: boolean;
  unitTypes: UnitType[];
  posSlotTypes: PosSlotType[];
  unitPosSlots: UnitPosSlot[];
  promoSections: PromoSection[];
  artwork: CampaignArtwork[];
  unitTargets: CampaignUnitTarget[];
}

type ArtworkKey = string;

function artworkKey(
  unitTypeId: string,
  posSlotTypeId: string,
  promoId: string | null
): ArtworkKey {
  return `${unitTypeId}|${posSlotTypeId}|${promoId ?? ''}`;
}

export function ArtworkPanel({
  campaignId,
  editable,
  unitTypes,
  posSlotTypes,
  unitPosSlots,
  promoSections,
  artwork,
  unitTargets,
}: Props) {
  const unitTypeById = useMemo(
    () => new Map(unitTypes.map((u) => [u.id, u])),
    [unitTypes]
  );
  const posSlotTypeById = useMemo(
    () => new Map(posSlotTypes.map((p) => [p.id, p])),
    [posSlotTypes]
  );
  const promoById = useMemo(
    () => new Map(promoSections.map((p) => [p.id, p])),
    [promoSections]
  );
  const artworkByKey = useMemo(() => {
    const m = new Map<ArtworkKey, CampaignArtwork>();
    for (const a of artwork) {
      m.set(
        artworkKey(a.unit_type_id, a.pos_slot_type_id, a.target_promo_section_id),
        a
      );
    }
    return m;
  }, [artwork]);

  // Build the grid of (targeted unit type) × (POS slot on that unit type).
  const targetUnitTypeIds = useMemo(
    () => [...new Set(unitTargets.map((t) => t.unit_type_id))],
    [unitTargets]
  );

  if (targetUnitTypeIds.length === 0) {
    return (
      <div
        style={{
          padding: 16,
          background: 'var(--ml-surface-panel)',
          border: '0.5px dashed var(--ml-border-default)',
          borderRadius: 'var(--ml-radius-lg)',
          fontSize: 13,
          color: 'var(--ml-text-muted)',
          textAlign: 'center',
        }}
      >
        Add a unit-type target first — artwork is uploaded per (unit type × POS
        slot).
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {targetUnitTypeIds.map((unitTypeId) => {
        const ut = unitTypeById.get(unitTypeId);
        const slots = unitPosSlots.filter(
          (s) => s.unit_type_id === unitTypeId
        );
        return (
          <div
            key={unitTypeId}
            style={{
              background: 'var(--ml-surface-panel)',
              border: '0.5px solid var(--ml-border-default)',
              borderRadius: 'var(--ml-radius-lg)',
              overflow: 'hidden',
            }}
          >
            <header
              style={{
                padding: '12px 16px',
                borderBottom: '0.5px solid var(--ml-border-default)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--ml-text-primary)',
                }}
              >
                {ut?.display_name ?? unitTypeId}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--ml-text-muted)',
                  fontFamily: 'ui-monospace, Menlo, monospace',
                }}
              >
                {ut?.code}
              </span>
            </header>
            {slots.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  fontSize: 12,
                  color: 'var(--ml-text-muted)',
                }}
              >
                This unit type has no POS slots configured.
              </div>
            ) : (
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                }}
              >
                {dedupeBySlotType(slots).map((slot, i, arr) => {
                  const pst = posSlotTypeById.get(slot.pos_slot_type_id);
                  const existing = artworkByKey.get(
                    artworkKey(unitTypeId, slot.pos_slot_type_id, null)
                  );
                  return (
                    <li
                      key={slot.pos_slot_type_id}
                      style={{
                        borderBottom:
                          i === arr.length - 1
                            ? 'none'
                            : '0.5px solid var(--ml-border-default)',
                      }}
                    >
                      <ArtworkRow
                        campaignId={campaignId}
                        editable={editable}
                        unitTypeId={unitTypeId}
                        posSlotType={pst}
                        existing={existing}
                        promoSections={promoSections}
                        promoById={promoById}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function dedupeBySlotType(slots: UnitPosSlot[]): UnitPosSlot[] {
  const seen = new Set<string>();
  const out: UnitPosSlot[] = [];
  for (const s of slots) {
    if (seen.has(s.pos_slot_type_id)) continue;
    seen.add(s.pos_slot_type_id);
    out.push(s);
  }
  return out;
}

// ---------------------------------------------------------------------------

interface RowProps {
  campaignId: string;
  editable: boolean;
  unitTypeId: string;
  posSlotType: PosSlotType | undefined;
  existing: CampaignArtwork | undefined;
  promoSections: { id: string; display_name: string }[];
  promoById: Map<string, { id: string; display_name: string }>;
}

function ArtworkRow({
  campaignId,
  editable,
  unitTypeId,
  posSlotType,
  existing,
  promoSections,
  promoById,
}: RowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [artworkUrl, setArtworkUrl] = useState(existing?.artwork_url ?? '');
  const [quantity, setQuantity] = useState(existing?.quantity_per_target ?? 1);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [promoSectionId, setPromoSectionId] = useState(
    existing?.target_promo_section_id ?? ''
  );

  async function onUpload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `campaigns/${campaignId}/${Date.now()}-${file.name.replace(
        /[^\w.\-]/g,
        '_'
      )}`;
      const { error: upErr } = await supabase.storage
        .from('campaign-assets')
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) {
        setError(`Upload failed: ${upErr.message}`);
        return;
      }
      // Mint a long-lived signed URL for the stored record. Readers through
      // the storage bucket RLS policy can also request their own — but for
      // the materialised quote payload we stash a signed URL here.
      const { data: signed, error: signErr } = await supabase.storage
        .from('campaign-assets')
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5); // 5 years
      if (signErr || !signed) {
        setError(`Signed URL failed: ${signErr?.message ?? 'unknown'}`);
        return;
      }
      setArtworkUrl(signed.signedUrl);
    } finally {
      setUploading(false);
    }
  }

  function onSave() {
    setError(null);
    if (!posSlotType) return;
    startTransition(async () => {
      const res = await upsertCampaignArtwork({
        campaign_id: campaignId,
        unit_type_id: unitTypeId,
        pos_slot_type_id: posSlotType.id,
        target_promo_section_id: promoSectionId || null,
        artwork_url: artworkUrl.trim() || null,
        quantity_per_target: quantity,
        notes: notes.trim() || null,
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
        padding: '12px 16px',
        display: 'grid',
        gridTemplateColumns: '220px 1fr auto',
        gap: 14,
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--ml-text-primary)',
          }}
        >
          {posSlotType?.display_name ?? 'Unknown slot'}
        </span>
        <span
          style={{
            fontSize: 10,
            color: 'var(--ml-text-muted)',
            fontFamily: 'ui-monospace, Menlo, monospace',
          }}
        >
          {posSlotType
            ? `${posSlotType.width_mm}×${posSlotType.height_mm} mm · ${posSlotType.default_material.toLowerCase()}`
            : ''}
        </span>
        {existing?.target_promo_section_id && (
          <span
            style={{
              fontSize: 10,
              color: 'var(--ml-text-muted)',
            }}
          >
            Promo: {promoById.get(existing.target_promo_section_id)?.display_name}
          </span>
        )}
      </div>

      {editable ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="url"
              placeholder="Artwork URL (PDF/PNG)"
              value={artworkUrl}
              onChange={(e) => setArtworkUrl(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <label style={fileButton}>
              {uploading ? 'Uploading…' : 'Upload'}
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onUpload(f);
                  e.target.value = '';
                }}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '90px 1fr 1fr',
              gap: 6,
            }}
          >
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, Number(e.target.value) || 1))
              }
              title="Qty per target"
              style={inputStyle}
            />
            <select
              value={promoSectionId}
              onChange={(e) => setPromoSectionId(e.target.value)}
              style={inputStyle}
              title="Promo-section-specific artwork (optional)"
            >
              <option value="">Generic (all promo sections)</option>
              {promoSections.map((p) => (
                <option key={p.id} value={p.id}>
                  Only {p.display_name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={inputStyle}
            />
          </div>
          {error && (
            <span
              role="alert"
              style={{ fontSize: 11, color: 'var(--ml-red)' }}
            >
              {error}
            </span>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {existing?.artwork_url ? (
            <a
              href={existing.artwork_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12,
                color: 'var(--ml-red)',
                textDecoration: 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 340,
              }}
            >
              {existing.artwork_url}
            </a>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--ml-text-muted)' }}>
              No artwork uploaded.
            </span>
          )}
          {existing?.notes && (
            <span style={{ fontSize: 11, color: 'var(--ml-text-muted)' }}>
              {existing.notes}
            </span>
          )}
        </div>
      )}

      {editable && (
        <button
          type="button"
          onClick={onSave}
          disabled={isPending || uploading}
          style={saveButton}
        >
          {isPending ? 'Saving…' : existing ? 'Save' : 'Add'}
        </button>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '7px 10px',
  fontFamily: 'inherit',
  fontSize: 12,
  color: 'var(--ml-text-primary)',
  background: 'var(--ml-off-white)',
  border: '1px solid var(--ml-border-default)',
  borderRadius: 'var(--ml-radius-md)',
  minWidth: 0,
};

const fileButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '7px 12px',
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--ml-charcoal)',
  background: 'var(--ml-surface-panel)',
  border: '1px solid var(--ml-border-default)',
  borderRadius: 'var(--ml-radius-md)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const saveButton: React.CSSProperties = {
  padding: '8px 14px',
  background: 'var(--ml-charcoal)',
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: 500,
  border: 'none',
  borderRadius: 'var(--ml-radius-md)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
