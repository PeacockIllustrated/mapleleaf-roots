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
  shipper_width_mm: number | null;
  shipper_height_mm: number | null;
  shipper_depth_mm: number | null;
  units_per_shipper: number | null;
  gtin: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  temperature_zone: 'AMBIENT' | 'CHILLED' | 'FROZEN';
}

/** Effective on-shelf width of a single facing — shipper box if defined. */
export function facingWidthMm(p: ProductSummary | null): number | null {
  if (!p) return null;
  return p.shipper_width_mm ?? p.width_mm ?? null;
}

/** Effective on-shelf height of a single facing — shipper box if defined. */
export function facingHeightMm(p: ProductSummary | null): number | null {
  if (!p) return null;
  return p.shipper_height_mm ?? p.height_mm ?? null;
}

/**
 * Display label for a shelf — numbered from the bottom up (1 = floor).
 * Data still stores shelf_order 1..N from top down; this helper is a
 * presentation-only inversion so users see what they'd see in-store.
 */
export function displayShelfLabel(
  shelfOrder: number,
  totalShelves: number
): number {
  return Math.max(1, totalShelves - shelfOrder + 1);
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
  stack_count: number;
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

export interface UnitPosSlot {
  id: string;
  position_label: string | null;
  quantity: number;
  pos_slot_type: {
    code: string;
    display_name: string;
    width_mm: number;
    height_mm: number;
    mount_method: string;
    default_material: string;
  };
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
  notes: string | null;
  shelves: ShelfRow[];
  pos_slots: UnitPosSlot[];
}
