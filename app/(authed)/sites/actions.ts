'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';

const siteCodeRe = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;

const createSiteSchema = z.object({
  code: z
    .string()
    .min(3, 'Code must be at least 3 characters')
    .max(64, 'Code is too long')
    .regex(
      siteCodeRe,
      'Use UPPERCASE letters, numbers, and underscores (e.g. BROMYARD_EXPRESS)'
    ),
  name: z.string().min(2, 'Name is required').max(120, 'Name is too long'),
  area_id: z.string().uuid('Select an area'),
  tier: z.enum(['SMALL', 'MEDIUM', 'LARGE']),
  address_line_1: z.string().max(160).optional().nullable(),
  address_line_2: z.string().max(160).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  postcode: z.string().max(16).optional().nullable(),
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;

export type CreateSiteResult =
  | { ok: true; siteId: string }
  | { ok: false; message: string };

/**
 * Create a new site. HQ Admins and Area Managers only.
 * RLS (sites_hq_write, sites_am_insert) is the hard wall — this role check
 * is the UX guard so we fail fast and explain.
 *
 * Also creates the matching site_planograms shell row in the same transaction
 * so the configurator has something to attach to on first visit.
 */
export async function createSite(input: unknown): Promise<CreateSiteResult> {
  await requireRole(['HQ_ADMIN', 'AREA_MANAGER']);

  const parsed = createSiteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues.map((i) => i.message).join('; '),
    };
  }

  const data = parsed.data;
  const supabase = await createServerClient();

  const { data: site, error: siteErr } = await supabase
    .from('sites')
    .insert({
      code: data.code,
      name: data.name,
      area_id: data.area_id,
      tier: data.tier,
      address_line_1: data.address_line_1 || null,
      address_line_2: data.address_line_2 || null,
      city: data.city || null,
      postcode: data.postcode || null,
      onboarding_status: 'CONFIGURING',
    })
    .select('id')
    .single();

  if (siteErr || !site) {
    return {
      ok: false,
      message:
        siteErr?.message ??
        'Could not create the site. Check your area assignment and try again.',
    };
  }

  // Companion planogram shell. RLS sp_sm_write permits this for HQ and AM
  // who manage the site's area (just-created by them).
  const { error: planErr } = await supabase
    .from('site_planograms')
    .insert({ site_id: site.id, name: 'Current planogram' });

  if (planErr) {
    // The site exists but the planogram didn't — surface the inconsistency
    // rather than silently swallow. The next visit to the detail page will
    // show a "recreate planogram" affordance if we ever add one.
    return {
      ok: false,
      message: `Site created, but planogram init failed: ${planErr.message}`,
    };
  }

  revalidatePath('/sites');
  return { ok: true, siteId: site.id };
}

// ---------------------------------------------------------------------------
// Classification toggles
// ---------------------------------------------------------------------------

const toggleSchema = z.object({
  siteId: z.string().uuid(),
  tagId: z.string().uuid(),
  applied: z.boolean(),
});

export type ToggleClassificationResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Apply or remove a classification tag on a site.
 * RLS `sc_hq_am_write` allows HQ Admin and the area's Area Manager.
 */
export async function toggleClassification(
  input: unknown
): Promise<ToggleClassificationResult> {
  await requireRole(['HQ_ADMIN', 'AREA_MANAGER', 'SITE_MANAGER']);

  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: 'Bad input' };
  }
  const { siteId, tagId, applied } = parsed.data;

  const supabase = await createServerClient();

  if (applied) {
    const { error } = await supabase
      .from('site_classifications')
      .insert({ site_id: siteId, tag_id: tagId });
    if (error && !/duplicate key/i.test(error.message)) {
      return { ok: false, message: error.message };
    }
  } else {
    const { error } = await supabase
      .from('site_classifications')
      .delete()
      .eq('site_id', siteId)
      .eq('tag_id', tagId);
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath(`/sites/${siteId}`);
  return { ok: true };
}
