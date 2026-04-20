-- ============================================================================
-- Seed 008: Starter product catalogue
-- ============================================================================
-- A small hand-picked set of common UK c-store products so the shelf
-- visualiser has real items to assign out of the box. Dimensions are
-- approximate (retail-catalog-accurate, not cabinetmaker-accurate) and all
-- in millimetres. GTINs are genuine EAN-13s for the named products so the
-- OFF nightly sync (Phase 2) will happily enrich them in place.
--
-- Categories reference product_categories (seeded in 006); if any code
-- isn't found, the product lands with a null category and HQ can correct
-- it later via the /admin/library/products view.
-- ============================================================================

insert into public.products (
  sku, gtin, name, brand, category_id,
  width_mm, height_mm, depth_mm,
  data_source, temperature_zone, is_active
) values
  -- Confectionery -----------------------------------------------------------
  ('CAD_DM_110', '7622210449283', 'Cadbury Dairy Milk 110g', 'Cadbury',
    (select id from public.product_categories where code = 'CONF_SINGLE_BARS'),
    78, 177, 14, 'INTERNAL_CATALOGUE', 'AMBIENT', true),
  ('CAD_TWIRL_43', '7622210449344', 'Cadbury Twirl 43g', 'Cadbury',
    (select id from public.product_categories where code = 'CONF_SINGLE_BARS'),
    48, 153, 16, 'INTERNAL_CATALOGUE', 'AMBIENT', true),
  ('MARS_51', '5000159461122', 'Mars Bar 51g', 'Mars',
    (select id from public.product_categories where code = 'CONF_SINGLE_BARS'),
    42, 172, 16, 'INTERNAL_CATALOGUE', 'AMBIENT', true),
  ('SNICKERS_48', '5000159411639', 'Snickers 48g', 'Mars',
    (select id from public.product_categories where code = 'CONF_SINGLE_BARS'),
    42, 172, 16, 'INTERNAL_CATALOGUE', 'AMBIENT', true),
  ('HARIBO_SB_140', '5010984009099', 'Haribo Starmix 140g', 'Haribo',
    (select id from public.product_categories where code = 'CONF_SHARING_BAGS'),
    150, 235, 30, 'INTERNAL_CATALOGUE', 'AMBIENT', true),
  ('MALTESERS_135', '5000159538602', 'Maltesers Pouch 135g', 'Mars',
    (select id from public.product_categories where code = 'CONF_SHARING_BAGS'),
    175, 240, 40, 'INTERNAL_CATALOGUE', 'AMBIENT', true),

  -- Soft drinks -------------------------------------------------------------
  ('COKE_330', '5449000000996', 'Coca-Cola 330ml can', 'Coca-Cola',
    (select id from public.product_categories where code = 'SD_SPARKLING'),
    66, 115, 66, 'INTERNAL_CATALOGUE', 'AMBIENT', true),
  ('COKE_ZERO_330', '5449000133328', 'Coca-Cola Zero Sugar 330ml can', 'Coca-Cola',
    (select id from public.product_categories where code = 'SD_SPARKLING'),
    66, 115, 66, 'INTERNAL_CATALOGUE', 'AMBIENT', true),
  ('PEPSI_330', '5000463205728', 'Pepsi Max 330ml can', 'PepsiCo',
    (select id from public.product_categories where code = 'SD_SPARKLING'),
    66, 115, 66, 'INTERNAL_CATALOGUE', 'AMBIENT', true),
  ('FANTA_500', '5449000124777', 'Fanta Orange 500ml bottle', 'Coca-Cola',
    (select id from public.product_categories where code = 'SD_SPARKLING'),
    70, 220, 70, 'INTERNAL_CATALOGUE', 'AMBIENT', true),
  ('RIBENA_500', '5000282014126', 'Ribena Blackcurrant 500ml', 'Suntory',
    (select id from public.product_categories where code = 'SD_STILL'),
    68, 225, 68, 'INTERNAL_CATALOGUE', 'AMBIENT', true),

  -- Energy drinks -----------------------------------------------------------
  ('RB_250', '9002490100070', 'Red Bull 250ml', 'Red Bull',
    (select id from public.product_categories where code = 'ENERGY_DRINKS'),
    53, 135, 53, 'INTERNAL_CATALOGUE', 'AMBIENT', true),
  ('MONSTER_500', '5060335631008', 'Monster Energy Original 500ml', 'Monster Beverage',
    (select id from public.product_categories where code = 'ENERGY_DRINKS'),
    66, 168, 66, 'INTERNAL_CATALOGUE', 'AMBIENT', true),

  -- Water -------------------------------------------------------------------
  ('EVIAN_500', '3068320008721', 'Evian Still Water 500ml', 'Evian',
    (select id from public.product_categories where code = 'WATER_STILL'),
    65, 220, 65, 'INTERNAL_CATALOGUE', 'AMBIENT', true),
  ('HIGHLAND_750', '5000391011205', 'Highland Spring Still 750ml', 'Highland Spring',
    (select id from public.product_categories where code = 'WATER_STILL'),
    72, 240, 72, 'INTERNAL_CATALOGUE', 'AMBIENT', true),

  -- Snacks ------------------------------------------------------------------
  ('WALKERS_RS_32', '5000328807638', 'Walkers Ready Salted 32g', 'Walkers',
    (select id from public.product_categories where code = 'SNK_CRISPS'),
    130, 215, 40, 'INTERNAL_CATALOGUE', 'AMBIENT', true),
  ('WALKERS_CHEES_32', '5000328807645', 'Walkers Cheese & Onion 32g', 'Walkers',
    (select id from public.product_categories where code = 'SNK_CRISPS'),
    130, 215, 40, 'INTERNAL_CATALOGUE', 'AMBIENT', true),
  ('MCC_SP_40', '50168057', 'McCoy''s Salted 40g', 'KP Snacks',
    (select id from public.product_categories where code = 'SNK_CRISPS'),
    140, 215, 45, 'INTERNAL_CATALOGUE', 'AMBIENT', true),
  ('KP_NUTS_50', '5000168062365', 'KP Dry Roasted 50g', 'KP Snacks',
    (select id from public.product_categories where code = 'SNK_NUTS'),
    110, 175, 35, 'INTERNAL_CATALOGUE', 'AMBIENT', true),

  -- Bakery ------------------------------------------------------------------
  ('HOVIS_800', '5010029212006', 'Hovis Soft White Medium 800g', 'Hovis',
    (select id from public.product_categories where code = 'BAK_BREAD'),
    120, 215, 110, 'INTERNAL_CATALOGUE', 'AMBIENT', true),

  -- Hot drinks --------------------------------------------------------------
  ('NES_GOLD_200', '7613035466708', 'Nescafé Gold Blend 200g', 'Nescafé',
    (select id from public.product_categories where code = 'HD_COFFEE'),
    100, 170, 100, 'INTERNAL_CATALOGUE', 'AMBIENT', true),
  ('PG_80', '5000208006298', 'PG Tips 80 bags', 'PG Tips',
    (select id from public.product_categories where code = 'HD_TEA'),
    170, 120, 70, 'INTERNAL_CATALOGUE', 'AMBIENT', true),

  -- Chilled food-to-go ------------------------------------------------------
  ('MEAL_SAND_CHSS', '5057753001201', 'Meal Deal Cheese Salad Sandwich', 'Own Brand',
    (select id from public.product_categories where code = 'CHL_SANDWICHES'),
    140, 105, 55, 'INTERNAL_CATALOGUE', 'CHILLED', true),
  ('MILK_2PT_SSMI', '5050854038006', 'Whole Milk 2 Pint', 'Own Brand',
    (select id from public.product_categories where code = 'CHL_DAIRY'),
    110, 235, 85, 'INTERNAL_CATALOGUE', 'CHILLED', true),

  -- Alcohol -----------------------------------------------------------------
  ('STELLA_4PK', '5010316005608', 'Stella Artois 440ml × 4', 'AB InBev',
    (select id from public.product_categories where code = 'ALC_BEER'),
    264, 170, 66, 'INTERNAL_CATALOGUE', 'AMBIENT', true),
  ('GUINNESS_4PK', '5010092560085', 'Guinness Draught 440ml × 4', 'Diageo',
    (select id from public.product_categories where code = 'ALC_BEER'),
    264, 170, 66, 'INTERNAL_CATALOGUE', 'AMBIENT', true),

  -- Household / motor care --------------------------------------------------
  ('ANDREX_4PK', '5029053545400', 'Andrex Classic Clean 4 Roll', 'Kimberly-Clark',
    (select id from public.product_categories where code = 'HH_PAPER'),
    240, 120, 240, 'INTERNAL_CATALOGUE', 'AMBIENT', true),
  ('FAIRY_320', '8001090434821', 'Fairy Original Washing-Up Liquid 320ml', 'P&G',
    (select id from public.product_categories where code = 'HH_CLEANING'),
    70, 250, 60, 'INTERNAL_CATALOGUE', 'AMBIENT', true),
  ('TPHD_SCRNW_5L', '5012128029837', 'Halfords Screenwash 5L', 'Halfords',
    (select id from public.product_categories where code = 'MC_SCREEN_WASH'),
    200, 310, 130, 'INTERNAL_CATALOGUE', 'AMBIENT', true)
on conflict (sku) do nothing;
