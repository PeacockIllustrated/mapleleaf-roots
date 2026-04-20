-- ============================================================================
-- Seed 005: Unit type → POS slot mapping
-- ============================================================================
-- For each unit type, list which POS slot positions it carries and how many.
-- position_label is unique per unit type and is used by install tasks to
-- identify exactly where artwork goes.
-- ============================================================================

-- Helper: a compact way to insert a mapping
-- Using WITH clauses to keep the unit and slot lookups readable.

-- ============================================================================
-- DRY SHELVING
-- ============================================================================

-- GONDOLA_AISLE_1000: top header, 5 shelf strips, wobbler pack, 2 side flags
insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'TOP_HEADER' from public.unit_types ut, public.pos_slot_types pst
  where ut.code = 'GONDOLA_AISLE_1000' and pst.code = 'HEADER_BOARD_1000'
union all
select ut.id, pst.id, 1, 'SHELF_1' from public.unit_types ut, public.pos_slot_types pst
  where ut.code = 'GONDOLA_AISLE_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'SHELF_2' from public.unit_types ut, public.pos_slot_types pst
  where ut.code = 'GONDOLA_AISLE_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'SHELF_3' from public.unit_types ut, public.pos_slot_types pst
  where ut.code = 'GONDOLA_AISLE_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'SHELF_4' from public.unit_types ut, public.pos_slot_types pst
  where ut.code = 'GONDOLA_AISLE_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'SHELF_5' from public.unit_types ut, public.pos_slot_types pst
  where ut.code = 'GONDOLA_AISLE_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'WOBBLER_PACK' from public.unit_types ut, public.pos_slot_types pst
  where ut.code = 'GONDOLA_AISLE_1000' and pst.code = 'WOBBLER_SET'
union all
select ut.id, pst.id, 2, 'SIDE_FLAGS' from public.unit_types ut, public.pos_slot_types pst
  where ut.code = 'GONDOLA_AISLE_1000' and pst.code = 'SIDE_FLAG_A5';

-- GONDOLA_AISLE_1250: same positions but 1.25m-sized strips and header
insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'TOP_HEADER' from public.unit_types ut, public.pos_slot_types pst
  where ut.code = 'GONDOLA_AISLE_1250' and pst.code = 'HEADER_BOARD_1250'
union all
select ut.id, pst.id, 1, 'SHELF_1' from public.unit_types ut, public.pos_slot_types pst
  where ut.code = 'GONDOLA_AISLE_1250' and pst.code = 'SHELF_STRIP_1250'
union all
select ut.id, pst.id, 1, 'SHELF_2' from public.unit_types ut, public.pos_slot_types pst
  where ut.code = 'GONDOLA_AISLE_1250' and pst.code = 'SHELF_STRIP_1250'
union all
select ut.id, pst.id, 1, 'SHELF_3' from public.unit_types ut, public.pos_slot_types pst
  where ut.code = 'GONDOLA_AISLE_1250' and pst.code = 'SHELF_STRIP_1250'
union all
select ut.id, pst.id, 1, 'SHELF_4' from public.unit_types ut, public.pos_slot_types pst
  where ut.code = 'GONDOLA_AISLE_1250' and pst.code = 'SHELF_STRIP_1250'
union all
select ut.id, pst.id, 1, 'SHELF_5' from public.unit_types ut, public.pos_slot_types pst
  where ut.code = 'GONDOLA_AISLE_1250' and pst.code = 'SHELF_STRIP_1250'
union all
select ut.id, pst.id, 1, 'WOBBLER_PACK' from public.unit_types ut, public.pos_slot_types pst
  where ut.code = 'GONDOLA_AISLE_1250' and pst.code = 'WOBBLER_SET'
union all
select ut.id, pst.id, 2, 'SIDE_FLAGS' from public.unit_types ut, public.pos_slot_types pst
  where ut.code = 'GONDOLA_AISLE_1250' and pst.code = 'SIDE_FLAG_A5';

-- GONDOLA_TALL_1000: 6 shelves
insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'TOP_HEADER' from public.unit_types ut, public.pos_slot_types pst
  where ut.code = 'GONDOLA_TALL_1000' and pst.code = 'HEADER_BOARD_1000'
union all
select ut.id, pst.id, 1, 'SHELF_1' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'GONDOLA_TALL_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'SHELF_2' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'GONDOLA_TALL_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'SHELF_3' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'GONDOLA_TALL_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'SHELF_4' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'GONDOLA_TALL_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'SHELF_5' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'GONDOLA_TALL_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'SHELF_6' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'GONDOLA_TALL_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'WOBBLER_PACK' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'GONDOLA_TALL_1000' and pst.code = 'WOBBLER_SET';

-- GONDOLA_LOW_1000: 4 shelves
insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'TOP_HEADER' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'GONDOLA_LOW_1000' and pst.code = 'HEADER_BOARD_1000'
union all
select ut.id, pst.id, 1, 'SHELF_1' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'GONDOLA_LOW_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'SHELF_2' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'GONDOLA_LOW_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'SHELF_3' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'GONDOLA_LOW_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'SHELF_4' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'GONDOLA_LOW_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'WOBBLER_PACK' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'GONDOLA_LOW_1000' and pst.code = 'WOBBLER_SET';

-- ENDCAP_1000: big poster + 4 shelf strips + wobblers
insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'ENDCAP_POSTER' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'ENDCAP_1000' and pst.code = 'ENDCAP_POSTER_A1'
union all
select ut.id, pst.id, 1, 'SHELF_1' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'ENDCAP_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'SHELF_2' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'ENDCAP_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'SHELF_3' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'ENDCAP_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'SHELF_4' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'ENDCAP_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'WOBBLER_PACK' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'ENDCAP_1000' and pst.code = 'WOBBLER_SET';

-- WALL_BAY_1000: header + 6 shelf strips + 2 wall posters (optional featured)
insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'TOP_HEADER' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'WALL_BAY_1000' and pst.code = 'HEADER_BOARD_1000'
union all
select ut.id, pst.id, 1, 'SHELF_1' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'WALL_BAY_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'SHELF_2' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'WALL_BAY_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'SHELF_3' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'WALL_BAY_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'SHELF_4' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'WALL_BAY_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'SHELF_5' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'WALL_BAY_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 1, 'SHELF_6' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'WALL_BAY_1000' and pst.code = 'SHELF_STRIP_1000'
union all
select ut.id, pst.id, 2, 'FEATURE_POSTERS' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'WALL_BAY_1000' and pst.code = 'WALL_POSTER_A2';

-- ============================================================================
-- CHILLED / FROZEN
-- ============================================================================

-- Chiller multideck 1.25m
insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'TOP_HEADER' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'CHILL_MULTIDECK_1250' and pst.code = 'HEADER_BOARD_1250'
union all
select ut.id, pst.id, 1, 'SHELF_1' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'CHILL_MULTIDECK_1250' and pst.code = 'SHELF_STRIP_1250'
union all
select ut.id, pst.id, 1, 'SHELF_2' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'CHILL_MULTIDECK_1250' and pst.code = 'SHELF_STRIP_1250'
union all
select ut.id, pst.id, 1, 'SHELF_3' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'CHILL_MULTIDECK_1250' and pst.code = 'SHELF_STRIP_1250'
union all
select ut.id, pst.id, 1, 'SHELF_4' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'CHILL_MULTIDECK_1250' and pst.code = 'SHELF_STRIP_1250'
union all
select ut.id, pst.id, 1, 'SHELF_5' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'CHILL_MULTIDECK_1250' and pst.code = 'SHELF_STRIP_1250';

-- Chiller multideck 1.875m (same pattern, custom-cut header)
insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'TOP_HEADER' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'CHILL_MULTIDECK_1875' and pst.code = 'HEADER_BOARD_1250'
union all
select ut.id, pst.id, 1, 'SHELF_1' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'CHILL_MULTIDECK_1875' and pst.code = 'SHELF_STRIP_1250'
union all
select ut.id, pst.id, 1, 'SHELF_2' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'CHILL_MULTIDECK_1875' and pst.code = 'SHELF_STRIP_1250'
union all
select ut.id, pst.id, 1, 'SHELF_3' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'CHILL_MULTIDECK_1875' and pst.code = 'SHELF_STRIP_1250'
union all
select ut.id, pst.id, 1, 'SHELF_4' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'CHILL_MULTIDECK_1875' and pst.code = 'SHELF_STRIP_1250'
union all
select ut.id, pst.id, 1, 'SHELF_5' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'CHILL_MULTIDECK_1875' and pst.code = 'SHELF_STRIP_1250';

-- Chiller upright 2-door: header + shelf strips + door decals
insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'TOP_HEADER' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'CHILL_UPRIGHT_2DR' and pst.code = 'HEADER_BOARD_1250'
union all
select ut.id, pst.id, 1, 'SHELF_1' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'CHILL_UPRIGHT_2DR' and pst.code = 'SHELF_STRIP_1250'
union all
select ut.id, pst.id, 1, 'SHELF_2' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'CHILL_UPRIGHT_2DR' and pst.code = 'SHELF_STRIP_1250'
union all
select ut.id, pst.id, 1, 'SHELF_3' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'CHILL_UPRIGHT_2DR' and pst.code = 'SHELF_STRIP_1250'
union all
select ut.id, pst.id, 1, 'SHELF_4' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'CHILL_UPRIGHT_2DR' and pst.code = 'SHELF_STRIP_1250'
union all
select ut.id, pst.id, 1, 'SHELF_5' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'CHILL_UPRIGHT_2DR' and pst.code = 'SHELF_STRIP_1250'
union all
select ut.id, pst.id, 2, 'DOOR_DECALS' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'CHILL_UPRIGHT_2DR' and pst.code = 'WINDOW_DOOR_VINYL';

-- Freezer well: just header
insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'TOP_HEADER' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'FREEZE_WELL_1250' and pst.code = 'HEADER_BOARD_1250'
union all
select ut.id, pst.id, 1, 'WOBBLER_PACK' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'FREEZE_WELL_1250' and pst.code = 'WOBBLER_SET';

-- ============================================================================
-- PROMO / SEASONAL
-- ============================================================================

insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'HEADER' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'DUMP_BIN_SQ' and pst.code = 'DUMP_BIN_HEADER'
union all
select ut.id, pst.id, 1, 'WOBBLER_PACK' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'DUMP_BIN_SQ' and pst.code = 'WOBBLER_SET';

insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'HEADER' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'DUMP_BIN_RECT' and pst.code = 'DUMP_BIN_HEADER'
union all
select ut.id, pst.id, 1, 'WOBBLER_PACK' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'DUMP_BIN_RECT' and pst.code = 'WOBBLER_SET';

insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'POSTER' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'SIDESTACK_A1' and pst.code = 'SIDESTACK_POSTER_A1'
union all
select ut.id, pst.id, 1, 'WOBBLER_PACK' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'SIDESTACK_A1' and pst.code = 'WOBBLER_SET';

insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'CROWN' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'FSDU_CARD' and pst.code = 'FSDU_CROWN';

insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'CROWN' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'WIRE_STAND_TALL' and pst.code = 'FSDU_CROWN'
union all
select ut.id, pst.id, 1, 'WOBBLER_PACK' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'WIRE_STAND_TALL' and pst.code = 'WOBBLER_SET';

-- ============================================================================
-- COUNTER / TILL
-- ============================================================================

insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'TILL_TOPPER' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'TILL_STANDARD' and pst.code = 'TILL_TOPPER'
union all
select ut.id, pst.id, 2, 'COUNTER_MATS' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'TILL_STANDARD' and pst.code = 'COUNTER_MAT_A3'
union all
select ut.id, pst.id, 1, 'WOBBLER_PACK' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'TILL_STANDARD' and pst.code = 'WOBBLER_SET';

-- BACK_BAR_CIGS intentionally has no POS (plain-pack legislation)

insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'MAIN_POSTER' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'COFFEE_STATION' and pst.code = 'WALL_POSTER_A1'
union all
select ut.id, pst.id, 2, 'ACCOMP_STRIPS' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'COFFEE_STATION' and pst.code = 'SHELF_STRIP_1000';

insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'MAIN_POSTER' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'FTG_HOT_CASE' and pst.code = 'WALL_POSTER_A2';

insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'WOBBLER_PACK' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'SLUSH_MACHINE' and pst.code = 'WOBBLER_SET';

-- ============================================================================
-- FORECOURT
-- ============================================================================

insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'AD_PANEL' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'TOTEM_MAIN' and pst.code = 'TOTEM_AD_PANEL'
union all
select ut.id, pst.id, 1, 'PRICE_PANEL' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'TOTEM_MAIN' and pst.code = 'TOTEM_PRICE_PANEL';

insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'PANEL' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'TOTEM_DIRECTIONAL' and pst.code = 'WALL_POSTER_A1';

insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 4, 'PUMP_TOPPERS' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'PUMP_ISLAND' and pst.code = 'PUMP_TOPPER_800'
union all
select ut.id, pst.id, 4, 'NOZZLE_FLAGS' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'PUMP_ISLAND' and pst.code = 'NOZZLE_FLAG';

insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'FASCIA_INSERT' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'CANOPY_FASCIA' and pst.code = 'CANOPY_FASCIA_INSERT';

insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'PANEL' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'ENTRY_SIGN' and pst.code = 'ENTRY_EXIT_PANEL';

insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'PANEL' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'EXIT_SIGN' and pst.code = 'ENTRY_EXIT_PANEL';

-- ============================================================================
-- WINDOWS / POS ONLY
-- ============================================================================

insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'ARTWORK' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'WIN_FULL_1800' and pst.code = 'WINDOW_VINYL_FULL';

insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'ARTWORK' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'WIN_BAND_3000' and pst.code = 'WINDOW_VINYL_BAND';

insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'ARTWORK' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'WIN_DOOR_VINYL' and pst.code = 'WINDOW_DOOR_VINYL';

insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'POSTER' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'WALL_POSTER_HOLDER_A1' and pst.code = 'WALL_POSTER_A1';

insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'ARTWORK' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'COUNTER_MAT_A3' and pst.code = 'COUNTER_MAT_A3';

insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'ARTWORK' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'FLOOR_GRAPHIC_500' and pst.code = 'FLOOR_GRAPHIC_500';

insert into public.unit_type_pos_slots (unit_type_id, pos_slot_type_id, quantity, position_label)
select ut.id, pst.id, 1, 'ARTWORK' from public.unit_types ut, public.pos_slot_types pst where ut.code = 'CEILING_HANGER_DSE' and pst.code = 'CEILING_HANGER_A3';
