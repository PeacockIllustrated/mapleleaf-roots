import { notFound } from 'next/navigation';
import { currentProfile } from '@/lib/auth/require-role';
import { createServerClient } from '@/lib/supabase/server';
import { PlanogramClient } from './planogram-client';
import type {
  PlacedUnit,
  PromoSectionSummary,
  Rotation,
  UnitTypeSummary,
} from '@/lib/configurator/types';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * /sites/[id]/planogram — Layout-mode configurator.
 *
 * Server fetches the site, the HQ-owned library (unit types, promo sections),
 * and the existing placed units. The client component owns interaction.
 */
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

  // Resolve the planogram row (created with the site by the create action).
  const { data: planogram } = await supabase
    .from('site_planograms')
    .select('id')
    .eq('site_id', id)
    .single();

  let initialUnits: PlacedUnit[] = [];
  if (planogram) {
    const { data: rows } = await supabase
      .from('site_units')
      .select(
        `id, site_planogram_id, unit_type_id, promo_section_id, label,
         floor_x, floor_y, rotation_degrees,
         unit_type:unit_types (
           id, code, display_name, category,
           width_mm, depth_mm, height_mm,
           is_double_sided, is_refrigerated, temperature_zone,
           default_shelf_count, sort_order
         )`
      )
      .eq('site_planogram_id', planogram.id);

    initialUnits = ((rows ?? []) as unknown as Array<
      Omit<PlacedUnit, 'unit_type' | 'rotation_degrees'> & {
        rotation_degrees: number;
        unit_type: UnitTypeSummary | UnitTypeSummary[] | null;
      }
    >)
      .map((r) => {
        const ut = Array.isArray(r.unit_type) ? r.unit_type[0] : r.unit_type;
        if (!ut) return null;
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
      canEdit={canEdit}
    />
  );
}
