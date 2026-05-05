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
  description: string | null;
  created_at: string;
};

type ArtworkRow = {
  campaign_id: string;
  artwork_url: string | null;
  pos_slot_types: { width_mm: number; height_mm: number } | null;
};

type TargetCount = {
  campaign_id: string;
  count: number;
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

const statusTone: Record<CampaignStatus, { bg: string; fg: string; ring: string }> = {
  DRAFT: {
    bg: 'var(--ml-surface-muted)',
    fg: 'var(--ml-charcoal)',
    ring: 'var(--ml-border-default)',
  },
  SUBMITTED: {
    bg: 'rgba(133, 183, 235, 0.2)',
    fg: '#1F5FA8',
    ring: 'rgba(133, 183, 235, 0.4)',
  },
  APPROVED: {
    bg: 'rgba(133, 183, 235, 0.2)',
    fg: '#1F5FA8',
    ring: 'rgba(133, 183, 235, 0.4)',
  },
  SCHEDULED: {
    bg: 'var(--ml-charcoal)',
    fg: '#FFFFFF',
    ring: 'var(--ml-charcoal)',
  },
  LIVE: {
    bg: 'var(--ml-red)',
    fg: '#FFFFFF',
    ring: 'var(--ml-red)',
  },
  ARCHIVED: {
    bg: 'var(--ml-surface-muted)',
    fg: 'var(--ml-text-muted)',
    ring: 'var(--ml-border-default)',
  },
  REJECTED: {
    bg: 'rgba(225, 40, 40, 0.08)',
    fg: 'var(--ml-red)',
    ring: 'rgba(225, 40, 40, 0.35)',
  },
};

const statusGroups: { label: string; statuses: CampaignStatus[] }[] = [
  { label: 'In flight', statuses: ['DRAFT', 'SUBMITTED', 'APPROVED'] },
  { label: 'Rolled out', statuses: ['SCHEDULED', 'LIVE'] },
  { label: 'Closed', statuses: ['ARCHIVED', 'REJECTED'] },
];

export default async function CampaignsListPage() {
  const supabase = await createServerClient();
  const [{ data, error }, { data: artwork }, { data: targets }] = await Promise.all([
    supabase
      .from('campaigns')
      .select(
        'id, code, name, status, scope, starts_at, ends_at, description, created_at'
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('campaign_artwork')
      .select('campaign_id, artwork_url, pos_slot_types ( width_mm, height_mm )'),
    supabase
      .from('campaign_unit_targets')
      .select('campaign_id'),
  ]);

  const rows = (data ?? []) as Row[];
  const artworkRows = (artwork ?? []) as unknown as ArtworkRow[];
  const targetRows = (targets ?? []) as { campaign_id: string }[];

  // For each campaign, pick the artwork with the largest area (the showcase
  // thumbnail) and count how many art pieces / targets it has.
  const heroByCampaign = new Map<string, ArtworkRow>();
  const artCountByCampaign = new Map<string, number>();
  for (const a of artworkRows) {
    artCountByCampaign.set(
      a.campaign_id,
      (artCountByCampaign.get(a.campaign_id) ?? 0) + 1
    );
    const current = heroByCampaign.get(a.campaign_id);
    const area = (a.pos_slot_types?.width_mm ?? 0) * (a.pos_slot_types?.height_mm ?? 0);
    const currentArea =
      (current?.pos_slot_types?.width_mm ?? 0) *
      (current?.pos_slot_types?.height_mm ?? 0);
    if (!current || area > currentArea) {
      heroByCampaign.set(a.campaign_id, a);
    }
  }
  const targetCountByCampaign = new Map<string, number>();
  for (const t of targetRows) {
    targetCountByCampaign.set(
      t.campaign_id,
      (targetCountByCampaign.get(t.campaign_id) ?? 0) + 1
    );
  }

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--ml-text-muted)',
            }}
          >
            HQ Campaigns
          </span>
          <h1
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--ml-text-primary)',
            }}
          >
            {rows.length === 0
              ? 'No campaigns yet.'
              : `${rows.length} ${
                  rows.length === 1 ? 'campaign' : 'campaigns'
                } in the system.`}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: 'var(--ml-text-muted)',
              maxWidth: 540,
            }}
          >
            Author promotional campaigns, upload artwork and publish to the
            matching forecourt sites.
          </p>
        </div>
        <Link href="/admin/campaigns/new" style={primaryButton}>
          + New campaign
        </Link>
      </header>

      {error && (
        <div role="alert" style={errorBanner}>
          Couldn’t load campaigns: {error.message}
        </div>
      )}

      {rows.length === 0 && !error && <EmptyState />}

      {statusGroups.map((g) => {
        const groupRows = byGroup.get(g.label) ?? [];
        if (groupRows.length === 0) return null;
        return (
          <section
            key={g.label}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: groupAccent(g.label),
                }}
                aria-hidden="true"
              />
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
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--ml-text-muted)',
                  marginLeft: 'auto',
                }}
              >
                {groupRows.length}{' '}
                {groupRows.length === 1 ? 'campaign' : 'campaigns'}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 14,
              }}
            >
              {groupRows.map((r) => (
                <CampaignCard
                  key={r.id}
                  row={r}
                  hero={heroByCampaign.get(r.id) ?? null}
                  artworkCount={artCountByCampaign.get(r.id) ?? 0}
                  targetCount={targetCountByCampaign.get(r.id) ?? 0}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function CampaignCard({
  row,
  hero,
  artworkCount,
  targetCount,
}: {
  row: Row;
  hero: ArtworkRow | null;
  artworkCount: number;
  targetCount: number;
}) {
  const tone = statusTone[row.status];
  const url = hero?.artwork_url ?? null;

  return (
    <Link
      href={`/admin/campaigns/${row.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--ml-surface-panel)',
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-lg)',
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
        transition:
          'transform var(--ml-motion-fast) var(--ml-ease-out), box-shadow var(--ml-motion-fast) var(--ml-ease-out)',
      }}
      className="ml-campaign-card"
    >
      <div
        style={{
          position: 'relative',
          aspectRatio: '16 / 9',
          background:
            'linear-gradient(135deg, var(--ml-surface-muted) 0%, var(--ml-off-white) 100%)',
          overflow: 'hidden',
        }}
      >
        {url ? (
          // Render the artwork as the card's hero image. SVG data URLs
          // scale to any size — `object-fit: contain` shows the whole
          // composition without cropping.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              padding: 18,
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ml-text-muted)',
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            No artwork yet
          </div>
        )}

        <span
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            padding: '4px 10px',
            fontSize: 10,
            fontWeight: 500,
            borderRadius: 9999,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            background: tone.bg,
            color: tone.fg,
            boxShadow: `0 0 0 1px ${tone.ring}`,
          }}
        >
          {statusLabels[row.status]}
        </span>
      </div>

      <div
        style={{
          padding: '14px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          flex: 1,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--ml-text-primary)',
              letterSpacing: '-0.005em',
            }}
          >
            {row.name}
          </span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--ml-text-muted)',
              fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
            }}
          >
            {row.code}
          </span>
        </div>

        {row.description && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: 'var(--ml-text-muted)',
              lineHeight: 1.45,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {row.description}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            marginTop: 'auto',
            paddingTop: 8,
          }}
        >
          {row.starts_at && (
            <Chip>
              {formatRange(row.starts_at, row.ends_at)}
            </Chip>
          )}
          <Chip>{row.scope.toLowerCase()}</Chip>
          <Chip>
            {targetCount} {targetCount === 1 ? 'target' : 'targets'}
          </Chip>
          <Chip>
            {artworkCount}{' '}
            {artworkCount === 1 ? 'artwork' : 'artworks'}
          </Chip>
        </div>
      </div>
    </Link>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        padding: '3px 9px',
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.04em',
        color: 'var(--ml-charcoal)',
        background: 'var(--ml-surface-muted)',
        borderRadius: 9999,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        padding: '60px 28px',
        background: 'var(--ml-surface-panel)',
        border: '0.5px dashed var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-lg)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--ml-surface-muted)',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          color: 'var(--ml-charcoal)',
        }}
      >
        ✦
      </span>
      <span style={{ fontSize: 17, color: 'var(--ml-text-primary)' }}>
        No campaigns yet.
      </span>
      <span
        style={{
          fontSize: 13,
          color: 'var(--ml-text-muted)',
          maxWidth: 360,
          margin: '0 auto',
        }}
      >
        Start your first campaign — target unit types, upload artwork, and
        publish when ready.
      </span>
      <div>
        <Link href="/admin/campaigns/new" style={primaryButton}>
          + New campaign
        </Link>
      </div>
    </div>
  );
}

function formatRange(starts: string, ends: string | null): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  return ends ? `${fmt(starts)} → ${fmt(ends)}` : `from ${fmt(starts)}`;
}

function groupAccent(group: string): string {
  switch (group) {
    case 'In flight':
      return 'var(--ml-red)';
    case 'Rolled out':
      return 'var(--ml-charcoal)';
    case 'Closed':
      return 'var(--ml-text-muted)';
    default:
      return 'var(--ml-text-muted)';
  }
}

const primaryButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '10px 18px',
  background: 'var(--ml-red)',
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: '0.01em',
  textDecoration: 'none',
  borderRadius: 'var(--ml-radius-md)',
  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
  transition: 'transform var(--ml-motion-fast) var(--ml-ease-out)',
};

const errorBanner: React.CSSProperties = {
  padding: 12,
  background: 'rgba(225, 40, 40, 0.06)',
  border: '1px solid rgba(225, 40, 40, 0.35)',
  borderRadius: 'var(--ml-radius-md)',
  fontSize: 13,
  color: 'var(--ml-red)',
};
