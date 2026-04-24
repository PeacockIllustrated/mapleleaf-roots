import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentProfile } from '@/lib/auth/require-role';
import { createServerClient } from '@/lib/supabase/server';
import { PageFrame } from '@/components/brand/PageFrame';
import type { RolloutStatus, TaskStatus } from '@/lib/campaigns/types';

interface Props {
  params: Promise<{ id: string; rolloutId: string }>;
}

type Rollout = {
  id: string;
  site_id: string;
  campaign_id: string;
  status: RolloutStatus;
  quote_ref: string | null;
  total_tasks: number;
  completed_tasks: number;
  problem_tasks: number;
  shipped_at: string | null;
  install_started_at: string | null;
  install_completed_at: string | null;
  created_at: string;
  campaigns: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    starts_at: string | null;
    ends_at: string | null;
  } | null;
  sites: { id: string; name: string; code: string } | null;
};

type Task = {
  id: string;
  task_order: number;
  status: TaskStatus;
  pos_position_label: string | null;
  completed_at: string | null;
  photo_url: string | null;
  problem_reason: string | null;
  problem_notes: string | null;
  site_units: {
    id: string;
    label: string;
    unit_types: { display_name: string; code: string } | null;
  } | null;
  campaign_artwork: {
    artwork_url: string | null;
    pos_slot_types: { display_name: string; code: string } | null;
  } | null;
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

const taskStatusLabels: Record<TaskStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
  PROBLEM: 'Problem',
  SKIPPED: 'Skipped',
};

export default async function RolloutDetailPage({ params }: Props) {
  const { id, rolloutId } = await params;
  const profile = await currentProfile();
  if (!profile) notFound();

  const supabase = await createServerClient();
  const [{ data: rollout }, { data: tasks }] = await Promise.all([
    supabase
      .from('site_campaign_rollouts')
      .select(
        `id, site_id, campaign_id, status, quote_ref, total_tasks, completed_tasks,
         problem_tasks, shipped_at, install_started_at, install_completed_at, created_at,
         campaigns ( id, code, name, description, starts_at, ends_at ),
         sites ( id, name, code )`
      )
      .eq('id', rolloutId)
      .eq('site_id', id)
      .single(),
    supabase
      .from('rollout_install_tasks')
      .select(
        `id, task_order, status, pos_position_label, completed_at, photo_url,
         problem_reason, problem_notes,
         site_units ( id, label, unit_types ( display_name, code ) ),
         campaign_artwork ( artwork_url, pos_slot_types ( display_name, code ) )`
      )
      .eq('rollout_id', rolloutId)
      .order('task_order'),
  ]);

  if (!rollout) notFound();

  const r = rollout as unknown as Rollout;
  const camp = r.campaigns;
  const site = r.sites;
  const taskList = (tasks ?? []) as unknown as Task[];

  const canInstall =
    profile.role === 'HQ_ADMIN' ||
    profile.role === 'AREA_MANAGER' ||
    profile.role === 'SITE_MANAGER' ||
    profile.role === 'EMPLOYEE';

  const pct =
    r.total_tasks > 0
      ? Math.round((r.completed_tasks / r.total_tasks) * 100)
      : 0;

  return (
    <PageFrame>
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          maxWidth: 960,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link
            href={`/sites/${id}/rollouts`}
            style={{
              fontSize: 12,
              color: 'var(--ml-text-muted)',
              textDecoration: 'none',
            }}
          >
            ← {site?.name ?? 'Site'} · Rollouts
          </Link>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: 26,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: 'var(--ml-text-primary)',
                }}
              >
                {camp?.name ?? 'Rollout'}
              </h1>
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  fontSize: 12,
                  color: 'var(--ml-text-muted)',
                }}
              >
                <span style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>
                  {camp?.code}
                </span>
                {camp?.starts_at && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {formatDate(camp.starts_at)}
                      {camp.ends_at ? ` → ${formatDate(camp.ends_at)}` : ''}
                    </span>
                  </>
                )}
              </div>
            </div>
            <span style={statusPill(r.status)}>{statusLabels[r.status]}</span>
          </div>
          {camp?.description && (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: 'var(--ml-text-primary)',
                lineHeight: 1.5,
                maxWidth: 720,
              }}
            >
              {camp.description}
            </p>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          <Stat label="Tasks" value={`${r.completed_tasks} / ${r.total_tasks}`} hint={`${pct}% complete`} />
          <Stat label="Problems" value={String(r.problem_tasks)} hint={r.problem_tasks > 0 ? 'Need review' : 'All clear'} />
          <Stat
            label="Quote"
            value={r.quote_ref ?? '—'}
            hint={
              r.quote_ref
                ? 'Linked Onesign quote'
                : 'Awaiting quote'
            }
            link={r.quote_ref ? `/sites/${id}/quotes/${r.quote_ref}` : null}
          />
        </div>

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
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--ml-text-primary)',
            }}
          >
            Install tasks
          </h2>
          {canInstall && taskList.length > 0 && (
            <Link
              href={`/sites/${id}/rollouts/${rolloutId}/install`}
              style={{
                padding: '8px 14px',
                background: 'var(--ml-red)',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 'var(--ml-radius-md)',
                textDecoration: 'none',
              }}
            >
              Open install checklist
            </Link>
          )}
        </div>

        <div
          style={{
            background: 'var(--ml-surface-panel)',
            border: '0.5px solid var(--ml-border-default)',
            borderRadius: 'var(--ml-radius-lg)',
            overflow: 'hidden',
          }}
        >
          {taskList.length === 0 ? (
            <div
              style={{
                padding: 28,
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--ml-text-muted)',
              }}
            >
              No install tasks on this rollout.
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {taskList.map((t, i) => {
                const ut = t.site_units?.unit_types;
                const slot = t.campaign_artwork?.pos_slot_types;
                return (
                  <li
                    key={t.id}
                    style={{
                      borderBottom:
                        i === taskList.length - 1
                          ? 'none'
                          : '0.5px solid var(--ml-border-default)',
                      padding: '14px 20px',
                      display: 'grid',
                      gridTemplateColumns: '40px 1fr 1fr auto',
                      gap: 14,
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--ml-text-muted)',
                        fontFamily: 'ui-monospace, Menlo, monospace',
                      }}
                    >
                      #{t.task_order}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: 'var(--ml-text-primary)',
                        }}
                      >
                        {t.site_units?.label ?? 'Unit'}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--ml-text-muted)',
                        }}
                      >
                        {ut?.display_name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span
                        style={{
                          fontSize: 12,
                          color: 'var(--ml-text-primary)',
                        }}
                      >
                        {slot?.display_name ?? 'POS slot'}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--ml-text-muted)',
                        }}
                      >
                        {t.pos_position_label ?? 'Default position'}
                      </span>
                    </div>
                    <TaskStatusPill status={t.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </PageFrame>
  );
}

function Stat({
  label,
  value,
  hint,
  link,
}: {
  label: string;
  value: string;
  hint?: string;
  link?: string | null;
}) {
  const body = (
    <div
      style={{
        padding: '16px 18px',
        background: 'var(--ml-surface-panel)',
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minHeight: 92,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--ml-text-muted)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--ml-text-primary)',
          letterSpacing: '-0.01em',
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
      {hint && (
        <span style={{ fontSize: 11, color: 'var(--ml-text-muted)' }}>
          {hint}
        </span>
      )}
    </div>
  );
  return link ? (
    <Link href={link} style={{ textDecoration: 'none' }}>
      {body}
    </Link>
  ) : (
    body
  );
}

function TaskStatusPill({ status }: { status: TaskStatus }) {
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
        padding: '4px 10px',
        fontSize: 10,
        fontWeight: 500,
        borderRadius: 9999,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        background: tone.bg,
        color: tone.fg,
      }}
    >
      {taskStatusLabels[status]}
    </span>
  );
}

function statusPill(status: RolloutStatus): React.CSSProperties {
  const tone =
    status === 'INSTALLED'
      ? { bg: 'var(--ml-red)', fg: '#FFFFFF' }
      : status === 'PROBLEM'
        ? { bg: 'rgba(225, 40, 40, 0.1)', fg: 'var(--ml-red)' }
        : status === 'INSTALLING'
          ? { bg: 'var(--ml-charcoal)', fg: '#FFFFFF' }
          : { bg: 'var(--ml-surface-muted)', fg: 'var(--ml-charcoal)' };
  return {
    padding: '5px 12px',
    fontSize: 11,
    fontWeight: 500,
    borderRadius: 9999,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    background: tone.bg,
    color: tone.fg,
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
