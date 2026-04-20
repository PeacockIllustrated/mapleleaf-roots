import { createServerClient } from '@/lib/supabase/server';

type PosSlotRow = {
  id: string;
  code: string;
  display_name: string;
  description: string | null;
  width_mm: number;
  height_mm: number;
  mount_method:
    | 'PRICE_CHANNEL'
    | 'ADHESIVE'
    | 'POSTER_POCKET'
    | 'MAGNETIC'
    | 'RAIL_INSERT'
    | 'FREESTANDING'
    | 'VINYL_DIRECT';
  default_material:
    | 'PAPER'
    | 'RIGID_PVC'
    | 'FOAMEX'
    | 'CORRUGATED_CARD'
    | 'VINYL'
    | 'ACRYLIC'
    | 'FABRIC';
  requires_hq_approval: boolean;
  sort_order: number;
};

const mountLabels: Record<PosSlotRow['mount_method'], string> = {
  PRICE_CHANNEL: 'Price channel',
  ADHESIVE: 'Adhesive',
  POSTER_POCKET: 'Poster pocket',
  MAGNETIC: 'Magnetic',
  RAIL_INSERT: 'Rail insert',
  FREESTANDING: 'Freestanding',
  VINYL_DIRECT: 'Vinyl direct',
};

const materialLabels: Record<PosSlotRow['default_material'], string> = {
  PAPER: 'Paper',
  RIGID_PVC: 'Rigid PVC',
  FOAMEX: 'Foamex',
  CORRUGATED_CARD: 'Corrugated card',
  VINYL: 'Vinyl',
  ACRYLIC: 'Acrylic',
  FABRIC: 'Fabric',
};

export default async function PosSlotsPage() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('pos_slot_types')
    .select(
      'id, code, display_name, description, width_mm, height_mm, mount_method, default_material, requires_hq_approval, sort_order'
    )
    .eq('is_active', true)
    .order('sort_order');

  const slots = (data ?? []) as PosSlotRow[];

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
          POS slot types
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ml-text-muted)' }}>
          {slots.length} artwork positions defined. Dimensions in millimetres.
        </p>
      </header>

      {error && (
        <div role="alert" style={errorBanner}>
          Couldn’t load POS slot types: {error.message}
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
              <Th>Slot</Th>
              <Th align="right">Size (mm)</Th>
              <Th>Mount</Th>
              <Th>Material</Th>
              <Th align="right">HQ approval</Th>
            </tr>
          </thead>
          <tbody>
            {slots.map((s, i) => (
              <tr
                key={s.id}
                style={{
                  borderBottom:
                    i === slots.length - 1
                      ? 'none'
                      : '0.5px solid var(--ml-border-default)',
                }}
              >
                <Td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span
                      style={{
                        fontSize: 13,
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
                  </div>
                </Td>
                <Td align="right">
                  <span
                    style={{
                      fontFamily:
                        'ui-monospace, "SFMono-Regular", Menlo, monospace',
                      fontSize: 12,
                      color: 'var(--ml-text-primary)',
                    }}
                  >
                    {s.width_mm} × {s.height_mm}
                  </span>
                </Td>
                <Td>{mountLabels[s.mount_method]}</Td>
                <Td>{materialLabels[s.default_material]}</Td>
                <Td align="right">
                  {s.requires_hq_approval ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: 'var(--ml-red)',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Required
                    </span>
                  ) : (
                    <span
                      style={{ fontSize: 11, color: 'var(--ml-text-muted)' }}
                    >
                      —
                    </span>
                  )}
                </Td>
              </tr>
            ))}
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

const errorBanner: React.CSSProperties = {
  padding: 12,
  background: 'rgba(225, 40, 40, 0.06)',
  border: '1px solid rgba(225, 40, 40, 0.35)',
  borderRadius: 'var(--ml-radius-md)',
  fontSize: 13,
  color: 'var(--ml-red)',
};
