import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentProfile } from '@/lib/auth/require-role';
import { createServerClient } from '@/lib/supabase/server';
import { PageFrame } from '@/components/brand/PageFrame';
import type { RolloutStatus } from '@/lib/campaigns/types';

interface Props {
  params: Promise<{ id: string }>;
}

type Row = {
  id: string;
  status: RolloutStatus;
  quote_ref: string | null;
  total_tasks: number;
  completed_tasks: number;
  problem_tasks: number;
  install_completed_at: string | null;
  shipped_at: string | null;
  campaigns: { id: string; code: string; name: string } | { id: string; code: string; name: string }[] | null;
};

const statusLabels: Record<RolloutStatus, string> = {
  PENDING: 'Pending',
  QUOTED: 'Quoted',
  IN_PRODUCTION: 'In production',
  SHIPPED: 'Shipped',
  INSTALLING: 'Installing',
  INSTALLED: 'Installed',
  PROBLEM: 'Problem',
};

export default async function RolloutsListPage({ params }: Props) {
  const { id } = await params;
  const profile = await currentProfile();
  if (!profile) notFound();

  const supabase = await createServerClient();
  const [{ data: site }, { data: rollouts }] = await Promise.all([
    supabase.from('sites').select('id, name').eq('id', id).single(),
    supabase
      .from('site_campaign_rollouts')
      .select(
        'id, status, quote_ref, total_tasks, completed_tasks, problem_tasks, install_completed_at, shipped_at, campaigns ( id, code, name )'
      )
      .eq('site_id', id)
      .order('created_at', { ascending: false }),
  ]);

  if (!site) notFound();

  const rows = (rollouts ?? []) as unknown as Row[];

  return (
    <PageFrame>
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          maxWidth: 900,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Link
            href={`/sites/${id}`}
            style={{
              fontSize: 12,
              color: 'var(--ml-text-muted)',
              textDecoration: 'none',
            }}
          >
            ← {site.name as string}
          </Link>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: 'var(--ml-text-primary)',
            }}
          >
            Campaign rollouts
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ml-text-muted)' }}>
            {rows.length === 0
              ? 'No campaigns have been rolled out to this site yet.'
              : `${rows.length} ${rows.length === 1 ? 'rollout' : 'rollouts'} for this site.`}
          </p>
        </div>

        {rows.length > 0 && (
          <div
            style={{
              background: 'var(--ml-surface-panel)',
              border: '0.5px solid var(--ml-border-default)',
              borderRadius: 'var(--ml-radius-lg)',
              overflow: 'hidden',
            }}
          >
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {rows.map((r, i) => {
                const camp = Array.isArray(r.campaigns)
                  ? r.campaigns[0]
                  : r.campaigns;
                const pct =
                  r.total_tasks > 0
                    ? Math.round((r.completed_tasks / r.total_tasks) * 100)
                    : 0;
                return (
                  <li
                    key={r.id}
                    style={{
                      borderBottom:
                        i === rows.length - 1
                          ? 'none'
                          : '0.5px solid var(--ml-border-default)',
                    }}
                  >
                    <Link
                      href={`/sites/${id}/rollouts/${r.id}`}
                      style={rowLink}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
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
                          {camp?.name ?? 'Campaign'}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--ml-text-muted)',
                            fontFamily: 'ui-monospace, Menlo, monospace',
                          }}
                        >
                          {camp?.code}
                          {r.quote_ref && ` · ${r.quote_ref}`}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          minWidth: 160,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 11,
                            color: 'var(--ml-text-muted)',
                          }}
                        >
                          <span>
                            {r.completed_tasks}/{r.total_tasks} done
                          </span>
                          {r.problem_tasks > 0 && (
                            <span style={{ color: 'var(--ml-red)' }}>
                              {r.problem_tasks} problem
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            height: 4,
                            background: 'var(--ml-surface-muted)',
                            borderRadius: 2,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              background:
                                r.problem_tasks > 0
                                  ? 'var(--ml-red)'
                                  : 'var(--ml-charcoal)',
                              transition: 'width 200ms ease',
                            }}
                          />
                        </div>
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
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </PageFrame>
  );
}

function StatusPill({ status }: { status: RolloutStatus }) {
  const tone =
    status === 'INSTALLED'
      ? { bg: 'var(--ml-red)', fg: '#FFFFFF' }
      : status === 'PROBLEM'
        ? { bg: 'rgba(225, 40, 40, 0.1)', fg: 'var(--ml-red)' }
        : status === 'INSTALLING'
          ? { bg: 'var(--ml-charcoal)', fg: '#FFFFFF' }
          : { bg: 'var(--ml-surface-muted)', fg: 'var(--ml-charcoal)' };
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

const rowLink: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto auto auto',
  alignItems: 'center',
  gap: 16,
  padding: '14px 20px',
  textDecoration: 'none',
  color: 'inherit',
};
