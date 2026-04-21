-- ============================================================================
-- Mapleleaf Roots — Facts-family sync scaffolding
-- Migration: 20260421_006_facts_family_sync
-- ============================================================================
-- Prepares the products table for a unified Open*Facts sync (OFF + OBF + OPF
-- + OPFF):
--
--   1. Extend product_data_source enum with the two missing Facts-family
--      sources (OBF, OPFF).
--   2. Add sync bookkeeping columns: last_synced_at, country_markets,
--      needs_review.
--   3. Enforce gtin uniqueness via a partial unique index — null gtins are
--      allowed (manual catalogue rows without a barcode), but any two rows
--      sharing a gtin are a bug.
--   4. Create product_sync_runs for observability: which source ran, when,
--      how many rows landed, and any error text.
-- ============================================================================

-- 1. Enum extensions ---------------------------------------------------------
-- Postgres disallows new enum values inside a transaction that also uses
-- them in a default or constraint. We're only adding values here, so this
-- is safe to run as part of the normal migration batch.

alter type public.product_data_source add value if not exists 'OPEN_BEAUTY_FACTS';
alter type public.product_data_source add value if not exists 'OPEN_PET_FOOD_FACTS';

-- 2. products bookkeeping ----------------------------------------------------

alter table public.products
  add column if not exists last_synced_at timestamptz,
  add column if not exists country_markets text[] not null default '{}',
  add column if not exists needs_review boolean not null default false;

-- 3. Uniqueness on gtin ------------------------------------------------------
-- Partial so manual rows without a barcode don't collide with each other.

create unique index if not exists uniq_products_gtin
  on public.products(gtin)
  where gtin is not null;

create index if not exists idx_products_last_synced_at
  on public.products(last_synced_at);

create index if not exists idx_products_country_markets
  on public.products using gin (country_markets);

-- 4. product_sync_runs -------------------------------------------------------

create table if not exists public.product_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source public.product_data_source not null,
  mode text not null check (mode in ('BULK_SEED', 'NIGHTLY_DELTA', 'ON_DEMAND')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'RUNNING'
    check (status in ('RUNNING', 'SUCCESS', 'FAILED')),
  rows_upserted integer not null default 0,
  rows_skipped integer not null default 0,
  error_text text,
  created_at timestamptz not null default now()
);

create index if not exists idx_psr_source_started
  on public.product_sync_runs(source, started_at desc);

alter table public.product_sync_runs enable row level security;

-- Only HQ Admin can see sync telemetry — nobody else needs it.
drop policy if exists psr_hq_read on public.product_sync_runs;
create policy psr_hq_read on public.product_sync_runs for select using (
  public.is_hq_admin()
);

-- No RLS writes — sync jobs use the service role and bypass RLS entirely.

-- ============================================================================
-- End of migration 20260421_006
-- ============================================================================
