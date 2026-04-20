'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-role';
import {
  createServerClient,
  createServiceClient,
} from '@/lib/supabase/server';

/**
 * Team onboarding server action.
 *
 * Creates an auth.users row with a password, materialises (or promotes)
 * the user_profiles row to the target role, and attaches area/site
 * assignments. Uses the service-role client because auth.admin APIs and
 * cross-role promotions need to bypass RLS. Code-level permission checks
 * enforce the hierarchy:
 *
 *   HQ_ADMIN        → can invite anyone (HQ/AM/SM/Employee), any areas/sites
 *   AREA_MANAGER    → can invite SM or Employee, only into sites in their areas
 *   SITE_MANAGER    → can invite Employee, only into their assigned sites
 *   EMPLOYEE        → no.
 */

const roleEnum = z.enum([
  'HQ_ADMIN',
  'AREA_MANAGER',
  'SITE_MANAGER',
  'EMPLOYEE',
]);

const inviteSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .max(128, 'Password is too long'),
  full_name: z
    .string()
    .min(2, 'Full name required')
    .max(120, 'Full name is too long'),
  role: roleEnum,
  area_ids: z.array(z.string().uuid()).default([]),
  site_ids: z.array(z.string().uuid()).default([]),
});

export type InviteInput = z.infer<typeof inviteSchema>;

export type InviteResult =
  | { ok: true; userId: string }
  | { ok: false; message: string };

export async function inviteSubordinate(input: unknown): Promise<InviteResult> {
  const caller = await requireRole([
    'HQ_ADMIN',
    'AREA_MANAGER',
    'SITE_MANAGER',
  ]);

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'Bad input',
    };
  }
  const v = parsed.data;

  // Permission ladder: what roles can each caller create?
  const allowedTargets: Record<typeof caller.role, Array<InviteInput['role']>> =
    {
      HQ_ADMIN: ['HQ_ADMIN', 'AREA_MANAGER', 'SITE_MANAGER', 'EMPLOYEE'],
      AREA_MANAGER: ['SITE_MANAGER', 'EMPLOYEE'],
      SITE_MANAGER: ['EMPLOYEE'],
      EMPLOYEE: [],
    };

  if (!allowedTargets[caller.role].includes(v.role)) {
    return {
      ok: false,
      message: `${labelFor(caller.role)}s can’t invite ${labelFor(v.role)}s.`,
    };
  }

  // Shape the assignments by target role. Enforce that HQ targets have no
  // assignments; AREA_MANAGER needs at least one area; SM/Employee needs
  // at least one site.
  if (v.role === 'HQ_ADMIN' && (v.area_ids.length > 0 || v.site_ids.length > 0)) {
    return {
      ok: false,
      message: 'HQ Admins aren’t scoped to areas or sites.',
    };
  }
  if (v.role === 'AREA_MANAGER' && v.area_ids.length === 0) {
    return {
      ok: false,
      message: 'Select at least one area for the new Area Manager.',
    };
  }
  if (
    (v.role === 'SITE_MANAGER' || v.role === 'EMPLOYEE') &&
    v.site_ids.length === 0
  ) {
    return {
      ok: false,
      message: 'Select at least one site.',
    };
  }

  // Scope check: the caller can only assign areas/sites they themselves can
  // see. Service client bypasses RLS, so we need this guard here rather than
  // relying on the DB refusing.
  const authed = await createServerClient();
  if (caller.role === 'AREA_MANAGER') {
    const { data: myAreas } = await authed
      .from('area_manager_assignments')
      .select('area_id')
      .eq('user_id', caller.id);
    const myAreaIds = new Set(
      (myAreas ?? []).map((r) => r.area_id as string)
    );

    if (v.area_ids.some((id) => !myAreaIds.has(id))) {
      return {
        ok: false,
        message: 'One of the areas you picked isn’t in your scope.',
      };
    }

    if (v.site_ids.length > 0) {
      const { data: sitesInAreas } = await authed
        .from('sites')
        .select('id, area_id')
        .in('area_id', [...myAreaIds]);
      const scopedSiteIds = new Set(
        (sitesInAreas ?? []).map((s) => s.id as string)
      );
      if (v.site_ids.some((id) => !scopedSiteIds.has(id))) {
        return {
          ok: false,
          message: 'One of the sites isn’t in your areas.',
        };
      }
    }
  }

  if (caller.role === 'SITE_MANAGER') {
    const { data: mySites } = await authed
      .from('site_user_assignments')
      .select('site_id')
      .eq('user_id', caller.id);
    const mySiteIds = new Set(
      (mySites ?? []).map((r) => r.site_id as string)
    );
    if (v.site_ids.some((id) => !mySiteIds.has(id))) {
      return {
        ok: false,
        message: 'One of the sites isn’t yours.',
      };
    }
  }

  // All checks passed — create the auth user.
  const admin = createServiceClient();

  const { data: created, error: createErr } = await admin.auth.admin.createUser(
    {
      email: v.email,
      password: v.password,
      email_confirm: true,
      user_metadata: { full_name: v.full_name },
    }
  );

  if (createErr || !created.user) {
    return {
      ok: false,
      message:
        createErr?.message ?? 'Could not create the user. Try a different email.',
    };
  }

  const userId = created.user.id;

  // The handle_new_auth_user trigger from migration 001 has inserted a
  // user_profiles row with role='EMPLOYEE'. Promote it to the target role
  // and persist the full name the admin typed.
  const { error: profileErr } = await admin
    .from('user_profiles')
    .update({
      full_name: v.full_name,
      role: v.role,
      is_active: true,
    })
    .eq('id', userId);

  if (profileErr) {
    // Best-effort cleanup of the auth user so we don't leave orphans.
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, message: profileErr.message };
  }

  // Area / site assignments.
  if (v.role === 'AREA_MANAGER' && v.area_ids.length > 0) {
    const { error: amaErr } = await admin
      .from('area_manager_assignments')
      .insert(
        v.area_ids.map((area_id) => ({ user_id: userId, area_id }))
      );
    if (amaErr) {
      await admin.auth.admin.deleteUser(userId);
      return { ok: false, message: amaErr.message };
    }
  }

  if ((v.role === 'SITE_MANAGER' || v.role === 'EMPLOYEE') && v.site_ids.length > 0) {
    const { error: suaErr } = await admin
      .from('site_user_assignments')
      .insert(
        v.site_ids.map((site_id, index) => ({
          user_id: userId,
          site_id,
          role: v.role,
          is_primary: index === 0,
        }))
      );
    if (suaErr) {
      await admin.auth.admin.deleteUser(userId);
      return { ok: false, message: suaErr.message };
    }
  }

  revalidatePath('/team');
  return { ok: true, userId };
}

function labelFor(role: InviteInput['role']): string {
  switch (role) {
    case 'HQ_ADMIN':
      return 'HQ Admin';
    case 'AREA_MANAGER':
      return 'Area Manager';
    case 'SITE_MANAGER':
      return 'Site Manager';
    case 'EMPLOYEE':
      return 'Employee';
  }
}

export { labelFor as roleLabel };
