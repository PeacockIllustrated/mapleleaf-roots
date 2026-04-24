import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentProfile } from '@/lib/auth/require-role';
import { createServerClient } from '@/lib/supabase/server';
import { ClassificationTags } from './classification-tags';
import { PageFrame } from '@/components/brand/PageFrame';

type Site = {
  id: string;
  code: string;
  name: string;
  area_id: string | null;
  tier: 'SMALL' | 'MEDIUM' | 'LARGE';
  onboarding_status:
    | 'INVITED'
    | 'CONFIGURING'
    | 'QUOTE_REQUESTED'
    | 'QUOTE_APPROVED'
    | 'FITTING'
    | 'ACTIVE'
    | 'SUSPENDED';
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  postcode: string | null;
  opened_at: string | null;
};

type Tag = { id: string; code: string; name: string; sort_order: number };

const statusLabels: Record<Site['onboarding_status'], string> = {
  INVITED: 'Invited',
  CONFIGURING: 'Configuring',
  QUOTE_REQUESTED: 'Quote requested',
  QUOTE_APPROVED: 'Quote approved',
  FITTING: 'Fitting',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SiteDetailPage({ params }: PageProps) {
  const { id } = await params;
  const profile = await currentProfile();
  if (!profile) notFound();

  const supabase = await createServerClient();

  const [
    { data: site, error: siteErr },
    { data: tags },
    { data: applied },
    { data: area },
  ] = await Promise.all([
    supabase
      .from('sites')
      .select(
        'id, code, name, area_id, tier, onboarding_status, address_line_1, address_line_2, city, postcode, opened_at'
      )
      .eq('id', id)
      .single(),
    supabase
      .from('classification_tags')
      .select('id, code, name, sort_order')
      .order('sort_order'),
    supabase.from('site_classifications').select('tag_id').eq('site_id', id),
    supabase
      .from('sites')
      .select('areas ( id, name )')
      .eq('id', id)
      .single(),
  ]);

  if (siteErr || !site) notFound();

  const typedSite = site as Site;
  const typedTags = (tags ?? []) as Tag[];
  const appliedIds = new Set(
    ((applied ?? []) as { tag_id: string }[]).map((r) => r.tag_id)
  );
  const areaField = (area as unknown as {
    areas?: { id: string; name: string } | { id: string; name: string }[] | null;
  } | null)?.areas;
  const areaName = Array.isArray(areaField)
    ? (areaField[0]?.name ?? 'Unassigned')
    : (areaField?.name ?? 'Unassigned');

  const canEdit =
    profile.role === 'HQ_ADMIN' ||
    profile.role === 'AREA_MANAGER' ||
    profile.role === 'SITE_MANAGER';

  return (
    <PageFrame>
    <section
      style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 960 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Link
          href="/sites"
          style={{
            fontSize: 12,
            color: 'var(--ml-text-muted)',
            textDecoration: 'none',
            letterSpacing: '0.02em',
          }}
        >
          ← All sites
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
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--ml-text-primary)',
              }}
            >
              {typedSite.name}
            </h1>
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                fontSize: 12,
                color: 'var(--ml-text-muted)',
                letterSpacing: '0.02em',
              }}
            >
              <span>{typedSite.code}</span>
              <span aria-hidden="true">·</span>
              <span>{areaName}</span>
              <span aria-hidden="true">·</span>
              <span>{typedSite.tier.toLowerCase()}</span>
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--ml-charcoal)',
              background: 'var(--ml-surface-muted)',
              padding: '6px 12px',
              borderRadius: 9999,
              letterSpacing: '0.02em',
            }}
          >
            {statusLabels[typedSite.onboarding_status]}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        <InfoCard title="Address">
          {typedSite.address_line_1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span>{typedSite.address_line_1}</span>
              {typedSite.address_line_2 && <span>{typedSite.address_line_2}</span>}
              <span>
                {[typedSite.city, typedSite.postcode].filter(Boolean).join(', ')}
              </span>
            </div>
          ) : (
            <span style={{ color: 'var(--ml-text-muted)' }}>
              No address on file.
            </span>
          )}
        </InfoCard>

        <InfoCard title="Opened">
          {typedSite.opened_at ? (
            new Date(typedSite.opened_at).toLocaleDateString('en-GB', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          ) : (
            <span style={{ color: 'var(--ml-text-muted)' }}>Not yet opened</span>
          )}
        </InfoCard>

        <InfoCard title="Planogram">
          <Link
            href={`/sites/${typedSite.id}/planogram`}
            style={{
              color: 'var(--ml-red)',
              fontWeight: 500,
              textDecoration: 'none',
              letterSpacing: '0.01em',
            }}
          >
            Open the configurator →
          </Link>
        </InfoCard>

        <InfoCard title="Campaign rollouts">
          <Link
            href={`/sites/${typedSite.id}/rollouts`}
            style={{
              color: 'var(--ml-red)',
              fontWeight: 500,
              textDecoration: 'none',
              letterSpacing: '0.01em',
            }}
          >
            View rollouts →
          </Link>
        </InfoCard>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
              fontSize: 17,
              fontWeight: 500,
              color: 'var(--ml-text-primary)',
            }}
          >
            Classifications
          </h2>
          <span
            style={{
              fontSize: 12,
              color: 'var(--ml-text-muted)',
            }}
          >
            Used for campaign targeting and reporting.
          </span>
        </div>
        <ClassificationTags
          siteId={typedSite.id}
          tags={typedTags}
          appliedIds={[...appliedIds]}
          canEdit={canEdit}
        />
      </div>
    </section>
    </PageFrame>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: '16px 20px',
        background: 'var(--ml-surface-panel)',
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 96,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--ml-text-muted)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </span>
      <div style={{ fontSize: 14, color: 'var(--ml-text-primary)' }}>
        {children}
      </div>
    </div>
  );
}
