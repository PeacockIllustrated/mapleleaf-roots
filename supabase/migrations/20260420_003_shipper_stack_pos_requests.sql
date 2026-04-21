-- ============================================================================
-- Mapleleaf Roots — Shipper box dimensions, slot stacking, POS redelivery
-- Migration: 20260420_003_shipper_stack_pos_requests
-- ============================================================================
-- Three additions driven by Phase 1.5 real-world feedback from forecourt
-- visits:
--
--   1. Small items like chocolate bars don't sit on the shelf as loose
--      SKUs — they live in a branded shipper/display box which IS what
--      the customer sees. Products gain nullable shipper_*_mm +
--      units_per_shipper columns; the shelf visualiser falls back to
--      the individual product dims when a shipper isn't defined.
--
--   2. Retail shelves commonly stack 2–4 deep (cans, tuna tins, pot
--      noodles). site_unit_slots.stack_count captures that multiplier.
--      Bounded 1..6 at the DB level; the app clamps further based on
--      the shelf's clearance_mm × product height.
--
--   3. Staff need to flag when POS material (price strips, wobblers,
--      header posters) is missing or damaged and trigger a redelivery.
--      pos_material_requests captures each issue per
--      (site_unit, unit_type_pos_slot) with a status machine and an
--      optional link to the onesign_quote that was raised to resolve it.
-- ============================================================================

-- 1. Shipper-box dimensions on products ---------------------------------------

alter table public.products
  add column if not exists shipper_width_mm integer,
  add column if not exists shipper_height_mm integer,
  add column if not exists shipper_depth_mm integer,
  add column if not exists units_per_shipper integer;

alter table public.products
  drop constraint if exists check_shipper_consistency;
alter table public.products
  add constraint check_shipper_consistency check (
    (shipper_width_mm is null
     and shipper_height_mm is null
     and shipper_depth_mm is null
     and units_per_shipper is null)
    or (shipper_width_mm > 0
        and shipper_height_mm > 0
        and shipper_depth_mm > 0
        and units_per_shipper > 0)
  );

-- 2. Stack multiplier on slots ------------------------------------------------

alter table public.site_unit_slots
  add column if not exists stack_count integer not null default 1;

alter table public.site_unit_slots
  drop constraint if exists check_stack_count_range;
alter table public.site_unit_slots
  add constraint check_stack_count_range check (
    stack_count between 1 and 6
  );

-- 3. POS material requests ----------------------------------------------------

do $$ begin
  create type public.pos_request_status as enum (
    'REPORTED',
    'ACKNOWLEDGED',
    'IN_PRODUCTION',
    'SHIPPED',
    'RESOLVED',
    'CANCELLED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pos_issue_reason as enum (
    'MISSING',
    'DAMAGED',
    'WRONG_SIZE',
    'WRONG_ARTWORK',
    'OTHER'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.pos_material_requests (
  id uuid primary key default gen_random_uuid(),
  site_unit_id uuid not null references public.site_units(id) on delete cascade,
  unit_type_pos_slot_id uuid not null references public.unit_type_pos_slots(id) on delete restrict,
  status public.pos_request_status not null default 'REPORTED',
  reason public.pos_issue_reason not null default 'MISSING',
  notes text,
  photo_url text,
  reported_by uuid references public.user_profiles(id) on delete set null,
  reported_at timestamptz not null default now(),
  resolved_at timestamptz,
  linked_quote_id uuid references public.onesign_quotes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists pos_material_requests_updated on public.pos_material_requests;
create trigger pos_material_requests_updated
  before update on public.pos_material_requests
  for each row execute function public.trg_set_updated_at();

create index if not exists idx_pmr_site_unit
  on public.pos_material_requests(site_unit_id);
create index if not exists idx_pmr_status
  on public.pos_material_requests(status);
create index if not exists idx_pmr_open
  on public.pos_material_requests(site_unit_id)
  where status in ('REPORTED', 'ACKNOWLEDGED', 'IN_PRODUCTION', 'SHIPPED');

alter table public.pos_material_requests enable row level security;

drop policy if exists pmr_read on public.pos_material_requests;
create policy pmr_read on public.pos_material_requests for select using (
  site_unit_id in (
    select su.id from public.site_units su
    join public.site_planograms sp on sp.id = su.site_planogram_id
    where sp.site_id in (select public.accessible_site_ids())
  )
);

drop policy if exists pmr_insert on public.pos_material_requests;
create policy pmr_insert on public.pos_material_requests for insert with check (
  site_unit_id in (
    select su.id from public.site_units su
    join public.site_planograms sp on sp.id = su.site_planogram_id
    where public.is_hq_admin()
       or public.manages_site_area(sp.site_id)
       or public.assigned_to_site(sp.site_id)
  )
);

drop policy if exists pmr_hq_am_update on public.pos_material_requests;
create policy pmr_hq_am_update on public.pos_material_requests for update using (
  site_unit_id in (
    select su.id from public.site_units su
    join public.site_planograms sp on sp.id = su.site_planogram_id
    where public.is_hq_admin() or public.manages_site_area(sp.site_id)
  )
) with check (true);

-- ============================================================================
-- End of migration 20260420_003
-- ============================================================================
