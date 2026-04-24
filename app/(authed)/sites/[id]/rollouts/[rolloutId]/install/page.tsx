import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentProfile } from '@/lib/auth/require-role';
import { createServerClient } from '@/lib/supabase/server';
import { PageFrame } from '@/components/brand/PageFrame';
import type { TaskStatus } from '@/lib/campaigns/types';
import { InstallTaskRow } from './install-task-row';

interface Props {
  params: Promise<{ id: string; rolloutId: string }>;
}

type Rollout = {
  id: string;
  site_id: string;
  campaigns: { name: string; code: string } | null;
  sites: { name: string } | null;
};

type Task = {
  id: string;
  task_order: number;
  status: TaskStatus;
  pos_position_label: string | null;
  photo_url: string | null;
  problem_reason: string | null;
  problem_notes: string | null;
  site_units: {
    label: string;
    unit_types: { display_name: string } | null;
  } | null;
  campaign_artwork: {
    artwork_url: string | null;
    quantity_per_target: number;
    notes: string | null;
    pos_slot_types: {
      display_name: string;
      width_mm: number;
      height_mm: number;
    } | null;
  } | null;
};

export default async function InstallChecklistPage({ params }: Props) {
  const { id, rolloutId } = await params;
  const profile = await currentProfile();
  if (!profile) notFound();

  const supabase = await createServerClient();
  const [{ data: rollout }, { data: tasks }] = await Promise.all([
    supabase
      .from('site_campaign_rollouts')
      .select(
        'id, site_id, campaigns ( name, code ), sites ( name )'
      )
      .eq('id', rolloutId)
      .eq('site_id', id)
      .single(),
    supabase
      .from('rollout_install_tasks')
      .select(
        `id, task_order, status, pos_position_label, photo_url, problem_reason, problem_notes,
         site_units ( label, unit_types ( display_name ) ),
         campaign_artwork ( artwork_url, quantity_per_target, notes, pos_slot_types ( display_name, width_mm, height_mm ) )`
      )
      .eq('rollout_id', rolloutId)
      .order('task_order'),
  ]);

  if (!rollout) notFound();

  const r = rollout as unknown as Rollout;
  const allTasks = (tasks ?? []) as unknown as Task[];
  const pending = allTasks.filter(
    (t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS'
  );
  const doneCount = allTasks.filter((t) => t.status === 'DONE').length;
  const problemCount = allTasks.filter((t) => t.status === 'PROBLEM').length;

  return (
    <PageFrame width="narrow">
      <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Link
            href={`/sites/${id}/rollouts/${rolloutId}`}
            style={{
              fontSize: 12,
              color: 'var(--ml-text-muted)',
              textDecoration: 'none',
            }}
          >
            ← {r.campaigns?.name ?? 'Rollout'}
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
            Install checklist
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ml-text-muted)' }}>
            Tick each piece of artwork as you fit it. Take a photo when a task
            is done — it proves the install without a second trip.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <Counter label="Done" value={doneCount} tone="done" />
          <Counter label="Remaining" value={pending.length} tone="neutral" />
          <Counter label="Problem" value={problemCount} tone="problem" />
        </div>

        {allTasks.length === 0 ? (
          <div
            style={{
              padding: 28,
              background: 'var(--ml-surface-panel)',
              border: '0.5px dashed var(--ml-border-default)',
              borderRadius: 'var(--ml-radius-lg)',
              textAlign: 'center',
              fontSize: 13,
              color: 'var(--ml-text-muted)',
            }}
          >
            No install tasks on this rollout yet.
          </div>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {allTasks.map((t) => (
              <li key={t.id}>
                <InstallTaskRow
                  siteId={id}
                  task={{
                    id: t.id,
                    task_order: t.task_order,
                    status: t.status,
                    pos_position_label: t.pos_position_label,
                    photo_url: t.photo_url,
                    problem_reason: t.problem_reason,
                    problem_notes: t.problem_notes,
                    unit_label: t.site_units?.label ?? '—',
                    unit_type: t.site_units?.unit_types?.display_name ?? '—',
                    pos_slot:
                      t.campaign_artwork?.pos_slot_types?.display_name ?? '—',
                    pos_dimensions: t.campaign_artwork?.pos_slot_types
                      ? `${t.campaign_artwork.pos_slot_types.width_mm}×${t.campaign_artwork.pos_slot_types.height_mm} mm`
                      : null,
                    artwork_url: t.campaign_artwork?.artwork_url ?? null,
                    artwork_notes: t.campaign_artwork?.notes ?? null,
                    quantity: t.campaign_artwork?.quantity_per_target ?? 1,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageFrame>
  );
}

function Counter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'done' | 'neutral' | 'problem';
}) {
  const palette =
    tone === 'done'
      ? { bg: 'var(--ml-red)', fg: '#FFFFFF' }
      : tone === 'problem'
        ? { bg: 'rgba(225, 40, 40, 0.08)', fg: 'var(--ml-red)' }
        : { bg: 'var(--ml-surface-panel)', fg: 'var(--ml-charcoal)' };
  return (
    <div
      style={{
        flex: '1 1 140px',
        padding: '14px 18px',
        border:
          tone === 'neutral'
            ? '0.5px solid var(--ml-border-default)'
            : 'none',
        borderRadius: 'var(--ml-radius-lg)',
        background: palette.bg,
        color: palette.fg,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          opacity: 0.85,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}
