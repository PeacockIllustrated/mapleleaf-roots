export type SlotStockingState =
  | 'MAIN'
  | 'SUB_A'
  | 'SUB_B'
  | 'EMPTY'
  | 'OUT_OF_SPEC';

export interface ProductSummary {
  id: string;
  name: string;
  brand: string | null;
  category_id: string | null;
  width_mm: number | null;
  height_mm: number | null;
  depth_mm: number | null;
  gtin: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  temperature_zone: 'AMBIENT' | 'CHILLED' | 'FROZEN';
}

export interface SlotAssignment {
  id: string;
  main: ProductSummary | null;
  sub_a: ProductSummary | null;
  sub_b: ProductSummary | null;
}

export interface ShelfSlot {
  id: string;
  shelf_id: string;
  slot_order: number;
  width_mm: number;
  facing_count: number;
  currently_stocking: SlotStockingState;
  assignment: SlotAssignment | null;
}

export interface ShelfRow {
  id: string;
  shelf_order: number;
  clearance_mm: number;
  depth_mm: number | null;
  is_base_shelf: boolean;
  promo_section_id: string | null;
  slots: ShelfSlot[];
}

export interface UnitWithShelves {
  id: string;
  site_id: string;
  site_name: string;
  unit_type_code: string;
  unit_type_name: string;
  label: string;
  width_mm: number;
  depth_mm: number;
  height_mm: number;
  promo_section_id: string | null;
  shelves: ShelfRow[];
}
