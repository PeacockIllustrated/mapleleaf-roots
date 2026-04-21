/**
 * Thin wrapper over the `public.campaign_matching_sites(uuid)` SQL function.
 *
 * Having this in one place means the authoring preview and the publish
 * materialisation logic call the same code path. If the matching rules
 * change (e.g. exclude suspended sites), there's one place to do it.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface MatchingSitesResult {
  siteIds: string[];
}

export async function campaignMatchingSites(
  supabase: SupabaseClient,
  campaignId: string
): Promise<MatchingSitesResult> {
  const { data, error } = await supabase.rpc('campaign_matching_sites', {
    p_campaign_id: campaignId,
  });

  if (error) {
    throw new Error(`campaign_matching_sites failed: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{ site_id: string }>;
  return { siteIds: rows.map((r) => r.site_id) };
}
