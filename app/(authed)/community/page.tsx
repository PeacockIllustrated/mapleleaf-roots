import Link from 'next/link';
import { currentProfile } from '@/lib/auth/require-role';
import { createServerClient } from '@/lib/supabase/server';
import { PageFrame } from '@/components/brand/PageFrame';

type SubmissionRow = {
  id: string;
  title: string;
  description: string;
  category:
    | 'FIXTURE'
    | 'POS_IDEA'
    | 'EXTERIOR'
    | 'PROMO_SECTION'
    | 'OTHER';
  status:
    | 'PENDING'
    | 'UNDER_REVIEW'
    | 'APPROVED'
    | 'FEATURED'
    | 'ADDED_TO_CATALOGUE'
    | 'REJECTED';
  upvote_count: number;
  created_at: string;
  site:
    | { id: string; name: string; code: string }
    | { id: string; name: string; code: string }[]
    | null;
  submitter:
    | { id: string; full_name: string }
    | { id: string; full_name: string }[]
    | null;
};

const categoryLabels: Record<SubmissionRow['category'], string> = {
  FIXTURE: 'Fixture',
  POS_IDEA: 'POS idea',
  EXTERIOR: 'Exterior',
  PROMO_SECTION: 'Promo section',
  OTHER: 'Other',
};

const statusLabels: Record<SubmissionRow['status'], string> = {
  PENDING: 'Pending review',
  UNDER_REVIEW: 'Under review',
  APPROVED: 'Approved',
  FEATURED: 'Featured',
  ADDED_TO_CATALOGUE: 'Added to catalogue',
  REJECTED: 'Not for us',
};

export default async function CommunityPage() {
  const profile = await currentProfile();
  const supabase = await createServerClient();

  // Check whether this user can submit (has any site assignment).
  const { count: assignmentCount } = await supabase
    .from('site_user_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profile?.id ?? '');

  const { data } = await supabase
    .from('community_submissions')
    .select(
      `id, title, description, category, status, upvote_count, created_at,
       site:sites ( id, name, code ),
       submitter:user_profiles!submitted_by ( id, full_name )`
    )
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as unknown as SubmissionRow[];
  const canSubmit = (assignmentCount ?? 0) > 0;

  return (
    <PageFrame>
    <section
      style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 960 }}
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
            Community board
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ml-text-muted)' }}>
            Franchisee ideas for fixtures, POS, and exterior work. HQ reviews
            and promotes the best into the catalogue.
          </p>
        </div>
        {canSubmit && (
          <Link
            href="/community/new"
            style={{
              height: 40,
              padding: '0 18px',
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--ml-action-primary)',
              color: '#FFFFFF',
              border: 0,
              borderRadius: 'var(--ml-radius-md)',
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Share an idea
          </Link>
        )}
      </header>

      {!canSubmit && (
        <div
          style={{
            padding: '14px 18px',
            background: 'var(--ml-surface-panel)',
            border: '0.5px solid var(--ml-border-default)',
            borderRadius: 'var(--ml-radius-md)',
            fontSize: 13,
            color: 'var(--ml-text-muted)',
          }}
        >
          You’ll be able to submit ideas once you’re assigned to a site.
        </div>
      )}

      {rows.length === 0 ? (
        <div
          style={{
            padding: '32px 24px',
            background: 'var(--ml-surface-panel)',
            border: '0.5px solid var(--ml-border-default)',
            borderRadius: 'var(--ml-radius-lg)',
            textAlign: 'center',
            fontSize: 14,
            color: 'var(--ml-text-muted)',
          }}
        >
          No submissions yet. Be the first to share an idea.
        </div>
      ) : (
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
          {rows.map((r) => {
            const site = Array.isArray(r.site) ? r.site[0] : r.site;
            const submitter = Array.isArray(r.submitter)
              ? r.submitter[0]
              : r.submitter;
            const featured = r.status === 'FEATURED';
            return (
              <li
                key={r.id}
                style={{
                  padding: '16px 20px',
                  background: 'var(--ml-surface-panel)',
                  border: '0.5px solid var(--ml-border-default)',
                  borderRadius: 'var(--ml-radius-lg)',
                  borderLeft: featured
                    ? '4px solid var(--ml-gold-mid)'
                    : '0.5px solid var(--ml-border-default)',
                  paddingLeft: featured ? 16 : 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
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
                      {categoryLabels[r.category]}
                    </span>
                    <span
                      aria-hidden="true"
                      style={{ color: 'var(--ml-text-muted)' }}
                    >
                      ·
                    </span>
                    <span
                      style={{ fontSize: 11, color: 'var(--ml-text-muted)' }}
                    >
                      {site?.name ?? '—'}
                    </span>
                  </div>
                  <StatusChip status={r.status} featured={featured} />
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 500,
                    color: 'var(--ml-text-primary)',
                  }}
                >
                  {r.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: 'var(--ml-text-muted)',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {r.description}
                </p>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 4,
                    fontSize: 11,
                    color: 'var(--ml-text-muted)',
                  }}
                >
                  <span>
                    Submitted by {submitter?.full_name ?? 'Unknown'} ·{' '}
                    {new Date(r.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span>{r.upvote_count} upvotes</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
    </PageFrame>
  );
}

function StatusChip({
  status,
  featured,
}: {
  status: SubmissionRow['status'];
  featured: boolean;
}) {
  const bg = featured
    ? 'linear-gradient(90deg, var(--ml-gold-light), var(--ml-gold-mid), var(--ml-gold-dark))'
    : 'var(--ml-surface-muted)';
  const fg = featured ? '#FFFFFF' : 'var(--ml-charcoal)';
  return (
    <span
      style={{
        padding: '4px 10px',
        fontSize: 10,
        fontWeight: 500,
        borderRadius: 9999,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        background: bg,
        color: fg,
      }}
    >
      {statusLabels[status]}
    </span>
  );
}
