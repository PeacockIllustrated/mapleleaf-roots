import { notFound } from 'next/navigation';
import { currentProfile } from '@/lib/auth/require-role';
import { createServerClient } from '@/lib/supabase/server';
import { PlanogramClient } from './planogram-client';
import type {
  PlacedUnit,
  PromoSectionSummary,
  Rotation,
  ShopBounds,
  SiteUnitShelf,
  UnitTypePosSlotRef,
  UnitTypeSummary,
} from '@/lib/configurator/types';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PlanogramPage({ params }: Props) {
  const { id } = await params;
  const profile = await currentProfile();
  if (!profile) notFound();

  const supabase = await createServerClient();

  const [{ data: site }, { data: unitTypes }, { data: promoSections }] =
    await Promise.all([
      supabase
        .from('sites')
        .select('id, name, code, onboarding_status')
        .eq('id', id)
        .single(),
      supabase
        .from('unit_types')
        .select(
          'id, code, display_name, category, width_mm, depth_mm, height_mm, is_double_sided, is_refrigerated, temperature_zone, default_shelf_count, sort_order'
        )
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('promo_sections')
        .select('id, code, display_name, hex_colour, sort_order')
        .eq('is_active', true)
        .order('sort_order'),
    ]);

  if (!site) notFound();

  // Planogram shell (created with the site; may carry shop_bounds).
  const { data: planogram } = await supabase
    .from('site_planograms')
    .select('id, shop_bounds_w_mm, shop_bounds_h_mm')
    .eq('site_id', id)
    .single();

  let initialUnits: PlacedUnit[] = [];
  let shopBounds: ShopBounds | null = null;

  if (planogram) {
    if (planogram.shop_bounds_w_mm && planogram.shop_bounds_h_mm) {
      shopBounds = {
        widthMm: planogram.shop_bounds_w_mm as number,
        heightMm: planogram.shop_bounds_h_mm as number,
      };
    }

    const [{ data: unitRows }, { data: posRows }] = await Promise.all([
      supabase
        .from('site_units')
        .select(
          `id, site_planogram_id, unit_type_id, promo_section_id, label,
           floor_x, floor_y, rotation_degrees,
           unit_type:unit_types (
             id, code, display_name, category,
             width_mm, depth_mm, height_mm,
             is_double_sided, is_refrigerated, temperature_zone,
             default_shelf_count, sort_order
           ),
           shelves:site_unit_shelves (
             id, site_unit_id, shelf_order, clearance_mm, depth_mm,
             is_base_shelf, promo_section_id
           )`
        )
        .eq('site_planogram_id', planogram.id),
      supabase
        .from('unit_type_pos_slots')
        .select(
          `id, unit_type_id, quantity, position_label,
           pos_slot_type:pos_slot_types (
             code, display_name, width_mm, height_mm, mount_method, default_material
           )`
        ),
    ]);

    // Group POS slots by unit_type_id.
    type PosRow = {
      id: string;
      unit_type_id: string;
      quantity: number;
      position_label: string | null;
      pos_slot_type:
        | UnitTypePosSlotRef['pos_slot_type']
        | UnitTypePosSlotRef['pos_slot_type'][]
        | null;
    };
    const posByUnitType = new Map<string, UnitTypePosSlotRef[]>();
    for (const r of ((posRows ?? []) as unknown as PosRow[])) {
      const pst = Array.isArray(r.pos_slot_type)
        ? r.pos_slot_type[0]
        : r.pos_slot_type;
      if (!pst) continue;
      const arr = posByUnitType.get(r.unit_type_id) ?? [];
      arr.push({
        id: r.id,
        position_label: r.position_label,
        quantity: r.quantity,
        pos_slot_type: pst,
      });
      posByUnitType.set(r.unit_type_id, arr);
    }

    type UnitRow = {
      id: string;
      site_planogram_id: string;
      unit_type_id: string;
      promo_section_id: string | null;
      label: string;
      floor_x: number;
      floor_y: number;
      rotation_degrees: number;
      unit_type: UnitTypeSummary | UnitTypeSummary[] | null;
      shelves: SiteUnitShelf[] | null;
    };

    initialUnits = ((unitRows ?? []) as unknown as UnitRow[])
      .map((r) => {
        const ut = Array.isArray(r.unit_type) ? r.unit_type[0] : r.unit_type;
        if (!ut) return null;
        const shelves = (r.shelves ?? []).slice().sort(
          (a, b) => a.shelf_order - b.shelf_order
        );
        return {
          id: r.id,
          site_planogram_id: r.site_planogram_id,
          unit_type_id: r.unit_type_id,
          unit_type: ut,
          promo_section_id: r.promo_section_id,
          label: r.label,
          floor_x: r.floor_x,
          floor_y: r.floor_y,
          rotation_degrees: (r.rotation_degrees as Rotation) ?? 0,
          shelves,
          pos_slots: posByUnitType.get(r.unit_type_id) ?? [],
        } satisfies PlacedUnit;
      })
      .filter((r): r is PlacedUnit => r !== null);
  }

  const canEdit =
    profile.role === 'HQ_ADMIN' ||
    profile.role === 'AREA_MANAGER' ||
    profile.role === 'SITE_MANAGER';

  return (
    <PlanogramClient
      siteId={site.id as string}
      siteName={site.name as string}
      unitTypes={(unitTypes ?? []) as UnitTypeSummary[]}
      promoSections={(promoSections ?? []) as PromoSectionSummary[]}
      initialUnits={initialUnits}
      initialShopBounds={shopBounds}
      canEdit={canEdit}
    />
  );
}
