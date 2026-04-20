'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  PlacedUnit,
  Rotation,
  ShopBounds,
  SiteUnitShelf,
  UnitTypeSummary,
} from './types';
import { SNAP_MM } from './types';

/**
 * Zustand store for the floor-plan configurator.
 *
 * Responsibilities:
 *   - Hold the current set of placed units (ephemeral UI copy of site_units)
 *   - Track selection, hover, and drag state
 *   - Apply optimistic updates when the user interacts
 *   - Expose selectors the components use for render
 *
 * Persistence is NOT here. The page shell watches for "dirty" units and
 * fires the debounced save Server Action. This store never imports anything
 * server-side.
 */

export type PendingUnit = {
  tempId: string;
  unit_type: UnitTypeSummary;
  floor_x: number;
  floor_y: number;
  rotation_degrees: Rotation;
  label: string;
  promo_section_id: string | null;
};

interface ConfiguratorState {
  units: PlacedUnit[];
  pending: PendingUnit[];
  selectedId: string | null; // id of a PlacedUnit, or tempId of a PendingUnit

  shopBounds: ShopBounds | null;

  // view
  zoom: number;

  // actions
  setUnits: (units: PlacedUnit[]) => void;
  setShopBounds: (bounds: ShopBounds | null) => void;
  addPending: (p: PendingUnit) => void;
  upgradePending: (tempId: string, saved: PlacedUnit) => void;
  removePending: (tempId: string) => void;
  updateUnit: (id: string, patch: Partial<PlacedUnit>) => void;
  addShelf: (unitId: string, shelf: SiteUnitShelf) => void;
  updateShelf: (
    unitId: string,
    shelfId: string,
    patch: Partial<SiteUnitShelf>
  ) => void;
  removeShelf: (unitId: string, shelfId: string) => void;
  removeUnit: (id: string) => void;
  select: (id: string | null) => void;
  setZoom: (z: number) => void;
}

/** Snap a millimetre value to the configured grid. */
export function snapMm(mm: number): number {
  return Math.round(mm / SNAP_MM) * SNAP_MM;
}

export const useConfigurator = create<ConfiguratorState>()(
  immer((set) => ({
    units: [],
    pending: [],
    selectedId: null,
    shopBounds: null,
    zoom: 1,

    setUnits: (units) =>
      set((draft) => {
        draft.units = units;
      }),

    setShopBounds: (bounds) =>
      set((draft) => {
        draft.shopBounds = bounds;
      }),

    addPending: (p) =>
      set((draft) => {
        draft.pending.push(p);
        draft.selectedId = p.tempId;
      }),

    upgradePending: (tempId, saved) =>
      set((draft) => {
        draft.pending = draft.pending.filter((p) => p.tempId !== tempId);
        draft.units.push(saved);
        if (draft.selectedId === tempId) draft.selectedId = saved.id;
      }),

    removePending: (tempId) =>
      set((draft) => {
        draft.pending = draft.pending.filter((p) => p.tempId !== tempId);
        if (draft.selectedId === tempId) draft.selectedId = null;
      }),

    updateUnit: (id, patch) =>
      set((draft) => {
        const u = draft.units.find((x) => x.id === id);
        if (u) Object.assign(u, patch);
      }),

    addShelf: (unitId, shelf) =>
      set((draft) => {
        const u = draft.units.find((x) => x.id === unitId);
        if (!u) return;
        u.shelves.push(shelf);
        u.shelves.sort((a, b) => a.shelf_order - b.shelf_order);
      }),

    updateShelf: (unitId, shelfId, patch) =>
      set((draft) => {
        const u = draft.units.find((x) => x.id === unitId);
        if (!u) return;
        const s = u.shelves.find((x) => x.id === shelfId);
        if (s) Object.assign(s, patch);
      }),

    removeShelf: (unitId, shelfId) =>
      set((draft) => {
        const u = draft.units.find((x) => x.id === unitId);
        if (!u) return;
        u.shelves = u.shelves.filter((s) => s.id !== shelfId);
      }),

    removeUnit: (id) =>
      set((draft) => {
        draft.units = draft.units.filter((x) => x.id !== id);
        if (draft.selectedId === id) draft.selectedId = null;
      }),

    select: (id) =>
      set((draft) => {
        draft.selectedId = id;
      }),

    setZoom: (z) =>
      set((draft) => {
        draft.zoom = Math.max(0.25, Math.min(2, z));
      }),
  }))
);
