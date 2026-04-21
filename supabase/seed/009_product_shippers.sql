-- ============================================================================
-- Seed 009: Shipper box dimensions for small / counter products
-- ============================================================================
-- Small impulse products (chocolate bars, single-bag snacks) ship in branded
-- display shippers that are what actually sits on the shelf. This seed maps
-- realistic shipper dimensions onto the seed 008 products that need them.
-- Dimensions are approximate retail-cat-accurate; HQ can refine via the
-- admin catalogue view as real spec sheets land.
-- ============================================================================

update public.products
set
  shipper_width_mm  = 200,
  shipper_height_mm = 90,
  shipper_depth_mm  = 200,
  units_per_shipper = 36
where sku = 'CAD_DM_110';

update public.products
set
  shipper_width_mm  = 170,
  shipper_height_mm = 90,
  shipper_depth_mm  = 160,
  units_per_shipper = 48
where sku = 'CAD_TWIRL_43';

update public.products
set
  shipper_width_mm  = 180,
  shipper_height_mm = 90,
  shipper_depth_mm  = 170,
  units_per_shipper = 32
where sku = 'MARS_51';

update public.products
set
  shipper_width_mm  = 180,
  shipper_height_mm = 90,
  shipper_depth_mm  = 170,
  units_per_shipper = 32
where sku = 'SNICKERS_48';

-- Sharing bags often stand individually but sometimes come in shippers; we
-- leave them without a shipper so the visualiser uses the bag directly.

-- Crisps usually sit in a floor-standing shipper of 12 or a hanging clip
-- strip. For shelf display we use a 12-count shipper footprint.
update public.products
set
  shipper_width_mm  = 280,
  shipper_height_mm = 220,
  shipper_depth_mm  = 160,
  units_per_shipper = 12
where sku = 'WALKERS_RS_32';

update public.products
set
  shipper_width_mm  = 280,
  shipper_height_mm = 220,
  shipper_depth_mm  = 160,
  units_per_shipper = 12
where sku = 'WALKERS_CHEES_32';

update public.products
set
  shipper_width_mm  = 290,
  shipper_height_mm = 220,
  shipper_depth_mm  = 170,
  units_per_shipper = 12
where sku = 'MCC_SP_40';
