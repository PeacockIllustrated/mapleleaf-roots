-- ============================================================================
-- Seed 004: Unit types (the master library)
-- ============================================================================
-- ~30 UK-standard furniture units spanning dry shelving, chilled, promo,
-- counter, forecourt, and pos-only categories. Dimensions in millimetres.
-- Sources: UK retail shelving industry standards — 500/665/1000/1250mm bay
-- widths, 1410/1610/1810/2110mm heights, 370mm c-store-preferred depth,
-- European 50mm shelf pitch.
-- ============================================================================

insert into public.unit_types (
  code, display_name, category, description,
  width_mm, depth_mm, height_mm,
  is_double_sided, is_refrigerated, temperature_zone,
  default_shelf_count, sort_order
) values

  -- ========================================================================
  -- DRY SHELVING
  -- ========================================================================
  ('GONDOLA_AISLE_1000', 'Gondola aisle 1m', 'DRY_SHELVING',
   'Double-sided aisle gondola, 1m bay width. C-store default.',
   1000, 740, 1610, true, false, 'AMBIENT', 5, 10),

  ('GONDOLA_AISLE_1250', 'Gondola aisle 1.25m', 'DRY_SHELVING',
   'Double-sided aisle gondola, 1.25m bay width.',
   1250, 740, 1610, true, false, 'AMBIENT', 5, 20),

  ('GONDOLA_TALL_1000', 'Gondola tall 1m', 'DRY_SHELVING',
   'Double-sided tall gondola, 2.1m height. Back-of-store zones only.',
   1000, 740, 2110, true, false, 'AMBIENT', 6, 30),

  ('GONDOLA_LOW_1000', 'Gondola low 1m', 'DRY_SHELVING',
   'Double-sided low gondola, 1.4m height. Front-of-store sight-line zones.',
   1000, 740, 1410, true, false, 'AMBIENT', 4, 40),

  ('ENDCAP_1000', 'Endcap 1m', 'DRY_SHELVING',
   'Single-sided end unit attached to gondola run ends.',
   1000, 470, 1610, false, false, 'AMBIENT', 4, 50),

  ('WALL_BAY_1000', 'Wall bay 1m', 'DRY_SHELVING',
   'Single-sided deeper wall-back shelving, 1m wide, 2.1m tall.',
   1000, 470, 2110, false, false, 'AMBIENT', 6, 60),

  -- ========================================================================
  -- CHILLED / FROZEN
  -- ========================================================================
  ('CHILL_MULTIDECK_1250', 'Chiller multideck 1.25m', 'CHILLED_FROZEN',
   'Open-front multideck chiller, 1.25m wide.',
   1250, 900, 2000, false, true, 'CHILLED', 5, 100),

  ('CHILL_MULTIDECK_1875', 'Chiller multideck 1.875m', 'CHILLED_FROZEN',
   'Open-front multideck chiller, 1.875m wide.',
   1875, 900, 2000, false, true, 'CHILLED', 5, 110),

  ('CHILL_UPRIGHT_2DR', 'Chiller upright 2-door', 'CHILLED_FROZEN',
   'Two-door glass-front upright chiller.',
   1250, 700, 2000, false, true, 'CHILLED', 5, 120),

  ('FREEZE_WELL_1250', 'Freezer well 1.25m', 'CHILLED_FROZEN',
   'Open-top chest freezer, 1.25m wide.',
   1250, 900, 850, false, true, 'FROZEN', 1, 130),

  -- ========================================================================
  -- PROMO / SEASONAL
  -- ========================================================================
  ('DUMP_BIN_SQ', 'Dump bin square', 'PROMO_SEASONAL',
   'Square promotional dump bin.',
   600, 600, 900, false, false, 'AMBIENT', null, 200),

  ('DUMP_BIN_RECT', 'Dump bin rectangular', 'PROMO_SEASONAL',
   'Rectangular promotional dump bin.',
   1000, 600, 900, false, false, 'AMBIENT', null, 210),

  ('SIDESTACK_A1', 'Sidestack A1', 'PROMO_SEASONAL',
   'Gondola-end promo tower with A1 portrait header.',
   600, 600, 1800, false, false, 'AMBIENT', null, 220),

  ('FSDU_CARD', 'FSDU (corrugated)', 'PROMO_SEASONAL',
   'Supplier-supplied free-standing display unit, corrugated card.',
   600, 500, 1600, false, false, 'AMBIENT', null, 230),

  ('WIRE_STAND_TALL', 'Wire merchandising stand', 'PROMO_SEASONAL',
   'Tall wire-mesh merchandising stand.',
   500, 500, 1600, false, false, 'AMBIENT', null, 240),

  -- ========================================================================
  -- COUNTER / TILL
  -- ========================================================================
  ('TILL_STANDARD', 'Till counter', 'COUNTER_TILL',
   'Standard till counter with customer-facing display zones.',
   2700, 700, 1200, false, false, 'AMBIENT', null, 300),

  ('BACK_BAR_CIGS', 'Back bar (tobacco gantry)', 'COUNTER_TILL',
   'Behind-counter tobacco/vape gantry, compliant with plain-pack legislation.',
   1100, 450, 2100, false, false, 'AMBIENT', null, 310),

  ('COFFEE_STATION', 'Coffee station', 'COUNTER_TILL',
   'Bean-to-cup coffee station with accompaniments shelf.',
   2400, 800, 1800, false, false, 'AMBIENT', null, 320),

  ('FTG_HOT_CASE', 'Hot food-to-go case', 'COUNTER_TILL',
   'Hot food service cabinet.',
   1200, 900, 1800, false, false, 'AMBIENT', null, 330),

  ('SLUSH_MACHINE', 'Slush drinks machine', 'COUNTER_TILL',
   'Frozen/slush drinks machine.',
   500, 600, 900, false, false, 'AMBIENT', null, 340),

  -- ========================================================================
  -- FORECOURT
  -- ========================================================================
  ('TOTEM_MAIN', 'Main totem', 'FORECOURT',
   'Primary forecourt totem (~7m). The "Petroleum golden arches".',
   1800, 600, 7000, false, false, 'AMBIENT', null, 400),

  ('TOTEM_DIRECTIONAL', 'Directional totem', 'FORECOURT',
   'Secondary wayfinding totem.',
   500, 400, 2500, false, false, 'AMBIENT', null, 410),

  ('PUMP_ISLAND', 'Pump island', 'FORECOURT',
   'Fuel pump island with up to 4 pump faces.',
   5000, 1200, 2500, false, false, 'AMBIENT', null, 420),

  ('CANOPY_FASCIA', 'Canopy fascia section', 'FORECOURT',
   'Canopy-edge branding panel, per 3m section.',
   3000, 500, 500, false, false, 'AMBIENT', null, 430),

  ('ENTRY_SIGN', 'Entry sign', 'FORECOURT',
   'Freestanding entry/welcome sign at forecourt ingress.',
   800, 50, 1200, false, false, 'AMBIENT', null, 440),

  ('EXIT_SIGN', 'Exit sign', 'FORECOURT',
   'Freestanding exit sign at forecourt egress.',
   800, 50, 1200, false, false, 'AMBIENT', null, 450),

  -- ========================================================================
  -- WINDOWS / POS ONLY
  -- ========================================================================
  ('WIN_FULL_1800', 'Window vinyl full-height', 'WINDOWS_POS_ONLY',
   'Full-height window vinyl. Dimensions are artwork surface only.',
   1800, 5, 600, false, false, 'AMBIENT', null, 500),

  ('WIN_BAND_3000', 'Window vinyl band', 'WINDOWS_POS_ONLY',
   'Horizontal window band vinyl.',
   3000, 5, 300, false, false, 'AMBIENT', null, 510),

  ('WIN_DOOR_VINYL', 'Door vinyl', 'WINDOWS_POS_ONLY',
   'Entry/exit door vinyl decal.',
   400, 5, 800, false, false, 'AMBIENT', null, 520),

  ('WALL_POSTER_HOLDER_A1', 'Wall poster holder A1', 'WINDOWS_POS_ONLY',
   'Wall-mounted A1 poster pocket.',
   594, 20, 841, false, false, 'AMBIENT', null, 530),

  ('COUNTER_MAT_A3', 'Counter mat A3', 'WINDOWS_POS_ONLY',
   'A3 landscape counter mat.',
   420, 297, 3, false, false, 'AMBIENT', null, 540),

  ('FLOOR_GRAPHIC_500', 'Floor graphic 500mm', 'WINDOWS_POS_ONLY',
   'Circular floor decal, 500mm diameter.',
   500, 500, 1, false, false, 'AMBIENT', null, 550),

  ('CEILING_HANGER_DSE', 'Ceiling hanger (DSE)', 'WINDOWS_POS_ONLY',
   'Double-sided ceiling-hung POS. A3 equivalent.',
   420, 5, 297, false, false, 'AMBIENT', null, 560);

-- ============================================================================
-- Default shelves for shelving units (50mm pitch European standard)
-- ============================================================================
-- Clearance values sum to roughly the height minus header (100mm) and base
-- plinth (150mm), giving realistic spacing that fits UK convenience stock.

-- GONDOLA_AISLE_1000 (1610mm total, 5 shelves)
insert into public.unit_type_default_shelves (unit_type_id, shelf_order, clearance_mm, depth_mm, is_base_shelf)
select id, 1, 280, 370, false from public.unit_types where code = 'GONDOLA_AISLE_1000'
union all select id, 2, 250, 370, false from public.unit_types where code = 'GONDOLA_AISLE_1000'
union all select id, 3, 220, 370, false from public.unit_types where code = 'GONDOLA_AISLE_1000'
union all select id, 4, 200, 370, false from public.unit_types where code = 'GONDOLA_AISLE_1000'
union all select id, 5, 200, 470, true  from public.unit_types where code = 'GONDOLA_AISLE_1000';

-- GONDOLA_AISLE_1250 (same shelf grid, wider bay)
insert into public.unit_type_default_shelves (unit_type_id, shelf_order, clearance_mm, depth_mm, is_base_shelf)
select id, 1, 280, 370, false from public.unit_types where code = 'GONDOLA_AISLE_1250'
union all select id, 2, 250, 370, false from public.unit_types where code = 'GONDOLA_AISLE_1250'
union all select id, 3, 220, 370, false from public.unit_types where code = 'GONDOLA_AISLE_1250'
union all select id, 4, 200, 370, false from public.unit_types where code = 'GONDOLA_AISLE_1250'
union all select id, 5, 200, 470, true  from public.unit_types where code = 'GONDOLA_AISLE_1250';

-- GONDOLA_TALL_1000 (2110mm, 6 shelves)
insert into public.unit_type_default_shelves (unit_type_id, shelf_order, clearance_mm, depth_mm, is_base_shelf)
select id, 1, 280, 370, false from public.unit_types where code = 'GONDOLA_TALL_1000'
union all select id, 2, 280, 370, false from public.unit_types where code = 'GONDOLA_TALL_1000'
union all select id, 3, 250, 370, false from public.unit_types where code = 'GONDOLA_TALL_1000'
union all select id, 4, 220, 370, false from public.unit_types where code = 'GONDOLA_TALL_1000'
union all select id, 5, 200, 370, false from public.unit_types where code = 'GONDOLA_TALL_1000'
union all select id, 6, 220, 470, true  from public.unit_types where code = 'GONDOLA_TALL_1000';

-- GONDOLA_LOW_1000 (1410mm, 4 shelves)
insert into public.unit_type_default_shelves (unit_type_id, shelf_order, clearance_mm, depth_mm, is_base_shelf)
select id, 1, 280, 370, false from public.unit_types where code = 'GONDOLA_LOW_1000'
union all select id, 2, 250, 370, false from public.unit_types where code = 'GONDOLA_LOW_1000'
union all select id, 3, 220, 370, false from public.unit_types where code = 'GONDOLA_LOW_1000'
union all select id, 4, 200, 470, true  from public.unit_types where code = 'GONDOLA_LOW_1000';

-- ENDCAP_1000 (4 shelves, deeper)
insert into public.unit_type_default_shelves (unit_type_id, shelf_order, clearance_mm, depth_mm, is_base_shelf)
select id, 1, 320, 470, false from public.unit_types where code = 'ENDCAP_1000'
union all select id, 2, 280, 470, false from public.unit_types where code = 'ENDCAP_1000'
union all select id, 3, 240, 470, false from public.unit_types where code = 'ENDCAP_1000'
union all select id, 4, 230, 570, true  from public.unit_types where code = 'ENDCAP_1000';

-- WALL_BAY_1000 (2110mm, 6 shelves)
insert into public.unit_type_default_shelves (unit_type_id, shelf_order, clearance_mm, depth_mm, is_base_shelf)
select id, 1, 300, 470, false from public.unit_types where code = 'WALL_BAY_1000'
union all select id, 2, 280, 470, false from public.unit_types where code = 'WALL_BAY_1000'
union all select id, 3, 260, 470, false from public.unit_types where code = 'WALL_BAY_1000'
union all select id, 4, 240, 470, false from public.unit_types where code = 'WALL_BAY_1000'
union all select id, 5, 220, 470, false from public.unit_types where code = 'WALL_BAY_1000'
union all select id, 6, 250, 570, true  from public.unit_types where code = 'WALL_BAY_1000';

-- Chiller multidecks (5 shelves each)
insert into public.unit_type_default_shelves (unit_type_id, shelf_order, clearance_mm, depth_mm, is_base_shelf)
select id, 1, 320, 500, false from public.unit_types where code = 'CHILL_MULTIDECK_1250'
union all select id, 2, 320, 500, false from public.unit_types where code = 'CHILL_MULTIDECK_1250'
union all select id, 3, 300, 500, false from public.unit_types where code = 'CHILL_MULTIDECK_1250'
union all select id, 4, 280, 500, false from public.unit_types where code = 'CHILL_MULTIDECK_1250'
union all select id, 5, 300, 600, true  from public.unit_types where code = 'CHILL_MULTIDECK_1250';

insert into public.unit_type_default_shelves (unit_type_id, shelf_order, clearance_mm, depth_mm, is_base_shelf)
select id, 1, 320, 500, false from public.unit_types where code = 'CHILL_MULTIDECK_1875'
union all select id, 2, 320, 500, false from public.unit_types where code = 'CHILL_MULTIDECK_1875'
union all select id, 3, 300, 500, false from public.unit_types where code = 'CHILL_MULTIDECK_1875'
union all select id, 4, 280, 500, false from public.unit_types where code = 'CHILL_MULTIDECK_1875'
union all select id, 5, 300, 600, true  from public.unit_types where code = 'CHILL_MULTIDECK_1875';

-- Chiller upright 2-door (5 shelves)
insert into public.unit_type_default_shelves (unit_type_id, shelf_order, clearance_mm, depth_mm, is_base_shelf)
select id, 1, 320, 450, false from public.unit_types where code = 'CHILL_UPRIGHT_2DR'
union all select id, 2, 320, 450, false from public.unit_types where code = 'CHILL_UPRIGHT_2DR'
union all select id, 3, 320, 450, false from public.unit_types where code = 'CHILL_UPRIGHT_2DR'
union all select id, 4, 300, 450, false from public.unit_types where code = 'CHILL_UPRIGHT_2DR'
union all select id, 5, 310, 500, true  from public.unit_types where code = 'CHILL_UPRIGHT_2DR';
