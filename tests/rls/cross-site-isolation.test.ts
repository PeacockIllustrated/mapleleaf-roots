import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  testEnvReady,
  userClient,
} from './helpers';

/**
 * Cross-site isolation test.
 *
 * Confirms that a Site Manager at Site A sees only Site A, not Site B, when
 * reading `public.sites`. This is the primary M1 acceptance test for the
 * role hierarchy.
 *
 * Requires env: TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_ROLE_KEY,
 * TEST_SUPABASE_ANON_KEY. See tests/rls/README.md.
 */

const skip = !testEnvReady();

const describeOrSkip = skip ? describe.skip : describe;

describeOrSkip('RLS · cross-site isolation', () => {
  const admin = skip ? null : adminClient();
  const createdUserIds: string[] = [];
  const createdSiteIds: string[] = [];
  const createdAreaIds: string[] = [];

  let userA: Awaited<ReturnType<typeof createTestUser>>;
  let userB: Awaited<ReturnType<typeof createTestUser>>;
  let siteAId: string;
  let siteBId: string;

  beforeAll(async () => {
    if (!admin) return;

    // Two throwaway areas
    const { data: areaA, error: areaAErr } = await admin
      .from('areas')
      .insert({ code: `TEST_A_${Date.now()}`, name: 'Test Area A' })
      .select('id')
      .single();
    if (areaAErr || !areaA) throw areaAErr;
    createdAreaIds.push(areaA.id);

    const { data: areaB, error: areaBErr } = await admin
      .from('areas')
      .insert({ code: `TEST_B_${Date.now()}`, name: 'Test Area B' })
      .select('id')
      .single();
    if (areaBErr || !areaB) throw areaBErr;
    createdAreaIds.push(areaB.id);

    // Two throwaway sites in their respective areas
    const { data: siteA, error: siteAErr } = await admin
      .from('sites')
      .insert({
        code: `TEST_SITE_A_${Date.now()}`,
        name: 'Test Site A',
        area_id: areaA.id,
        tier: 'SMALL',
      })
      .select('id')
      .single();
    if (siteAErr || !siteA) throw siteAErr;
    siteAId = siteA.id;
    createdSiteIds.push(siteA.id);

    const { data: siteB, error: siteBErr } = await admin
      .from('sites')
      .insert({
        code: `TEST_SITE_B_${Date.now()}`,
        name: 'Test Site B',
        area_id: areaB.id,
        tier: 'SMALL',
      })
      .select('id')
      .single();
    if (siteBErr || !siteB) throw siteBErr;
    siteBId = siteB.id;
    createdSiteIds.push(siteB.id);

    // Two Site Managers, one assigned to each site
    userA = await createTestUser(admin, 'sm-a');
    userB = await createTestUser(admin, 'sm-b');
    createdUserIds.push(userA.id, userB.id);

    await admin
      .from('user_profiles')
      .update({ role: 'SITE_MANAGER', full_name: 'SM A' })
      .eq('id', userA.id);

    await admin
      .from('user_profiles')
      .update({ role: 'SITE_MANAGER', full_name: 'SM B' })
      .eq('id', userB.id);

    await admin.from('site_user_assignments').insert([
      { site_id: siteAId, user_id: userA.id, role: 'SITE_MANAGER', is_primary: true },
      { site_id: siteBId, user_id: userB.id, role: 'SITE_MANAGER', is_primary: true },
    ]);
  });

  afterAll(async () => {
    if (!admin) return;
    for (const id of createdUserIds) {
      try {
        await deleteTestUser(admin, id);
      } catch {
        /* best effort */
      }
    }
    if (createdSiteIds.length) {
      await admin.from('sites').delete().in('id', createdSiteIds);
    }
    if (createdAreaIds.length) {
      await admin.from('areas').delete().in('id', createdAreaIds);
    }
  });

  it('SM A sees only Site A', async () => {
    const client = userClient(userA.accessToken);
    const { data, error } = await client
      .from('sites')
      .select('id, code, name')
      .in('id', [siteAId, siteBId]);

    expect(error).toBeNull();
    expect(data?.map((s) => s.id)).toEqual([siteAId]);
  });

  it('SM B sees only Site B', async () => {
    const client = userClient(userB.accessToken);
    const { data, error } = await client
      .from('sites')
      .select('id, code, name')
      .in('id', [siteAId, siteBId]);

    expect(error).toBeNull();
    expect(data?.map((s) => s.id)).toEqual([siteBId]);
  });
});
