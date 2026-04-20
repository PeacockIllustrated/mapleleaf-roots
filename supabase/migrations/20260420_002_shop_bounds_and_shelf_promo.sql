-- ============================================================================
-- Mapleleaf Roots — Shop bounds and per-shelf promo section
-- Migration: 20260420_002_shop_bounds_and_shelf_promo
-- ============================================================================
-- Two additions that fall out of real-world configurator use:
--
--   1. Every site has a shop floor of specific physical dimensions. Storing
--      those on site_planograms lets the configurator draw the floor outline
--      (so people can see where furniture stops making sense) and lets later
--      phases reject placements that fall outside those bounds. Rectangle
--      only in Phase 1 — polygonal floors land in Phase 2+ if needed.
--
--   2. In real retail, a single gondola commonly spans two promo sections
--      (e.g., top two shelves Confectionery, bottom three Snacks). Adding a
--      nullable promo_section_id to site_unit_shelves lets users tag shelves
--      independently of the parent unit's section, unlocking the shelf
--      visualiser work in Phase 1.5.
--
-- No policies change — existing site_planograms and site_unit_shelves RLS
-- covers read/write on the new columns automatically.
-- ============================================================================

-- 1. Shop bounds on site_planograms --------------------------------------------

alter table public.site_planograms
  add column if not exists shop_bounds_w_mm integer,
  add column if not exists shop_bounds_h_mm integer;

-- Both dimensions must be present together, and positive when present.
alter table public.site_planograms
  drop constraint if exists check_shop_bounds_shape;
alter table public.site_planograms
  add constraint check_shop_bounds_shape check (
    (shop_bounds_w_mm is null and shop_bounds_h_mm is null)
    or (shop_bounds_w_mm > 0 and shop_bounds_h_mm > 0)
  );

-- 2. Promo section per shelf ---------------------------------------------------

alter table public.site_unit_shelves
  add column if not exists promo_section_id uuid references public.promo_sections(id) on delete set null;

create index if not exists idx_sush_promo
  on public.site_unit_shelves(promo_section_id)
  where promo_section_id is not null;

-- ============================================================================
-- End of migration 20260420_002
-- ============================================================================
