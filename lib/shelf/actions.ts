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
  stackCount: z.number().int().min(1).max(6).optional(),
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

  // If a product is supplied, compute width from the on-shelf facing width
  // (shipper box if defined, else the individual product) × facings.
  let resolvedWidth = v.widthMm ?? 0;
  if (v.mainProductId) {
    const { data: product, error: prodErr } = await supabase
      .from('products')
      .select('width_mm, shipper_width_mm')
      .eq('id', v.mainProductId)
      .single();
    if (prodErr || !product) {
      return {
        ok: false,
        message: prodErr?.message ?? 'Main product not found',
      };
    }
    const facingW =
      ((product.shipper_width_mm as number | null) ?? 0) ||
      ((product.width_mm as number | null) ?? 0);
    if (facingW <= 0) {
      return {
        ok: false,
        message:
          'That product has no width recorded. Either pick another product or add an empty slot.',
      };
    }
    resolvedWidth = facingW * v.facingCount;
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
  const {
    siteId,
    unitId,
    slotId,
    widthMm,
    facingCount,
    stackCount,
    currentlyStocking,
  } = parsed.data;

  const patch: Record<string, unknown> = {};
  if (widthMm !== undefined) patch.width_mm = widthMm;
  if (facingCount !== undefined) patch.facing_count = facingCount;
  if (stackCount !== undefined) patch.stack_count = stackCount;
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

// ---------------------------------------------------------------------------
// Resize shelf clearance with sibling-borrow — the unit's physical height
// is fixed, so growing one shelf has to come out of another. We prefer the
// neighbour below, fall back to the neighbour above, then any other shelf
// whose clearance can absorb the delta without dropping below MIN.
// ---------------------------------------------------------------------------

const MIN_CLEARANCE_MM = 80;

const resizeClearanceSchema = z.object({
  siteId: z.string().uuid(),
  unitId: z.string().uuid(),
  shelfId: z.string().uuid(),
  deltaMm: z
    .number()
    .int()
    .refine((n) => n !== 0, 'Delta must be non-zero')
    .refine((n) => Math.abs(n) <= 500, 'Step too large'),
});

export type ResizeShelfResult = ShelfActionResult<{
  targetId: string;
  targetClearance: number;
  donorId: string;
  donorClearance: number;
}>;

export async function resizeShelfClearance(
  input: unknown
): Promise<ResizeShelfResult> {
  await requireRole(WRITE_ROLES);
  const parsed = resizeClearanceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Bad input' };
  }
  const { siteId, unitId, shelfId, deltaMm } = parsed.data;

  const supabase = await createServerClient();

  const { data: target, error: targetErr } = await supabase
    .from('site_unit_shelves')
    .select('id, site_unit_id, shelf_order, clearance_mm')
    .eq('id', shelfId)
    .single();
  if (targetErr || !target) {
    return { ok: false, message: targetErr?.message ?? 'Shelf not found' };
  }

  const newTarget = (target.clearance_mm as number) + deltaMm;
  if (newTarget < MIN_CLEARANCE_MM) {
    return {
      ok: false,
      message: `Shelf can't drop below ${MIN_CLEARANCE_MM}mm.`,
    };
  }

  const { data: siblings, error: sibErr } = await supabase
    .from('site_unit_shelves')
    .select('id, shelf_order, clearance_mm')
    .eq('site_unit_id', target.site_unit_id)
    .order('shelf_order');
  if (sibErr) {
    return { ok: false, message: sibErr.message };
  }

  type Sib = {
    id: string;
    shelf_order: number;
    clearance_mm: number;
  };
  const all = (siblings ?? []) as Sib[];

  // Preferred donor order: immediately below → immediately above → others,
  // largest-clearance-first so we don't starve tight shelves.
  const below = all.find(
    (s) => s.shelf_order === (target.shelf_order as number) + 1
  );
  const above = all.find(
    (s) => s.shelf_order === (target.shelf_order as number) - 1
  );
  const others = all
    .filter((s) => s.id !== target.id && s.id !== below?.id && s.id !== above?.id)
    .sort((a, b) => b.clearance_mm - a.clearance_mm);

  const candidates = [below, above, ...others].filter(
    (x): x is Sib => !!x
  );

  const donor = candidates.find(
    (c) => c.clearance_mm - deltaMm >= MIN_CLEARANCE_MM
  );
  if (!donor) {
    return {
      ok: false,
      message:
        'No other shelf can absorb this change. Delete a product or pick a different shelf.',
    };
  }

  const donorNew = donor.clearance_mm - deltaMm;

  const { error: t1 } = await supabase
    .from('site_unit_shelves')
    .update({ clearance_mm: newTarget })
    .eq('id', target.id);
  if (t1) return { ok: false, message: t1.message };

  const { error: t2 } = await supabase
    .from('site_unit_shelves')
    .update({ clearance_mm: donorNew })
    .eq('id', donor.id);
  if (t2) {
    // Roll back the target change so we don't leave the unit taller or
    // shorter than its physical height.
    await supabase
      .from('site_unit_shelves')
      .update({ clearance_mm: target.clearance_mm })
      .eq('id', target.id);
    return { ok: false, message: t2.message };
  }

  revalidatePath(`/sites/${siteId}/units/${unitId}/shelves`);
  return {
    ok: true,
    data: {
      targetId: target.id as string,
      targetClearance: newTarget,
      donorId: donor.id,
      donorClearance: donorNew,
    },
  };
}

// ---------------------------------------------------------------------------
// Spread shelf — fill remaining whitespace by adding facings to existing
// product-backed slots (round-robin, least-facings-first). Empty placeholder
// slots are left as-is; the user can manually assign products or widen them.
// ---------------------------------------------------------------------------

const spreadShelfSchema = z.object({
  siteId: z.string().uuid(),
  unitId: z.string().uuid(),
  shelfId: z.string().uuid(),
  unitWidthMm: z.number().int().positive().max(5000),
});

export async function spreadShelf(
  input: unknown
): Promise<ShelfActionResult<{ added: number }>> {
  await requireRole(WRITE_ROLES);
  const parsed = spreadShelfSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Bad input' };
  }
  const { siteId, unitId, shelfId, unitWidthMm } = parsed.data;

  const supabase = await createServerClient();

  const { data: slots, error: slotErr } = await supabase
    .from('site_unit_slots')
    .select(
      `id, width_mm, facing_count,
       assignment:slot_product_assignments (
         main:products!main_product_id (
           width_mm, shipper_width_mm
         )
       )`
    )
    .eq('site_unit_shelf_id', shelfId)
    .order('slot_order');

  if (slotErr) return { ok: false, message: slotErr.message };

  type SlotShape = {
    id: string;
    width_mm: number;
    facing_count: number;
    facingW: number;
  };

  type Raw = (typeof slots extends Array<infer X> | null ? X : never) & {
    assignment:
      | Array<{
          main:
            | { width_mm: number | null; shipper_width_mm: number | null }
            | Array<{ width_mm: number | null; shipper_width_mm: number | null }>
            | null;
        }>
      | {
          main:
            | { width_mm: number | null; shipper_width_mm: number | null }
            | Array<{ width_mm: number | null; shipper_width_mm: number | null }>
            | null;
        }
      | null;
  };

  const candidates: SlotShape[] = ((slots ?? []) as unknown as Raw[])
    .map((s) => {
      const assignment = Array.isArray(s.assignment) ? s.assignment[0] : s.assignment;
      const main = assignment
        ? Array.isArray(assignment.main)
          ? assignment.main[0]
          : assignment.main
        : null;
      const facingW =
        ((main?.shipper_width_mm as number | null) ?? 0) ||
        ((main?.width_mm as number | null) ?? 0);
      if (!facingW || facingW <= 0) return null;
      return {
        id: s.id as string,
        width_mm: s.width_mm as number,
        facing_count: s.facing_count as number,
        facingW,
      } satisfies SlotShape;
    })
    .filter((x): x is SlotShape => x !== null);

  if (candidates.length === 0) {
    return {
      ok: false,
      message: 'Nothing to spread — assign a product to at least one slot first.',
    };
  }

  let used = candidates.reduce((acc, s) => acc + s.width_mm, 0);
  // Also count any empty/non-candidate slots toward used so we don't overflow.
  const totalUsedIncludingEmpties = ((slots ?? []) as unknown as Raw[])
    .reduce((acc, s) => acc + (s.width_mm as number), 0);
  used = totalUsedIncludingEmpties;

  let added = 0;
  // Round-robin, bump the lowest-facing candidate that fits.
  // Stop when no candidate can grow by one facing.
  // Guard loop with a reasonable upper bound.
  for (let i = 0; i < 2000; i++) {
    const remaining = unitWidthMm - used;
    if (remaining <= 0) break;

    candidates.sort((a, b) => a.facing_count - b.facing_count);
    const next = candidates.find((s) => s.facingW <= remaining);
    if (!next) break;

    next.facing_count += 1;
    next.width_mm += next.facingW;
    used += next.facingW;
    added += 1;
  }

  // Persist the changes for slots that actually moved.
  for (const s of candidates) {
    const { error } = await supabase
      .from('site_unit_slots')
      .update({ facing_count: s.facing_count, width_mm: s.width_mm })
      .eq('id', s.id);
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath(`/sites/${siteId}/units/${unitId}/shelves`);
  return { ok: true, data: { added } };
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
