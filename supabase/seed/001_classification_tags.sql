-- ============================================================================
-- Seed 001: Classification tags
-- ============================================================================
-- Tags applied to sites to characterise their operational profile.
-- Used for campaign targeting ("all MOTORWAY sites get this pump topper").
-- ============================================================================

insert into public.classification_tags (code, name, description, sort_order) values
  ('MOTORWAY',            'Motorway',           'Located on or immediately off a motorway', 10),
  ('URBAN',               'Urban',              'City centre or high-density urban site', 20),
  ('SUBURBAN',            'Suburban',           'Suburban location, residential catchment', 30),
  ('RURAL',               'Rural',              'Rural or A-road location', 40),
  ('TWENTY_FOUR_HOUR',    '24 hour',            'Open 24/7', 50),
  ('NIGHT_PAY',           'Night pay',          'Night-pay window operation', 60),
  ('ALCOHOL_LICENSED',    'Alcohol licensed',   'Licensed to sell alcohol', 70),
  ('COFFEE_STATION',      'Coffee station',     'Bean-to-cup coffee on site', 80),
  ('HOT_FOOD_TO_GO',      'Hot food to go',     'Hot food service available', 90),
  ('LOTTERY',             'Lottery',            'National Lottery terminal', 100),
  ('POST_OFFICE',         'Post Office',        'Post Office counter inside', 110),
  ('EV_CHARGING',         'EV charging',        'Electric vehicle charging points', 120),
  ('JET_WASH',            'Jet wash',           'Self-service jet wash on forecourt', 130),
  ('CAR_WASH',            'Car wash',           'Automatic car wash on forecourt', 140),
  ('WORKSHOP',            'Workshop',           'Mapleleaf Automotive workshop on site', 150);
