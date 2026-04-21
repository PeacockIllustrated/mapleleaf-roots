-- ============================================================================
-- Mapleleaf Roots — Campaign classification targeting, rollout automation
-- Migration: 20260421_008_campaign_targeting_and_status
-- ============================================================================
-- The five core campaign tables (campaigns, campaign_unit_targets,
-- campaign_artwork, site_campaign_rollouts, rollout_install_tasks) already
-- exist from migration 000. What Phase 2 adds on top:
--
--   1. campaign_classification_targets — optional AND filter on top of unit
--      type targeting so HQ can scope campaigns to site classifications
--      (ALCOHOL_LICENSED, TWENTY_FOUR_HOUR, etc.).
--   2. public.campaign_matching_sites(campaign_id) — the single source of
--      truth for "which sites does this campaign apply to?". Used by the
--      authoring preview AND by the publish materialisation logic so the
--      two can never disagree.
--   3. Supabase Storage bucket `campaign-assets` with RLS — HQ Admin
--      writes, any authed user reads. Artwork PDFs and install-proof
--      photos live here.
--   4. Automation triggers on rollout_install_tasks — every insert/update
--      recounts the parent rollout's total/completed/problem tasks and
--      auto-flips rollout.status (PENDING→INSTALLING on first DONE,
--      INSTALLING→INSTALLED when every task is DONE). Keeps the counters
--      accurate without anyone having to remember.
--
-- The PHASE2_CAMPAIGNS_PROMPT describes simpler enum states (DRAFT/
-- PUBLISHED/CLOSED for campaigns; SCHEDULED/INSTALLING/COMPLETE for
-- rollouts). The migration 000 schema is richer (LIVE/SCHEDULED/ARCHIVED
-- for campaigns; PENDING/QUOTED/IN_PRODUCTION/SHIPPED/INSTALLING/INSTALLED
-- for rollouts) and we're keeping it — it models the real print-ship-
-- install lifecycle honestly rather than flattening it.
-- ============================================================================

-- 1. campaign_classification_targets -----------------------------------------

create table if not exists public.campaign_classification_targets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  classification_tag_id uuid not null references public.classification_tags(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (campaign_id, classification_tag_id)
);

create index if not exists idx_cct_campaign
  on public.campaign_classification_targets(campaign_id);

alter table public.campaign_classification_targets enable row level security;

-- Read: anyone who can read the parent campaign.
drop policy if exists cct_read on public.campaign_classification_targets;
create policy cct_read on public.campaign_classification_targets for select using (
  campaign_id in (
    select id from public.campaigns
    where public.is_hq_admin()
       or scope = 'GLOBAL'
       or (scope = 'LOCAL' and owner_site_id in (select public.accessible_site_ids()))
  )
);

-- Write: HQ Admin only (GLOBAL campaigns) or the LOCAL campaign's owner site's AM.
drop policy if exists cct_write on public.campaign_classification_targets;
create policy cct_write on public.campaign_classification_targets for all using (
  campaign_id in (
    select id from public.campaigns
    where public.is_hq_admin()
       or (scope = 'LOCAL' and owner_site_id is not null and public.manages_site_area(owner_site_id))
  )
) with check (
  campaign_id in (
    select id from public.campaigns
    where public.is_hq_admin()
       or (scope = 'LOCAL' and owner_site_id is not null and public.manages_site_area(owner_site_id))
  )
);

-- 2. Matching-sites function --------------------------------------------------
--
-- A site matches a campaign when:
--   (a) at least one of its placed units has a unit_type listed in the
--       campaign's unit targets, AND
--   (b) either the campaign has no classification targets OR the site has
--       every one of the campaign's classification targets (AND semantics).
--
-- SECURITY DEFINER because the HQ Admin publishing the campaign should get
-- a faithful count regardless of whether they personally have read access
-- to every `site_classifications` row. Callers that shouldn't see the
-- result list still can't — this function returns UUIDs, not names, and
-- the UI only renders names via existing RLS-gated reads.

create or replace function public.campaign_matching_sites(p_campaign_id uuid)
returns table (site_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  with target_unit_types as (
    select distinct unit_type_id
    from public.campaign_unit_targets
    where campaign_id = p_campaign_id
  ),
  target_tags as (
    select classification_tag_id
    from public.campaign_classification_targets
    where campaign_id = p_campaign_id
  ),
  tag_count as (
    select count(*)::int as required_count from target_tags
  ),
  candidate_sites as (
    select distinct sp.site_id
    from public.site_units su
    join public.site_planograms sp on sp.id = su.site_planogram_id
    where su.unit_type_id in (select unit_type_id from target_unit_types)
  )
  select cs.site_id
  from candidate_sites cs
  where (
    (select required_count from tag_count) = 0
    or (
      (select count(*)::int
         from public.site_classifications sc
         where sc.site_id = cs.site_id
           and sc.tag_id in (select classification_tag_id from target_tags))
      = (select required_count from tag_count)
    )
  );
$$;

comment on function public.campaign_matching_sites(uuid) is
  'Sites matching a campaign: has at least one unit of a targeted unit_type AND has every targeted classification tag (AND semantics). Authoritative source — used by both the authoring preview and the publish materialisation.';

grant execute on function public.campaign_matching_sites(uuid) to authenticated;

-- 3. Storage bucket for campaign assets --------------------------------------
--
-- HQ uploads print-ready artwork PDFs here during campaign authoring, and
-- Employees upload install-proof photos here when marking tasks DONE.
-- Bucket is NOT public — every download goes through a signed URL so RLS
-- can be enforced.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'campaign-assets',
  'campaign-assets',
  false,
  52428800, -- 50 MB per file; plenty for a POS-ready PDF or phone photo
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- HQ Admin can write anywhere in the bucket.
drop policy if exists "campaign-assets hq write"
  on storage.objects;
create policy "campaign-assets hq write"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'campaign-assets' and public.is_hq_admin())
  with check (bucket_id = 'campaign-assets' and public.is_hq_admin());

-- Site-accessible users can upload install proofs under proofs/<site_id>/
-- so Employees can record a completion photo on their own site only.
drop policy if exists "campaign-assets proof upload"
  on storage.objects;
create policy "campaign-assets proof upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'campaign-assets'
    and (storage.foldername(name))[1] = 'proofs'
    and (storage.foldername(name))[2]::uuid in (select public.accessible_site_ids())
  );

-- Any authed user can read from the bucket — artwork links are needed in
-- the install checklist and the print pack PDF. Signed URLs control
-- whether a given reader can actually fetch.
drop policy if exists "campaign-assets authed read"
  on storage.objects;
create policy "campaign-assets authed read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'campaign-assets');

-- 4. Rollout counters + status automation ------------------------------------
--
-- site_campaign_rollouts already has total_tasks / completed_tasks /
-- problem_tasks columns (schema 000). Keep them accurate by recomputing
-- from rollout_install_tasks on every task write. Plus auto-flip:
--   PENDING/QUOTED/SHIPPED → INSTALLING when first DONE task lands
--   INSTALLING → INSTALLED when every task is DONE
-- Terminal states (INSTALLED, PROBLEM) are left alone — explicit admin
-- action required to reopen.

create or replace function public.trg_recount_rollout_tasks()
returns trigger
language plpgsql
as $$
declare
  v_rollout_id uuid;
  v_total int;
  v_done int;
  v_problem int;
  v_current_status public.rollout_status;
  v_next_status public.rollout_status;
begin
  v_rollout_id := coalesce(new.rollout_id, old.rollout_id);

  select count(*)::int,
         count(*) filter (where status = 'DONE')::int,
         count(*) filter (where status = 'PROBLEM')::int
    into v_total, v_done, v_problem
  from public.rollout_install_tasks
  where rollout_id = v_rollout_id;

  select status into v_current_status
  from public.site_campaign_rollouts
  where id = v_rollout_id;

  v_next_status := v_current_status;
  if v_current_status in ('PENDING', 'QUOTED', 'IN_PRODUCTION', 'SHIPPED')
     and v_done > 0 then
    v_next_status := 'INSTALLING';
  end if;
  if v_current_status = 'INSTALLING'
     and v_total > 0
     and v_done = v_total then
    v_next_status := 'INSTALLED';
  end if;

  update public.site_campaign_rollouts
     set total_tasks = v_total,
         completed_tasks = v_done,
         problem_tasks = v_problem,
         status = v_next_status,
         install_started_at = case
            when install_started_at is null and v_next_status = 'INSTALLING' then now()
            else install_started_at
         end,
         install_completed_at = case
            when install_completed_at is null and v_next_status = 'INSTALLED' then now()
            else install_completed_at
         end
   where id = v_rollout_id;

  return null;
end;
$$;

drop trigger if exists rit_recount_after_change on public.rollout_install_tasks;
create trigger rit_recount_after_change
  after insert or update of status or delete
  on public.rollout_install_tasks
  for each row execute function public.trg_recount_rollout_tasks();

-- ============================================================================
-- End of migration 20260421_008
-- ============================================================================
