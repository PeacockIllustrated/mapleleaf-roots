import { notFound } from 'next/navigation';
import { currentProfile } from '@/lib/auth/require-role';
import { createServerClient } from '@/lib/supabase/server';
import type {
  ProductSummary,
  ShelfRow,
  ShelfSlot,
  SlotAssignment,
  SlotStockingState,
  UnitPosSlot,
  UnitWithShelves,
} from '@/lib/shelf/types';
import type { PromoSectionSummary } from '@/lib/configurator/types';
import { ShelvesClient } from './shelves-client';
import { LoadError } from '@/components/brand/LoadError';

interface Props {
  params: Promise<{ id: string; unitId: string }>;
}

type RawUnit = {
  id: string;
  label: string;
  promo_section_id: string | null;
  site_planogram_id: string;
  unit_type_id: string;
  notes: string | null;
  unit_type:
    | {
        code: string;
        display_name: string;
        width_mm: number;
        depth_mm: number;
        height_mm: number;
      }
    | Array<{
        code: string;
        display_name: string;
        width_mm: number;
        depth_mm: number;
        height_mm: number;
      }>
    | null;
  shelves:
    | Array<{
        id: string;
        shelf_order: number;
        clearance_mm: number;
        depth_mm: number | null;
        is_base_shelf: boolean;
        promo_section_id: string | null;
        slots: Array<{
          id: string;
          site_unit_shelf_id: string;
          slot_order: number;
          width_mm: number;
          facing_count: number;
          stack_count: number;
          currently_stocking: SlotStockingState;
          assignment: Array<{
            id: string;
            main: ProductSummary | ProductSummary[] | null;
            sub_a: ProductSummary | ProductSummary[] | null;
            sub_b: ProductSummary | ProductSummary[] | null;
          }> | null;
        }>;
      }>
    | null;
};

function firstOrNull<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

/** PostgREST code for "Results contain 0 rows" — a genuine not-found. */
const PG_NO_ROWS = 'PGRST116';

export default async function ShelvesPage({ params }: Props) {
  const { id, unitId } = await params;
  const profile = await currentProfile();
  if (!profile) notFound();

  const supabase = await createServerClient();

  // Site (to confirm access + give the breadcrumb title)
  const { data: site, error: siteErr } = await supabase
    .from('sites')
    .select('id, name')
    .eq('id', id)
    .single();
  if (siteErr && siteErr.code !== PG_NO_ROWS) {
    return (
      <LoadError
        title="Couldn't load this site"
        backHref="/sites"
        backLabel="All sites"
        hint="The database rejected the query for the sites table. The deployed schema may be behind the app — check that every migration in supabase/migrations/ has been applied to the active Supabase project."
        detail={siteErr.message}
      />
    );
  }
  if (!site) notFound();

  // The unit — joined with shelves, slots, and each slot's product assignment.
  const { data: raw, error: unitErr } = await supabase
    .from('site_units')
    .select(
      `id, label, promo_section_id, site_planogram_id, unit_type_id, notes,
       unit_type:unit_types (
         code, display_name, width_mm, depth_mm, height_mm
       ),
       shelves:site_unit_shelves (
         id, shelf_order, clearance_mm, depth_mm, is_base_shelf,
         promo_section_id,
         slots:site_unit_slots (
           id, site_unit_shelf_id, slot_order, width_mm, facing_count,
           stack_count, currently_stocking,
           assignment:slot_product_assignments (
             id,
             main:products!main_product_id (
               id, name, brand, category_id,
               width_mm, height_mm, depth_mm,
               shipper_width_mm, shipper_height_mm, shipper_depth_mm, units_per_shipper,
               gtin, image_url, thumbnail_url, temperature_zone
             ),
             sub_a:products!substitute_a_product_id (
               id, name, brand, category_id,
               width_mm, height_mm, depth_mm,
               shipper_width_mm, shipper_height_mm, shipper_depth_mm, units_per_shipper,
               gtin, image_url, thumbnail_url, temperature_zone
             ),
             sub_b:products!substitute_b_product_id (
               id, name, brand, category_id,
               width_mm, height_mm, depth_mm,
               shipper_width_mm, shipper_height_mm, shipper_depth_mm, units_per_shipper,
               gtin, image_url, thumbnail_url, temperature_zone
             )
           )
         )
       )`
    )
    .eq('id', unitId)
    .single();

  if (unitErr && unitErr.code !== PG_NO_ROWS) {
    // This is the exact failure mode that bit us on the deployed preview:
    // when the shipper/stack_count columns or the pos_material_requests
    // table don't exist on the deployed Supabase project, PostgREST errors
    // out and we previously swallowed it as a 404. Show the actual error
    // so the next schema drift is obvious.
    return (
      <LoadError
        title="Couldn't load this unit"
        backHref={`/sites/${id}/planogram`}
        backLabel="Back to planogram"
        hint={
          'The nested query on site_units / site_unit_slots / products ' +
          'failed. Most often this means the deployed Supabase project is ' +
          'missing one of the later migrations (003-shipper/stack/POS ' +
          'requests, 004-pos artwork, 005-clearance lock). Apply any ' +
          'pending migrations from supabase/migrations/ and reload.'
        }
        detail={unitErr.message}
      />
    );
  }
  if (!raw) notFound();
  const unit = raw as unknown as RawUnit;
  const ut = firstOrNull(unit.unit_type);
  if (!ut) notFound();

  // Shape shelves into the canonical form the client expects.
  const shelves: ShelfRow[] = (unit.shelves ?? [])
    .slice()
    .sort((a, b) => a.shelf_order - b.shelf_order)
    .map((s) => {
      const slots: ShelfSlot[] = (s.slots ?? [])
        .slice()
        .sort((a, b) => a.slot_order - b.slot_order)
        .map((raw) => {
          const a = firstOrNull(raw.assignment);
          const assignment: SlotAssignment | null = a
            ? {
                id: a.id,
                main: firstOrNull(a.main),
                sub_a: firstOrNull(a.sub_a),
                sub_b: firstOrNull(a.sub_b),
              }
            : null;
          return {
            id: raw.id,
            shelf_id: raw.site_unit_shelf_id,
            slot_order: raw.slot_order,
            width_mm: raw.width_mm,
            facing_count: raw.facing_count,
            stack_count: raw.stack_count ?? 1,
            currently_stocking: raw.currently_stocking,
            assignment,
          };
        });
      return {
        id: s.id,
        shelf_order: s.shelf_order,
        clearance_mm: s.clearance_mm,
        depth_mm: s.depth_mm,
        is_base_shelf: s.is_base_shelf,
        promo_section_id: s.promo_section_id,
        slots,
      };
    });

  // POS slots the unit type carries — rendered in the header and shelf-edge
  // zones so users can see the printable real estate at a glance.
  const { data: posRows } = await supabase
    .from('unit_type_pos_slots')
    .select(
      `id, position_label, quantity,
       pos_slot_type:pos_slot_types (
         code, display_name, width_mm, height_mm, mount_method, default_material
       )`
    )
    .eq('unit_type_id', unit.unit_type_id);

  type PosRaw = {
    id: string;
    position_label: string | null;
    quantity: number;
    pos_slot_type:
      | UnitPosSlot['pos_slot_type']
      | UnitPosSlot['pos_slot_type'][]
      | null;
  };

  const posSlots: UnitPosSlot[] = ((posRows ?? []) as unknown as PosRaw[])
    .map((r) => {
      const pst = Array.isArray(r.pos_slot_type)
        ? r.pos_slot_type[0]
        : r.pos_slot_type;
      if (!pst) return null;
      return {
        id: r.id,
        position_label: r.position_label,
        quantity: r.quantity,
        pos_slot_type: pst,
      } satisfies UnitPosSlot;
    })
    .filter((x): x is UnitPosSlot => x !== null);

  const unitWithShelves: UnitWithShelves = {
    id: unit.id,
    site_id: site.id as string,
    site_name: site.name as string,
    unit_type_code: ut.code,
    unit_type_name: ut.display_name,
    label: unit.label,
    width_mm: ut.width_mm,
    depth_mm: ut.depth_mm,
    height_mm: ut.height_mm,
    promo_section_id: unit.promo_section_id,
    notes: unit.notes,
    shelves,
    pos_slots: posSlots,
  };

  // Promo sections — for shelf colour lookups.
  const { data: promoRows } = await supabase
    .from('promo_sections')
    .select('id, code, display_name, hex_colour, sort_order')
    .eq('is_active', true)
    .order('sort_order');
  const promoSections = (promoRows ?? []) as PromoSectionSummary[];

  // Products — the picker's pool.
  const { data: productRows } = await supabase
    .from('products')
    .select(
      `id, name, brand, category_id,
       width_mm, height_mm, depth_mm,
       shipper_width_mm, shipper_height_mm, shipper_depth_mm, units_per_shipper,
       gtin, image_url, thumbnail_url, temperature_zone`
    )
    .eq('is_active', true)
    .order('brand')
    .order('name');
  const products = (productRows ?? []) as ProductSummary[];

  const canEdit =
    profile.role === 'HQ_ADMIN' ||
    profile.role === 'AREA_MANAGER' ||
    profile.role === 'SITE_MANAGER';
  const canRequestRedelivery = canEdit;

  const { data: posIssuesRaw } = await supabase
    .from('pos_material_requests')
    .select(
      'id, unit_type_pos_slot_id, reason, notes, status, reported_at'
    )
    .eq('site_unit_id', unitId)
    .order('reported_at', { ascending: false });
  const posIssues = (posIssuesRaw ?? []) as Array<{
    id: string;
    unit_type_pos_slot_id: string;
    reason: string;
    notes: string | null;
    status: string;
    reported_at: string;
  }>;

  const { data: artworkRaw } = await supabase
    .from('site_unit_pos_artwork')
    .select('unit_type_pos_slot_id, artwork_url, notes')
    .eq('site_unit_id', unitId);
  const posArtwork = (artworkRaw ?? []) as Array<{
    unit_type_pos_slot_id: string;
    artwork_url: string | null;
    notes: string | null;
  }>;

  return (
    <ShelvesClient
      unit={unitWithShelves}
      promoSections={promoSections}
      products={products}
      canEdit={canEdit}
      canRequestRedelivery={canRequestRedelivery}
      posIssues={posIssues}
      posArtwork={posArtwork}
    />
  );
}
