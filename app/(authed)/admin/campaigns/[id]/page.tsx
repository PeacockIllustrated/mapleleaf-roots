import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { campaignMatchingSites } from '@/lib/campaigns/matching-sites';
import type {
  CampaignArtwork,
  CampaignClassificationTarget,
  CampaignStatus,
  CampaignUnitTarget,
} from '@/lib/campaigns/types';
import { UnitTargetsPanel } from './unit-targets-panel';
import { ClassificationTargetsPanel } from './classification-targets-panel';
import { ArtworkPanel } from './artwork-panel';
import { PublishPanel } from './publish-panel';

interface Props {
  params: Promise<{ id: string }>;
}

type CampaignRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  scope: 'GLOBAL' | 'LOCAL';
  status: CampaignStatus;
  starts_at: string | null;
  ends_at: string | null;
  brief_url: string | null;
  created_at: string;
};

type UnitType = {
  id: string;
  code: string;
  display_name: string;
  category: string;
};

type PromoSection = {
  id: string;
  code: string;
  display_name: string;
  hex_colour: string;
};

type ClassificationTag = {
  id: string;
  code: string;
  name: string;
};

type PosSlotType = {
  id: string;
  code: string;
  display_name: string;
  width_mm: number;
  height_mm: number;
  default_material: string;
};

type UnitPosSlot = {
  unit_type_id: string;
  pos_slot_type_id: string;
  position_label: string | null;
  quantity: number;
};

type RolloutMini = {
  id: string;
  site_id: string;
  status: string;
  total_tasks: number;
  completed_tasks: number;
  quote_ref: string | null;
  sites: { name: string; code: string } | { name: string; code: string }[] | null;
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

export default async function CampaignDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerClient();

  const [
    { data: campaign },
    { data: unitTargets },
    { data: classTargets },
    { data: artwork },
    { data: unitTypes },
    { data: promoSections },
    { data: classTags },
    { data: posSlotTypes },
    { data: unitPosSlots },
    { data: rollouts },
  ] = await Promise.all([
    supabase
      .from('campaigns')
      .select(
        'id, code, name, description, scope, status, starts_at, ends_at, brief_url, created_at'
      )
      .eq('id', id)
      .single(),
    supabase
      .from('campaign_unit_targets')
      .select('id, campaign_id, unit_type_id, promo_section_id')
      .eq('campaign_id', id),
    supabase
      .from('campaign_classification_targets')
      .select('id, campaign_id, classification_tag_id')
      .eq('campaign_id', id),
    supabase
      .from('campaign_artwork')
      .select(
        'id, campaign_id, unit_type_id, pos_slot_type_id, target_promo_section_id, linked_product_id, artwork_url, preview_url, material, quantity_per_target, notes'
      )
      .eq('campaign_id', id),
    supabase
      .from('unit_types')
      .select('id, code, display_name, category')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('promo_sections')
      .select('id, code, display_name, hex_colour')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('classification_tags')
      .select('id, code, name')
      .order('sort_order'),
    supabase
      .from('pos_slot_types')
      .select(
        'id, code, display_name, width_mm, height_mm, default_material'
      )
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('unit_type_pos_slots')
      .select('unit_type_id, pos_slot_type_id, position_label, quantity'),
    supabase
      .from('site_campaign_rollouts')
      .select(
        'id, site_id, status, total_tasks, completed_tasks, quote_ref, sites ( name, code )'
      )
      .eq('campaign_id', id)
      .order('created_at', { ascending: true }),
  ]);

  if (!campaign) notFound();
  const c = campaign as CampaignRow;

  const unitTypeList = (unitTypes ?? []) as UnitType[];
  const promoSectionList = (promoSections ?? []) as PromoSection[];
  const classTagList = (classTags ?? []) as ClassificationTag[];
  const posSlotTypeList = (posSlotTypes ?? []) as PosSlotType[];
  const unitPosSlotList = (unitPosSlots ?? []) as UnitPosSlot[];
  const unitTargetList = (unitTargets ?? []) as CampaignUnitTarget[];
  const classTargetList = (classTargets ?? []) as CampaignClassificationTarget[];
  const artworkList = (artwork ?? []) as CampaignArtwork[];
  const rolloutList = (rollouts ?? []) as unknown as RolloutMini[];

  const matching = await campaignMatchingSites(supabase, id).catch(() => ({
    siteIds: [] as string[],
  }));

  const isDraft = c.status === 'DRAFT';
  const isPublished = !['DRAFT', 'SUBMITTED', 'REJECTED'].includes(c.status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <Link
          href="/admin/campaigns"
          style={{
            fontSize: 12,
            color: 'var(--ml-text-muted)',
            textDecoration: 'none',
          }}
        >
          ← All campaigns
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
              {c.name}
            </h1>
            <div
              style={{
                display: 'flex',
                gap: 10,
                fontSize: 12,
                color: 'var(--ml-text-muted)',
              }}
            >
              <span
                style={{
                  fontFamily: 'ui-monospace, Menlo, monospace',
                }}
              >
                {c.code}
              </span>
              <span aria-hidden="true">·</span>
              <span>{c.scope.toLowerCase()}</span>
              {c.starts_at && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {formatDate(c.starts_at)}
                    {c.ends_at ? ` → ${formatDate(c.ends_at)}` : ''}
                  </span>
                </>
              )}
            </div>
          </div>
          <span style={statusPill(c.status)}>{statusLabels[c.status]}</span>
        </div>
        {c.description && (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: 'var(--ml-text-primary)',
              maxWidth: 720,
              lineHeight: 1.5,
            }}
          >
            {c.description}
          </p>
        )}
        {c.brief_url && (
          <a
            href={c.brief_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12,
              color: 'var(--ml-red)',
              textDecoration: 'none',
              width: 'fit-content',
            }}
          >
            Open design brief →
          </a>
        )}
      </header>

      {artworkList.length > 0 && (
        <ArtworkGalleryStrip
          artwork={artworkList}
          posSlotTypes={posSlotTypeList}
          unitTypes={unitTypeList}
        />
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Section
            title="Unit-type targets"
            hint="Campaign applies to any site with at least one placed unit of these types."
          >
            <UnitTargetsPanel
              campaignId={c.id}
              editable={isDraft}
              unitTypes={unitTypeList}
              promoSections={promoSectionList}
              targets={unitTargetList}
            />
          </Section>

          <Section
            title="Classification filter"
            hint="Optional AND filter — site must have every tag below. Leave empty to accept all sites with matching units."
          >
            <ClassificationTargetsPanel
              campaignId={c.id}
              editable={isDraft}
              tags={classTagList}
              targets={classTargetList}
            />
          </Section>

          <Section
            title="Artwork"
            hint="One artwork per (unit type × POS slot). Promo-section-specific artwork takes priority over generic."
          >
            <ArtworkPanel
              campaignId={c.id}
              editable={isDraft}
              unitTypes={unitTypeList}
              posSlotTypes={posSlotTypeList}
              unitPosSlots={unitPosSlotList}
              promoSections={promoSectionList}
              artwork={artworkList}
              unitTargets={unitTargetList}
            />
          </Section>

          {rolloutList.length > 0 && (
            <Section title="Rollouts">
              <div
                style={{
                  background: 'var(--ml-surface-panel)',
                  border: '0.5px solid var(--ml-border-default)',
                  borderRadius: 'var(--ml-radius-lg)',
                  overflow: 'hidden',
                }}
              >
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {rolloutList.map((r, i) => {
                    const site = Array.isArray(r.sites) ? r.sites[0] : r.sites;
                    return (
                      <li
                        key={r.id}
                        style={{
                          borderBottom:
                            i === rolloutList.length - 1
                              ? 'none'
                              : '0.5px solid var(--ml-border-default)',
                        }}
                      >
                        <Link
                          href={`/sites/${r.site_id}/rollouts/${r.id}`}
                          style={rowLink}
                        >
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: 'var(--ml-text-primary)',
                              }}
                            >
                              {site?.name ?? '—'}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                color: 'var(--ml-text-muted)',
                                fontFamily: 'ui-monospace, Menlo, monospace',
                              }}
                            >
                              {site?.code ?? ''}{' '}
                              {r.quote_ref ? `· ${r.quote_ref}` : ''}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              color: 'var(--ml-text-muted)',
                            }}
                          >
                            {r.completed_tasks}/{r.total_tasks} tasks
                          </span>
                          <span style={rolloutStatusPill(r.status)}>
                            {r.status.replace(/_/g, ' ').toLowerCase()}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Section>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <MatchingSitesPreview siteIds={matching.siteIds} />
          <PublishPanel
            campaignId={c.id}
            status={c.status}
            canPublish={isDraft}
            canArchive={isPublished}
            matchingCount={matching.siteIds.length}
            unitTargetCount={unitTargetList.length}
            artworkCount={artworkList.length}
          />
        </div>
      </div>
    </div>
  );
}

function ArtworkGalleryStrip({
  artwork,
  posSlotTypes,
  unitTypes,
}: {
  artwork: CampaignArtwork[];
  posSlotTypes: PosSlotType[];
  unitTypes: UnitType[];
}) {
  const slotById = new Map(posSlotTypes.map((p) => [p.id, p]));
  const utById = new Map(unitTypes.map((u) => [u.id, u]));

  return (
    <section
      style={{
        background: 'var(--ml-charcoal)',
        borderRadius: 'var(--ml-radius-lg)',
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            Artwork pack
          </span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: '#FFFFFF',
            }}
          >
            {artwork.length} {artwork.length === 1 ? 'piece' : 'pieces'} ready
            for production
          </span>
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 12,
        }}
      >
        {artwork.map((a) => {
          const slot = slotById.get(a.pos_slot_type_id);
          const unit = utById.get(a.unit_type_id);
          const aspect = slot
            ? `${slot.width_mm} / ${slot.height_mm}`
            : '4 / 3';
          return (
            <a
              key={a.id}
              href={a.artwork_url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div
                style={{
                  aspectRatio: aspect,
                  background:
                    'repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 8px, rgba(255,255,255,0.02) 8px 16px)',
                  border: '0.5px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 'var(--ml-radius-md)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 10,
                }}
              >
                {a.artwork_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.artwork_url}
                    alt=""
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                      borderRadius: 2,
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.4)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Empty
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: '#FFFFFF',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {slot?.display_name ?? 'POS slot'}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: 'rgba(255, 255, 255, 0.55)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {unit?.display_name ?? ''}
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}

async function MatchingSitesPreview({ siteIds }: { siteIds: string[] }) {
  const supabase = await createServerClient();
  const { data } = siteIds.length
    ? await supabase
        .from('sites')
        .select('id, name, code')
        .in('id', siteIds)
        .order('name')
    : { data: [] as { id: string; name: string; code: string }[] };
  const rows = (data ?? []) as { id: string; name: string; code: string }[];

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
          padding: '14px 18px',
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
          Matching sites
        </span>
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--ml-text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <div
          style={{
            padding: '18px',
            fontSize: 12,
            color: 'var(--ml-text-muted)',
            textAlign: 'center',
          }}
        >
          No sites match yet. Add unit-type targets to start matching.
        </div>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: '6px 0',
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {rows.map((s) => (
            <li key={s.id}>
              <Link
                href={`/sites/${s.id}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '8px 18px',
                  textDecoration: 'none',
                  color: 'inherit',
                  fontSize: 12,
                }}
              >
                <span style={{ color: 'var(--ml-text-primary)' }}>
                  {s.name}
                </span>
                <span
                  style={{
                    color: 'var(--ml-text-muted)',
                    fontFamily: 'ui-monospace, Menlo, monospace',
                  }}
                >
                  {s.code}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
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
          {title}
        </h2>
        {hint && (
          <span style={{ fontSize: 12, color: 'var(--ml-text-muted)' }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusPill(status: CampaignStatus): React.CSSProperties {
  const tones: Record<
    CampaignStatus,
    { bg: string; fg: string }
  > = {
    DRAFT: { bg: 'var(--ml-surface-muted)', fg: 'var(--ml-charcoal)' },
    SUBMITTED: { bg: 'rgba(133, 183, 235, 0.2)', fg: '#1F5FA8' },
    APPROVED: { bg: 'rgba(133, 183, 235, 0.2)', fg: '#1F5FA8' },
    SCHEDULED: { bg: 'var(--ml-charcoal)', fg: '#FFFFFF' },
    LIVE: { bg: 'var(--ml-red)', fg: '#FFFFFF' },
    ARCHIVED: { bg: 'var(--ml-surface-muted)', fg: 'var(--ml-text-muted)' },
    REJECTED: { bg: 'rgba(225, 40, 40, 0.08)', fg: 'var(--ml-red)' },
  };
  const t = tones[status];
  return {
    padding: '5px 12px',
    fontSize: 11,
    fontWeight: 500,
    borderRadius: 9999,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    background: t.bg,
    color: t.fg,
    flexShrink: 0,
  };
}

function rolloutStatusPill(status: string): React.CSSProperties {
  return {
    padding: '4px 10px',
    fontSize: 10,
    fontWeight: 500,
    borderRadius: 9999,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    background:
      status === 'INSTALLED'
        ? 'var(--ml-red)'
        : status === 'PROBLEM'
          ? 'rgba(225, 40, 40, 0.12)'
          : 'var(--ml-surface-muted)',
    color:
      status === 'INSTALLED'
        ? '#FFFFFF'
        : status === 'PROBLEM'
          ? 'var(--ml-red)'
          : 'var(--ml-charcoal)',
    flexShrink: 0,
  };
}

const rowLink: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto auto',
  alignItems: 'center',
  gap: 16,
  padding: '12px 18px',
  textDecoration: 'none',
  color: 'inherit',
};
