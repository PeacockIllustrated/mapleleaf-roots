import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import type { CampaignStatus, CampaignScope } from '@/lib/campaigns/types';

type Row = {
  id: string;
  code: string;
  name: string;
  status: CampaignStatus;
  scope: CampaignScope;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

const statusLabels: Record<CampaignStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  SCHEDULED: 'Scheduled',
  LIVE: 'Live',
  ARCHIVED: 'Archived',
  REJECTED: 'Rejected',
};

const statusTone: Record<CampaignStatus, { bg: string; fg: string }> = {
  DRAFT: { bg: 'var(--ml-surface-muted)', fg: 'var(--ml-charcoal)' },
  SUBMITTED: { bg: 'rgba(133, 183, 235, 0.2)', fg: '#1F5FA8' },
  APPROVED: { bg: 'rgba(133, 183, 235, 0.2)', fg: '#1F5FA8' },
  SCHEDULED: { bg: 'var(--ml-charcoal)', fg: '#FFFFFF' },
  LIVE: { bg: 'var(--ml-red)', fg: '#FFFFFF' },
  ARCHIVED: { bg: 'var(--ml-surface-muted)', fg: 'var(--ml-text-muted)' },
  REJECTED: {
    bg: 'rgba(225, 40, 40, 0.08)',
    fg: 'var(--ml-red)',
  },
};

const statusGroups: { label: string; statuses: CampaignStatus[] }[] = [
  { label: 'In flight', statuses: ['DRAFT', 'SUBMITTED', 'APPROVED'] },
  { label: 'Rolled out', statuses: ['SCHEDULED', 'LIVE'] },
  { label: 'Closed', statuses: ['ARCHIVED', 'REJECTED'] },
];

export default async function CampaignsListPage() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, code, name, status, scope, starts_at, ends_at, created_at')
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as Row[];

  const byGroup = new Map<string, Row[]>();
  for (const g of statusGroups) byGroup.set(g.label, []);
  for (const r of rows) {
    for (const g of statusGroups) {
      if (g.statuses.includes(r.status)) {
        byGroup.get(g.label)?.push(r);
        break;
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: 'var(--ml-text-primary)',
            }}
          >
            Campaigns
          </h1>
          <p
            style={{ margin: 0, fontSize: 13, color: 'var(--ml-text-muted)' }}
          >
            Author promotional campaigns, upload artwork and publish to the
            matching sites.
          </p>
        </div>
        <Link href="/admin/campaigns/new" style={primaryButton}>
          New campaign
        </Link>
      </header>

      {error && (
        <div role="alert" style={errorBanner}>
          Couldn’t load campaigns: {error.message}
        </div>
      )}

      {rows.length === 0 && !error && (
        <EmptyState />
      )}

      {statusGroups.map((g) => {
        const groupRows = byGroup.get(g.label) ?? [];
        if (groupRows.length === 0) return null;
        return (
          <section
            key={g.label}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--ml-text-muted)',
                }}
              >
                {g.label}
              </h2>
              <span style={{ fontSize: 12, color: 'var(--ml-text-muted)' }}>
                {groupRows.length}{' '}
                {groupRows.length === 1 ? 'campaign' : 'campaigns'}
              </span>
            </div>

            <div
              style={{
                background: 'var(--ml-surface-panel)',
                border: '0.5px solid var(--ml-border-default)',
                borderRadius: 'var(--ml-radius-lg)',
                overflow: 'hidden',
              }}
            >
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {groupRows.map((r, i) => (
                  <li
                    key={r.id}
                    style={{
                      borderBottom:
                        i === groupRows.length - 1
                          ? 'none'
                          : '0.5px solid var(--ml-border-default)',
                    }}
                  >
                    <Link
                      href={`/admin/campaigns/${r.id}`}
                      style={rowLink}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: 'var(--ml-text-primary)',
                          }}
                        >
                          {r.name}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--ml-text-muted)',
                            fontFamily:
                              'ui-monospace, "SFMono-Regular", Menlo, monospace',
                          }}
                        >
                          {r.code} · {r.scope.toLowerCase()}
                          {r.starts_at &&
                            ` · ${formatDate(r.starts_at)}${
                              r.ends_at ? ` → ${formatDate(r.ends_at)}` : ''
                            }`}
                        </span>
                      </div>
                      <StatusPill status={r.status} />
                      <span
                        aria-hidden="true"
                        style={{ fontSize: 18, color: 'var(--ml-text-muted)' }}
                      >
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function StatusPill({ status }: { status: CampaignStatus }) {
  const tone = statusTone[status];
  return (
    <span
      style={{
        padding: '4px 10px',
        fontSize: 10,
        fontWeight: 500,
        borderRadius: 9999,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        background: tone.bg,
        color: tone.fg,
        flexShrink: 0,
      }}
    >
      {statusLabels[status]}
    </span>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        padding: '40px 28px',
        background: 'var(--ml-surface-panel)',
        border: '0.5px dashed var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-lg)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <span style={{ fontSize: 15, color: 'var(--ml-text-primary)' }}>
        No campaigns yet.
      </span>
      <span style={{ fontSize: 13, color: 'var(--ml-text-muted)' }}>
        Start your first campaign — target unit types, upload artwork, and
        publish when ready.
      </span>
      <div>
        <Link href="/admin/campaigns/new" style={primaryButton}>
          Create a campaign
        </Link>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const primaryButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '9px 16px',
  background: 'var(--ml-red)',
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: '0.01em',
  textDecoration: 'none',
  borderRadius: 'var(--ml-radius-md)',
  transition: 'background var(--ml-motion-fast) var(--ml-ease-out)',
};

const rowLink: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto auto',
  alignItems: 'center',
  gap: 16,
  padding: '14px 20px',
  textDecoration: 'none',
  color: 'inherit',
};

const errorBanner: React.CSSProperties = {
  padding: 12,
  background: 'rgba(225, 40, 40, 0.06)',
  border: '1px solid rgba(225, 40, 40, 0.35)',
  borderRadius: 'var(--ml-radius-md)',
  fontSize: 13,
  color: 'var(--ml-red)',
};
