-- ============================================================================
-- Mapleleaf Roots — Swap partial unique index for a real unique constraint
-- Migration: 20260421_007_products_gtin_unique_constraint
-- ============================================================================
-- Migration 006 added a partial unique index on products(gtin) WHERE gtin is
-- not null. That enforces the right runtime invariant but Postgres's
-- `INSERT ... ON CONFLICT (gtin)` can't target a *partial* index unless the
-- caller repeats the WHERE predicate — and the Supabase JS client doesn't.
-- Every batch fails with:
--   "there is no unique or exclusion constraint matching the ON CONFLICT
--    specification"
--
-- The partial index was over-defensive anyway: Postgres's default
-- NULLS DISTINCT behaviour already lets multiple rows with a NULL gtin
-- coexist under a plain UNIQUE constraint. Swap the partial index for a
-- real constraint so ON CONFLICT works.
-- ============================================================================

drop index if exists public.uniq_products_gtin;

alter table public.products
  drop constraint if exists uniq_products_gtin;

alter table public.products
  add constraint uniq_products_gtin unique (gtin);

-- ============================================================================
-- End of migration 20260421_007
-- ============================================================================
