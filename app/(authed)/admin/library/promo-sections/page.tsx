import { createServerClient } from '@/lib/supabase/server';

type PromoSectionRow = {
  id: string;
  code: string;
  display_name: string;
  description: string | null;
  hex_colour: string;
  source: 'HQ' | 'PROMOTED_SUGGESTION';
  sort_order: number;
};

export default async function PromoSectionsPage() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('promo_sections')
    .select(
      'id, code, display_name, description, hex_colour, source, sort_order'
    )
    .eq('is_active', true)
    .order('sort_order');

  const sections = (data ?? []) as PromoSectionRow[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
          Promo sections
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ml-text-muted)' }}>
          {sections.length} merchandising tags. Each colour is the floor-plan
          fill used when a unit is tagged.
        </p>
      </header>

      {error && (
        <div role="alert" style={errorBanner}>
          Couldn’t load promo sections: {error.message}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 12,
        }}
      >
        {sections.map((s) => (
          <article
            key={s.id}
            style={{
              background: 'var(--ml-surface-panel)',
              border: '0.5px solid var(--ml-border-default)',
              borderRadius: 'var(--ml-radius-lg)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                background: s.hex_colour,
                height: 56,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                padding: '8px 12px',
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: 'rgba(0, 0, 0, 0.6)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily:
                    'ui-monospace, "SFMono-Regular", Menlo, monospace',
                }}
              >
                {s.hex_colour}
              </span>
              {s.source === 'PROMOTED_SUGGESTION' && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: 'rgba(0, 0, 0, 0.7)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    background: 'rgba(255, 255, 255, 0.7)',
                    borderRadius: 4,
                  }}
                >
                  Community
                </span>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                padding: '12px 14px',
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--ml-text-primary)',
                }}
              >
                {s.display_name}
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
              {s.description && (
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: 12,
                    color: 'var(--ml-text-muted)',
                    lineHeight: 1.4,
                  }}
                >
                  {s.description}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

const errorBanner: React.CSSProperties = {
  padding: 12,
  background: 'rgba(225, 40, 40, 0.06)',
  border: '1px solid rgba(225, 40, 40, 0.35)',
  borderRadius: 'var(--ml-radius-md)',
  fontSize: 13,
  color: 'var(--ml-red)',
};
