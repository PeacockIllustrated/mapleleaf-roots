'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-role';
import { createServerClient } from '@/lib/supabase/server';

const categorySchema = z.enum([
  'FIXTURE',
  'POS_IDEA',
  'EXTERIOR',
  'PROMO_SECTION',
  'OTHER',
]);

const createSchema = z.object({
  site_id: z.string().uuid(),
  title: z.string().min(3, 'A short title helps HQ review').max(120),
  description: z
    .string()
    .min(10, 'Describe the idea in at least a couple of sentences')
    .max(2000),
  category: categorySchema,
});

export type CreateSubmissionResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

/**
 * Submit a community-board idea. Caller must be site-assigned (RLS
 * cs_insert enforces); the server action wraps it for clear error copy.
 */
export async function createSubmission(
  input: unknown
): Promise<CreateSubmissionResult> {
  const profile = await requireRole([
    'HQ_ADMIN',
    'AREA_MANAGER',
    'SITE_MANAGER',
    'EMPLOYEE',
  ]);

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Bad input' };
  }
  const v = parsed.data;

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('community_submissions')
    .insert({
      site_id: v.site_id,
      submitted_by: profile.id,
      title: v.title,
      description: v.description,
      category: v.category,
    })
    .select('id')
    .single();

  if (error || !data) {
    return {
      ok: false,
      message:
        error?.message ??
        'Could not submit — check you’re assigned to this site and try again.',
    };
  }

  revalidatePath('/community');
  return { ok: true, id: data.id as string };
}
