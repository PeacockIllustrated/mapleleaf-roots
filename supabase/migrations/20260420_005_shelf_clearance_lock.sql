-- ============================================================================
-- Mapleleaf Roots — Per-shelf clearance lock
-- Migration: 20260420_005_shelf_clearance_lock
-- ============================================================================
-- Adds a boolean lock to each shelf row. When true, resizeShelfClearance
-- refuses to pull millimetres out of that shelf to feed a neighbour — so
-- once a site manager dials in "the coffee-station shelf is exactly
-- 320mm", they can lock it and know later tweaks elsewhere won't steal
-- from it. The lock also prevents direct +/- on the locked shelf itself
-- so nothing can inadvertently move it.
-- ============================================================================

alter table public.site_unit_shelves
  add column if not exists clearance_locked boolean not null default false;

create index if not exists idx_sush_clearance_locked
  on public.site_unit_shelves(clearance_locked)
  where clearance_locked = true;

-- ============================================================================
-- End of migration 20260420_005
-- ============================================================================
