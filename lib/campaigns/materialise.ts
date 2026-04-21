/**
 * Campaign → rollouts materialisation.
 *
 * Called when HQ publishes a campaign. Responsibilities:
 *
 *   1. Resolve the set of matching sites via campaign_matching_sites().
 *   2. For each matching site, find the site_units whose unit_type is
 *      targeted, and create one install task per (site_unit × POS slot)
 *      pairing that has matching artwork.
 *   3. Insert the site_campaign_rollouts row, its install tasks, and a
 *      linked Onesign CAMPAIGN_PACK quote with a line-items payload.
 *   4. Return a summary the caller can show in the publish-success modal.
 *
 * Idempotency: the caller is expected to guard by campaign.status. This
 * function does not re-check — it'll happily create a second set of
 * rollouts if called twice. The (site_id, campaign_id) unique index on
 * site_campaign_rollouts would reject duplicates with a DB error if that
 * happened, which is the last-line safety net.
 *
 * Failure policy: the function runs site-by-site and aggregates errors
 * into `warnings`. A single site failing does not roll back earlier
 * sites. This matches the Onesign workflow — if one site's rollout
 * breaks, HQ wants the others to have landed so they can manually
 * remediate the one.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { campaignMatchingSites } from './matching-sites';
import type { MaterialisationSummary } from './types';
import type { QuotePayloadV1, LineItem } from '@/lib/quote/types';

interface CampaignRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
}

interface ArtworkRow {
  id: string;
  unit_type_id: string;
  pos_slot_type_id: string;
  artwork_url: string | null;
  material: string | null;
  quantity_per_target: number;
  target_promo_section_id: string | null;
  notes: string | null;
}

interface SiteRow {
  id: string;
  name: string;
  code: string;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  postcode: string | null;
}

interface SiteUnitRow {
  id: string;
  unit_type_id: string;
  label: string;
  promo_section_id: string | null;
}

interface UnitTypePosSlot {
  id: string;
  unit_type_id: string;
  pos_slot_type_id: string;
  position_label: string | null;
  quantity: number;
}

interface PosSlotType {
  id: string;
  code: string;
  display_name: string;
  width_mm: number;
  height_mm: number;
  default_material: string;
}

interface UnitType {
  id: string;
  code: string;
  display_name: string;
}

export async function materialiseCampaign(
  supabase: SupabaseClient,
  campaignId: string,
  requestedBy: { id: string; name: string; email: string }
): Promise<MaterialisationSummary> {
  // ---- 1. Load the campaign + its artwork + unit/slot/type lookups. ----

  const { data: campaign, error: cErr } = await supabase
    .from('campaigns')
    .select('id, code, name, description, starts_at, ends_at')
    .eq('id', campaignId)
    .single<CampaignRow>();

  if (cErr || !campaign) {
    throw new Error(cErr?.message ?? 'Campaign not found');
  }

  const { data: artworks, error: aErr } = await supabase
    .from('campaign_artwork')
    .select(
      'id, unit_type_id, pos_slot_type_id, artwork_url, material, quantity_per_target, target_promo_section_id, notes'
    )
    .eq('campaign_id', campaignId);

  if (aErr) throw new Error(`Load artwork: ${aErr.message}`);
  const artworkList = (artworks ?? []) as ArtworkRow[];
  if (artworkList.length === 0) {
    throw new Error(
      'Cannot materialise: campaign has no artwork uploaded. Add at least one artwork per targeted unit type / POS slot combination.'
    );
  }

  // Index artwork by (unit_type_id, pos_slot_type_id, target_promo_section_id)
  // so the per-unit loop below can find the right one quickly.
  const artworkIndex = new Map<string, ArtworkRow>();
  for (const a of artworkList) {
    artworkIndex.set(artworkKey(a.unit_type_id, a.pos_slot_type_id, a.target_promo_section_id), a);
  }

  const unitTypeIds = [...new Set(artworkList.map((a) => a.unit_type_id))];
  const posSlotTypeIds = [...new Set(artworkList.map((a) => a.pos_slot_type_id))];

  const [{ data: unitTypes }, { data: posSlotTypes }, { data: pos }] = await Promise.all([
    supabase
      .from('unit_types')
      .select('id, code, display_name')
      .in('id', unitTypeIds),
    supabase
      .from('pos_slot_types')
      .select('id, code, display_name, width_mm, height_mm, default_material')
      .in('id', posSlotTypeIds),
    supabase
      .from('unit_type_pos_slots')
      .select('id, unit_type_id, pos_slot_type_id, position_label, quantity')
      .in('unit_type_id', unitTypeIds),
  ]);

  const unitTypeById = new Map<string, UnitType>(
    ((unitTypes ?? []) as UnitType[]).map((u) => [u.id, u])
  );
  const posSlotTypeById = new Map<string, PosSlotType>(
    ((posSlotTypes ?? []) as PosSlotType[]).map((p) => [p.id, p])
  );
  const posByUnitType = new Map<string, UnitTypePosSlot[]>();
  for (const p of ((pos ?? []) as UnitTypePosSlot[])) {
    const arr = posByUnitType.get(p.unit_type_id) ?? [];
    arr.push(p);
    posByUnitType.set(p.unit_type_id, arr);
  }

  // ---- 2. Resolve matching sites. ----

  const { siteIds } = await campaignMatchingSites(supabase, campaignId);
  if (siteIds.length === 0) {
    return {
      rollouts_created: 0,
      tasks_created: 0,
      quotes_created: 0,
      sites: [],
      warnings: [
        'No sites matched this campaign. Check the unit-type and classification targets.',
      ],
    };
  }

  const { data: sites, error: sErr } = await supabase
    .from('sites')
    .select(
      'id, name, code, address_line_1, address_line_2, city, postcode'
    )
    .in('id', siteIds);
  if (sErr) throw new Error(`Load sites: ${sErr.message}`);
  const siteById = new Map<string, SiteRow>(
    ((sites ?? []) as SiteRow[]).map((s) => [s.id, s])
  );

  // ---- 3. Per-site loop. ----

  const summary: MaterialisationSummary = {
    rollouts_created: 0,
    tasks_created: 0,
    quotes_created: 0,
    sites: [],
    warnings: [],
  };

  for (const siteId of siteIds) {
    const site = siteById.get(siteId);
    if (!site) {
      summary.warnings.push(`Site ${siteId} vanished mid-materialisation`);
      continue;
    }

    try {
      const perSite = await materialiseForSite({
        supabase,
        campaign,
        site,
        artworkIndex,
        unitTypeById,
        posSlotTypeById,
        posByUnitType,
        requestedBy,
      });
      summary.rollouts_created += 1;
      summary.tasks_created += perSite.task_count;
      summary.quotes_created += 1;
      summary.sites.push(perSite);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      summary.warnings.push(`${site.name}: ${msg}`);
    }
  }

  return summary;
}

// ---------------------------------------------------------------------------

interface PerSiteContext {
  supabase: SupabaseClient;
  campaign: CampaignRow;
  site: SiteRow;
  artworkIndex: Map<string, ArtworkRow>;
  unitTypeById: Map<string, UnitType>;
  posSlotTypeById: Map<string, PosSlotType>;
  posByUnitType: Map<string, UnitTypePosSlot[]>;
  requestedBy: { id: string; name: string; email: string };
}

interface PerSiteResult {
  site_id: string;
  site_name: string;
  rollout_id: string;
  quote_ref: string;
  task_count: number;
}

async function materialiseForSite(ctx: PerSiteContext): Promise<PerSiteResult> {
  const { supabase, campaign, site, artworkIndex, unitTypeById, posSlotTypeById, posByUnitType, requestedBy } = ctx;

  // All site_units at this site whose unit_type is in the artwork set.
  const targetUnitTypeIds = [...unitTypeById.keys()];
  const { data: siteUnits, error: suErr } = await supabase
    .from('site_units')
    .select(
      `id, unit_type_id, label, promo_section_id,
       site_planograms!inner(site_id)`
    )
    .in('unit_type_id', targetUnitTypeIds)
    .eq('site_planograms.site_id', site.id);

  if (suErr) throw new Error(`Load site_units: ${suErr.message}`);

  const units = (siteUnits ?? []) as unknown as SiteUnitRow[];
  if (units.length === 0) {
    throw new Error('No placed units match the campaign targets');
  }

  // Build the (site_unit × POS slot × artwork) list with matching artwork.
  type TaskDraft = {
    site_unit_id: string;
    unit_label: string;
    unit_type_id: string;
    campaign_artwork_id: string;
    pos_slot_type_id: string;
    pos_position_label: string | null;
    quantity: number;
  };
  const drafts: TaskDraft[] = [];

  for (const u of units) {
    const posSlots = posByUnitType.get(u.unit_type_id) ?? [];
    for (const slot of posSlots) {
      // Artwork lookup: prefer a promo-section-specific artwork if the
      // unit has a promo section AND a matching artwork exists; else the
      // generic (promo_section_id = null) artwork for the unit/slot.
      const specific = artworkIndex.get(
        artworkKey(u.unit_type_id, slot.pos_slot_type_id, u.promo_section_id)
      );
      const generic = artworkIndex.get(
        artworkKey(u.unit_type_id, slot.pos_slot_type_id, null)
      );
      const art = specific ?? generic;
      if (!art) continue;

      drafts.push({
        site_unit_id: u.id,
        unit_label: u.label,
        unit_type_id: u.unit_type_id,
        campaign_artwork_id: art.id,
        pos_slot_type_id: slot.pos_slot_type_id,
        pos_position_label: slot.position_label,
        quantity: slot.quantity * art.quantity_per_target,
      });
    }
  }

  if (drafts.length === 0) {
    throw new Error(
      'Site has matching units but none of them carry a POS position with matching artwork'
    );
  }

  // Insert rollout row first — tasks FK to it.
  const { data: rollout, error: rErr } = await supabase
    .from('site_campaign_rollouts')
    .insert({
      site_id: site.id,
      campaign_id: campaign.id,
      status: 'PENDING',
    })
    .select('id')
    .single();
  if (rErr || !rollout) throw new Error(`Create rollout: ${rErr?.message}`);
  const rolloutId = rollout.id as string;

  // Insert tasks.
  const taskRows = drafts.map((d, i) => ({
    rollout_id: rolloutId,
    site_unit_id: d.site_unit_id,
    campaign_artwork_id: d.campaign_artwork_id,
    pos_position_label: d.pos_position_label,
    task_order: i + 1,
    status: 'PENDING' as const,
  }));
  const { error: tErr } = await supabase
    .from('rollout_install_tasks')
    .insert(taskRows);
  if (tErr) throw new Error(`Create tasks: ${tErr.message}`);

  // Build + insert the Onesign quote.
  const payload = buildCampaignQuotePayload({
    campaign,
    site,
    rolloutId,
    drafts,
    unitTypeById,
    posSlotTypeById,
    requestedBy,
  });

  const { data: refRow, error: refErr } = await supabase
    .rpc('next_onesign_quote_ref')
    .single();
  if (refErr || !refRow) {
    throw new Error(`Quote ref: ${refErr?.message ?? 'empty'}`);
  }
  const quoteRef = refRow as unknown as string;

  const { error: qErr } = await supabase.from('onesign_quotes').insert({
    quote_ref: quoteRef,
    site_id: site.id,
    quote_type: 'CAMPAIGN_PACK',
    linked_rollout_id: rolloutId,
    status: 'SUBMITTED',
    payload,
    requested_by: requestedBy.id,
    submitted_at: new Date().toISOString(),
  });
  if (qErr) throw new Error(`Create quote: ${qErr.message}`);

  // Stamp quote_ref + bump rollout to QUOTED.
  const { error: uErr } = await supabase
    .from('site_campaign_rollouts')
    .update({ quote_ref: quoteRef, status: 'QUOTED' })
    .eq('id', rolloutId);
  if (uErr) throw new Error(`Update rollout quote_ref: ${uErr.message}`);

  return {
    site_id: site.id,
    site_name: site.name,
    rollout_id: rolloutId,
    quote_ref: quoteRef,
    task_count: drafts.length,
  };
}

// ---------------------------------------------------------------------------

function artworkKey(
  unitTypeId: string,
  posSlotTypeId: string,
  promoSectionId: string | null
): string {
  return `${unitTypeId}|${posSlotTypeId}|${promoSectionId ?? ''}`;
}

function buildCampaignQuotePayload(args: {
  campaign: CampaignRow;
  site: SiteRow;
  rolloutId: string;
  drafts: Array<{
    unit_label: string;
    unit_type_id: string;
    campaign_artwork_id: string;
    pos_slot_type_id: string;
    pos_position_label: string | null;
    quantity: number;
  }>;
  unitTypeById: Map<string, UnitType>;
  posSlotTypeById: Map<string, PosSlotType>;
  requestedBy: { name: string; email: string };
}): QuotePayloadV1 {
  const { campaign, site, rolloutId, drafts, unitTypeById, posSlotTypeById, requestedBy } = args;

  const lineItems: LineItem[] = drafts.map((d) => {
    const ut = unitTypeById.get(d.unit_type_id);
    const pst = posSlotTypeById.get(d.pos_slot_type_id);
    return {
      line_type: 'POS_ARTWORK',
      unit_type_code: ut?.code,
      unit_label: d.unit_label,
      pos_slot_type_code: pst?.code,
      pos_position_label: d.pos_position_label ?? undefined,
      material: pst?.default_material,
      quantity: d.quantity,
      notes: `Campaign ${campaign.code}`,
    };
  });

  return {
    payload_version: 1,
    site: {
      code: site.code,
      name: site.name,
      address: {
        line_1: site.address_line_1 ?? '',
        line_2: site.address_line_2 ?? undefined,
        city: site.city ?? '',
        postcode: site.postcode ?? '',
      },
    },
    quote_type: 'CAMPAIGN_PACK',
    linked_rollout_id: rolloutId,
    requested_by: {
      name: requestedBy.name,
      email: requestedBy.email,
    },
    line_items: lineItems,
    target_install_date: campaign.starts_at ?? undefined,
    notes: campaign.description ?? undefined,
  };
}
