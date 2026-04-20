import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentProfile } from '@/lib/auth/require-role';
import { createServerClient } from '@/lib/supabase/server';
import {
  quoteStatusLabels,
  type QuotePayloadV1,
  type QuoteStatus,
} from '@/lib/quote/types';
import { SubmitQuoteButton } from './submit-quote-button';

interface Props {
  params: Promise<{ id: string; ref: string }>;
}

type QuoteRow = {
  id: string;
  quote_ref: string;
  quote_type: 'SITE_FITTING' | 'CAMPAIGN_PACK' | 'ADDITIONAL_SIGNAGE';
  status: QuoteStatus;
  payload: QuotePayloadV1;
  requested_at: string;
  submitted_at: string | null;
};

export default async function QuoteDetailPage({ params }: Props) {
  const { id, ref } = await params;
  const profile = await currentProfile();
  if (!profile) notFound();

  const supabase = await createServerClient();
  const { data: quote } = await supabase
    .from('onesign_quotes')
    .select(
      'id, quote_ref, quote_type, status, payload, requested_at, submitted_at'
    )
    .eq('site_id', id)
    .eq('quote_ref', ref)
    .single();

  if (!quote) notFound();
  const q = quote as unknown as QuoteRow;

  const canSubmit =
    (profile.role === 'HQ_ADMIN' ||
      profile.role === 'AREA_MANAGER' ||
      profile.role === 'SITE_MANAGER') &&
    q.status === 'DRAFT';

  const unitLines = q.payload.line_items.filter(
    (l) => l.line_type === 'UNIT'
  );
  const posLines = q.payload.line_items.filter(
    (l) => l.line_type === 'POS_ARTWORK'
  );

  return (
    <section
      style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 960 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Link
          href={`/sites/${id}/quotes`}
          style={{
            fontSize: 12,
            color: 'var(--ml-text-muted)',
            textDecoration: 'none',
            letterSpacing: '0.02em',
          }}
        >
          ← All quotes
        </Link>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--ml-text-primary)',
                fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
              }}
            >
              {q.quote_ref}
            </h1>
            <span
              style={{
                fontSize: 12,
                color: 'var(--ml-text-muted)',
                letterSpacing: '0.02em',
              }}
            >
              Site fitting · requested{' '}
              {new Date(q.requested_at).toLocaleString('en-GB', {
                dateStyle: 'long',
                timeStyle: 'short',
              })}
              {q.submitted_at
                ? ` · submitted ${new Date(q.submitted_at).toLocaleString(
                    'en-GB',
                    { dateStyle: 'medium', timeStyle: 'short' }
                  )}`
                : ''}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span
              style={{
                padding: '6px 14px',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                borderRadius: 9999,
                background:
                  q.status === 'DRAFT'
                    ? 'var(--ml-surface-muted)'
                    : 'var(--ml-charcoal)',
                color: q.status === 'DRAFT' ? 'var(--ml-charcoal)' : '#FFFFFF',
              }}
            >
              {quoteStatusLabels[q.status]}
            </span>
            {canSubmit && <SubmitQuoteButton quoteRef={q.quote_ref} />}
          </div>
        </div>
      </div>

      <div
        style={{
          background: 'var(--ml-surface-panel)',
          border: '0.5px solid var(--ml-border-default)',
          borderRadius: 'var(--ml-radius-lg)',
          padding: '16px 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <Meta label="Site code" value={q.payload.site.code} mono />
        <Meta label="Site" value={q.payload.site.name} />
        <Meta
          label="Address"
          value={[
            q.payload.site.address.line_1,
            q.payload.site.address.line_2,
            q.payload.site.address.city,
            q.payload.site.address.postcode,
          ]
            .filter(Boolean)
            .join(', ')}
        />
        <Meta
          label="Requested by"
          value={`${q.payload.requested_by.name} · ${q.payload.requested_by.email}`}
        />
      </div>

      <LineGroup
        title="Units"
        count={unitLines.length}
        rows={unitLines.map((l) => ({
          primary: l.unit_label ?? l.unit_type_code ?? '—',
          secondary: [l.unit_type_code, l.promo_section_code]
            .filter(Boolean)
            .join(' · '),
          trailing: `× ${l.quantity}`,
        }))}
      />

      <LineGroup
        title="POS artwork"
        count={posLines.length}
        rows={posLines.map((l) => ({
          primary: l.pos_slot_type_code ?? '—',
          secondary: [
            l.unit_label,
            l.pos_position_label,
            l.material,
            l.promo_section_code,
          ]
            .filter(Boolean)
            .join(' · '),
          trailing: `× ${l.quantity}`,
        }))}
      />
    </section>
  );
}

function Meta({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
          fontSize: 13,
          color: 'var(--ml-text-primary)',
          fontFamily: mono
            ? 'ui-monospace, "SFMono-Regular", Menlo, monospace'
            : 'inherit',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function LineGroup({
  title,
  count,
  rows,
}: {
  title: string;
  count: number;
  rows: Array<{ primary: string; secondary: string; trailing: string }>;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
          {title}
        </h2>
        <span style={{ fontSize: 12, color: 'var(--ml-text-muted)' }}>
          {count} {count === 1 ? 'line' : 'lines'}
        </span>
      </div>
      {rows.length === 0 ? (
        <div
          style={{
            padding: '16px 20px',
            background: 'var(--ml-surface-panel)',
            border: '0.5px solid var(--ml-border-default)',
            borderRadius: 'var(--ml-radius-md)',
            fontSize: 12,
            color: 'var(--ml-text-muted)',
          }}
        >
          None on this quote.
        </div>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            background: 'var(--ml-surface-panel)',
            border: '0.5px solid var(--ml-border-default)',
            borderRadius: 'var(--ml-radius-md)',
            overflow: 'hidden',
          }}
        >
          {rows.map((r, i) => (
            <li
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderBottom:
                  i === rows.length - 1
                    ? 'none'
                    : '0.5px solid var(--ml-border-default)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--ml-text-primary)',
                  }}
                >
                  {r.primary}
                </span>
                {r.secondary && (
                  <span
                    style={{ fontSize: 11, color: 'var(--ml-text-muted)' }}
                  >
                    {r.secondary}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily:
                    'ui-monospace, "SFMono-Regular", Menlo, monospace',
                  color: 'var(--ml-text-primary)',
                }}
              >
                {r.trailing}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
