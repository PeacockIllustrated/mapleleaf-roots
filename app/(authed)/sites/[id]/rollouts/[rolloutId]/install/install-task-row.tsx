'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { markTaskDone, markTaskProblem } from '@/lib/campaigns/actions';
import type { TaskProblemReason, TaskStatus } from '@/lib/campaigns/types';

interface TaskView {
  id: string;
  task_order: number;
  status: TaskStatus;
  pos_position_label: string | null;
  photo_url: string | null;
  problem_reason: string | null;
  problem_notes: string | null;
  unit_label: string;
  unit_type: string;
  pos_slot: string;
  pos_dimensions: string | null;
  artwork_url: string | null;
  artwork_notes: string | null;
  quantity: number;
}

interface Props {
  siteId: string;
  task: TaskView;
}

const problemReasons: { value: TaskProblemReason; label: string }[] = [
  { value: 'ARTWORK_DAMAGED', label: 'Artwork damaged' },
  { value: 'ARTWORK_MISSING', label: 'Artwork missing from pack' },
  { value: 'WRONG_SIZE', label: 'Wrong size' },
  { value: 'MOUNT_FAILED', label: 'Mount failed' },
  { value: 'SITE_CLOSED', label: 'Site closed' },
  { value: 'OTHER', label: 'Other' },
];

export function InstallTaskRow({ siteId, task }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProblem, setShowProblem] = useState(false);
  const [problemReason, setProblemReason] =
    useState<TaskProblemReason>('ARTWORK_DAMAGED');
  const [problemNotes, setProblemNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const isDone = task.status === 'DONE';
  const isProblem = task.status === 'PROBLEM';

  async function uploadProof(file: File): Promise<string | null> {
    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `proofs/${siteId}/${task.id}-${Date.now()}-${file.name.replace(
        /[^\w.\-]/g,
        '_'
      )}`;
      const { error: upErr } = await supabase.storage
        .from('campaign-assets')
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) {
        setError(`Upload failed: ${upErr.message}`);
        return null;
      }
      const { data: signed, error: signErr } = await supabase.storage
        .from('campaign-assets')
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr || !signed) {
        setError(`Signed URL failed: ${signErr?.message ?? 'unknown'}`);
        return null;
      }
      return signed.signedUrl;
    } finally {
      setUploading(false);
    }
  }

  function onMarkDone(withPhotoUrl: string | null) {
    setError(null);
    startTransition(async () => {
      const res = await markTaskDone({
        task_id: task.id,
        photo_url: withPhotoUrl,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.refresh();
    });
  }

  async function onPhotoPickedThenDone(file: File) {
    const url = await uploadProof(file);
    if (url) {
      setPhotoUrl(url);
      onMarkDone(url);
    }
  }

  function onSubmitProblem(photoUrl: string | null) {
    setError(null);
    startTransition(async () => {
      const res = await markTaskProblem({
        task_id: task.id,
        reason: problemReason,
        notes: problemNotes.trim() || null,
        photo_url: photoUrl,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setShowProblem(false);
      router.refresh();
    });
  }

  async function onProblemPhotoPicked(file: File) {
    const url = await uploadProof(file);
    if (url) {
      setPhotoUrl(url);
      onSubmitProblem(url);
    }
  }

  return (
    <article
      style={{
        background: 'var(--ml-surface-panel)',
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-lg)',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        borderLeft: isDone
          ? '4px solid var(--ml-red)'
          : isProblem
            ? '4px solid var(--ml-red)'
            : '4px solid transparent',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 14,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <span
            style={{
              fontSize: 11,
              color: 'var(--ml-text-muted)',
              fontFamily: 'ui-monospace, Menlo, monospace',
              letterSpacing: '0.04em',
            }}
          >
            Task #{task.task_order} · {task.unit_label}
          </span>
          <span
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--ml-text-primary)',
            }}
          >
            {task.pos_slot}
            {task.pos_position_label && (
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--ml-text-muted)',
                  fontWeight: 400,
                  marginLeft: 6,
                }}
              >
                · {task.pos_position_label}
              </span>
            )}
          </span>
          <span style={{ fontSize: 12, color: 'var(--ml-text-muted)' }}>
            {task.unit_type}
            {task.pos_dimensions && ` · ${task.pos_dimensions}`}
            {task.quantity > 1 && ` · ${task.quantity}×`}
          </span>
          {task.artwork_notes && (
            <span
              style={{
                fontSize: 12,
                color: 'var(--ml-text-primary)',
                background: 'var(--ml-surface-muted)',
                padding: '6px 10px',
                borderRadius: 'var(--ml-radius-md)',
                marginTop: 2,
              }}
            >
              {task.artwork_notes}
            </span>
          )}
        </div>
        <StatusBadge status={task.status} />
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {task.artwork_url && (
          <a
            href={task.artwork_url}
            target="_blank"
            rel="noopener noreferrer"
            style={secondaryButton}
          >
            View artwork
          </a>
        )}
        {(task.photo_url || photoUrl) && (
          <a
            href={task.photo_url ?? photoUrl ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...secondaryButton, color: 'var(--ml-red)' }}
          >
            View install photo
          </a>
        )}
      </div>

      {isProblem && task.problem_reason && (
        <div
          role="status"
          style={{
            background: 'rgba(225, 40, 40, 0.06)',
            border: '1px solid rgba(225, 40, 40, 0.35)',
            borderRadius: 'var(--ml-radius-md)',
            padding: 10,
            fontSize: 12,
            color: 'var(--ml-red)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span style={{ fontWeight: 500 }}>
            {task.problem_reason.replace(/_/g, ' ').toLowerCase()}
          </span>
          {task.problem_notes && <span>{task.problem_notes}</span>}
        </div>
      )}

      {!isDone && !isProblem && (
        <>
          {!showProblem ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <label style={{ ...primaryButton, position: 'relative' }}>
                {uploading
                  ? 'Uploading…'
                  : isPending
                    ? 'Saving…'
                    : 'Mark done with photo'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  capture="environment"
                  disabled={uploading || isPending}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onPhotoPickedThenDone(f);
                    e.target.value = '';
                  }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => onMarkDone(null)}
                disabled={uploading || isPending}
                style={ghostButton}
                title="Mark done without a photo — do this only if a photo isn't possible."
              >
                No photo
              </button>
              <button
                type="button"
                onClick={() => setShowProblem(true)}
                disabled={uploading || isPending}
                style={{ ...ghostButton, marginLeft: 'auto' }}
              >
                Report a problem
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                padding: 12,
                background: 'var(--ml-off-white)',
                border: '0.5px solid var(--ml-border-default)',
                borderRadius: 'var(--ml-radius-md)',
              }}
            >
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
                  What’s wrong?
                </span>
                <select
                  value={problemReason}
                  onChange={(e) =>
                    setProblemReason(e.target.value as TaskProblemReason)
                  }
                  style={inputStyle}
                >
                  {problemReasons.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
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
                  Notes (optional)
                </span>
                <textarea
                  rows={2}
                  value={problemNotes}
                  onChange={(e) => setProblemNotes(e.target.value)}
                  placeholder="Anything useful for HQ…"
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <label style={{ ...primaryButton, position: 'relative' }}>
                  {uploading
                    ? 'Uploading…'
                    : isPending
                      ? 'Saving…'
                      : 'Submit with photo'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    capture="environment"
                    disabled={uploading || isPending}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void onProblemPhotoPicked(f);
                      e.target.value = '';
                    }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      cursor: 'pointer',
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onSubmitProblem(null)}
                  disabled={uploading || isPending}
                  style={ghostButton}
                >
                  No photo
                </button>
                <button
                  type="button"
                  onClick={() => setShowProblem(false)}
                  disabled={uploading || isPending}
                  style={{ ...ghostButton, marginLeft: 'auto' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {error && (
        <div role="alert" style={errorBanner}>
          {error}
        </div>
      )}
    </article>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const labels: Record<TaskStatus, string> = {
    PENDING: 'To do',
    IN_PROGRESS: 'In progress',
    DONE: 'Done',
    PROBLEM: 'Problem',
    SKIPPED: 'Skipped',
  };
  const tone =
    status === 'DONE'
      ? { bg: 'var(--ml-red)', fg: '#FFFFFF' }
      : status === 'PROBLEM'
        ? { bg: 'rgba(225, 40, 40, 0.1)', fg: 'var(--ml-red)' }
        : status === 'IN_PROGRESS'
          ? { bg: 'var(--ml-charcoal)', fg: '#FFFFFF' }
          : { bg: 'var(--ml-surface-muted)', fg: 'var(--ml-charcoal)' };
  return (
    <span
      style={{
        padding: '5px 12px',
        fontSize: 10,
        fontWeight: 500,
        borderRadius: 9999,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        background: tone.bg,
        color: tone.fg,
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      {labels[status]}
    </span>
  );
}

const primaryButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '9px 16px',
  background: 'var(--ml-red)',
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: 500,
  border: 'none',
  borderRadius: 'var(--ml-radius-md)',
  cursor: 'pointer',
};

const secondaryButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '8px 14px',
  background: 'var(--ml-off-white)',
  color: 'var(--ml-charcoal)',
  fontSize: 12,
  fontWeight: 500,
  border: '1px solid var(--ml-border-default)',
  borderRadius: 'var(--ml-radius-md)',
  textDecoration: 'none',
};

const ghostButton: React.CSSProperties = {
  padding: '8px 14px',
  background: 'transparent',
  color: 'var(--ml-charcoal)',
  fontSize: 12,
  fontWeight: 500,
  border: '1px solid var(--ml-border-default)',
  borderRadius: 'var(--ml-radius-md)',
  cursor: 'pointer',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  fontFamily: 'inherit',
  fontSize: 13,
  color: 'var(--ml-text-primary)',
  background: 'var(--ml-off-white)',
  border: '1px solid var(--ml-border-default)',
  borderRadius: 'var(--ml-radius-md)',
};

const errorBanner: React.CSSProperties = {
  padding: 10,
  background: 'rgba(225, 40, 40, 0.06)',
  border: '1px solid rgba(225, 40, 40, 0.35)',
  borderRadius: 'var(--ml-radius-md)',
  fontSize: 12,
  color: 'var(--ml-red)',
};
