'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  closeCampaign,
  publishCampaign,
  type MaterialisationSummary,
} from '@/lib/campaigns/actions';
import type { CampaignStatus } from '@/lib/campaigns/types';

interface Props {
  campaignId: string;
  status: CampaignStatus;
  canPublish: boolean;
  canArchive: boolean;
  matchingCount: number;
  unitTargetCount: number;
  artworkCount: number;
}

export function PublishPanel({
  campaignId,
  canPublish,
  canArchive,
  matchingCount,
  unitTargetCount,
  artworkCount,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<MaterialisationSummary | null>(null);

  const blocked =
    unitTargetCount === 0 || artworkCount === 0 || matchingCount === 0;

  function onPublish() {
    setError(null);
    startTransition(async () => {
      const res = await publishCampaign({ campaign_id: campaignId });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setSummary(res.data);
      router.refresh();
    });
  }

  function onArchive() {
    if (!confirm('Archive this campaign? Rollouts stay in place, but the campaign becomes read-only.')) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await closeCampaign({ campaign_id: campaignId });
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
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ml-text-muted)',
          }}
        >
          Publish
        </span>
        <span style={{ fontSize: 13, color: 'var(--ml-text-muted)' }}>
          Generates rollouts, install tasks and Onesign quotes for every
          matching site.
        </span>
      </div>

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
        <Checklist label="Unit targets" value={unitTargetCount} required />
        <Checklist label="Artwork uploaded" value={artworkCount} required />
        <Checklist label="Matching sites" value={matchingCount} required />
      </ul>

      {canPublish && (
        <button
          type="button"
          onClick={onPublish}
          disabled={isPending || blocked}
          style={{
            ...publishButton,
            opacity: blocked ? 0.5 : 1,
            cursor: blocked ? 'not-allowed' : 'pointer',
          }}
          title={
            blocked
              ? 'Add at least one unit target, one artwork and make sure at least one site matches.'
              : undefined
          }
        >
          {isPending ? 'Publishing…' : 'Publish campaign'}
        </button>
      )}

      {canArchive && (
        <button
          type="button"
          onClick={onArchive}
          disabled={isPending}
          style={archiveButton}
        >
          {isPending ? 'Archiving…' : 'Archive campaign'}
        </button>
      )}

      {error && (
        <div role="alert" style={errorBanner}>
          {error}
        </div>
      )}

      {summary && (
        <div
          role="status"
          style={{
            background: 'rgba(133, 183, 235, 0.08)',
            border: '1px solid rgba(133, 183, 235, 0.35)',
            borderRadius: 'var(--ml-radius-md)',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            fontSize: 12,
          }}
        >
          <span style={{ fontWeight: 500, color: '#1F5FA8' }}>
            Published — {summary.rollouts_created} rollouts,{' '}
            {summary.tasks_created} tasks, {summary.quotes_created} quotes.
          </span>
          {summary.warnings.length > 0 && (
            <ul
              style={{
                listStyle: 'disc',
                margin: 0,
                paddingLeft: 18,
                color: 'var(--ml-red)',
              }}
            >
              {summary.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Checklist({
  label,
  value,
  required,
}: {
  label: string;
  value: number;
  required?: boolean;
}) {
  const ok = value > 0;
  return (
    <li
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        fontSize: 12,
      }}
    >
      <span style={{ color: 'var(--ml-text-primary)' }}>
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: 14,
            textAlign: 'center',
            marginRight: 6,
            color: ok ? '#1F7A3B' : required ? 'var(--ml-red)' : 'var(--ml-text-muted)',
          }}
        >
          {ok ? '✓' : required ? '!' : '·'}
        </span>
        {label}
      </span>
      <span
        style={{
          color: 'var(--ml-text-muted)',
          fontFamily: 'ui-monospace, Menlo, monospace',
        }}
      >
        {value}
      </span>
    </li>
  );
}

const publishButton: React.CSSProperties = {
  padding: '11px 16px',
  background: 'var(--ml-red)',
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: 500,
  border: 'none',
  borderRadius: 'var(--ml-radius-md)',
  cursor: 'pointer',
};

const archiveButton: React.CSSProperties = {
  padding: '9px 16px',
  background: 'transparent',
  color: 'var(--ml-charcoal)',
  fontSize: 12,
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
