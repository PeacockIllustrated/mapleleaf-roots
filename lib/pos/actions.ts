'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-role';
import { createServerClient } from '@/lib/supabase/server';

const WRITE_ROLES = [
  'HQ_ADMIN',
  'AREA_MANAGER',
  'SITE_MANAGER',
  'EMPLOYEE',
] as const;

const ARTWORK_ROLES = [
  'HQ_ADMIN',
  'AREA_MANAGER',
  'SITE_MANAGER',
] as const;

const REDELIVERY_ROLES = [
  'HQ_ADMIN',
  'AREA_MANAGER',
  'SITE_MANAGER',
] as const;

export type PosActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Report a POS position as missing / damaged / wrong
// ---------------------------------------------------------------------------

const reportSchema = z.object({
  siteId: z.string().uuid(),
  unitId: z.string().uuid(),
  siteUnitId: z.string().uuid(),
  unitTypePosSlotId: z.string().uuid(),
  reason: z.enum([
    'MISSING',
    'DAMAGED',
    'WRONG_SIZE',
    'WRONG_ARTWORK',
    'OTHER',
  ]),
  notes: z.string().max(2000).optional().nullable(),
});

export async function reportPosIssue(
  input: unknown
): Promise<PosActionResult<{ id: string }>> {
  const caller = await requireRole(WRITE_ROLES);

  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Bad input' };
  }
  const v = parsed.data;

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('pos_material_requests')
    .insert({
      site_unit_id: v.siteUnitId,
      unit_type_pos_slot_id: v.unitTypePosSlotId,
      reason: v.reason,
      status: 'REPORTED',
      notes: v.notes ?? null,
      reported_by: caller.id,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Insert failed' };
  }

  revalidatePath(`/sites/${v.siteId}/units/${v.unitId}/shelves`);
  return { ok: true, data: { id: data.id as string } };
}

// ---------------------------------------------------------------------------
// Set / clear the artwork assigned to a POS position on a site_unit
// ---------------------------------------------------------------------------

const setArtworkSchema = z.object({
  siteId: z.string().uuid(),
  unitId: z.string().uuid(),
  siteUnitId: z.string().uuid(),
  unitTypePosSlotId: z.string().uuid(),
  artworkUrl: z.string().max(2000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function setPosArtwork(
  input: unknown
): Promise<PosActionResult> {
  const caller = await requireRole(ARTWORK_ROLES);
  const parsed = setArtworkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Bad input' };
  }
  const v = parsed.data;

  const supabase = await createServerClient();

  const { data: existing } = await supabase
    .from('site_unit_pos_artwork')
    .select('id')
    .eq('site_unit_id', v.siteUnitId)
    .eq('unit_type_pos_slot_id', v.unitTypePosSlotId)
    .maybeSingle();

  const payload = {
    site_unit_id: v.siteUnitId,
    unit_type_pos_slot_id: v.unitTypePosSlotId,
    artwork_url: v.artworkUrl || null,
    notes: v.notes || null,
    set_by: caller.id,
    set_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase
      .from('site_unit_pos_artwork')
      .update(payload)
      .eq('id', existing.id);
    if (error) return { ok: false, message: error.message };
  } else {
    const { error } = await supabase
      .from('site_unit_pos_artwork')
      .insert(payload);
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath(`/sites/${v.siteId}/units/${v.unitId}/shelves`);
  return { ok: true };
}

const clearArtworkSchema = z.object({
  siteId: z.string().uuid(),
  unitId: z.string().uuid(),
  siteUnitId: z.string().uuid(),
  unitTypePosSlotId: z.string().uuid(),
});

export async function clearPosArtwork(
  input: unknown
): Promise<PosActionResult> {
  await requireRole(ARTWORK_ROLES);
  const parsed = clearArtworkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Bad input' };
  const v = parsed.data;

  const supabase = await createServerClient();
  const { error } = await supabase
    .from('site_unit_pos_artwork')
    .delete()
    .eq('site_unit_id', v.siteUnitId)
    .eq('unit_type_pos_slot_id', v.unitTypePosSlotId);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/sites/${v.siteId}/units/${v.unitId}/shelves`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Roll open POS requests on a site into a single ADDITIONAL_SIGNAGE quote.
// Each open (status in REPORTED|ACKNOWLEDGED) request becomes a POS_ARTWORK
// line item on the quote, then links back via linked_quote_id and advances
// to ACKNOWLEDGED so we don't re-include it on subsequent runs.
// ---------------------------------------------------------------------------

const redeliverySchema = z.object({
  siteId: z.string().uuid(),
});

export async function requestPosRedelivery(
  input: unknown
): Promise<PosActionResult<{ quoteRef: string; lineCount: number }>> {
  const caller = await requireRole(REDELIVERY_ROLES);

  const parsed = redeliverySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Bad input' };
  const { siteId } = parsed.data;

  const supabase = await createServerClient();

  // Site metadata for the payload.
  const { data: site, error: siteErr } = await supabase
    .from('sites')
    .select(
      'id, code, name, address_line_1, address_line_2, city, postcode'
    )
    .eq('id', siteId)
    .single();
  if (siteErr || !site) {
    return { ok: false, message: siteErr?.message ?? 'Site not found' };
  }
  if (!site.address_line_1 || !site.city || !site.postcode) {
    return {
      ok: false,
      message:
        'Site address is incomplete — add an address before requesting redelivery.',
    };
  }

  // Open POS requests on this site — joined to the unit + pos_slot_type so
  // the payload carries everything Onesign needs to reprint.
  const { data: rows, error: rowsErr } = await supabase
    .from('pos_material_requests')
    .select(
      `id, status, reason, notes,
       site_unit:site_units ( label,
         unit_type:unit_types ( code )
       ),
       unit_type_pos_slot:unit_type_pos_slots ( position_label, quantity,
         pos_slot_type:pos_slot_types ( code, display_name, default_material )
       )`
    )
    .in('status', ['REPORTED', 'ACKNOWLEDGED']);
  if (rowsErr) return { ok: false, message: rowsErr.message };

  // Only keep requests attached to this site (join filter via site_unit).
  type Raw = {
    id: string;
    status: string;
    reason: string;
    notes: string | null;
    site_unit:
      | { label: string; unit_type: { code: string } | { code: string }[] | null }
      | Array<{ label: string; unit_type: { code: string } | { code: string }[] | null }>
      | null;
    unit_type_pos_slot:
      | {
          position_label: string | null;
          quantity: number;
          pos_slot_type:
            | { code: string; display_name: string; default_material: string | null }
            | Array<{ code: string; display_name: string; default_material: string | null }>
            | null;
        }
      | Array<{
          position_label: string | null;
          quantity: number;
          pos_slot_type:
            | { code: string; display_name: string; default_material: string | null }
            | Array<{ code: string; display_name: string; default_material: string | null }>
            | null;
        }>
      | null;
  };

  // We need to filter by site; join through to site_units -> site_planograms.
  // Re-fetch site_unit ids for this site so we can filter client-side.
  const { data: siteUnits } = await supabase
    .from('site_units')
    .select('id, site_planogram_id')
    .in(
      'site_planogram_id',
      (
        await supabase
          .from('site_planograms')
          .select('id')
          .eq('site_id', siteId)
      ).data?.map((p) => p.id as string) ?? []
    );
  const siteUnitIdSet = new Set((siteUnits ?? []).map((r) => r.id as string));

  const pending = ((rows ?? []) as unknown as (Raw & { site_unit_id?: string })[])
    .filter((r) => {
      const su = Array.isArray(r.site_unit) ? r.site_unit[0] : r.site_unit;
      return !!su;
    });

  // We need the site_unit_id per row; the above joined select didn't select it.
  const { data: rawWithIds } = await supabase
    .from('pos_material_requests')
    .select('id, site_unit_id')
    .in(
      'id',
      pending.map((r) => r.id)
    );
  const siteUnitIdByRequest = new Map<string, string>();
  for (const r of (rawWithIds ?? []) as Array<{
    id: string;
    site_unit_id: string;
  }>) {
    siteUnitIdByRequest.set(r.id, r.site_unit_id);
  }

  const forThisSite = pending.filter((r) => {
    const sid = siteUnitIdByRequest.get(r.id);
    return !!sid && siteUnitIdSet.has(sid);
  });

  if (forThisSite.length === 0) {
    return {
      ok: false,
      message: 'No open POS issues on this site — nothing to redeliver.',
    };
  }

  // Build the quote payload — POS_ARTWORK line items with notes that say
  // which reason was flagged.
  type LineItem = {
    line_type: 'POS_ARTWORK';
    unit_type_code?: string;
    unit_label?: string;
    pos_slot_type_code?: string;
    pos_position_label?: string;
    material?: string;
    quantity: number;
    notes?: string;
  };

  const lineItems: LineItem[] = forThisSite.map((r) => {
    const su = Array.isArray(r.site_unit) ? r.site_unit[0] : r.site_unit;
    const utps = Array.isArray(r.unit_type_pos_slot)
      ? r.unit_type_pos_slot[0]
      : r.unit_type_pos_slot;
    const unitType = su
      ? Array.isArray(su.unit_type)
        ? su.unit_type[0]
        : su.unit_type
      : null;
    const pst = utps
      ? Array.isArray(utps.pos_slot_type)
        ? utps.pos_slot_type[0]
        : utps.pos_slot_type
      : null;

    const reasonLabel = r.reason.toLowerCase().replace(/_/g, ' ');
    const notesLine = r.notes ? ` · ${r.notes}` : '';

    return {
      line_type: 'POS_ARTWORK' as const,
      unit_type_code: unitType?.code,
      unit_label: su?.label,
      pos_slot_type_code: pst?.code,
      pos_position_label: utps?.position_label ?? undefined,
      material: pst?.default_material ?? undefined,
      quantity: utps?.quantity ?? 1,
      notes: `Reason: ${reasonLabel}${notesLine}`,
    };
  });

  const payload = {
    payload_version: 1 as const,
    site: {
      code: site.code as string,
      name: site.name as string,
      address: {
        line_1: site.address_line_1 as string,
        line_2: (site.address_line_2 as string | null) ?? undefined,
        city: site.city as string,
        postcode: site.postcode as string,
      },
    },
    quote_type: 'ADDITIONAL_SIGNAGE' as const,
    requested_by: { name: caller.full_name, email: caller.email },
    line_items: lineItems,
    notes: 'Auto-generated from POS material issue reports.',
  };

  // Quote ref.
  const { data: refRow, error: refErr } = await supabase
    .rpc('next_onesign_quote_ref')
    .single();
  if (refErr || !refRow) {
    return {
      ok: false,
      message: refErr?.message ?? 'Could not generate quote ref',
    };
  }
  const quoteRef = refRow as unknown as string;

  const { data: quote, error: insErr } = await supabase
    .from('onesign_quotes')
    .insert({
      quote_ref: quoteRef,
      site_id: siteId,
      quote_type: 'ADDITIONAL_SIGNAGE',
      status: 'DRAFT',
      payload,
      requested_by: caller.id,
    })
    .select('id, quote_ref')
    .single();
  if (insErr || !quote) {
    return { ok: false, message: insErr?.message ?? 'Quote insert failed' };
  }

  // Advance each request to ACKNOWLEDGED and link the quote.
  const { error: updErr } = await supabase
    .from('pos_material_requests')
    .update({ status: 'ACKNOWLEDGED', linked_quote_id: quote.id })
    .in(
      'id',
      forThisSite.map((r) => r.id)
    );
  if (updErr) return { ok: false, message: updErr.message };

  revalidatePath(`/sites/${siteId}/quotes`);
  return {
    ok: true,
    data: {
      quoteRef: quote.quote_ref as string,
      lineCount: lineItems.length,
    },
  };
}
