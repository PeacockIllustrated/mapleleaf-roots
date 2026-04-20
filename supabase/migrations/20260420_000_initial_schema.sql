-- ============================================================================
-- Mapleleaf Roots — Initial schema
-- Migration: 20260420_000_initial_schema
-- ============================================================================
-- This migration establishes the full Phase 1 schema. Every subsequent schema
-- change MUST be in a new migration file. Never edit this one after merge.
--
-- Conventions:
--   * UUIDs via gen_random_uuid() — pgcrypto (Supabase enables by default)
--   * snake_case for everything
--   * created_at + updated_at on every table, with triggers
--   * RLS enabled on every table with policies in the same file
--   * FK deletes default to RESTRICT; cascades are explicit and deliberate
-- ============================================================================

-- Extensions ------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- Utility: updated_at trigger -------------------------------------------------
create or replace function public.trg_set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- 1. USERS & HIERARCHY
-- ============================================================================

create type public.user_role as enum (
  'HQ_ADMIN',
  'AREA_MANAGER',
  'SITE_MANAGER',
  'EMPLOYEE'
);

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null unique,
  full_name text not null,
  role public.user_role not null default 'EMPLOYEE',
  avatar_url text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger user_profiles_updated before update on public.user_profiles
  for each row execute function public.trg_set_updated_at();
create index idx_user_profiles_role on public.user_profiles(role) where is_active;

-- Areas: geographic groupings assigned to Area Managers
create table public.areas (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger areas_updated before update on public.areas
  for each row execute function public.trg_set_updated_at();

-- Area Manager assignments (many-to-many: an AM may cover multiple areas)
create table public.area_manager_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  area_id uuid not null references public.areas(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (user_id, area_id)
);
create index idx_ama_user on public.area_manager_assignments(user_id);
create index idx_ama_area on public.area_manager_assignments(area_id);

-- ============================================================================
-- 2. SITES & SITE USER ASSIGNMENTS
-- ============================================================================

create type public.site_tier as enum ('SMALL', 'MEDIUM', 'LARGE');

create type public.site_onboarding_status as enum (
  'INVITED',
  'CONFIGURING',
  'QUOTE_REQUESTED',
  'QUOTE_APPROVED',
  'FITTING',
  'ACTIVE',
  'SUSPENDED'
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,           -- e.g. 'BROMYARD-EXPRESS'
  name text not null,                  -- 'Mapleleaf Express Bromyard'
  area_id uuid references public.areas(id) on delete restrict,
  tier public.site_tier not null,
  address_line_1 text,
  address_line_2 text,
  city text,
  postcode text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  onboarding_status public.site_onboarding_status not null default 'INVITED',
  opened_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger sites_updated before update on public.sites
  for each row execute function public.trg_set_updated_at();
create index idx_sites_area on public.sites(area_id);
create index idx_sites_status on public.sites(onboarding_status);

-- Classification tags (Alcohol, Coffee, Lottery, 24-hour, etc.)
create table public.classification_tags (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 0
);

create table public.site_classifications (
  site_id uuid not null references public.sites(id) on delete cascade,
  tag_id uuid not null references public.classification_tags(id) on delete cascade,
  primary key (site_id, tag_id)
);

-- Site user assignments: Site Managers and Employees assigned to specific sites
create table public.site_user_assignments (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  role public.user_role not null check (role in ('SITE_MANAGER', 'EMPLOYEE')),
  is_primary boolean not null default false,
  assigned_at timestamptz not null default now(),
  unique (site_id, user_id)
);
create index idx_sua_site on public.site_user_assignments(site_id);
create index idx_sua_user on public.site_user_assignments(user_id);

-- ============================================================================
-- 3. UNIT LIBRARY (HQ-owned master catalogue)
-- ============================================================================

create type public.unit_category as enum (
  'DRY_SHELVING',
  'CHILLED_FROZEN',
  'PROMO_SEASONAL',
  'COUNTER_TILL',
  'FORECOURT',
  'WINDOWS_POS_ONLY'
);

create type public.temperature_zone as enum ('AMBIENT', 'CHILLED', 'FROZEN');

create table public.unit_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                          -- 'GONDOLA_AISLE_1000'
  display_name text not null,
  category public.unit_category not null,
  description text,
  width_mm integer not null,
  depth_mm integer not null,
  height_mm integer not null,
  is_double_sided boolean not null default false,
  is_refrigerated boolean not null default false,
  temperature_zone public.temperature_zone not null default 'AMBIENT',
  default_shelf_count integer,                        -- null for non-shelving units
  footprint_svg text,                                  -- top-down shape for floor plan
  render_url text,                                     -- optional 3D/iso preview
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger unit_types_updated before update on public.unit_types
  for each row execute function public.trg_set_updated_at();
create index idx_unit_types_category on public.unit_types(category) where is_active;

-- Default shelf grid for shelving-type units
create table public.unit_type_default_shelves (
  id uuid primary key default gen_random_uuid(),
  unit_type_id uuid not null references public.unit_types(id) on delete cascade,
  shelf_order integer not null,                       -- 1 = top, increments downward
  clearance_mm integer not null,                      -- space above the shelf
  depth_mm integer,                                    -- override unit depth if different
  is_base_shelf boolean not null default false,
  unique (unit_type_id, shelf_order)
);

-- POS slot types: named artwork positions that unit types can carry
create type public.pos_mount_method as enum (
  'PRICE_CHANNEL',
  'ADHESIVE',
  'POSTER_POCKET',
  'MAGNETIC',
  'RAIL_INSERT',
  'FREESTANDING',
  'VINYL_DIRECT'
);

create type public.pos_material as enum (
  'PAPER',
  'RIGID_PVC',
  'FOAMEX',
  'CORRUGATED_CARD',
  'VINYL',
  'ACRYLIC',
  'FABRIC'
);

create table public.pos_slot_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                          -- 'SHELF_STRIP_1000'
  display_name text not null,
  description text,
  width_mm integer not null,
  height_mm integer not null,
  mount_method public.pos_mount_method not null,
  default_material public.pos_material not null,
  requires_hq_approval boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger pos_slot_types_updated before update on public.pos_slot_types
  for each row execute function public.trg_set_updated_at();

-- Junction: which POS slots does each unit type carry, and how many
create table public.unit_type_pos_slots (
  id uuid primary key default gen_random_uuid(),
  unit_type_id uuid not null references public.unit_types(id) on delete cascade,
  pos_slot_type_id uuid not null references public.pos_slot_types(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  position_label text,                                -- 'TOP_HEADER', 'SHELF_1', etc.
  unique (unit_type_id, position_label)
);
create index idx_utps_unit on public.unit_type_pos_slots(unit_type_id);

-- ============================================================================
-- 4. PROMO SECTIONS (HQ-owned merchandising taxonomy)
-- ============================================================================

create type public.promo_section_source as enum (
  'HQ',
  'PROMOTED_SUGGESTION'
);

create table public.promo_sections (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                          -- 'SOFT_DRINKS'
  display_name text not null,
  description text,
  hex_colour text not null check (hex_colour ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0,
  source public.promo_section_source not null default 'HQ',
  is_active boolean not null default true,
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger promo_sections_updated before update on public.promo_sections
  for each row execute function public.trg_set_updated_at();

-- ============================================================================
-- 5. SITE PLANOGRAM (the composition of a site)
-- ============================================================================

create table public.site_planograms (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null unique references public.sites(id) on delete cascade,
  name text not null default 'Current planogram',
  last_published_at timestamptz,
  published_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger site_planograms_updated before update on public.site_planograms
  for each row execute function public.trg_set_updated_at();

-- Site units: instances placed on the floor plan
create table public.site_units (
  id uuid primary key default gen_random_uuid(),
  site_planogram_id uuid not null references public.site_planograms(id) on delete cascade,
  unit_type_id uuid not null references public.unit_types(id) on delete restrict,
  promo_section_id uuid references public.promo_sections(id) on delete set null,
  label text not null,                                -- 'Aisle 1 Left', 'Endcap A'
  floor_x integer not null,                            -- mm from floor-plan origin (top-left)
  floor_y integer not null,
  rotation_degrees integer not null default 0 check (rotation_degrees in (0, 90, 180, 270)),
  is_promo_featured boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete set null
);
create trigger site_units_updated before update on public.site_units
  for each row execute function public.trg_set_updated_at();
create index idx_site_units_planogram on public.site_units(site_planogram_id);
create index idx_site_units_unit_type on public.site_units(unit_type_id);
create index idx_site_units_promo on public.site_units(promo_section_id);

-- Per-site shelves (materialised from unit_type_default_shelves at placement time)
create table public.site_unit_shelves (
  id uuid primary key default gen_random_uuid(),
  site_unit_id uuid not null references public.site_units(id) on delete cascade,
  shelf_order integer not null,
  clearance_mm integer not null,
  depth_mm integer,
  is_base_shelf boolean not null default false,
  unique (site_unit_id, shelf_order)
);
create index idx_sus_unit on public.site_unit_shelves(site_unit_id);

-- Per-site slots (product positions on shelves)
create type public.slot_stocking_state as enum (
  'MAIN',
  'SUB_A',
  'SUB_B',
  'EMPTY',
  'OUT_OF_SPEC'
);

create table public.site_unit_slots (
  id uuid primary key default gen_random_uuid(),
  site_unit_shelf_id uuid not null references public.site_unit_shelves(id) on delete cascade,
  slot_order integer not null,                         -- left-to-right along shelf
  width_mm integer not null,
  facing_count integer not null default 1 check (facing_count > 0),
  currently_stocking public.slot_stocking_state not null default 'MAIN',
  last_restocked_at timestamptz,
  last_restocked_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_unit_shelf_id, slot_order)
);
create trigger site_unit_slots_updated before update on public.site_unit_slots
  for each row execute function public.trg_set_updated_at();
create index idx_sus2_shelf on public.site_unit_slots(site_unit_shelf_id);

-- ============================================================================
-- 6. PRODUCT CATALOGUE
-- ============================================================================

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.product_categories(id) on delete restrict,
  code text not null unique,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create type public.product_data_source as enum (
  'OPEN_FOOD_FACTS',
  'OPEN_PRODUCTS_FACTS',
  'INTERNAL_CATALOGUE',
  'FRANCHISEE_SUBMITTED'
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  gtin text,                                           -- barcode (EAN-13 most common)
  name text not null,
  brand text,
  category_id uuid references public.product_categories(id) on delete set null,
  width_mm integer,
  height_mm integer,
  depth_mm integer,
  image_url text,
  thumbnail_url text,
  data_source public.product_data_source not null default 'INTERNAL_CATALOGUE',
  external_ref text,                                   -- OFF barcode or supplier ID
  temperature_zone public.temperature_zone not null default 'AMBIENT',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger products_updated before update on public.products
  for each row execute function public.trg_set_updated_at();
create index idx_products_gtin on public.products(gtin) where gtin is not null;
create index idx_products_category on public.products(category_id);
create index idx_products_name on public.products using gin (to_tsvector('english', name));

-- Slot product assignments: the main + sub A + sub B pattern
create table public.slot_product_assignments (
  id uuid primary key default gen_random_uuid(),
  site_unit_slot_id uuid not null unique references public.site_unit_slots(id) on delete cascade,
  main_product_id uuid references public.products(id) on delete restrict,
  substitute_a_product_id uuid references public.products(id) on delete restrict,
  substitute_b_product_id uuid references public.products(id) on delete restrict,
  assigned_by uuid references public.user_profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger slot_product_assignments_updated before update on public.slot_product_assignments
  for each row execute function public.trg_set_updated_at();

-- ============================================================================
-- 7. CAMPAIGNS
-- ============================================================================

create type public.campaign_scope as enum ('GLOBAL', 'LOCAL');

create type public.campaign_status as enum (
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'SCHEDULED',
  'LIVE',
  'ARCHIVED',
  'REJECTED'
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                           -- 'SUMMER_BBQ_2026'
  name text not null,
  scope public.campaign_scope not null default 'GLOBAL',
  owner_site_id uuid references public.sites(id) on delete cascade,  -- set for LOCAL scope
  status public.campaign_status not null default 'DRAFT',
  starts_at date,
  ends_at date,
  description text,
  brief_url text,                                      -- link to design brief document
  approved_by uuid references public.user_profiles(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_local_has_site check (
    (scope = 'LOCAL' and owner_site_id is not null) or
    (scope = 'GLOBAL' and owner_site_id is null)
  ),
  constraint check_dates_ordered check (ends_at is null or starts_at is null or ends_at >= starts_at)
);
create trigger campaigns_updated before update on public.campaigns
  for each row execute function public.trg_set_updated_at();
create index idx_campaigns_status on public.campaigns(status);
create index idx_campaigns_dates on public.campaigns(starts_at, ends_at) where status in ('SCHEDULED', 'LIVE');

-- Which unit types a campaign targets
create table public.campaign_unit_targets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  unit_type_id uuid not null references public.unit_types(id) on delete restrict,
  promo_section_id uuid references public.promo_sections(id) on delete set null,
  unique (campaign_id, unit_type_id, promo_section_id)
);
create index idx_cut_campaign on public.campaign_unit_targets(campaign_id);

-- Campaign artwork: one row per (campaign × unit_type × pos_slot)
create table public.campaign_artwork (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  unit_type_id uuid not null references public.unit_types(id) on delete restrict,
  pos_slot_type_id uuid not null references public.pos_slot_types(id) on delete restrict,
  target_promo_section_id uuid references public.promo_sections(id) on delete set null,
  linked_product_id uuid references public.products(id) on delete set null,
  artwork_url text,                                    -- final print-ready file
  preview_url text,                                    -- low-res for admin UI
  material public.pos_material,
  quantity_per_target integer not null default 1,
  notes text,
  uploaded_by uuid references public.user_profiles(id) on delete set null,
  uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, unit_type_id, pos_slot_type_id, target_promo_section_id)
);
create trigger campaign_artwork_updated before update on public.campaign_artwork
  for each row execute function public.trg_set_updated_at();
create index idx_ca_campaign on public.campaign_artwork(campaign_id);

-- Per-site rollout
create type public.rollout_status as enum (
  'PENDING',
  'QUOTED',
  'IN_PRODUCTION',
  'SHIPPED',
  'INSTALLING',
  'INSTALLED',
  'PROBLEM'
);

create table public.site_campaign_rollouts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  status public.rollout_status not null default 'PENDING',
  quote_ref text,                                      -- 'OSD-2026-001247'
  total_tasks integer not null default 0,
  completed_tasks integer not null default 0,
  problem_tasks integer not null default 0,
  shipped_at timestamptz,
  install_started_at timestamptz,
  install_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, campaign_id)
);
create trigger site_campaign_rollouts_updated before update on public.site_campaign_rollouts
  for each row execute function public.trg_set_updated_at();
create index idx_scr_site on public.site_campaign_rollouts(site_id);
create index idx_scr_campaign on public.site_campaign_rollouts(campaign_id);
create index idx_scr_status on public.site_campaign_rollouts(status);

-- Individual install tasks (the primitive for the employee mobile app)
create type public.task_status as enum (
  'PENDING',
  'IN_PROGRESS',
  'DONE',
  'PROBLEM',
  'SKIPPED'
);

create type public.task_problem_reason as enum (
  'ARTWORK_DAMAGED',
  'WRONG_SIZE',
  'MISSING_FROM_PACK',
  'CANNOT_FIND_LOCATION',
  'OTHER'
);

create table public.rollout_install_tasks (
  id uuid primary key default gen_random_uuid(),
  rollout_id uuid not null references public.site_campaign_rollouts(id) on delete cascade,
  site_unit_id uuid not null references public.site_units(id) on delete cascade,
  campaign_artwork_id uuid not null references public.campaign_artwork(id) on delete restrict,
  pos_position_label text,                             -- e.g. 'SHELF_1' (matches unit_type_pos_slots.position_label)
  task_order integer not null,
  status public.task_status not null default 'PENDING',
  completed_by uuid references public.user_profiles(id) on delete set null,
  completed_at timestamptz,
  photo_url text,
  problem_reason public.task_problem_reason,
  problem_notes text,
  problem_photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger rollout_install_tasks_updated before update on public.rollout_install_tasks
  for each row execute function public.trg_set_updated_at();
create index idx_rit_rollout on public.rollout_install_tasks(rollout_id);
create index idx_rit_status on public.rollout_install_tasks(rollout_id, status);

-- ============================================================================
-- 8. ACTIVITY LOG (employee-driven)
-- ============================================================================

create type public.slot_activity_action as enum (
  'RESTOCKED_MAIN',
  'SWITCHED_TO_SUB_A',
  'SWITCHED_TO_SUB_B',
  'MARKED_EMPTY',
  'MARKED_OUT_OF_SPEC',
  'REPORTED_DAMAGE',
  'PRICE_UPDATED',
  'ASSIGNMENT_CHANGED'
);

create table public.slot_activity_log (
  id uuid primary key default gen_random_uuid(),
  site_unit_slot_id uuid not null references public.site_unit_slots(id) on delete cascade,
  actor_id uuid not null references public.user_profiles(id) on delete restrict,
  action public.slot_activity_action not null,
  previous_state jsonb,
  new_state jsonb,
  notes text,
  photo_url text,
  logged_at timestamptz not null default now()
);
create index idx_sal_slot on public.slot_activity_log(site_unit_slot_id);
create index idx_sal_actor_time on public.slot_activity_log(actor_id, logged_at desc);

-- ============================================================================
-- 9. COMMUNITY BOARD
-- ============================================================================

create type public.submission_category as enum (
  'FIXTURE',
  'POS_IDEA',
  'EXTERIOR',
  'PROMO_SECTION',
  'OTHER'
);

create type public.submission_status as enum (
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'FEATURED',
  'ADDED_TO_CATALOGUE',
  'REJECTED'
);

create table public.community_submissions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  submitted_by uuid not null references public.user_profiles(id) on delete restrict,
  title text not null,
  description text not null,
  category public.submission_category not null,
  images jsonb default '[]'::jsonb,
  linked_product_id uuid references public.products(id) on delete set null,
  linked_unit_type_id uuid references public.unit_types(id) on delete set null,
  upvote_count integer not null default 0,
  status public.submission_status not null default 'PENDING',
  hq_notes text,
  reviewed_by uuid references public.user_profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger community_submissions_updated before update on public.community_submissions
  for each row execute function public.trg_set_updated_at();
create index idx_cs_status on public.community_submissions(status);
create index idx_cs_site on public.community_submissions(site_id);

-- ============================================================================
-- 10. ONESIGN QUOTE BRIDGE
-- ============================================================================

create type public.quote_type as enum (
  'SITE_FITTING',
  'CAMPAIGN_PACK',
  'ADDITIONAL_SIGNAGE'
);

create type public.quote_status as enum (
  'DRAFT',
  'SUBMITTED',
  'ACKNOWLEDGED',
  'PRICED',
  'APPROVED',
  'IN_PRODUCTION',
  'SHIPPED',
  'CLOSED',
  'CANCELLED'
);

create table public.onesign_quotes (
  id uuid primary key default gen_random_uuid(),
  quote_ref text not null unique,                      -- 'OSD-2026-001247'
  site_id uuid not null references public.sites(id) on delete restrict,
  quote_type public.quote_type not null,
  linked_rollout_id uuid references public.site_campaign_rollouts(id) on delete set null,
  status public.quote_status not null default 'DRAFT',
  payload jsonb not null,                              -- line items, quantities, notes
  total_estimate_pence integer,
  requested_by uuid references public.user_profiles(id) on delete set null,
  requested_at timestamptz not null default now(),
  submitted_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger onesign_quotes_updated before update on public.onesign_quotes
  for each row execute function public.trg_set_updated_at();
create index idx_oq_site on public.onesign_quotes(site_id);
create index idx_oq_status on public.onesign_quotes(status);

-- ============================================================================
-- 11. RLS — HELPER FUNCTIONS
-- ============================================================================
-- These functions power the policies below. Keeping them here in one block
-- makes the access model auditable.

-- Get the role of the currently authenticated user
create or replace function public.current_user_role()
returns public.user_role as $$
  select role from public.user_profiles where id = auth.uid() and is_active = true
$$ language sql security definer stable;

-- Check if current user is HQ Admin
create or replace function public.is_hq_admin()
returns boolean as $$
  select public.current_user_role() = 'HQ_ADMIN'
$$ language sql security definer stable;

-- Check if current user manages an area that contains the given site
create or replace function public.manages_site_area(site_id_arg uuid)
returns boolean as $$
  select exists (
    select 1
    from public.sites s
    join public.area_manager_assignments ama on ama.area_id = s.area_id
    where s.id = site_id_arg
      and ama.user_id = auth.uid()
  )
$$ language sql security definer stable;

-- Check if current user is assigned to a given site
create or replace function public.assigned_to_site(site_id_arg uuid)
returns boolean as $$
  select exists (
    select 1 from public.site_user_assignments
    where site_id = site_id_arg and user_id = auth.uid()
  )
$$ language sql security definer stable;

-- Get all site_ids the current user can see (any role)
create or replace function public.accessible_site_ids()
returns setof uuid as $$
  select case
    when public.is_hq_admin() then (select id from public.sites)
    when public.current_user_role() = 'AREA_MANAGER' then (
      select s.id from public.sites s
      join public.area_manager_assignments ama on ama.area_id = s.area_id
      where ama.user_id = auth.uid()
    )
    else (
      select site_id from public.site_user_assignments where user_id = auth.uid()
    )
  end
$$ language sql security definer stable;

-- ============================================================================
-- 12. RLS — ENABLE ON EVERY TABLE
-- ============================================================================

alter table public.user_profiles enable row level security;
alter table public.areas enable row level security;
alter table public.area_manager_assignments enable row level security;
alter table public.sites enable row level security;
alter table public.classification_tags enable row level security;
alter table public.site_classifications enable row level security;
alter table public.site_user_assignments enable row level security;
alter table public.unit_types enable row level security;
alter table public.unit_type_default_shelves enable row level security;
alter table public.pos_slot_types enable row level security;
alter table public.unit_type_pos_slots enable row level security;
alter table public.promo_sections enable row level security;
alter table public.site_planograms enable row level security;
alter table public.site_units enable row level security;
alter table public.site_unit_shelves enable row level security;
alter table public.site_unit_slots enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.slot_product_assignments enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_unit_targets enable row level security;
alter table public.campaign_artwork enable row level security;
alter table public.site_campaign_rollouts enable row level security;
alter table public.rollout_install_tasks enable row level security;
alter table public.slot_activity_log enable row level security;
alter table public.community_submissions enable row level security;
alter table public.onesign_quotes enable row level security;

-- ============================================================================
-- 13. RLS — POLICIES
-- ============================================================================

-- user_profiles: users see themselves; HQ sees all; Managers see their area/site staff
create policy up_self_select on public.user_profiles for select
  using (id = auth.uid() or public.is_hq_admin());

create policy up_self_update on public.user_profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.user_profiles where id = auth.uid()));

create policy up_hq_all on public.user_profiles for all
  using (public.is_hq_admin()) with check (public.is_hq_admin());

-- areas: HQ writes; everyone authenticated reads
create policy areas_read on public.areas for select using (auth.uid() is not null);
create policy areas_hq_write on public.areas for all
  using (public.is_hq_admin()) with check (public.is_hq_admin());

-- area_manager_assignments: HQ manages; users can see their own
create policy ama_self_read on public.area_manager_assignments for select
  using (user_id = auth.uid() or public.is_hq_admin());
create policy ama_hq_write on public.area_manager_assignments for all
  using (public.is_hq_admin()) with check (public.is_hq_admin());

-- sites: scoped by accessible_site_ids(); HQ writes anywhere; AM writes sites in their areas
create policy sites_read on public.sites for select
  using (id in (select public.accessible_site_ids()));
create policy sites_hq_write on public.sites for all
  using (public.is_hq_admin()) with check (public.is_hq_admin());
create policy sites_am_write on public.sites for update
  using (public.manages_site_area(id)) with check (public.manages_site_area(id));

-- classification_tags: HQ writes; everyone reads
create policy ct_read on public.classification_tags for select using (auth.uid() is not null);
create policy ct_hq_write on public.classification_tags for all
  using (public.is_hq_admin()) with check (public.is_hq_admin());

-- site_classifications: follows site access
create policy sc_read on public.site_classifications for select
  using (site_id in (select public.accessible_site_ids()));
create policy sc_hq_am_write on public.site_classifications for all
  using (public.is_hq_admin() or public.manages_site_area(site_id))
  with check (public.is_hq_admin() or public.manages_site_area(site_id));

-- site_user_assignments: HQ and AMs manage; users see their own
create policy sua_self_read on public.site_user_assignments for select
  using (user_id = auth.uid() or public.is_hq_admin() or public.manages_site_area(site_id));
create policy sua_hq_am_write on public.site_user_assignments for all
  using (public.is_hq_admin() or public.manages_site_area(site_id))
  with check (public.is_hq_admin() or public.manages_site_area(site_id));

-- Library tables (unit_types, pos_slot_types, promo_sections, product_categories):
-- read by all authenticated; HQ-only write
create policy ut_read on public.unit_types for select using (auth.uid() is not null);
create policy ut_hq_write on public.unit_types for all
  using (public.is_hq_admin()) with check (public.is_hq_admin());

create policy utds_read on public.unit_type_default_shelves for select using (auth.uid() is not null);
create policy utds_hq_write on public.unit_type_default_shelves for all
  using (public.is_hq_admin()) with check (public.is_hq_admin());

create policy pst_read on public.pos_slot_types for select using (auth.uid() is not null);
create policy pst_hq_write on public.pos_slot_types for all
  using (public.is_hq_admin()) with check (public.is_hq_admin());

create policy utps_read on public.unit_type_pos_slots for select using (auth.uid() is not null);
create policy utps_hq_write on public.unit_type_pos_slots for all
  using (public.is_hq_admin()) with check (public.is_hq_admin());

create policy ps_read on public.promo_sections for select using (auth.uid() is not null);
create policy ps_hq_write on public.promo_sections for all
  using (public.is_hq_admin()) with check (public.is_hq_admin());

create policy pc_read on public.product_categories for select using (auth.uid() is not null);
create policy pc_hq_write on public.product_categories for all
  using (public.is_hq_admin()) with check (public.is_hq_admin());

create policy products_read on public.products for select using (auth.uid() is not null);
create policy products_hq_write on public.products for all
  using (public.is_hq_admin()) with check (public.is_hq_admin());

-- Site planograms and composition: read by site-accessible users; write by SM and above
create policy sp_read on public.site_planograms for select
  using (site_id in (select public.accessible_site_ids()));
create policy sp_sm_write on public.site_planograms for all
  using (
    public.is_hq_admin() or
    public.manages_site_area(site_id) or
    (public.current_user_role() = 'SITE_MANAGER' and public.assigned_to_site(site_id))
  ) with check (
    public.is_hq_admin() or
    public.manages_site_area(site_id) or
    (public.current_user_role() = 'SITE_MANAGER' and public.assigned_to_site(site_id))
  );

create policy su_read on public.site_units for select using (
  site_planogram_id in (
    select id from public.site_planograms where site_id in (select public.accessible_site_ids())
  )
);
create policy su_sm_write on public.site_units for all using (
  site_planogram_id in (
    select sp.id from public.site_planograms sp
    where public.is_hq_admin()
       or public.manages_site_area(sp.site_id)
       or (public.current_user_role() = 'SITE_MANAGER' and public.assigned_to_site(sp.site_id))
  )
) with check (
  site_planogram_id in (
    select sp.id from public.site_planograms sp
    where public.is_hq_admin()
       or public.manages_site_area(sp.site_id)
       or (public.current_user_role() = 'SITE_MANAGER' and public.assigned_to_site(sp.site_id))
  )
);

create policy sush_read on public.site_unit_shelves for select using (
  site_unit_id in (
    select su.id from public.site_units su
    join public.site_planograms sp on sp.id = su.site_planogram_id
    where sp.site_id in (select public.accessible_site_ids())
  )
);
create policy sush_sm_write on public.site_unit_shelves for all using (
  site_unit_id in (
    select su.id from public.site_units su
    join public.site_planograms sp on sp.id = su.site_planogram_id
    where public.is_hq_admin()
       or public.manages_site_area(sp.site_id)
       or (public.current_user_role() = 'SITE_MANAGER' and public.assigned_to_site(sp.site_id))
  )
) with check (
  site_unit_id in (
    select su.id from public.site_units su
    join public.site_planograms sp on sp.id = su.site_planogram_id
    where public.is_hq_admin()
       or public.manages_site_area(sp.site_id)
       or (public.current_user_role() = 'SITE_MANAGER' and public.assigned_to_site(sp.site_id))
  )
);

-- site_unit_slots: readable by site-accessible; Employees get UPDATE (for stocking state) only
create policy sus2_read on public.site_unit_slots for select using (
  site_unit_shelf_id in (
    select sush.id from public.site_unit_shelves sush
    join public.site_units su on su.id = sush.site_unit_id
    join public.site_planograms sp on sp.id = su.site_planogram_id
    where sp.site_id in (select public.accessible_site_ids())
  )
);
create policy sus2_sm_write on public.site_unit_slots for all using (
  site_unit_shelf_id in (
    select sush.id from public.site_unit_shelves sush
    join public.site_units su on su.id = sush.site_unit_id
    join public.site_planograms sp on sp.id = su.site_planogram_id
    where public.is_hq_admin()
       or public.manages_site_area(sp.site_id)
       or (public.current_user_role() = 'SITE_MANAGER' and public.assigned_to_site(sp.site_id))
  )
) with check (
  site_unit_shelf_id in (
    select sush.id from public.site_unit_shelves sush
    join public.site_units su on su.id = sush.site_unit_id
    join public.site_planograms sp on sp.id = su.site_planogram_id
    where public.is_hq_admin()
       or public.manages_site_area(sp.site_id)
       or (public.current_user_role() = 'SITE_MANAGER' and public.assigned_to_site(sp.site_id))
  )
);
create policy sus2_emp_update_stocking on public.site_unit_slots for update using (
  site_unit_shelf_id in (
    select sush.id from public.site_unit_shelves sush
    join public.site_units su on su.id = sush.site_unit_id
    join public.site_planograms sp on sp.id = su.site_planogram_id
    where public.assigned_to_site(sp.site_id)
  )
) with check (
  site_unit_shelf_id in (
    select sush.id from public.site_unit_shelves sush
    join public.site_units su on su.id = sush.site_unit_id
    join public.site_planograms sp on sp.id = su.site_planogram_id
    where public.assigned_to_site(sp.site_id)
  )
);

-- slot_product_assignments: readable by site-accessible; writable by SM+
create policy spa_read on public.slot_product_assignments for select using (
  site_unit_slot_id in (
    select sus.id from public.site_unit_slots sus
    join public.site_unit_shelves sush on sush.id = sus.site_unit_shelf_id
    join public.site_units su on su.id = sush.site_unit_id
    join public.site_planograms sp on sp.id = su.site_planogram_id
    where sp.site_id in (select public.accessible_site_ids())
  )
);
create policy spa_sm_write on public.slot_product_assignments for all using (
  site_unit_slot_id in (
    select sus.id from public.site_unit_slots sus
    join public.site_unit_shelves sush on sush.id = sus.site_unit_shelf_id
    join public.site_units su on su.id = sush.site_unit_id
    join public.site_planograms sp on sp.id = su.site_planogram_id
    where public.is_hq_admin()
       or public.manages_site_area(sp.site_id)
       or (public.current_user_role() = 'SITE_MANAGER' and public.assigned_to_site(sp.site_id))
  )
) with check (
  site_unit_slot_id in (
    select sus.id from public.site_unit_slots sus
    join public.site_unit_shelves sush on sush.id = sus.site_unit_shelf_id
    join public.site_units su on su.id = sush.site_unit_id
    join public.site_planograms sp on sp.id = su.site_planogram_id
    where public.is_hq_admin()
       or public.manages_site_area(sp.site_id)
       or (public.current_user_role() = 'SITE_MANAGER' and public.assigned_to_site(sp.site_id))
  )
);

-- Campaigns: GLOBAL read by all authenticated, write HQ only; LOCAL by owning site staff
create policy camp_read on public.campaigns for select using (
  auth.uid() is not null and (
    scope = 'GLOBAL' or
    (scope = 'LOCAL' and owner_site_id in (select public.accessible_site_ids()))
  )
);
create policy camp_hq_write on public.campaigns for all
  using (public.is_hq_admin()) with check (public.is_hq_admin());
create policy camp_local_write on public.campaigns for all using (
  scope = 'LOCAL' and owner_site_id in (select public.accessible_site_ids())
  and public.current_user_role() in ('SITE_MANAGER', 'AREA_MANAGER')
) with check (
  scope = 'LOCAL' and owner_site_id in (select public.accessible_site_ids())
  and public.current_user_role() in ('SITE_MANAGER', 'AREA_MANAGER')
);

create policy cut_read on public.campaign_unit_targets for select using (
  campaign_id in (select id from public.campaigns)
);
create policy cut_write on public.campaign_unit_targets for all using (
  campaign_id in (
    select id from public.campaigns c where public.is_hq_admin()
    or (c.scope = 'LOCAL' and c.owner_site_id in (select public.accessible_site_ids()))
  )
) with check (
  campaign_id in (
    select id from public.campaigns c where public.is_hq_admin()
    or (c.scope = 'LOCAL' and c.owner_site_id in (select public.accessible_site_ids()))
  )
);

create policy ca_read on public.campaign_artwork for select using (
  campaign_id in (select id from public.campaigns)
);
create policy ca_write on public.campaign_artwork for all using (
  campaign_id in (
    select id from public.campaigns c where public.is_hq_admin()
    or (c.scope = 'LOCAL' and c.owner_site_id in (select public.accessible_site_ids()))
  )
) with check (
  campaign_id in (
    select id from public.campaigns c where public.is_hq_admin()
    or (c.scope = 'LOCAL' and c.owner_site_id in (select public.accessible_site_ids()))
  )
);

-- Rollouts: readable by site-accessible users; status updates by site staff
create policy scr_read on public.site_campaign_rollouts for select
  using (site_id in (select public.accessible_site_ids()));
create policy scr_hq_write on public.site_campaign_rollouts for all
  using (public.is_hq_admin()) with check (public.is_hq_admin());
create policy scr_site_update on public.site_campaign_rollouts for update
  using (public.assigned_to_site(site_id) or public.manages_site_area(site_id))
  with check (public.assigned_to_site(site_id) or public.manages_site_area(site_id));

-- Install tasks: readable by site-accessible; Employees can update their own tasks
create policy rit_read on public.rollout_install_tasks for select using (
  rollout_id in (
    select id from public.site_campaign_rollouts where site_id in (select public.accessible_site_ids())
  )
);
create policy rit_hq_write on public.rollout_install_tasks for all
  using (public.is_hq_admin()) with check (public.is_hq_admin());
create policy rit_site_update on public.rollout_install_tasks for update using (
  rollout_id in (
    select id from public.site_campaign_rollouts
    where public.assigned_to_site(site_id) or public.manages_site_area(site_id)
  )
) with check (
  rollout_id in (
    select id from public.site_campaign_rollouts
    where public.assigned_to_site(site_id) or public.manages_site_area(site_id)
  )
);

-- Activity log: read by site-accessible users; insert by any site-assigned user
create policy sal_read on public.slot_activity_log for select using (
  site_unit_slot_id in (
    select sus.id from public.site_unit_slots sus
    join public.site_unit_shelves sush on sush.id = sus.site_unit_shelf_id
    join public.site_units su on su.id = sush.site_unit_id
    join public.site_planograms sp on sp.id = su.site_planogram_id
    where sp.site_id in (select public.accessible_site_ids())
  )
);
create policy sal_insert on public.slot_activity_log for insert with check (
  actor_id = auth.uid() and site_unit_slot_id in (
    select sus.id from public.site_unit_slots sus
    join public.site_unit_shelves sush on sush.id = sus.site_unit_shelf_id
    join public.site_units su on su.id = sush.site_unit_id
    join public.site_planograms sp on sp.id = su.site_planogram_id
    where public.assigned_to_site(sp.site_id)
      or public.manages_site_area(sp.site_id)
      or public.is_hq_admin()
  )
);

-- Community submissions: submitted by any site-assigned user; read by site & HQ
create policy cs_read on public.community_submissions for select
  using (public.is_hq_admin() or site_id in (select public.accessible_site_ids()));
create policy cs_insert on public.community_submissions for insert with check (
  submitted_by = auth.uid() and public.assigned_to_site(site_id)
);
create policy cs_hq_update on public.community_submissions for update
  using (public.is_hq_admin()) with check (public.is_hq_admin());

-- Onesign quotes: read by site-accessible; write by HQ and AM
create policy oq_read on public.onesign_quotes for select
  using (site_id in (select public.accessible_site_ids()));
create policy oq_hq_am_write on public.onesign_quotes for all
  using (public.is_hq_admin() or public.manages_site_area(site_id))
  with check (public.is_hq_admin() or public.manages_site_area(site_id));

-- ============================================================================
-- End of initial schema
-- ============================================================================
