'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  setPosArtwork,
  clearPosArtwork,
} from '@/lib/pos/actions';
import type { UnitPosSlot } from '@/lib/shelf/types';

export interface PosArtworkAssignment {
  unit_type_pos_slot_id: string;
  artwork_url: string | null;
  notes: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  siteId: string;
  unitId: string;
  siteUnitId: string;
  posSlot: UnitPosSlot | null;
  existing: PosArtworkAssignment | null;
  canEdit: boolean;
}

export function PosArtworkDialog({
  open,
  onClose,
  siteId,
  unitId,
  siteUnitId,
  posSlot,
  existing,
  canEdit,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setUrl(existing?.artwork_url ?? '');
      setNotes(existing?.notes ?? '');
      setError(null);
    }
  }, [open, existing?.artwork_url, existing?.notes]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !posSlot) return null;

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await setPosArtwork({
        siteId,
        unitId,
        siteUnitId,
        unitTypePosSlotId: posSlot!.id,
        artworkUrl: url.trim() || null,
        notes: notes.trim() || null,
      });
      if (res.ok) {
        onClose();
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  }

  function clear() {
    setError(null);
    startTransition(async () => {
      const res = await clearPosArtwork({
        siteId,
        unitId,
        siteUnitId,
        unitTypePosSlotId: posSlot!.id,
      });
      if (res.ok) {
        onClose();
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(65, 64, 66, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 85,
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--ml-surface-panel)',
          border: '0.5px solid var(--ml-border-default)',
          borderRadius: 'var(--ml-radius-lg)',
          width: '100%',
          maxWidth: 460,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(65, 64, 66, 0.3)',
        }}
      >
        <header
          style={{
            padding: '18px 20px',
            borderBottom: '0.5px solid var(--ml-border-default)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--ml-text-muted)',
            }}
          >
            {posSlot.position_label ?? posSlot.pos_slot_type.code}
          </span>
          <h2
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 500,
              color: 'var(--ml-text-primary)',
            }}
          >
            POS artwork for {posSlot.pos_slot_type.display_name}
          </h2>
          <span
            style={{
              marginTop: 4,
              fontSize: 11,
              fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
              color: 'var(--ml-text-muted)',
            }}
          >
            {posSlot.pos_slot_type.width_mm}×
            {posSlot.pos_slot_type.height_mm} mm ·{' '}
            {posSlot.pos_slot_type.default_material
              .toLowerCase()
              .replace(/_/g, ' ')}
          </span>
        </header>

        <div
          style={{
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.04em',
                color: 'var(--ml-text-primary)',
              }}
            >
              Artwork URL
            </span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={!canEdit || isPending}
              placeholder="https://drive.example.com/shelf-strip.pdf"
              style={inputStyle}
            />
            <span style={hintStyle}>
              Drop a link to the final print-ready file when ready. Leave
              blank if you're still briefing.
            </span>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.04em',
                color: 'var(--ml-text-primary)',
              }}
            >
              Notes for the brief
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!canEdit || isPending}
              placeholder="e.g. Reuse Summer BBQ 2026 brand guidelines, 4-colour offset."
              rows={4}
              style={{ ...inputStyle, height: 'auto', padding: 10 }}
            />
          </label>

          {error && (
            <div
              role="alert"
              style={{
                padding: 10,
                background: 'rgba(225, 40, 40, 0.06)',
                border: '1px solid rgba(225, 40, 40, 0.35)',
                borderRadius: 'var(--ml-radius-md)',
                fontSize: 12,
                color: 'var(--ml-red)',
              }}
            >
              {error}
            </div>
          )}
        </div>

        <footer
          style={{
            padding: '10px 16px',
            borderTop: '0.5px solid var(--ml-border-default)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          {existing && canEdit ? (
            <button
              type="button"
              onClick={clear}
              disabled={isPending}
              style={clearButton}
            >
              Remove
            </button>
          ) : (
            <span />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              style={outlineButton}
            >
              Cancel
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={save}
                disabled={isPending}
                style={primaryButton}
              >
                {isPending ? 'Saving…' : 'Save artwork'}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 38,
  padding: '0 12px',
  border: '1px solid var(--ml-border-default)',
  borderRadius: 'var(--ml-radius-md)',
  background: 'var(--ml-off-white)',
  fontSize: 13,
  fontFamily: 'inherit',
  color: 'var(--ml-text-primary)',
};

const hintStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'var(--ml-text-muted)',
};

const outlineButton: React.CSSProperties = {
  height: 34,
  padding: '0 14px',
  background: 'transparent',
  color: 'var(--ml-charcoal)',
  border: '1px solid var(--ml-charcoal)',
  borderRadius: 'var(--ml-radius-md)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};

const primaryButton: React.CSSProperties = {
  height: 34,
  padding: '0 16px',
  background: 'var(--ml-action-primary)',
  color: '#FFFFFF',
  border: 0,
  borderRadius: 'var(--ml-radius-md)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};

const clearButton: React.CSSProperties = {
  height: 34,
  padding: '0 14px',
  background: 'transparent',
  color: 'var(--ml-red)',
  border: 0,
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  textDecoration: 'underline',
};
