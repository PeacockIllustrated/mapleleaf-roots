import type { SupabaseClient } from '@supabase/supabase-js';
import type { LineItem, QuotePayloadV1 } from './types';
import { quotePayloadV1Schema } from './types';

/**
 * Build a SITE_FITTING quote payload from the current state of a site's
 * planogram. One UNIT line per site_unit and one POS_ARTWORK line per
 * (site_unit × unit_type_pos_slot) position, matching the shape the
 * Onesign Portal expects.
 *
 * Fetches everything in one pass so the server action stays simple.
 */
export async function buildFittingPayload(
  supabase: SupabaseClient,
  siteId: string,
  requestedBy: { name: string; email: string }
): Promise<QuotePayloadV1> {
  const { data: site, error: siteErr } = await supabase
    .from('sites')
    .select(
      'id, code, name, address_line_1, address_line_2, city, postcode'
    )
    .eq('id', siteId)
    .single();

  if (siteErr || !site) {
    throw new Error(siteErr?.message ?? 'Site not found');
  }

  if (!site.address_line_1 || !site.city || !site.postcode) {
    throw new Error(
      'Site address is incomplete — fill in address, city, and postcode before requesting a quote.'
    );
  }

  const { data: planogram } = await supabase
    .from('site_planograms')
    .select('id')
    .eq('site_id', siteId)
    .single();

  if (!planogram) {
    throw new Error('Site has no planogram shell — reopen the planogram to create one.');
  }

  const { data: unitsRaw, error: unitsErr } = await supabase
    .from('site_units')
    .select(
      `id, label,
       promo_section:promo_sections ( code ),
       unit_type:unit_types (
         code,
         unit_type_pos_slots (
           quantity,
           position_label,
           pos_slot_type:pos_slot_types ( code, default_material )
         )
       )`
    )
    .eq('site_planogram_id', planogram.id)
    .order('label');

  if (unitsErr) throw unitsErr;

  const lineItems: LineItem[] = [];

  type UnitRow = {
    id: string;
    label: string;
    promo_section: { code: string } | { code: string }[] | null;
    unit_type:
      | {
          code: string;
          unit_type_pos_slots: Array<{
            quantity: number;
            position_label: string | null;
            pos_slot_type:
              | { code: string; default_material: string | null }
              | { code: string; default_material: string | null }[]
              | null;
          }>;
        }
      | Array<{
          code: string;
          unit_type_pos_slots: Array<{
            quantity: number;
            position_label: string | null;
            pos_slot_type:
              | { code: string; default_material: string | null }
              | { code: string; default_material: string | null }[]
              | null;
          }>;
        }>
      | null;
  };

  for (const r of (unitsRaw ?? []) as unknown as UnitRow[]) {
    const unitType = Array.isArray(r.unit_type) ? r.unit_type[0] : r.unit_type;
    if (!unitType) continue;

    const promo = Array.isArray(r.promo_section)
      ? r.promo_section[0]
      : r.promo_section;

    lineItems.push({
      line_type: 'UNIT',
      unit_type_code: unitType.code,
      unit_label: r.label,
      promo_section_code: promo?.code,
      quantity: 1,
    });

    for (const slot of unitType.unit_type_pos_slots ?? []) {
      const pst = Array.isArray(slot.pos_slot_type)
        ? slot.pos_slot_type[0]
        : slot.pos_slot_type;
      if (!pst) continue;
      lineItems.push({
        line_type: 'POS_ARTWORK',
        unit_type_code: unitType.code,
        unit_label: r.label,
        pos_slot_type_code: pst.code,
        pos_position_label: slot.position_label ?? undefined,
        material: pst.default_material ?? undefined,
        promo_section_code: promo?.code,
        quantity: slot.quantity,
      });
    }
  }

  const payload: QuotePayloadV1 = {
    payload_version: 1,
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
    quote_type: 'SITE_FITTING',
    requested_by: requestedBy,
    line_items: lineItems,
  };

  // Final guard — never hand a malformed payload to the DB.
  return quotePayloadV1Schema.parse(payload);
}
