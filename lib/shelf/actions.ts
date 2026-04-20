'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-role';
import { createServerClient } from '@/lib/supabase/server';

const WRITE_ROLES = ['HQ_ADMIN', 'AREA_MANAGER', 'SITE_MANAGER'] as const;

export type ShelfActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Slot CRUD
// ---------------------------------------------------------------------------

const addSlotSchema = z.object({
  siteId: z.string().uuid(),
  unitId: z.string().uuid(),
  shelfId: z.string().uuid(),
  // When mainProductId is supplied, the server computes width_mm from the
  // product's own width_mm × facingCount. For empty placeholder slots the
  // caller passes widthMm directly.
  mainProductId: z.string().uuid().nullable().optional(),
  widthMm: z.number().int().positive().max(5000).optional(),
  facingCount: z.number().int().positive().max(60).default(1),
});

const updateSlotSchema = z.object({
  siteId: z.string().uuid(),
  unitId: z.string().uuid(),
  slotId: z.string().uuid(),
  widthMm: z.number().int().positive().max(5000).optional(),
  facingCount: z.number().int().positive().max(60).optional(),
  currentlyStocking: z
    .enum(['MAIN', 'SUB_A', 'SUB_B', 'EMPTY', 'OUT_OF_SPEC'])
    .optional(),
});

const deleteSlotSchema = z.object({
  siteId: z.string().uuid(),
  unitId: z.string().uuid(),
  slotId: z.string().uuid(),
});

export async function addSlot(
  input: unknown
): Promise<
  ShelfActionResult<{ id: string; widthMm: number; facingCount: number }>
> {
  const caller = await requireRole(WRITE_ROLES);
  const parsed = addSlotSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Bad input' };
  }
  const v = parsed.data;

  if (!v.mainProductId && v.widthMm === undefined) {
    return {
      ok: false,
      message: 'Specify either a main product or an explicit width.',
    };
  }

  const supabase = await createServerClient();

  // If a product is supplied, compute width from its own width × facings.
  let resolvedWidth = v.widthMm ?? 0;
  if (v.mainProductId) {
    const { data: product, error: prodErr } = await supabase
      .from('products')
      .select('width_mm')
      .eq('id', v.mainProductId)
      .single();
    if (prodErr || !product) {
      return {
        ok: false,
        message: prodErr?.message ?? 'Main product not found',
      };
    }
    const pw = (product.width_mm as number | null) ?? 0;
    if (pw <= 0) {
      return {
        ok: false,
        message:
          'That product has no width recorded. Either pick another product or add an empty slot.',
      };
    }
    resolvedWidth = pw * v.facingCount;
  }

  if (!Number.isFinite(resolvedWidth) || resolvedWidth <= 0) {
    return { ok: false, message: 'Resolved slot width is invalid.' };
  }

  // Next slot_order for this shelf.
  const { data: last } = await supabase
    .from('site_unit_slots')
    .select('slot_order')
    .eq('site_unit_shelf_id', v.shelfId)
    .order('slot_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = ((last?.slot_order as number | undefined) ?? 0) + 1;

  const { data, error } = await supabase
    .from('site_unit_slots')
    .insert({
      site_unit_shelf_id: v.shelfId,
      slot_order: nextOrder,
      width_mm: Math.round(resolvedWidth),
      facing_count: v.facingCount,
      currently_stocking: v.mainProductId ? 'MAIN' : 'EMPTY',
    })
    .select('id')
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Insert failed' };
  }

  // Persist the main product assignment in the same round-trip.
  if (v.mainProductId) {
    const { error: assignErr } = await supabase
      .from('slot_product_assignments')
      .insert({
        site_unit_slot_id: data.id,
        main_product_id: v.mainProductId,
        assigned_by: caller.id,
        assigned_at: new Date().toISOString(),
      });
    if (assignErr) {
      return { ok: false, message: assignErr.message };
    }
  }

  revalidatePath(`/sites/${v.siteId}/units/${v.unitId}/shelves`);
  return {
    ok: true,
    data: {
      id: data.id as string,
      widthMm: Math.round(resolvedWidth),
      facingCount: v.facingCount,
    },
  };
}

export async function updateSlot(
  input: unknown
): Promise<ShelfActionResult> {
  await requireRole(WRITE_ROLES);
  const parsed = updateSlotSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Bad input' };
  }
  const { siteId, unitId, slotId, widthMm, facingCount, currentlyStocking } =
    parsed.data;

  const patch: Record<string, unknown> = {};
  if (widthMm !== undefined) patch.width_mm = widthMm;
  if (facingCount !== undefined) patch.facing_count = facingCount;
  if (currentlyStocking !== undefined)
    patch.currently_stocking = currentlyStocking;

  if (Object.keys(patch).length === 0) return { ok: true };

  const supabase = await createServerClient();
  const { error } = await supabase
    .from('site_unit_slots')
    .update(patch)
    .eq('id', slotId);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/sites/${siteId}/units/${unitId}/shelves`);
  return { ok: true };
}

export async function deleteSlot(input: unknown): Promise<ShelfActionResult> {
  await requireRole(WRITE_ROLES);
  const parsed = deleteSlotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Bad input' };
  const { siteId, unitId, slotId } = parsed.data;

  const supabase = await createServerClient();
  const { error } = await supabase
    .from('site_unit_slots')
    .delete()
    .eq('id', slotId);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/sites/${siteId}/units/${unitId}/shelves`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Slot product assignment (main / sub A / sub B)
// ---------------------------------------------------------------------------

const assignSchema = z.object({
  siteId: z.string().uuid(),
  unitId: z.string().uuid(),
  slotId: z.string().uuid(),
  mainProductId: z.string().uuid().nullable().optional(),
  subAProductId: z.string().uuid().nullable().optional(),
  subBProductId: z.string().uuid().nullable().optional(),
});

export async function assignSlotProducts(
  input: unknown
): Promise<ShelfActionResult> {
  const caller = await requireRole(WRITE_ROLES);

  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Bad input' };
  }
  const v = parsed.data;

  const supabase = await createServerClient();

  // Upsert keyed by site_unit_slot_id (unique). We fetch the existing row
  // first so we can preserve any of the three product fields the caller
  // didn't explicitly touch.
  const { data: existing } = await supabase
    .from('slot_product_assignments')
    .select('id, main_product_id, substitute_a_product_id, substitute_b_product_id')
    .eq('site_unit_slot_id', v.slotId)
    .maybeSingle();

  const nextMain =
    v.mainProductId !== undefined
      ? v.mainProductId
      : (existing?.main_product_id as string | null) ?? null;
  const nextSubA =
    v.subAProductId !== undefined
      ? v.subAProductId
      : (existing?.substitute_a_product_id as string | null) ?? null;
  const nextSubB =
    v.subBProductId !== undefined
      ? v.subBProductId
      : (existing?.substitute_b_product_id as string | null) ?? null;

  const payload = {
    site_unit_slot_id: v.slotId,
    main_product_id: nextMain,
    substitute_a_product_id: nextSubA,
    substitute_b_product_id: nextSubB,
    assigned_by: caller.id,
    assigned_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase
      .from('slot_product_assignments')
      .update(payload)
      .eq('id', existing.id);
    if (error) return { ok: false, message: error.message };
  } else {
    const { error } = await supabase
      .from('slot_product_assignments')
      .insert(payload);
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath(`/sites/${v.siteId}/units/${v.unitId}/shelves`);
  return { ok: true };
}
