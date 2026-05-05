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
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--ml-text-primary)',
            }}
          >
            {posSlotType?.display_name ?? 'Unknown slot'}
          </span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--ml-text-muted)',
              fontFamily: 'ui-monospace, Menlo, monospace',
            }}
          >
            {posSlotType
              ? `${posSlotType.width_mm}×${posSlotType.height_mm} mm · ${posSlotType.default_material
                  .toLowerCase()
                  .replace(/_/g, ' ')}`
              : ''}
          </span>
          {existing?.target_promo_section_id && (
            <span
              style={{
                marginTop: 2,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--ml-charcoal)',
                background: 'var(--ml-surface-muted)',
                padding: '2px 8px',
                borderRadius: 9999,
                width: 'fit-content',
              }}
            >
              Only {promoById.get(existing.target_promo_section_id)?.display_name}
            </span>
          )}
        </div>
        {editable && (
          <button
            type="button"
            onClick={onSave}
            disabled={isPending || uploading}
            style={saveButton}
          >
            {isPending ? 'Saving…' : existing ? 'Save changes' : 'Add'}
          </button>
        )}
      </header>

      {/* Hero artwork preview */}
      {artworkUrl ? (
        <ArtworkHero
          url={artworkUrl}
          aspect={
            posSlotType
              ? `${posSlotType.width_mm} / ${posSlotType.height_mm}`
              : '16 / 9'
          }
          editable={editable}
          uploading={uploading}
          onReplace={onUpload}
          onClear={() => setArtworkUrl('')}
        />
      ) : editable ? (
        <UploadDropzone onFile={onUpload} uploading={uploading} />
      ) : (
        <div
          style={{
            padding: '24px 16px',
            background: 'var(--ml-surface-muted)',
            borderRadius: 'var(--ml-radius-md)',
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--ml-text-muted)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          No artwork uploaded yet.
        </div>
      )}

      {editable ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '90px 1fr 1.4fr',
            gap: 8,
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
      ) : (
        existing?.notes && (
          <span style={{ fontSize: 12, color: 'var(--ml-text-muted)' }}>
            {existing.notes}
          </span>
        )
      )}

      {error && (
        <span
          role="alert"
          style={{ fontSize: 11, color: 'var(--ml-red)' }}
        >
          {error}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

/**
 * ArtworkHero — large, true-to-aspect-ratio preview of the uploaded artwork.
 * Hovering reveals Replace / Remove actions when editable.
 */
function ArtworkHero({
  url,
  aspect,
  editable,
  uploading,
  onReplace,
  onClear,
}: {
  url: string;
  aspect: string;
  editable: boolean;
  uploading: boolean;
  onReplace: (file: File) => void | Promise<void>;
  onClear: () => void;
}) {
  const isPdf = /\.pdf(\?|$)/i.test(url);
  return (
    <div
      style={{
        position: 'relative',
        background:
          'repeating-linear-gradient(45deg, var(--ml-off-white) 0 8px, var(--ml-surface-muted) 8px 16px)',
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-md)',
        overflow: 'hidden',
        minHeight: 140,
      }}
    >
      <div
        style={{
          aspectRatio: aspect,
          maxHeight: 360,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        {isPdf ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: 'var(--ml-surface-panel)',
              border: '0.5px solid var(--ml-border-default)',
              borderRadius: 'var(--ml-radius-md)',
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--ml-charcoal)',
              }}
            >
              PDF
            </span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11, color: 'var(--ml-red)', textDecoration: 'none' }}
            >
              Open in new tab →
            </a>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              borderRadius: 4,
              background: 'var(--ml-cream, #F7F5F0)',
            }}
          />
        )}
      </div>
      {editable && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 6,
          }}
        >
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={ghostPillButton}
            onClick={(e) => e.stopPropagation()}
          >
            Open
          </a>
          <label style={pillButton}>
            {uploading ? 'Uploading…' : 'Replace'}
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp,image/svg+xml"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onReplace(f);
                e.target.value = '';
              }}
              style={{ display: 'none' }}
            />
          </label>
          <button
            type="button"
            onClick={onClear}
            disabled={uploading}
            style={ghostPillButton}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function UploadDropzone({
  onFile,
  uploading,
}: {
  onFile: (file: File) => void | Promise<void>;
  uploading: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void onFile(file);
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '14px 16px',
        minHeight: 72,
        background: dragOver
          ? 'rgba(225, 40, 40, 0.04)'
          : 'var(--ml-off-white)',
        border: dragOver
          ? '1px dashed var(--ml-red)'
          : '1px dashed var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-md)',
        cursor: uploading ? 'wait' : 'pointer',
        transition:
          'background var(--ml-motion-fast) var(--ml-ease-out), border-color var(--ml-motion-fast) var(--ml-ease-out)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'var(--ml-surface-muted)',
          color: 'var(--ml-charcoal)',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {uploading ? '…' : '+'}
      </span>
      <span
        style={{
          fontSize: 12,
          color: 'var(--ml-text-primary)',
          lineHeight: 1.35,
        }}
      >
        {uploading ? (
          'Uploading…'
        ) : (
          <>
            <span style={{ fontWeight: 500 }}>Click to upload</span>{' '}
            <span style={{ color: 'var(--ml-text-muted)' }}>
              or drop a PDF / PNG / JPG here
            </span>
          </>
        )}
      </span>
      <input
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        disabled={uploading}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = '';
        }}
        style={{ display: 'none' }}
      />
    </label>
  );
}

// ---------------------------------------------------------------------------

const pillButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '5px 11px',
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--ml-charcoal)',
  background: 'rgba(255, 255, 255, 0.92)',
  border: '0.5px solid var(--ml-border-default)',
  borderRadius: 9999,
  textDecoration: 'none',
  cursor: 'pointer',
  backdropFilter: 'blur(4px)',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
};

const ghostPillButton: React.CSSProperties = {
  ...pillButton,
  color: 'var(--ml-text-muted)',
};

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
