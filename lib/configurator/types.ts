/**
 * Shared types for the floor-plan configurator.
 *
 * Coordinate system: millimetres from the top-left of the floor plan.
 * Rotation: 0, 90, 180, or 270 degrees — clockwise, applied around the
 * unit's top-left origin. The Konva stage converts mm → screen px at
 * render time via a zoom factor.
 */

export type UnitCategory =
  | 'DRY_SHELVING'
  | 'CHILLED_FROZEN'
  | 'PROMO_SEASONAL'
  | 'COUNTER_TILL'
  | 'FORECOURT'
  | 'WINDOWS_POS_ONLY';

export type TemperatureZone = 'AMBIENT' | 'CHILLED' | 'FROZEN';

export interface UnitTypeSummary {
  id: string;
  code: string;
  display_name: string;
  category: UnitCategory;
  width_mm: number;
  depth_mm: number;
  height_mm: number;
  is_double_sided: boolean;
  is_refrigerated: boolean;
  temperature_zone: TemperatureZone;
  default_shelf_count: number | null;
  sort_order: number;
}

export interface PromoSectionSummary {
  id: string;
  code: string;
  display_name: string;
  hex_colour: string;
  sort_order: number;
}

export type Rotation = 0 | 90 | 180 | 270;

/**
 * A unit placed on a site's floor plan. Mirrors the `site_units` row shape
 * with the unit_type fields joined in for rendering convenience.
 */
export interface PlacedUnit {
  id: string;
  site_planogram_id: string;
  unit_type_id: string;
  unit_type: UnitTypeSummary;
  promo_section_id: string | null;
  label: string;
  floor_x: number;
  floor_y: number;
  rotation_degrees: Rotation;
  shelves: SiteUnitShelf[];
  pos_slots: UnitTypePosSlotRef[];
}

export interface SiteUnitShelf {
  id: string;
  site_unit_id: string;
  shelf_order: number;
  clearance_mm: number;
  depth_mm: number | null;
  is_base_shelf: boolean;
  promo_section_id: string | null;
}

export interface UnitTypePosSlotRef {
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

export interface ShopBounds {
  widthMm: number;
  heightMm: number;
}

/**
 * Result envelope for configurator server actions — mirrors the pattern used
 * for sites/actions.ts so all server actions feel the same.
 */
export type ConfigActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Rendering constants
// ---------------------------------------------------------------------------

/** Snap step for floor-plan placement. */
export const SNAP_MM = 100;

/** Default display scale: 1 mm → 0.25 px at default zoom (4× zoom-out). */
export const DEFAULT_PX_PER_MM = 0.25;

/** Stage physical dimensions — a realistic forecourt shop floor. */
export const STAGE_WIDTH_MM = 24_000;
export const STAGE_HEIGHT_MM = 16_000;
