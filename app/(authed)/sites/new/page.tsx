import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/require-role';
import { createServerClient } from '@/lib/supabase/server';
import { NewSiteForm } from './new-site-form';
import { PageFrame } from '@/components/brand/PageFrame';

type AreaOption = { id: string; code: string; name: string };

/**
 * /sites/new — create a new franchise site.
 *
 * Role gate: HQ Admins and Area Managers only. Employees and Site Managers
 * get a not-found (we render nothing rather than announce this route exists).
 *
 * Area dropdown: HQ sees all areas; AMs see only areas they're assigned to.
 * RLS allows AMs to read all areas (areas_read) so we filter in the query
 * layer for UX — they shouldn't be offered options that the insert would
 * then reject via sites_am_insert.
 */
export default async function NewSitePage() {
  let profile;
  try {
    profile = await requireRole(['HQ_ADMIN', 'AREA_MANAGER']);
  } catch {
    notFound();
  }

  const supabase = await createServerClient();

  let areas: AreaOption[] = [];

  if (profile.role === 'HQ_ADMIN') {
    const { data } = await supabase
      .from('areas')
      .select('id, code, name')
      .order('name', { ascending: true });
    areas = (data ?? []) as AreaOption[];
  } else {
    const { data } = await supabase
      .from('area_manager_assignments')
      .select('areas ( id, code, name )')
      .eq('user_id', profile.id);
    areas = ((data ?? []) as unknown as { areas: AreaOption | AreaOption[] | null }[])
      .flatMap((r) =>
        r.areas ? (Array.isArray(r.areas) ? r.areas : [r.areas]) : []
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <PageFrame width="narrow">
    <section style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 680 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: 'var(--ml-text-primary)',
          }}
        >
          New site
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: 'var(--ml-text-muted)',
          }}
        >
          Onboard a new franchise location. You can refine the address,
          classification, and planogram from the site page afterwards.
        </p>
      </header>

      {areas.length === 0 ? (
        <div
          style={{
            padding: '20px 24px',
            background: 'var(--ml-surface-panel)',
            border: '0.5px solid var(--ml-border-default)',
            borderRadius: 'var(--ml-radius-lg)',
            fontSize: 13,
            color: 'var(--ml-text-muted)',
          }}
        >
          You aren’t assigned to any areas yet. Ask HQ to add an area
          assignment before onboarding a site.
        </div>
      ) : (
        <NewSiteForm areas={areas} />
      )}
    </section>
    </PageFrame>
  );
}
