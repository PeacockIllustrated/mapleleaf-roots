'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import type { ConfigActionResult, PlacedUnit, Rotation } from './types';

const rotationSchema = z.union([
  z.literal(0),
  z.literal(90),
  z.literal(180),
  z.literal(270),
]);

const placeSchema = z.object({
  siteId: z.string().uuid(),
  unitTypeId: z.string().uuid(),
  label: z.string().min(1).max(120),
  floor_x: z.number().int(),
  floor_y: z.number().int(),
  rotation_degrees: rotationSchema,
  promo_section_id: z.string().uuid().nullable().optional(),
});

const updateSchema = z.object({
  siteId: z.string().uuid(),
  unitId: z.string().uuid(),
  label: z.string().min(1).max(120).optional(),
  floor_x: z.number().int().optional(),
  floor_y: z.number().int().optional(),
  rotation_degrees: rotationSchema.optional(),
  promo_section_id: z.string().uuid().nullable().optional(),
});

const deleteSchema = z.object({
  siteId: z.string().uuid(),
  unitId: z.string().uuid(),
});

const WRITE_ROLES = ['HQ_ADMIN', 'AREA_MANAGER', 'SITE_MANAGER'] as const;

async function resolvePlanogram(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  siteId: string
) {
  const { data, error } = await supabase
    .from('site_planograms')
    .select('id')
    .eq('site_id', siteId)
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? 'No planogram on this site');
  }
  return data.id as string;
}

/**
 * Place a new site_unit on the floor plan and materialise its shelves from
 * the unit type's default grid in a single transaction.
 */
export async function placeSiteUnit(
  input: unknown
): Promise<ConfigActionResult<PlacedUnit>> {
  await requireRole(WRITE_ROLES);

  const parsed = placeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Bad input' };
  }
  const v = parsed.data;

  const supabase = await createServerClient();

  let planogramId: string;
  try {
    planogramId = await resolvePlanogram(supabase, v.siteId);
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Planogram lookup failed',
    };
  }

  // Fetch the unit type — we need it for rendering and to materialise shelves.
  const { data: unitType, error: utErr } = await supabase
    .from('unit_types')
    .select(
      'id, code, display_name, category, width_mm, depth_mm, height_mm, is_double_sided, is_refrigerated, temperature_zone, default_shelf_count, sort_order'
    )
    .eq('id', v.unitTypeId)
    .single();
  if (utErr || !unitType) {
    return { ok: false, message: utErr?.message ?? 'Unknown unit type' };
  }

  // Insert the site_unit.
  const { data: inserted, error: insErr } = await supabase
    .from('site_units')
    .insert({
      site_planogram_id: planogramId,
      unit_type_id: v.unitTypeId,
      promo_section_id: v.promo_section_id ?? null,
      label: v.label,
      floor_x: v.floor_x,
      floor_y: v.floor_y,
      rotation_degrees: v.rotation_degrees,
    })
    .select('id')
    .single();

  if (insErr || !inserted) {
    return { ok: false, message: insErr?.message ?? 'Insert failed' };
  }

  // Materialise site_unit_shelves from unit_type_default_shelves.
  const { data: defaults } = await supabase
    .from('unit_type_default_shelves')
    .select('shelf_order, clearance_mm, depth_mm, is_base_shelf')
    .eq('unit_type_id', v.unitTypeId)
    .order('shelf_order');

  if (defaults && defaults.length > 0) {
    await supabase.from('site_unit_shelves').insert(
      defaults.map((d) => ({
        site_unit_id: inserted.id,
        shelf_order: d.shelf_order,
        clearance_mm: d.clearance_mm,
        depth_mm: d.depth_mm,
        is_base_shelf: d.is_base_shelf,
      }))
    );
  }

  revalidatePath(`/sites/${v.siteId}/planogram`);

  const placed: PlacedUnit = {
    id: inserted.id,
    site_planogram_id: planogramId,
    unit_type_id: v.unitTypeId,
    unit_type: unitType as PlacedUnit['unit_type'],
    promo_section_id: v.promo_section_id ?? null,
    label: v.label,
    floor_x: v.floor_x,
    floor_y: v.floor_y,
    rotation_degrees: v.rotation_degrees as Rotation,
  };

  return { ok: true, data: placed };
}

/**
 * Update a site_unit's position, rotation, label, or promo section.
 * Single UPDATE; no shelf changes.
 */
export async function updateSiteUnit(
  input: unknown
): Promise<ConfigActionResult> {
  await requireRole(WRITE_ROLES);

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Bad input' };
  }
  const { siteId, unitId, ...patch } = parsed.data;

  if (Object.keys(patch).length === 0) {
    return { ok: true };
  }

  const supabase = await createServerClient();
  const { error } = await supabase
    .from('site_units')
    .update(patch)
    .eq('id', unitId);

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/sites/${siteId}/planogram`);
  return { ok: true };
}

/**
 * Delete a site_unit. site_unit_shelves and site_unit_slots cascade via FK.
 */
export async function deleteSiteUnit(
  input: unknown
): Promise<ConfigActionResult> {
  await requireRole(WRITE_ROLES);

  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: 'Bad input' };
  }
  const { siteId, unitId } = parsed.data;

  const supabase = await createServerClient();
  const { error } = await supabase.from('site_units').delete().eq('id', unitId);

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/sites/${siteId}/planogram`);
  return { ok: true };
}
