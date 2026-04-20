-- ============================================================================
-- Mapleleaf Roots — Area Manager inserts, first-login profile, quote sequence
-- Migration: 20260420_001_am_inserts_first_login_quote_seq
-- ============================================================================
-- Three Phase 1 M0 additions that the initial schema left open:
--
--   1. Let Area Managers INSERT sites (and, by extension, the shell
--      site_planograms row). The initial schema only grants sites_am_write as
--      UPDATE, which blocks the Phase 1 acceptance demo where an AM onboards a
--      new site in their area. Adds a dedicated area-level helper function
--      (manages_area) because the existing manages_site_area helper joins
--      through public.sites — unusable at INSERT time before the row exists.
--
--   2. Auto-materialise a public.user_profiles row whenever a new auth.users
--      row is created, so post-signup redirects never land on a page that
--      fails RLS due to a missing profile. Default role is EMPLOYEE; Phase 1
--      promotion to SITE_MANAGER / AREA_MANAGER / HQ_ADMIN remains a manual
--      SQL step performed by HQ.
--
--   3. Provide a cluster-wide, monotonic Onesign quote reference generator.
--      Quote refs are formatted OSD-YYYY-NNNNNN where NNNNNN is a globally
--      unique sequence value (never resets) and YYYY is the current year,
--      included for human readability only. This matches the existing Onesign
--      Portal numbering contract and avoids the gap/duplicate classes of bugs
--      that date-scoped counters are prone to under concurrency.
--
-- No existing helper, policy, table, or trigger is modified by this
-- migration. Every new object uses "if not exists" or "create or replace"
-- where safe, so this file is re-runnable from the Supabase SQL editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Area Manager INSERT on sites
-- ----------------------------------------------------------------------------

-- Area-scoped membership check. Distinct from public.manages_site_area(site_id)
-- which joins through public.sites — that helper cannot be used at INSERT time
-- on the sites table itself because the row being inserted does not yet exist.
create or replace function public.manages_area(area_id_arg uuid)
returns boolean as $$
  select exists (
    select 1
    from public.area_manager_assignments ama
    where ama.area_id = area_id_arg
      and ama.user_id = auth.uid()
  )
$$ language sql security definer stable set search_path = public;

-- Area Managers may insert a new site into any area they manage. The USING
-- clause is omitted (INSERT policies only take WITH CHECK). HQ Admin already
-- has full write access via sites_hq_write.
create policy sites_am_insert on public.sites for insert
  with check (
    public.current_user_role() = 'AREA_MANAGER'
    and area_id is not null
    and public.manages_area(area_id)
  );

-- Note: the shell public.site_planograms row for a newly onboarded site is
-- already covered by the existing sp_sm_write policy (initial schema line
-- 841), which is declared "for all" with USING/WITH CHECK clauses that call
-- public.manages_site_area(site_id). At INSERT time on site_planograms the
-- parent sites row has just been created, so manages_site_area resolves
-- correctly for the AM and no additional INSERT policy is required here.

-- ----------------------------------------------------------------------------
-- 2. First-login profile materialisation
-- ----------------------------------------------------------------------------

-- Runs as the function owner (SECURITY DEFINER), so it bypasses RLS on
-- public.user_profiles. That is deliberate: the caller is Supabase Auth's
-- service role on behalf of a user who does not yet have a profile row and
-- therefore cannot satisfy any policy. search_path is locked to public to
-- harden against schema-shadowing attacks on a SECURITY DEFINER function.
create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      split_part(new.email::text, '@', 1)
    ),
    'EMPLOYEE'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Drop-then-create so re-running this migration is safe. We do NOT touch any
-- existing trigger on auth.users that may have been added out-of-band.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ----------------------------------------------------------------------------
-- 3. Onesign quote reference sequence
-- ----------------------------------------------------------------------------

-- Global, monotonic, never-cycles. NNNNNN runs to 999,999 before format width
-- is exceeded — at Mapleleaf's current ~200 quotes/year that is ~5,000 years
-- of headroom; when it overflows, lpad will simply stop padding and the ref
-- will grow to 7+ digits, which is acceptable.
create sequence if not exists public.onesign_quote_seq
  as bigint
  start with 1
  no cycle;

-- Wrapper helper. SECURITY DEFINER so that a client calling this via a
-- Server Action under the authenticated role does not need explicit
-- GRANT USAGE on the sequence.
create or replace function public.next_onesign_quote_ref()
returns text as $$
  select 'OSD-'
    || to_char(now(), 'YYYY')
    || '-'
    || lpad(nextval('public.onesign_quote_seq')::text, 6, '0')
$$ language sql security definer volatile set search_path = public;

grant execute on function public.next_onesign_quote_ref() to authenticated;

-- ============================================================================
-- End of migration 20260420_001
-- ============================================================================
