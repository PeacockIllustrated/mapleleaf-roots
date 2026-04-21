'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  reportPosIssue,
  requestPosRedelivery,
} from '@/lib/pos/actions';
import type { UnitPosSlot } from '@/lib/shelf/types';

export interface PosIssue {
  id: string;
  unit_type_pos_slot_id: string;
  reason: string;
  notes: string | null;
  status: string;
  reported_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  siteId: string;
  unitId: string;
  siteUnitId: string;
  posSlots: UnitPosSlot[];
  existingIssues: PosIssue[];
  canRequestRedelivery: boolean;
}

const reasons = [
  { value: 'MISSING', label: 'Missing' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'WRONG_SIZE', label: 'Wrong size' },
  { value: 'WRONG_ARTWORK', label: 'Wrong artwork' },
  { value: 'OTHER', label: 'Other' },
] as const;

type ReasonValue = (typeof reasons)[number]['value'];

/**
 * POS issues dialog.
 *
 * Lists every POS position on this unit, surfaces open issues, and lets
 * the user flag a new one (MISSING / DAMAGED / WRONG_SIZE / WRONG_ARTWORK /
 * OTHER) with optional notes. A "Request redelivery" action at the bottom
 * rolls all open issues into a single ADDITIONAL_SIGNAGE quote.
 */
export function PosIssuesDialog({
  open,
  onClose,
  siteId,
  unitId,
  siteUnitId,
  posSlots,
  existingIssues,
  canRequestRedelivery,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [draftReason, setDraftReason] = useState<ReasonValue>('MISSING');
  const [draftNotes, setDraftNotes] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setActiveSlot(null);
      setDraftReason('MISSING');
      setDraftNotes('');
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const issuesByPos = new Map<string, PosIssue[]>();
  for (const i of existingIssues) {
    const arr = issuesByPos.get(i.unit_type_pos_slot_id) ?? [];
    arr.push(i);
    issuesByPos.set(i.unit_type_pos_slot_id, arr);
  }
  const openIssueCount = existingIssues.filter(
    (i) => i.status === 'REPORTED' || i.status === 'ACKNOWLEDGED'
  ).length;

  function submitFlag(slotId: string) {
    setError(null);
    startTransition(async () => {
      const res = await reportPosIssue({
        siteId,
        unitId,
        siteUnitId,
        unitTypePosSlotId: slotId,
        reason: draftReason,
        notes: draftNotes.trim() || null,
      });
      if (res.ok) {
        setActiveSlot(null);
        setDraftNotes('');
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  }

  function submitRedelivery() {
    setError(null);
    startTransition(async () => {
      const res = await requestPosRedelivery({ siteId });
      if (res.ok) {
        router.push(`/sites/${siteId}/quotes/${res.data.quoteRef}`);
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
        zIndex: 80,
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
          maxWidth: 560,
          maxHeight: 'calc(100vh - 48px)',
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
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--ml-text-muted)',
              }}
            >
              POS material issues
            </span>
            <h2
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 500,
                color: 'var(--ml-text-primary)',
              }}
            >
              Flag missing or damaged POS
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 0,
              fontSize: 13,
              color: 'var(--ml-text-muted)',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </header>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            background: 'var(--ml-off-white)',
          }}
        >
          {posSlots.length === 0 && (
            <div
              style={{
                padding: 20,
                fontSize: 13,
                color: 'var(--ml-text-muted)',
                textAlign: 'center',
              }}
            >
              This unit type has no POS positions defined.
            </div>
          )}

          {posSlots.map((slot) => {
            const issues = issuesByPos.get(slot.id) ?? [];
            const openIssues = issues.filter(
              (i) => i.status === 'REPORTED' || i.status === 'ACKNOWLEDGED'
            );
            const isFlagging = activeSlot === slot.id;

            return (
              <div
                key={slot.id}
                style={{
                  padding: 12,
                  background: 'var(--ml-surface-panel)',
                  border: '0.5px solid var(--ml-border-default)',
                  borderRadius: 'var(--ml-radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
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
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--ml-text-primary)',
                      }}
                    >
                      {slot.pos_slot_type.display_name}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--ml-text-muted)',
                      }}
                    >
                      {slot.position_label ?? '—'} ·{' '}
                      {slot.pos_slot_type.width_mm}×
                      {slot.pos_slot_type.height_mm} mm ·{' '}
                      {slot.pos_slot_type.default_material
                        .toLowerCase()
                        .replace(/_/g, ' ')}
                    </span>
                  </div>
                  {openIssues.length > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: 9999,
                        background: 'rgba(225, 40, 40, 0.12)',
                        color: 'var(--ml-red)',
                      }}
                    >
                      {openIssues.length} open
                    </span>
                  )}
                </div>

                {openIssues.map((iss) => (
                  <div
                    key={iss.id}
                    style={{
                      padding: '6px 10px',
                      background: 'var(--ml-off-white)',
                      borderRadius: 'var(--ml-radius-sm)',
                      fontSize: 12,
                      color: 'var(--ml-text-primary)',
                    }}
                  >
                    <strong
                      style={{
                        textTransform: 'capitalize',
                        color: 'var(--ml-red)',
                      }}
                    >
                      {iss.reason.toLowerCase().replace(/_/g, ' ')}
                    </strong>
                    {iss.notes ? ` — ${iss.notes}` : ''}
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 10,
                        color: 'var(--ml-text-muted)',
                      }}
                    >
                      ·{' '}
                      {new Date(iss.reported_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      · {iss.status.toLowerCase().replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}

                {!isFlagging ? (
                  <button
                    type="button"
                    onClick={() => setActiveSlot(slot.id)}
                    style={{
                      alignSelf: 'flex-start',
                      background: 'transparent',
                      border: 0,
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--ml-charcoal)',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Flag an issue
                  </button>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      padding: 10,
                      background: 'var(--ml-off-white)',
                      borderRadius: 'var(--ml-radius-sm)',
                    }}
                  >
                    <select
                      value={draftReason}
                      onChange={(e) =>
                        setDraftReason(e.target.value as ReasonValue)
                      }
                      disabled={isPending}
                      style={fieldInput}
                    >
                      {reasons.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <textarea
                      placeholder="Optional notes"
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      disabled={isPending}
                      rows={2}
                      style={{ ...fieldInput, height: 'auto', padding: 8 }}
                    />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setActiveSlot(null)}
                        disabled={isPending}
                        style={outlineButton}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => submitFlag(slot.id)}
                        disabled={isPending}
                        style={primaryButton}
                      >
                        {isPending ? 'Flagging…' : 'Flag issue'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: '8px 14px',
              background: 'rgba(225, 40, 40, 0.06)',
              borderTop: '1px solid rgba(225, 40, 40, 0.35)',
              fontSize: 12,
              color: 'var(--ml-red)',
            }}
          >
            {error}
          </div>
        )}

        <footer
          style={{
            padding: '10px 20px',
            borderTop: '0.5px solid var(--ml-border-default)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--ml-text-muted)' }}>
            {openIssueCount} open issue{openIssueCount === 1 ? '' : 's'} on
            this unit. Esc to close.
          </span>
          {canRequestRedelivery && (
            <button
              type="button"
              onClick={submitRedelivery}
              disabled={isPending || openIssueCount === 0}
              style={{
                ...primaryButton,
                opacity: openIssueCount === 0 ? 0.5 : 1,
                cursor: openIssueCount === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Request redelivery
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

const fieldInput: React.CSSProperties = {
  height: 36,
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
