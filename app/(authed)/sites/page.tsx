import Link from 'next/link';
import { currentProfile } from '@/lib/auth/require-role';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PageFrame } from '@/components/brand/PageFrame';

/**
 * /sites — sites the current user can access.
 *
 * RLS filters for us: the `sites_read` policy uses `accessible_site_ids()`
 * which returns every site for HQ, only area-assigned sites for Area Managers,
 * and only directly-assigned sites for Site Managers and Employees.
 *
 * M1 intentionally ships a minimal list. Creation, detail, classification
 * toggles land in M2.
 */

type SiteRow = {
  id: string;
  code: string;
  name: string;
  postcode: string | null;
  tier: 'SMALL' | 'MEDIUM' | 'LARGE';
  onboarding_status:
    | 'INVITED'
    | 'CONFIGURING'
    | 'QUOTE_REQUESTED'
    | 'QUOTE_APPROVED'
    | 'FITTING'
    | 'ACTIVE'
    | 'SUSPENDED';
};

const statusLabels: Record<SiteRow['onboarding_status'], string> = {
  INVITED: 'Invited',
  CONFIGURING: 'Configuring',
  QUOTE_REQUESTED: 'Quote requested',
  QUOTE_APPROVED: 'Quote approved',
  FITTING: 'Fitting',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
};

export default async function SitesPage() {
  const profile = await currentProfile();
  if (!profile) redirect('/login');

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('sites')
    .select('id, code, name, postcode, tier, onboarding_status')
    .order('name', { ascending: true });

  const sites = (data ?? []) as SiteRow[];

  return (
    <PageFrame>
    <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 16,
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
            Sites
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: 'var(--ml-text-muted)',
            }}
          >
            Welcome, {profile.full_name.split(' ')[0]}. Everything you can see
            is scoped to your role.
          </p>
        </div>

        {(profile.role === 'HQ_ADMIN' || profile.role === 'AREA_MANAGER') && (
          <Link
            href="/sites/new"
            style={{
              height: 40,
              padding: '0 18px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--ml-action-primary)',
              color: '#FFFFFF',
              border: 0,
              borderRadius: 'var(--ml-radius-md)',
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              letterSpacing: '0.01em',
            }}
          >
            New site
          </Link>
        )}
      </header>

      {error && (
        <div
          role="alert"
          style={{
            padding: 12,
            background: 'rgba(225, 40, 40, 0.06)',
            border: '1px solid rgba(225, 40, 40, 0.35)',
            borderRadius: 'var(--ml-radius-md)',
            fontSize: 13,
            color: 'var(--ml-red)',
          }}
        >
          Couldn’t load sites: {error.message}
        </div>
      )}

      {!error && sites.length === 0 && (
        <div
          style={{
            padding: '32px 24px',
            background: 'var(--ml-surface-panel)',
            border: '0.5px solid var(--ml-border-default)',
            borderRadius: 'var(--ml-radius-lg)',
            textAlign: 'center',
            color: 'var(--ml-text-muted)',
            fontSize: 14,
          }}
        >
          No sites yet. {profile.role === 'HQ_ADMIN' || profile.role === 'AREA_MANAGER'
            ? 'Create one to get started.'
            : 'When you’re assigned to a site, it will appear here.'}
        </div>
      )}

      {!error && sites.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {sites.map((site) => (
            <li key={site.id}>
              <Link
                href={`/sites/${site.id}`}
                style={{
                  padding: '16px 20px',
                  background: 'var(--ml-surface-panel)',
                  border: '0.5px solid var(--ml-border-default)',
                  borderRadius: 'var(--ml-radius-lg)',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  alignItems: 'center',
                  gap: 12,
                  textDecoration: 'none',
                  color: 'inherit',
                  transition:
                    'border-color var(--ml-motion-fast) var(--ml-ease-out), transform var(--ml-motion-fast) var(--ml-ease-out)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: 'var(--ml-text-primary)',
                    }}
                  >
                    {site.name}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--ml-text-muted)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {site.code}
                    {site.postcode ? ` · ${site.postcode}` : ''} ·{' '}
                    {site.tier.toLowerCase()}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--ml-charcoal)',
                    background: 'var(--ml-surface-muted)',
                    padding: '4px 10px',
                    borderRadius: 9999,
                    letterSpacing: '0.02em',
                  }}
                >
                  {statusLabels[site.onboarding_status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
    </PageFrame>
  );
}
