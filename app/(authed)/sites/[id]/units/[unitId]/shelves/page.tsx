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

interface Props {
  params: Promise<{ id: string; unitId: string }>;
}

type RawUnit = {
  id: string;
  label: string;
  promo_section_id: string | null;
  site_planogram_id: string;
  unit_type_id: string;
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

export default async function ShelvesPage({ params }: Props) {
  const { id, unitId } = await params;
  const profile = await currentProfile();
  if (!profile) notFound();

  const supabase = await createServerClient();

  // Site (to confirm access + give the breadcrumb title)
  const { data: site } = await supabase
    .from('sites')
    .select('id, name')
    .eq('id', id)
    .single();
  if (!site) notFound();

  // The unit — joined with shelves, slots, and each slot's product assignment.
  const { data: raw } = await supabase
    .from('site_units')
    .select(
      `id, label, promo_section_id, site_planogram_id, unit_type_id,
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

  return (
    <ShelvesClient
      unit={unitWithShelves}
      promoSections={promoSections}
      products={products}
      canEdit={canEdit}
    />
  );
}
