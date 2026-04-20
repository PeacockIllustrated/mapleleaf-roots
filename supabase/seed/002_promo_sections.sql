-- ============================================================================
-- Seed 002: Promo sections
-- ============================================================================
-- HQ-owned merchandising taxonomy. Every site_unit is tagged with one of these
-- so campaigns can target "all CONFECTIONERY units across the network".
-- Hex colours align with the Mapleleaf brand-adjacent palette used on the
-- Layout-mode floor plan legend.
-- ============================================================================

insert into public.promo_sections (code, display_name, description, hex_colour, sort_order, source) values
  ('SOFT_DRINKS',         'Soft drinks',         'Ambient soft drinks, bottles and cans',                   '#B5D4F4', 10,  'HQ'),
  ('ENERGY_DRINKS',       'Energy drinks',       'Red Bull, Monster, and similar',                          '#85B7EB', 20,  'HQ'),
  ('CONFECTIONERY',       'Confectionery',       'Chocolate, sweets, gift tins',                            '#F4C0D1', 30,  'HQ'),
  ('SNACKS',              'Snacks',              'Crisps, nuts, savoury snacks',                            '#FAC775', 40,  'HQ'),
  ('CHILLED_FOOD_TO_GO',  'Chilled food to go',  'Sandwiches, wraps, chilled meal components',              '#9FE1CB', 50,  'HQ'),
  ('MEAL_DEAL',           'Meal deal',           'Meal deal featured area',                                 '#5DCAA5', 60,  'HQ'),
  ('BAKERY',              'Bakery',              'Ambient bakery, bread, pastries',                         '#F8D3A3', 70,  'HQ'),
  ('HOT_DRINKS',          'Hot drinks',          'Coffee station and accompaniments',                       '#ECBB7F', 80,  'HQ'),
  ('ALCOHOL',             'Alcohol',             'Beer, wine, spirits (licensed sites only)',               '#A96533', 90,  'HQ'),
  ('TOBACCO_VAPING',      'Tobacco and vaping',  'Tobacco gantry and vaping products',                      '#D3D1C7', 100, 'HQ'),
  ('GROCERIES_AMBIENT',   'Groceries',           'Ambient groceries, pantry staples',                       '#C0DD97', 110, 'HQ'),
  ('FROZEN',              'Frozen',              'Frozen food',                                             '#AFA9EC', 120, 'HQ'),
  ('HOUSEHOLD_CLEANING',  'Household',           'Household, cleaning, personal care',                      '#CECBF6', 130, 'HQ'),
  ('MOTOR_CARE',          'Motor care',          'Motor oil, screen wash, car care',                        '#534AB7', 140, 'HQ'),
  ('IMPULSE_TILL_POINT',  'Impulse',             'Impulse purchases at till point',                         '#ED93B1', 150, 'HQ'),
  ('FORECOURT',           'Forecourt',           'Forecourt signage, pumps, totems',                        '#E24B4A', 160, 'HQ'),
  ('SEASONAL',            'Seasonal',            'Seasonal promotions and temporary merchandising',         '#F5C4B3', 170, 'HQ');
