-- ============================================================================
-- Seed 003: POS slot types
-- ============================================================================
-- Named artwork positions. Each unit type carries a set of these; each
-- campaign_artwork row uploads artwork sized to one of these.
-- Dimensions are all in millimetres and reflect UK print industry norms.
-- ============================================================================

insert into public.pos_slot_types (code, display_name, description, width_mm, height_mm, mount_method, default_material, requires_hq_approval, sort_order) values
  -- Shelf and gondola POS
  ('HEADER_BOARD_1000',     'Header board 1m',          'Top-of-gondola header panel for 1m bays',          1000, 300, 'RAIL_INSERT',   'RIGID_PVC',       true,  10),
  ('HEADER_BOARD_1250',     'Header board 1.25m',       'Top-of-gondola header panel for 1.25m bays',       1250, 300, 'RAIL_INSERT',   'RIGID_PVC',       true,  20),
  ('SHELF_STRIP_1000',      'Shelf strip 1m',           'Shelf-edge strip fitting 1m price channels',       1000, 32,  'PRICE_CHANNEL', 'PAPER',           false, 30),
  ('SHELF_STRIP_1250',      'Shelf strip 1.25m',        'Shelf-edge strip fitting 1.25m price channels',    1250, 32,  'PRICE_CHANNEL', 'PAPER',           false, 40),
  ('WOBBLER_SET',           'Wobbler set',              'Pack of shelf-edge wobblers (typically 6-12)',     150, 150,  'ADHESIVE',      'RIGID_PVC',       false, 50),
  ('SIDE_FLAG_A5',          'Side flag A5',             'Side-mounted flag on gondola uprights',            148, 210,  'ADHESIVE',      'RIGID_PVC',       false, 60),
  
  -- Endcap and sidestack
  ('ENDCAP_POSTER_A1',      'Endcap poster A1',         'A1 portrait poster for endcap units',              594, 841,  'POSTER_POCKET', 'PAPER',           true,  70),
  ('ENDCAP_POSTER_A2',      'Endcap poster A2',         'A2 portrait poster for endcap units',              420, 594,  'POSTER_POCKET', 'PAPER',           false, 80),
  ('SIDESTACK_POSTER_A1',   'Sidestack poster A1',      'A1 portrait header for sidestack units',           594, 841,  'POSTER_POCKET', 'RIGID_PVC',       true,  90),
  
  -- Dump bins and free-standing units
  ('DUMP_BIN_HEADER',       'Dump bin header',          'Top panel of a dump bin, printed both sides',      600, 300,  'RAIL_INSERT',   'CORRUGATED_CARD', false, 100),
  ('FSDU_CROWN',            'FSDU crown',               'Crown/topper on free-standing display unit',       600, 400,  'RAIL_INSERT',   'CORRUGATED_CARD', false, 110),
  
  -- Counter and till point
  ('COUNTER_MAT_A3',        'Counter mat A3',           'A3 landscape counter mat, laminated',              420, 297,  'ADHESIVE',      'RIGID_PVC',       false, 120),
  ('TILL_TOPPER',           'Till topper',              'Mounted above till, landscape',                    800, 200,  'POSTER_POCKET', 'RIGID_PVC',       false, 130),
  
  -- Floor and ceiling
  ('FLOOR_GRAPHIC_500',     'Floor graphic 500mm',      'Circular floor decal',                             500, 500,  'VINYL_DIRECT',  'VINYL',           false, 140),
  ('CEILING_HANGER_A3',     'Ceiling hanger A3',        'Double-sided ceiling hanger, A3',                  420, 297,  'FREESTANDING',  'RIGID_PVC',       false, 150),
  
  -- Walls and windows
  ('WALL_POSTER_A1',        'Wall poster A1',           'Wall-mounted A1 portrait poster',                  594, 841,  'POSTER_POCKET', 'PAPER',           true,  160),
  ('WALL_POSTER_A2',        'Wall poster A2',           'Wall-mounted A2 portrait poster',                  420, 594,  'POSTER_POCKET', 'PAPER',           false, 170),
  ('WINDOW_VINYL_FULL',     'Window vinyl full',        'Full-height window vinyl',                         1800, 600, 'VINYL_DIRECT',  'VINYL',           true,  180),
  ('WINDOW_VINYL_BAND',     'Window vinyl band',        'Horizontal window vinyl band',                     3000, 300, 'VINYL_DIRECT',  'VINYL',           false, 190),
  ('WINDOW_DOOR_VINYL',     'Window door vinyl',        'Door-mounted vinyl decal',                         400, 800,  'VINYL_DIRECT',  'VINYL',           false, 200),
  
  -- Forecourt
  ('PUMP_TOPPER_800',       'Pump topper 800mm',        'Pump topper insert, 800mm wide',                   800, 200,  'RAIL_INSERT',   'RIGID_PVC',       true,  210),
  ('PUMP_TOPPER_1000',      'Pump topper 1000mm',       'Pump topper insert, 1000mm wide',                  1000, 250, 'RAIL_INSERT',   'RIGID_PVC',       true,  220),
  ('NOZZLE_FLAG',           'Nozzle flag',              'Small flag attached to pump nozzle',               200, 100,  'ADHESIVE',      'RIGID_PVC',       false, 230),
  ('TOTEM_AD_PANEL',        'Totem ad panel',           'Digital/static ad panel on totem',                 1200, 800, 'POSTER_POCKET', 'RIGID_PVC',       true,  240),
  ('TOTEM_PRICE_PANEL',     'Totem price panel',        'Fuel price display panel on totem',                1000, 200, 'RAIL_INSERT',   'ACRYLIC',         true,  250),
  ('CANOPY_FASCIA_INSERT',  'Canopy fascia insert',     'Canopy-edge branding panel per metre',             3000, 500, 'RAIL_INSERT',   'ACRYLIC',         true,  260),
  ('ENTRY_EXIT_PANEL',      'Entry/exit panel',         'Freestanding entry or exit sign panel',            800, 1200, 'FREESTANDING',  'ACRYLIC',         true,  270),
  
  -- Neon-style category signage
  ('NEON_CATEGORY_MED',     'Neon category sign (med)', 'Outlined-letter category sign, medium',            600, 250,  'ADHESIVE',      'ACRYLIC',         true,  280),
  ('NEON_CATEGORY_LRG',     'Neon category sign (lrg)', 'Outlined-letter category sign, large',             1200, 400, 'ADHESIVE',      'ACRYLIC',         true,  290);
