import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentProfile } from '@/lib/auth/require-role';
import { createServerClient } from '@/lib/supabase/server';
import { quoteStatusLabels, type QuoteStatus } from '@/lib/quote/types';
import { PageFrame } from '@/components/brand/PageFrame';

interface Props {
  params: Promise<{ id: string }>;
}

type QuoteRow = {
  id: string;
  quote_ref: string;
  quote_type: 'SITE_FITTING' | 'CAMPAIGN_PACK' | 'ADDITIONAL_SIGNAGE';
  status: QuoteStatus;
  requested_at: string;
  submitted_at: string | null;
};

const typeLabels: Record<QuoteRow['quote_type'], string> = {
  SITE_FITTING: 'Site fitting',
  CAMPAIGN_PACK: 'Campaign pack',
  ADDITIONAL_SIGNAGE: 'Additional signage',
};

export default async function QuotesListPage({ params }: Props) {
  const { id } = await params;
  const profile = await currentProfile();
  if (!profile) notFound();

  const supabase = await createServerClient();

  const [{ data: site }, { data: quotes }] = await Promise.all([
    supabase.from('sites').select('id, name').eq('id', id).single(),
    supabase
      .from('onesign_quotes')
      .select(
        'id, quote_ref, quote_type, status, requested_at, submitted_at'
      )
      .eq('site_id', id)
      .order('requested_at', { ascending: false }),
  ]);

  if (!site) notFound();

  const rows = (quotes ?? []) as QuoteRow[];

  return (
    <PageFrame>
    <section
      style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Link
          href={`/sites/${id}`}
          style={{
            fontSize: 12,
            color: 'var(--ml-text-muted)',
            textDecoration: 'none',
            letterSpacing: '0.02em',
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
          Onesign quotes
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ml-text-muted)' }}>
          {rows.length === 0
            ? 'No quotes yet. Head back to the planogram to request one.'
            : `${rows.length} ${rows.length === 1 ? 'quote' : 'quotes'} for this site.`}
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
            {rows.map((q, i) => (
              <li
                key={q.id}
                style={{
                  borderBottom:
                    i === rows.length - 1
                      ? 'none'
                      : '0.5px solid var(--ml-border-default)',
                }}
              >
                <Link
                  href={`/sites/${id}/quotes/${q.quote_ref}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    gap: 16,
                    alignItems: 'center',
                    padding: '14px 20px',
                    textDecoration: 'none',
                    color: 'inherit',
                    borderLeft:
                      q.quote_type === 'SITE_FITTING'
                        ? '4px solid var(--ml-red)'
                        : '4px solid transparent',
                    paddingLeft: 16,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        letterSpacing: '0.02em',
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
                      {typeLabels[q.quote_type]} · requested{' '}
                      {new Date(q.requested_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <StatusPill status={q.status} />
                  <span
                    aria-hidden="true"
                    style={{ fontSize: 18, color: 'var(--ml-text-muted)' }}
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
    </PageFrame>
  );
}

function StatusPill({ status }: { status: QuoteStatus }) {
  const draft = status === 'DRAFT';
  return (
    <span
      style={{
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 500,
        borderRadius: 9999,
        letterSpacing: '0.02em',
        background: draft ? 'var(--ml-surface-muted)' : 'var(--ml-charcoal)',
        color: draft ? 'var(--ml-charcoal)' : '#FFFFFF',
      }}
    >
      {quoteStatusLabels[status]}
    </span>
  );
}
