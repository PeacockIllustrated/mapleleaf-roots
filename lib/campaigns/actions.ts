'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-role';
import { createServerClient } from '@/lib/supabase/server';
import { materialiseCampaign } from './materialise';
import type {
  CampaignStatus,
  MaterialisationSummary,
  TaskProblemReason,
} from './types';

const HQ_ONLY = ['HQ_ADMIN'] as const;

export type CampaignActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Campaign CRUD
// ---------------------------------------------------------------------------

const createCampaignSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(64)
    .regex(
      /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/,
      'UPPERCASE letters, numbers and underscores only (e.g. SUMMER_BBQ_2026)'
    ),
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional().nullable(),
  starts_at: z.string().date().optional().nullable(),
  ends_at: z.string().date().optional().nullable(),
  brief_url: z.string().url().optional().nullable(),
});

export async function createCampaign(
  input: unknown
): Promise<CampaignActionResult<{ id: string }>> {
  const profile = await requireRole(HQ_ONLY);
  const parsed = createCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'Bad input',
    };
  }
  const v = parsed.data;

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      code: v.code,
      name: v.name,
      description: v.description ?? null,
      starts_at: v.starts_at ?? null,
      ends_at: v.ends_at ?? null,
      brief_url: v.brief_url ?? null,
      scope: 'GLOBAL',
      status: 'DRAFT',
      created_by: profile.id,
    })
    .select('id')
    .single();

  if (error || !data) return { ok: false, message: error?.message ?? 'Insert failed' };

  revalidatePath('/admin/campaigns');
  return { ok: true, data: { id: data.id as string } };
}

const updateCampaignSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  starts_at: z.string().date().nullable().optional(),
  ends_at: z.string().date().nullable().optional(),
  brief_url: z.string().url().nullable().optional(),
});

export async function updateCampaign(
  input: unknown
): Promise<CampaignActionResult> {
  await requireRole(HQ_ONLY);
  const parsed = updateCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'Bad input',
    };
  }
  const { id, ...rest } = parsed.data;

  const supabase = await createServerClient();

  // Can only edit while DRAFT — prevents changing dates/desc after publish.
  const { data: current } = await supabase
    .from('campaigns')
    .select('status')
    .eq('id', id)
    .single();
  if (!current) return { ok: false, message: 'Campaign not found' };
  if ((current.status as CampaignStatus) !== 'DRAFT') {
    return {
      ok: false,
      message: 'Campaign is no longer editable — it has been submitted or published.',
    };
  }

  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) patch[k] = v;
  }
  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await supabase.from('campaigns').update(patch).eq('id', id);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/admin/campaigns/${id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Target CRUD (unit types + classification tags)
// ---------------------------------------------------------------------------

const addUnitTargetSchema = z.object({
  campaign_id: z.string().uuid(),
  unit_type_id: z.string().uuid(),
  promo_section_id: z.string().uuid().nullable().optional(),
});

export async function addUnitTarget(
  input: unknown
): Promise<CampaignActionResult> {
  await requireRole(HQ_ONLY);
  const parsed = addUnitTargetSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Bad input' };
  }
  const v = parsed.data;

  const supabase = await createServerClient();
  const { error } = await supabase.from('campaign_unit_targets').insert({
    campaign_id: v.campaign_id,
    unit_type_id: v.unit_type_id,
    promo_section_id: v.promo_section_id ?? null,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/admin/campaigns/${v.campaign_id}`);
  return { ok: true };
}

const removeUnitTargetSchema = z.object({
  campaign_id: z.string().uuid(),
  target_id: z.string().uuid(),
});

export async function removeUnitTarget(
  input: unknown
): Promise<CampaignActionResult> {
  await requireRole(HQ_ONLY);
  const parsed = removeUnitTargetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Bad input' };

  const supabase = await createServerClient();
  const { error } = await supabase
    .from('campaign_unit_targets')
    .delete()
    .eq('id', parsed.data.target_id)
    .eq('campaign_id', parsed.data.campaign_id);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/admin/campaigns/${parsed.data.campaign_id}`);
  return { ok: true };
}

const addClassificationTargetSchema = z.object({
  campaign_id: z.string().uuid(),
  classification_tag_id: z.string().uuid(),
});

export async function addClassificationTarget(
  input: unknown
): Promise<CampaignActionResult> {
  await requireRole(HQ_ONLY);
  const parsed = addClassificationTargetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Bad input' };

  const supabase = await createServerClient();
  const { error } = await supabase
    .from('campaign_classification_targets')
    .insert({
      campaign_id: parsed.data.campaign_id,
      classification_tag_id: parsed.data.classification_tag_id,
    });
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/admin/campaigns/${parsed.data.campaign_id}`);
  return { ok: true };
}

const removeClassificationTargetSchema = z.object({
  campaign_id: z.string().uuid(),
  target_id: z.string().uuid(),
});

export async function removeClassificationTarget(
  input: unknown
): Promise<CampaignActionResult> {
  await requireRole(HQ_ONLY);
  const parsed = removeClassificationTargetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Bad input' };

  const supabase = await createServerClient();
  const { error } = await supabase
    .from('campaign_classification_targets')
    .delete()
    .eq('id', parsed.data.target_id)
    .eq('campaign_id', parsed.data.campaign_id);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/admin/campaigns/${parsed.data.campaign_id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Artwork
// ---------------------------------------------------------------------------

const upsertArtworkSchema = z.object({
  campaign_id: z.string().uuid(),
  unit_type_id: z.string().uuid(),
  pos_slot_type_id: z.string().uuid(),
  target_promo_section_id: z.string().uuid().nullable().optional(),
  linked_product_id: z.string().uuid().nullable().optional(),
  artwork_url: z.string().url().nullable().optional(),
  preview_url: z.string().url().nullable().optional(),
  material: z.string().nullable().optional(),
  quantity_per_target: z.number().int().positive().default(1),
  notes: z.string().max(500).nullable().optional(),
});

export async function upsertCampaignArtwork(
  input: unknown
): Promise<CampaignActionResult<{ id: string }>> {
  const profile = await requireRole(HQ_ONLY);
  const parsed = upsertArtworkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Bad input' };
  }
  const v = parsed.data;

  const supabase = await createServerClient();

  // Upsert by the composite uniqueness (campaign_id, unit_type_id,
  // pos_slot_type_id, target_promo_section_id). Supabase doesn't expose
  // onConflict on composite keys with a nullable column, so resolve
  // manually — the promo_section_id nullable needs .is(null) vs .eq.
  const promoId = v.target_promo_section_id ?? null;
  let existingQuery = supabase
    .from('campaign_artwork')
    .select('id')
    .eq('campaign_id', v.campaign_id)
    .eq('unit_type_id', v.unit_type_id)
    .eq('pos_slot_type_id', v.pos_slot_type_id);
  existingQuery = promoId
    ? existingQuery.eq('target_promo_section_id', promoId)
    : existingQuery.is('target_promo_section_id', null);
  const { data: existing } = await existingQuery.maybeSingle();

  const payload = {
    campaign_id: v.campaign_id,
    unit_type_id: v.unit_type_id,
    pos_slot_type_id: v.pos_slot_type_id,
    target_promo_section_id: v.target_promo_section_id ?? null,
    linked_product_id: v.linked_product_id ?? null,
    artwork_url: v.artwork_url ?? null,
    preview_url: v.preview_url ?? null,
    material: v.material ?? null,
    quantity_per_target: v.quantity_per_target,
    notes: v.notes ?? null,
    uploaded_by: profile.id,
    uploaded_at: new Date().toISOString(),
  };

  let resultId: string;
  if (existing?.id) {
    const { error } = await supabase
      .from('campaign_artwork')
      .update(payload)
      .eq('id', existing.id as string);
    if (error) return { ok: false, message: error.message };
    resultId = existing.id as string;
  } else {
    const { data, error } = await supabase
      .from('campaign_artwork')
      .insert(payload)
      .select('id')
      .single();
    if (error || !data) {
      return { ok: false, message: error?.message ?? 'Insert failed' };
    }
    resultId = data.id as string;
  }

  revalidatePath(`/admin/campaigns/${v.campaign_id}`);
  return { ok: true, data: { id: resultId } };
}

// ---------------------------------------------------------------------------
// Publish → materialise rollouts + quotes
// ---------------------------------------------------------------------------

const publishSchema = z.object({
  campaign_id: z.string().uuid(),
});

export async function publishCampaign(
  input: unknown
): Promise<CampaignActionResult<MaterialisationSummary>> {
  const profile = await requireRole(HQ_ONLY);
  const parsed = publishSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Bad input' };
  const { campaign_id } = parsed.data;

  const supabase = await createServerClient();

  const { data: current } = await supabase
    .from('campaigns')
    .select('id, status, code, name, starts_at, ends_at')
    .eq('id', campaign_id)
    .single();
  if (!current) return { ok: false, message: 'Campaign not found' };
  const status = current.status as CampaignStatus;
  if (status !== 'DRAFT' && status !== 'APPROVED') {
    return {
      ok: false,
      message: `Campaign is ${status} — can only publish a DRAFT or APPROVED campaign.`,
    };
  }

  let summary: MaterialisationSummary;
  try {
    summary = await materialiseCampaign(supabase, campaign_id, {
      id: profile.id,
      name: profile.full_name,
      email: profile.email,
    });
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Publish failed',
    };
  }

  // Move campaign to SCHEDULED on success, even if some sites errored —
  // the warnings surface the partial failure and HQ can retry those
  // sites manually. If zero sites materialised, leave status alone.
  if (summary.rollouts_created > 0) {
    const { error: upErr } = await supabase
      .from('campaigns')
      .update({
        status: 'SCHEDULED',
        approved_by: profile.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', campaign_id);
    if (upErr) {
      summary.warnings.push(`Campaign status update failed: ${upErr.message}`);
    }
  }

  revalidatePath('/admin/campaigns');
  revalidatePath(`/admin/campaigns/${campaign_id}`);
  return { ok: true, data: summary };
}

const closeCampaignSchema = z.object({ campaign_id: z.string().uuid() });

export async function closeCampaign(
  input: unknown
): Promise<CampaignActionResult> {
  await requireRole(HQ_ONLY);
  const parsed = closeCampaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Bad input' };

  const supabase = await createServerClient();
  const { error } = await supabase
    .from('campaigns')
    .update({ status: 'ARCHIVED' })
    .eq('id', parsed.data.campaign_id);
  if (error) return { ok: false, message: error.message };

  revalidatePath('/admin/campaigns');
  revalidatePath(`/admin/campaigns/${parsed.data.campaign_id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Install task updates — Employees + Site Managers on their own sites
// ---------------------------------------------------------------------------

const markTaskDoneSchema = z.object({
  task_id: z.string().uuid(),
  photo_url: z.string().url().nullable().optional(),
});

export async function markTaskDone(
  input: unknown
): Promise<CampaignActionResult> {
  const profile = await requireRole(['HQ_ADMIN', 'AREA_MANAGER', 'SITE_MANAGER', 'EMPLOYEE']);
  const parsed = markTaskDoneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Bad input' };

  const supabase = await createServerClient();
  const { error, data } = await supabase
    .from('rollout_install_tasks')
    .update({
      status: 'DONE',
      completed_by: profile.id,
      completed_at: new Date().toISOString(),
      photo_url: parsed.data.photo_url ?? null,
    })
    .eq('id', parsed.data.task_id)
    .select('rollout_id')
    .single();
  if (error) return { ok: false, message: error.message };

  const rolloutId = data?.rollout_id as string | undefined;
  if (rolloutId) {
    // Pick up the site id so we can revalidate the right paths.
    const { data: rollout } = await supabase
      .from('site_campaign_rollouts')
      .select('site_id')
      .eq('id', rolloutId)
      .single();
    const siteId = rollout?.site_id as string | undefined;
    if (siteId) {
      revalidatePath(`/sites/${siteId}/rollouts/${rolloutId}`);
      revalidatePath(`/sites/${siteId}/rollouts/${rolloutId}/install`);
    }
  }
  return { ok: true };
}

const markTaskProblemSchema = z.object({
  task_id: z.string().uuid(),
  reason: z.enum([
    'ARTWORK_DAMAGED',
    'ARTWORK_MISSING',
    'WRONG_SIZE',
    'MOUNT_FAILED',
    'SITE_CLOSED',
    'OTHER',
  ] as const satisfies readonly TaskProblemReason[]),
  notes: z.string().max(500).nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
});

export async function markTaskProblem(
  input: unknown
): Promise<CampaignActionResult> {
  const profile = await requireRole(['HQ_ADMIN', 'AREA_MANAGER', 'SITE_MANAGER', 'EMPLOYEE']);
  const parsed = markTaskProblemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Bad input' };

  const supabase = await createServerClient();
  const { error, data } = await supabase
    .from('rollout_install_tasks')
    .update({
      status: 'PROBLEM',
      completed_by: profile.id,
      problem_reason: parsed.data.reason,
      problem_notes: parsed.data.notes ?? null,
      problem_photo_url: parsed.data.photo_url ?? null,
    })
    .eq('id', parsed.data.task_id)
    .select('rollout_id')
    .single();
  if (error) return { ok: false, message: error.message };

  const rolloutId = data?.rollout_id as string | undefined;
  if (rolloutId) {
    const { data: rollout } = await supabase
      .from('site_campaign_rollouts')
      .select('site_id')
      .eq('id', rolloutId)
      .single();
    const siteId = rollout?.site_id as string | undefined;
    if (siteId) {
      revalidatePath(`/sites/${siteId}/rollouts/${rolloutId}`);
      revalidatePath(`/sites/${siteId}/rollouts/${rolloutId}/install`);
    }
  }
  return { ok: true };
}

// Re-export so the UI has one import surface.
export type { MaterialisationSummary } from './types';
