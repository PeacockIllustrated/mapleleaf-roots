import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentProfile } from '@/lib/auth/require-role';
import { createServerClient } from '@/lib/supabase/server';
import { quoteStatusLabels, type QuoteStatus } from '@/lib/quote/types';

type SiteRow = {
  id: string;
  code: string;
  name: string;
  onboarding_status:
    | 'INVITED'
    | 'CONFIGURING'
    | 'QUOTE_REQUESTED'
    | 'QUOTE_APPROVED'
    | 'FITTING'
    | 'ACTIVE'
    | 'SUSPENDED';
};

type QuoteRow = {
  quote_ref: string;
  status: QuoteStatus;
  requested_at: string;
  site: { id: string; name: string } | { id: string; name: string }[] | null;
};

type SubmissionRow = {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
};

export default async function DashboardPage() {
  const profile = await currentProfile();
  if (!profile) notFound();

  const supabase = await createServerClient();

  const [
    { count: siteCount },
    { count: teamCount },
    { data: openQuotes },
    { data: recentSubs },
    { data: recentSites },
  ] = await Promise.all([
    supabase
      .from('sites')
      .select('*', { count: 'exact', head: true }),
    profile.role === 'EMPLOYEE'
      ? Promise.resolve({ count: null })
      : supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
    supabase
      .from('onesign_quotes')
      .select('quote_ref, status, requested_at, site:sites ( id, name )')
      .in('status', ['DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'PRICED', 'APPROVED'])
      .order('requested_at', { ascending: false })
      .limit(5),
    supabase
      .from('community_submissions')
      .select('id, title, category, status, created_at')
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('sites')
      .select('id, code, name, onboarding_status')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const quotes = (openQuotes ?? []) as unknown as QuoteRow[];
  const subs = (recentSubs ?? []) as SubmissionRow[];
  const sites = (recentSites ?? []) as SiteRow[];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 18) return 'Afternoon';
    return 'Evening';
  })();

  const firstName = profile.full_name.split(' ')[0];

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ml-text-muted)',
          }}
        >
          {greeting}
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
          {firstName}, here’s your estate.
        </h1>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        <Stat
          label="Sites"
          value={String(siteCount ?? 0)}
          hint={profile.role === 'HQ_ADMIN' ? 'Across the network' : 'In your scope'}
          accent="red"
        />
        {profile.role !== 'EMPLOYEE' && (
          <Stat
            label="Active people"
            value={String(teamCount ?? 0)}
            hint="Signed in and assigned"
          />
        )}
        <Stat
          label="Open quotes"
          value={String(quotes.length)}
          hint="Requested or in production"
        />
        <Stat
          label="Community ideas"
          value={String(subs.length)}
          hint="Latest submissions"
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <Panel title="Quick actions">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 10,
            }}
          >
            {(profile.role === 'HQ_ADMIN' ||
              profile.role === 'AREA_MANAGER') && (
              <ActionLink
                href="/sites/new"
                title="New site"
                subtitle="Onboard a franchise location"
              />
            )}
            {(profile.role === 'HQ_ADMIN' ||
              profile.role === 'AREA_MANAGER' ||
              profile.role === 'SITE_MANAGER') && (
              <ActionLink
                href="/team"
                title="Invite someone"
                subtitle="Add to your team"
              />
            )}
            <ActionLink
              href="/community/new"
              title="Share an idea"
              subtitle="Post to the community board"
            />
            {sites[0] && (
              <ActionLink
                href={`/sites/${sites[0].id}/planogram`}
                title="Open latest planogram"
                subtitle={sites[0].name}
              />
            )}
          </div>
        </Panel>

        <Panel title="Recent sites">
          {sites.length === 0 ? (
            <EmptyHint>
              No sites yet. Create one to get started.
            </EmptyHint>
          ) : (
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {sites.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/sites/${s.id}`}
                    style={rowLink}
                  >
                    <span
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: 'var(--ml-text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {s.name}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--ml-text-muted)',
                          fontFamily:
                            'ui-monospace, "SFMono-Regular", Menlo, monospace',
                        }}
                      >
                        {s.code}
                      </span>
                    </span>
                    <StatusPill value={s.onboarding_status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <Panel title="Open quotes">
          {quotes.length === 0 ? (
            <EmptyHint>No live quotes right now.</EmptyHint>
          ) : (
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {quotes.map((q) => {
                const site = Array.isArray(q.site) ? q.site[0] : q.site;
                return (
                  <li key={q.quote_ref}>
                    <Link
                      href={`/sites/${site?.id}/quotes/${q.quote_ref}`}
                      style={rowLink}
                    >
                      <span
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            fontFamily:
                              'ui-monospace, "SFMono-Regular", Menlo, monospace',
                            color: 'var(--ml-text-primary)',
                          }}
                        >
                          {q.quote_ref}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--ml-text-muted)',
                          }}
                        >
                          {site?.name ?? '—'}
                        </span>
                      </span>
                      <QuotePill value={q.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Recent community ideas">
          {subs.length === 0 ? (
            <EmptyHint>Nothing posted yet.</EmptyHint>
          ) : (
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {subs.map((s) => (
                <li key={s.id}>
                  <Link href="/community" style={rowLink}>
                    <span
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: 'var(--ml-text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {s.title}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--ml-text-muted)',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {s.category.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--ml-text-muted)',
                      }}
                    >
                      {new Date(s.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: 'red';
}) {
  return (
    <div
      style={{
        padding: '18px 20px',
        background: 'var(--ml-surface-panel)',
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-lg)',
        borderLeft: accent === 'red' ? '4px solid var(--ml-red)' : undefined,
        paddingLeft: accent === 'red' ? 16 : 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minHeight: 104,
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
        {label}
      </span>
      <span
        style={{
          fontSize: 34,
          fontWeight: 700,
          color: 'var(--ml-text-primary)',
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      {hint && (
        <span style={{ fontSize: 12, color: 'var(--ml-text-muted)' }}>
          {hint}
        </span>
      )}
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: 'var(--ml-surface-panel)',
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-lg)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '0.5px solid var(--ml-border-default)',
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--ml-text-muted)',
        }}
      >
        {title}
      </div>
      <div style={{ padding: '8px 10px' }}>{children}</div>
    </div>
  );
}

function ActionLink({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '14px 16px',
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-md)',
        background: 'var(--ml-off-white)',
        color: 'var(--ml-text-primary)',
        textDecoration: 'none',
        transition:
          'background var(--ml-motion-fast) var(--ml-ease-out), border-color var(--ml-motion-fast) var(--ml-ease-out)',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 500 }}>{title}</span>
      <span style={{ fontSize: 11, color: 'var(--ml-text-muted)' }}>
        {subtitle}
      </span>
    </Link>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '18px 14px',
        fontSize: 13,
        color: 'var(--ml-text-muted)',
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
}

const statusLabels: Record<SiteRow['onboarding_status'], string> = {
  INVITED: 'Invited',
  CONFIGURING: 'Configuring',
  QUOTE_REQUESTED: 'Quote requested',
  QUOTE_APPROVED: 'Quote approved',
  FITTING: 'Fitting',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
};

function StatusPill({ value }: { value: SiteRow['onboarding_status'] }) {
  return (
    <span
      style={{
        padding: '4px 10px',
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        borderRadius: 9999,
        background: 'var(--ml-surface-muted)',
        color: 'var(--ml-charcoal)',
        flexShrink: 0,
      }}
    >
      {statusLabels[value]}
    </span>
  );
}

function QuotePill({ value }: { value: QuoteStatus }) {
  const draft = value === 'DRAFT';
  return (
    <span
      style={{
        padding: '4px 10px',
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        borderRadius: 9999,
        background: draft ? 'var(--ml-surface-muted)' : 'var(--ml-charcoal)',
        color: draft ? 'var(--ml-charcoal)' : '#FFFFFF',
        flexShrink: 0,
      }}
    >
      {quoteStatusLabels[value]}
    </span>
  );
}

const rowLink: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  alignItems: 'center',
  gap: 12,
  padding: '10px 14px',
  borderRadius: 'var(--ml-radius-md)',
  color: 'inherit',
  textDecoration: 'none',
  transition:
    'background var(--ml-motion-fast) var(--ml-ease-out)',
};
