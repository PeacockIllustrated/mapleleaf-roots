import { createServerClient } from '@/lib/supabase/server';
import { SyncImagesButton } from './sync-images-button';

type ProductRow = {
  id: string;
  sku: string | null;
  gtin: string | null;
  name: string;
  brand: string | null;
  category:
    | { id: string; code: string; name: string }
    | { id: string; code: string; name: string }[]
    | null;
  width_mm: number | null;
  height_mm: number | null;
  depth_mm: number | null;
  image_url: string | null;
  thumbnail_url: string | null;
  data_source:
    | 'OPEN_FOOD_FACTS'
    | 'OPEN_PRODUCTS_FACTS'
    | 'INTERNAL_CATALOGUE'
    | 'FRANCHISEE_SUBMITTED';
  temperature_zone: 'AMBIENT' | 'CHILLED' | 'FROZEN';
  is_active: boolean;
};

const sourceLabels: Record<ProductRow['data_source'], string> = {
  OPEN_FOOD_FACTS: 'Open Food Facts',
  OPEN_PRODUCTS_FACTS: 'Open Products Facts',
  INTERNAL_CATALOGUE: 'Internal',
  FRANCHISEE_SUBMITTED: 'Franchisee',
};

const zoneLabels: Record<ProductRow['temperature_zone'], string> = {
  AMBIENT: 'Ambient',
  CHILLED: 'Chilled',
  FROZEN: 'Frozen',
};

export default async function ProductsLibraryPage() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('products')
    .select(
      `id, sku, gtin, name, brand,
       width_mm, height_mm, depth_mm,
       image_url, thumbnail_url,
       data_source, temperature_zone, is_active,
       category:product_categories ( id, code, name )`
    )
    .eq('is_active', true)
    .order('brand', { ascending: true })
    .order('name', { ascending: true });

  const rows = (data ?? []) as unknown as ProductRow[];

  const withImages = rows.filter((r) => !!r.image_url || !!r.thumbnail_url)
    .length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
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
            Product catalogue
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ml-text-muted)' }}>
            {rows.length} active · {withImages} with images. Dimensions in
            millimetres.
          </p>
        </div>
        <SyncImagesButton />
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
          Couldn’t load products: {error.message}
        </div>
      )}

      <div
        style={{
          background: 'var(--ml-surface-panel)',
          border: '0.5px solid var(--ml-border-default)',
          borderRadius: 'var(--ml-radius-lg)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr
              style={{
                background: 'var(--ml-surface-muted)',
                borderBottom: '0.5px solid var(--ml-border-default)',
              }}
            >
              <Th>{'\u00A0'}</Th>
              <Th>Product</Th>
              <Th>Category</Th>
              <Th align="right">Dimensions (mm)</Th>
              <Th>GTIN</Th>
              <Th>Source</Th>
              <Th>Zone</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => {
              const cat = Array.isArray(p.category) ? p.category[0] : p.category;
              const thumb = p.thumbnail_url ?? p.image_url;
              return (
                <tr
                  key={p.id}
                  style={{
                    borderBottom:
                      i === rows.length - 1
                        ? 'none'
                        : '0.5px solid var(--ml-border-default)',
                  }}
                >
                  <Td>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 6,
                        border: '0.5px solid var(--ml-border-default)',
                        background: 'var(--ml-off-white)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          width={44}
                          height={44}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: 10,
                            color: 'var(--ml-text-muted)',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                          }}
                        >
                          No img
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <div
                      style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: 'var(--ml-text-primary)',
                        }}
                      >
                        {p.name}
                      </span>
                      <span
                        style={{ fontSize: 11, color: 'var(--ml-text-muted)' }}
                      >
                        {[p.brand, p.sku]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    {cat?.name ?? (
                      <span style={{ color: 'var(--ml-text-muted)' }}>
                        Unmapped
                      </span>
                    )}
                  </Td>
                  <Td align="right">
                    <span
                      style={{
                        fontFamily:
                          'ui-monospace, "SFMono-Regular", Menlo, monospace',
                        fontSize: 12,
                      }}
                    >
                      {p.width_mm ?? '?'} × {p.height_mm ?? '?'} ×{' '}
                      {p.depth_mm ?? '?'}
                    </span>
                  </Td>
                  <Td>
                    <span
                      style={{
                        fontFamily:
                          'ui-monospace, "SFMono-Regular", Menlo, monospace',
                        fontSize: 11,
                        color: p.gtin
                          ? 'var(--ml-text-primary)'
                          : 'var(--ml-text-muted)',
                      }}
                    >
                      {p.gtin ?? '—'}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ fontSize: 11, color: 'var(--ml-text-muted)' }}>
                      {sourceLabels[p.data_source]}
                    </span>
                  </Td>
                  <Td>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: 9999,
                        background:
                          p.temperature_zone === 'CHILLED'
                            ? 'rgba(133, 183, 235, 0.20)'
                            : p.temperature_zone === 'FROZEN'
                            ? 'rgba(175, 169, 236, 0.25)'
                            : 'var(--ml-surface-muted)',
                        color:
                          p.temperature_zone === 'CHILLED'
                            ? '#1F5FA8'
                            : p.temperature_zone === 'FROZEN'
                            ? '#4844B7'
                            : 'var(--ml-charcoal)',
                      }}
                    >
                      {zoneLabels[p.temperature_zone]}
                    </span>
                  </Td>
                </tr>
              );
            })}
            {rows.length === 0 && !error && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: 40,
                    textAlign: 'center',
                    fontSize: 13,
                    color: 'var(--ml-text-muted)',
                  }}
                >
                  No products yet. Run seed 008 or wait for the OFF sync.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      style={{
        textAlign: align,
        padding: '10px 16px',
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--ml-text-muted)',
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <td
      style={{
        textAlign: align,
        padding: '12px 16px',
        fontSize: 13,
        color: 'var(--ml-text-primary)',
        verticalAlign: 'middle',
      }}
    >
      {children}
    </td>
  );
}
