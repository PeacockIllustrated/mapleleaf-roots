import { notFound } from 'next/navigation';
import { currentProfile } from '@/lib/auth/require-role';
import { createServerClient } from '@/lib/supabase/server';
import { InviteForm } from './invite-form';
import { PageFrame } from '@/components/brand/PageFrame';

type Area = { id: string; code: string; name: string };
type Site = { id: string; code: string; name: string };
type Role = 'HQ_ADMIN' | 'AREA_MANAGER' | 'SITE_MANAGER' | 'EMPLOYEE';

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
};

const roleLabels: Record<Role, string> = {
  HQ_ADMIN: 'HQ Admin',
  AREA_MANAGER: 'Area Manager',
  SITE_MANAGER: 'Site Manager',
  EMPLOYEE: 'Employee',
};

const roleOrder: Role[] = ['HQ_ADMIN', 'AREA_MANAGER', 'SITE_MANAGER', 'EMPLOYEE'];

export default async function TeamPage() {
  const caller = await currentProfile();
  if (!caller) notFound();

  if (caller.role === 'EMPLOYEE') notFound();

  const supabase = await createServerClient();

  // Scope the team list + the options the form can offer:
  //   HQ_ADMIN     → everyone, every area, every site
  //   AREA_MANAGER → users in sites in their areas + area peers; their areas, their sites
  //   SITE_MANAGER → users at their assigned sites; no areas; their sites
  let areas: Area[] = [];
  let sites: Site[] = [];
  let visibleProfileIds: string[] | null = null; // null = all

  if (caller.role === 'HQ_ADMIN') {
    const [{ data: a }, { data: s }] = await Promise.all([
      supabase.from('areas').select('id, code, name').order('name'),
      supabase.from('sites').select('id, code, name').order('name'),
    ]);
    areas = (a ?? []) as Area[];
    sites = (s ?? []) as Site[];
  } else if (caller.role === 'AREA_MANAGER') {
    const { data: myAreas } = await supabase
      .from('area_manager_assignments')
      .select('areas ( id, code, name )')
      .eq('user_id', caller.id);
    areas = ((myAreas ?? []) as unknown as Array<{
      areas: Area | Area[] | null;
    }>)
      .flatMap((r) => (r.areas ? (Array.isArray(r.areas) ? r.areas : [r.areas]) : []))
      .sort((a, b) => a.name.localeCompare(b.name));

    const { data: scopedSites } = await supabase
      .from('sites')
      .select('id, code, name')
      .in('area_id', areas.map((a) => a.id))
      .order('name');
    sites = (scopedSites ?? []) as Site[];

    const { data: assigned } = await supabase
      .from('site_user_assignments')
      .select('user_id')
      .in('site_id', sites.map((s) => s.id));
    const siteUserIds = (assigned ?? []).map((r) => r.user_id as string);

    const { data: amaRows } = await supabase
      .from('area_manager_assignments')
      .select('user_id')
      .in('area_id', areas.map((a) => a.id));
    const amUserIds = (amaRows ?? []).map((r) => r.user_id as string);

    visibleProfileIds = [...new Set([...siteUserIds, ...amUserIds, caller.id])];
  } else {
    // SITE_MANAGER
    const { data: mySites } = await supabase
      .from('site_user_assignments')
      .select('site:sites ( id, code, name )')
      .eq('user_id', caller.id);
    sites = ((mySites ?? []) as unknown as Array<{
      site: Site | Site[] | null;
    }>)
      .flatMap((r) => (r.site ? (Array.isArray(r.site) ? r.site : [r.site]) : []))
      .sort((a, b) => a.name.localeCompare(b.name));

    const { data: assigned } = await supabase
      .from('site_user_assignments')
      .select('user_id')
      .in('site_id', sites.map((s) => s.id));
    visibleProfileIds = [
      ...new Set([...(assigned ?? []).map((r) => r.user_id as string), caller.id]),
    ];
  }

  let profileQuery = supabase
    .from('user_profiles')
    .select('id, email, full_name, role, is_active, created_at')
    .eq('is_active', true)
    .order('full_name');
  if (visibleProfileIds) {
    profileQuery = profileQuery.in('id', visibleProfileIds);
  }
  const { data: people } = await profileQuery;
  const rows = (people ?? []) as ProfileRow[];

  const allowedTargets: Role[] =
    caller.role === 'HQ_ADMIN'
      ? ['HQ_ADMIN', 'AREA_MANAGER', 'SITE_MANAGER', 'EMPLOYEE']
      : caller.role === 'AREA_MANAGER'
      ? ['SITE_MANAGER', 'EMPLOYEE']
      : ['EMPLOYEE'];

  return (
    <PageFrame width="narrow">
    <section
      style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1040 }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
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
            Team
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ml-text-muted)' }}>
            {caller.role === 'HQ_ADMIN'
              ? 'Everyone in the network.'
              : caller.role === 'AREA_MANAGER'
              ? 'People in your areas and their peers.'
              : 'People at your site.'}
          </p>
        </div>
      </header>

      <InviteForm
        callerRole={caller.role}
        allowedTargets={allowedTargets}
        areas={areas}
        sites={sites}
      />

      <div
        style={{
          background: 'var(--ml-surface-panel)',
          border: '0.5px solid var(--ml-border-default)',
          borderRadius: 'var(--ml-radius-lg)',
          overflow: 'hidden',
        }}
      >
        {roleOrder.map((r) => {
          const group = rows.filter((p) => p.role === r);
          if (group.length === 0) return null;
          return (
            <div key={r}>
              <div
                style={{
                  padding: '10px 20px',
                  background: 'var(--ml-surface-muted)',
                  borderBottom: '0.5px solid var(--ml-border-default)',
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
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
                  {roleLabels[r]}
                </span>
                <span style={{ fontSize: 12, color: 'var(--ml-text-muted)' }}>
                  {group.length}
                </span>
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {group.map((p, i) => (
                  <li
                    key={p.id}
                    style={{
                      padding: '12px 20px',
                      borderBottom:
                        i === group.length - 1
                          ? '0.5px solid var(--ml-border-default)'
                          : '0.5px solid var(--ml-border-default)',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: 'var(--ml-text-primary)',
                        }}
                      >
                        {p.full_name}
                        {p.id === caller.id && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 10,
                              fontWeight: 500,
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              color: 'var(--ml-text-muted)',
                            }}
                          >
                            · you
                          </span>
                        )}
                      </span>
                      <span
                        style={{ fontSize: 12, color: 'var(--ml-text-muted)' }}
                      >
                        {p.email}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--ml-text-muted)' }}>
                      Joined{' '}
                      {new Date(p.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div
            style={{
              padding: '32px 24px',
              textAlign: 'center',
              fontSize: 14,
              color: 'var(--ml-text-muted)',
            }}
          >
            No one to show yet. Invite someone above.
          </div>
        )}
      </div>
    </section>
    </PageFrame>
  );
}
