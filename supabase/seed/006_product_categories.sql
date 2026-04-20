-- ============================================================================
-- Seed 006: Product categories (starter taxonomy)
-- ============================================================================
-- Two-level tree covering the main convenience/forecourt store categories.
-- Products from Open Food Facts / Open Products Facts will be mapped into
-- these categories during the nightly sync.
-- ============================================================================

-- Top-level categories
insert into public.product_categories (code, name, sort_order) values
  ('CONFECTIONERY',      'Confectionery',     10),
  ('SOFT_DRINKS',        'Soft drinks',       20),
  ('ENERGY_DRINKS',      'Energy drinks',     30),
  ('WATER',              'Water',             40),
  ('ALCOHOL',            'Alcohol',           50),
  ('TOBACCO_VAPING',     'Tobacco and vaping', 60),
  ('SNACKS',             'Snacks',            70),
  ('BAKERY',             'Bakery',            80),
  ('HOT_DRINKS',         'Hot drinks',        90),
  ('CHILLED',            'Chilled',          100),
  ('FROZEN',             'Frozen',           110),
  ('GROCERIES_AMBIENT',  'Groceries',        120),
  ('HOUSEHOLD',          'Household',        130),
  ('MOTOR_CARE',         'Motor care',       140);

-- Confectionery subcategories
insert into public.product_categories (parent_id, code, name, sort_order)
select id, 'CONF_SINGLE_BARS',  'Single bars',       10 from public.product_categories where code = 'CONFECTIONERY' union all
select id, 'CONF_SHARING_BAGS', 'Sharing bags',      20 from public.product_categories where code = 'CONFECTIONERY' union all
select id, 'CONF_MULTIPACKS',   'Multipacks',        30 from public.product_categories where code = 'CONFECTIONERY' union all
select id, 'CONF_GIFT_TINS',    'Gift tins and tubs', 40 from public.product_categories where code = 'CONFECTIONERY' union all
select id, 'CONF_SWEETS_MINTS', 'Sweets and mints',  50 from public.product_categories where code = 'CONFECTIONERY';

-- Soft drinks subcategories
insert into public.product_categories (parent_id, code, name, sort_order)
select id, 'SD_SPARKLING', 'Sparkling', 10 from public.product_categories where code = 'SOFT_DRINKS' union all
select id, 'SD_STILL',     'Still',     20 from public.product_categories where code = 'SOFT_DRINKS' union all
select id, 'SD_JUICE',     'Juice',     30 from public.product_categories where code = 'SOFT_DRINKS' union all
select id, 'SD_MIXERS',    'Mixers',    40 from public.product_categories where code = 'SOFT_DRINKS';

-- Water subcategories
insert into public.product_categories (parent_id, code, name, sort_order)
select id, 'WATER_STILL',     'Still water',     10 from public.product_categories where code = 'WATER' union all
select id, 'WATER_SPARKLING', 'Sparkling water', 20 from public.product_categories where code = 'WATER';

-- Alcohol subcategories
insert into public.product_categories (parent_id, code, name, sort_order)
select id, 'ALC_BEER',    'Beer',    10 from public.product_categories where code = 'ALCOHOL' union all
select id, 'ALC_WINE',    'Wine',    20 from public.product_categories where code = 'ALCOHOL' union all
select id, 'ALC_SPIRITS', 'Spirits', 30 from public.product_categories where code = 'ALCOHOL' union all
select id, 'ALC_CIDER',   'Cider',   40 from public.product_categories where code = 'ALCOHOL' union all
select id, 'ALC_RTD',     'Ready-to-drink', 50 from public.product_categories where code = 'ALCOHOL';

-- Snacks subcategories
insert into public.product_categories (parent_id, code, name, sort_order)
select id, 'SNK_CRISPS', 'Crisps',           10 from public.product_categories where code = 'SNACKS' union all
select id, 'SNK_NUTS',   'Nuts',             20 from public.product_categories where code = 'SNACKS' union all
select id, 'SNK_OTHER',  'Other savoury',    30 from public.product_categories where code = 'SNACKS' union all
select id, 'SNK_SWEET',  'Sweet snacks',     40 from public.product_categories where code = 'SNACKS';

-- Bakery subcategories
insert into public.product_categories (parent_id, code, name, sort_order)
select id, 'BAK_BREAD',    'Bread',     10 from public.product_categories where code = 'BAKERY' union all
select id, 'BAK_PASTRIES', 'Pastries',  20 from public.product_categories where code = 'BAKERY' union all
select id, 'BAK_CAKES',    'Cakes',     30 from public.product_categories where code = 'BAKERY';

-- Hot drinks subcategories
insert into public.product_categories (parent_id, code, name, sort_order)
select id, 'HD_COFFEE',       'Coffee',          10 from public.product_categories where code = 'HOT_DRINKS' union all
select id, 'HD_TEA',          'Tea',             20 from public.product_categories where code = 'HOT_DRINKS' union all
select id, 'HD_ACCOMP',       'Accompaniments',  30 from public.product_categories where code = 'HOT_DRINKS';

-- Chilled subcategories
insert into public.product_categories (parent_id, code, name, sort_order)
select id, 'CHL_DAIRY',       'Dairy',            10 from public.product_categories where code = 'CHILLED' union all
select id, 'CHL_SANDWICHES',  'Sandwiches',       20 from public.product_categories where code = 'CHILLED' union all
select id, 'CHL_READY_MEALS', 'Ready meals',      30 from public.product_categories where code = 'CHILLED' union all
select id, 'CHL_FTG',         'Food-to-go',       40 from public.product_categories where code = 'CHILLED';

-- Frozen subcategories
insert into public.product_categories (parent_id, code, name, sort_order)
select id, 'FRZ_ICE_CREAM',   'Ice cream',        10 from public.product_categories where code = 'FROZEN' union all
select id, 'FRZ_READY_MEALS', 'Ready meals',      20 from public.product_categories where code = 'FROZEN' union all
select id, 'FRZ_SAVOURY',     'Frozen savoury',   30 from public.product_categories where code = 'FROZEN';

-- Groceries subcategories
insert into public.product_categories (parent_id, code, name, sort_order)
select id, 'GA_PANTRY',    'Pantry staples',     10 from public.product_categories where code = 'GROCERIES_AMBIENT' union all
select id, 'GA_SAUCES',    'Sauces',             20 from public.product_categories where code = 'GROCERIES_AMBIENT' union all
select id, 'GA_PASTA',     'Pasta, rice, grains', 30 from public.product_categories where code = 'GROCERIES_AMBIENT' union all
select id, 'GA_CEREAL',    'Breakfast cereals',  40 from public.product_categories where code = 'GROCERIES_AMBIENT';

-- Household subcategories
insert into public.product_categories (parent_id, code, name, sort_order)
select id, 'HH_CLEANING',      'Cleaning',        10 from public.product_categories where code = 'HOUSEHOLD' union all
select id, 'HH_PERSONAL_CARE', 'Personal care',   20 from public.product_categories where code = 'HOUSEHOLD' union all
select id, 'HH_PAPER',         'Paper products',  30 from public.product_categories where code = 'HOUSEHOLD';

-- Motor care subcategories
insert into public.product_categories (parent_id, code, name, sort_order)
select id, 'MC_OILS',        'Oils and lubricants', 10 from public.product_categories where code = 'MOTOR_CARE' union all
select id, 'MC_SCREEN_WASH', 'Screen wash',         20 from public.product_categories where code = 'MOTOR_CARE' union all
select id, 'MC_AIR_FRESH',   'Air fresheners',      30 from public.product_categories where code = 'MOTOR_CARE' union all
select id, 'MC_ACCESSORIES', 'Accessories',         40 from public.product_categories where code = 'MOTOR_CARE';
