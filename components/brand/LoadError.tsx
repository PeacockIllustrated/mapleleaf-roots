import Link from 'next/link';

interface Props {
  title: string;
  hint: string;
  detail?: string | null;
  backHref: string;
  backLabel: string;
}

/**
 * LoadError — shown by a Server Component when a Supabase query errors
 * (as opposed to just returning zero rows, which stays as a proper 404).
 *
 * We used to call `notFound()` in these paths, which produced a bare "404"
 * with no clue what actually went wrong — turning a five-minute "apply
 * this migration" fix into an hour of guesswork. This component surfaces
 * the Postgres error message and links back to a sensible fallback page.
 *
 * The detail block is only meaningful to an admin/engineer, so it's
 * rendered in a muted `code` style and wrapped for copy-pasting into a
 * bug report — the franchisee sees the title + hint and knows to tell HQ.
 */
export function LoadError({ title, hint, detail, backHref, backLabel }: Props) {
  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '48px 32px',
        maxWidth: 640,
        margin: '0 auto',
      }}
    >
      <Link
        href={backHref}
        style={{
          fontSize: 12,
          color: 'var(--ml-text-muted)',
          textDecoration: 'none',
          letterSpacing: '0.02em',
        }}
      >
        ← {backLabel}
      </Link>

      <h1
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: 'var(--ml-text-primary)',
        }}
      >
        {title}
      </h1>

      <p
        style={{
          margin: 0,
          fontSize: 14,
          lineHeight: 1.55,
          color: 'var(--ml-text-primary)',
        }}
      >
        {hint}
      </p>

      {detail && (
        <div
          style={{
            padding: '12px 14px',
            background: 'rgba(225, 40, 40, 0.06)',
            border: '0.5px solid rgba(225, 40, 40, 0.35)',
            borderRadius: 'var(--ml-radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--ml-red)',
            }}
          >
            Database error
          </span>
          <code
            style={{
              fontFamily:
                'ui-monospace, "SFMono-Regular", Menlo, monospace',
              fontSize: 12,
              color: 'var(--ml-text-primary)',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
          >
            {detail}
          </code>
        </div>
      )}
    </section>
  );
}
