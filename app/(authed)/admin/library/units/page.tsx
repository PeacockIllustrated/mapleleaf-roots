import { createServerClient } from '@/lib/supabase/server';

type UnitRow = {
  id: string;
  code: string;
  display_name: string;
  description: string | null;
  category:
    | 'DRY_SHELVING'
    | 'CHILLED_FROZEN'
    | 'PROMO_SEASONAL'
    | 'COUNTER_TILL'
    | 'FORECOURT'
    | 'WINDOWS_POS_ONLY';
  width_mm: number;
  depth_mm: number;
  height_mm: number;
  is_double_sided: boolean;
  is_refrigerated: boolean;
  temperature_zone: 'AMBIENT' | 'CHILLED' | 'FROZEN';
  default_shelf_count: number | null;
  sort_order: number;
};

const categoryOrder: UnitRow['category'][] = [
  'DRY_SHELVING',
  'CHILLED_FROZEN',
  'PROMO_SEASONAL',
  'COUNTER_TILL',
  'FORECOURT',
  'WINDOWS_POS_ONLY',
];

const categoryLabels: Record<UnitRow['category'], string> = {
  DRY_SHELVING: 'Dry shelving',
  CHILLED_FROZEN: 'Chilled and frozen',
  PROMO_SEASONAL: 'Promo and seasonal',
  COUNTER_TILL: 'Counter and till',
  FORECOURT: 'Forecourt',
  WINDOWS_POS_ONLY: 'Windows and POS only',
};

export default async function UnitLibraryPage() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('unit_types')
    .select(
      'id, code, display_name, description, category, width_mm, depth_mm, height_mm, is_double_sided, is_refrigerated, temperature_zone, default_shelf_count, sort_order'
    )
    .eq('is_active', true)
    .order('sort_order');

  const units = (data ?? []) as UnitRow[];

  const byCategory = new Map<UnitRow['category'], UnitRow[]>();
  for (const cat of categoryOrder) byCategory.set(cat, []);
  for (const u of units) byCategory.get(u.category)?.push(u);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
          Unit library
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ml-text-muted)' }}>
          {units.length} units available to every site. Dimensions in
          millimetres.
        </p>
      </header>

      {error && (
        <div role="alert" style={errorBanner}>
          Couldn’t load units: {error.message}
        </div>
      )}

      {categoryOrder.map((cat) => {
        const rows = byCategory.get(cat) ?? [];
        if (rows.length === 0) return null;
        return (
          <div
            key={cat}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
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
                {categoryLabels[cat]}
              </h2>
              <span style={{ fontSize: 12, color: 'var(--ml-text-muted)' }}>
                {rows.length}{' '}
                {rows.length === 1 ? 'unit type' : 'unit types'}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 12,
              }}
            >
              {rows.map((u) => (
                <article
                  key={u.id}
                  style={{
                    padding: '14px 16px',
                    background: 'var(--ml-surface-panel)',
                    border: '0.5px solid var(--ml-border-default)',
                    borderRadius: 'var(--ml-radius-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: 'var(--ml-text-primary)',
                        }}
                      >
                        {u.display_name}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--ml-text-muted)',
                          letterSpacing: '0.02em',
                          fontFamily:
                            'ui-monospace, "SFMono-Regular", Menlo, monospace',
                        }}
                      >
                        {u.code}
                      </span>
                    </div>
                    {u.is_refrigerated && <Badge tone="chilled">Chilled</Badge>}
                  </div>

                  {u.description && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: 'var(--ml-text-muted)',
                        lineHeight: 1.4,
                      }}
                    >
                      {u.description}
                    </p>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      flexWrap: 'wrap',
                      marginTop: 4,
                    }}
                  >
                    <Chip
                      label={`${u.width_mm} × ${u.depth_mm} × ${u.height_mm} mm`}
                    />
                    {u.default_shelf_count != null && (
                      <Chip label={`${u.default_shelf_count} shelves`} />
                    )}
                    {u.is_double_sided && <Chip label="Double sided" />}
                    {u.temperature_zone !== 'AMBIENT' && (
                      <Chip label={u.temperature_zone.toLowerCase()} />
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span
      style={{
        padding: '3px 8px',
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--ml-charcoal)',
        background: 'var(--ml-surface-muted)',
        borderRadius: 9999,
        letterSpacing: '0.02em',
      }}
    >
      {label}
    </span>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: 'chilled';
  children: React.ReactNode;
}) {
  const toneStyles: Record<string, React.CSSProperties> = {
    chilled: {
      color: '#1F5FA8',
      background: 'rgba(133, 183, 235, 0.2)',
    },
  };
  return (
    <span
      style={{
        padding: '2px 8px',
        fontSize: 10,
        fontWeight: 500,
        borderRadius: 9999,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        ...toneStyles[tone],
      }}
    >
      {children}
    </span>
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
