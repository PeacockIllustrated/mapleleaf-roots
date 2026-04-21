'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import type { PromoSectionSummary } from '@/lib/configurator/types';
import type {
  ProductSummary,
  ShelfRow,
  ShelfSlot,
  SlotStockingState,
  UnitWithShelves,
} from '@/lib/shelf/types';
import {
  addSlot as addSlotAction,
  updateSlot as updateSlotAction,
  deleteSlot as deleteSlotAction,
  assignSlotProducts,
  spreadShelf as spreadShelfAction,
} from '@/lib/shelf/actions';
import {
  updateShelf as updateShelfAction,
} from '@/lib/configurator/actions';
import { ShelfCanvas } from './shelf-canvas';
import { SlotInspector } from './slot-inspector';
import { ProductPicker } from './product-picker';

interface Props {
  unit: UnitWithShelves;
  promoSections: PromoSectionSummary[];
  products: ProductSummary[];
  canEdit: boolean;
}

type PickerTarget =
  | {
      mode: 'assign';
      slotId: string;
      kind: 'main' | 'sub_a' | 'sub_b';
    }
  | {
      mode: 'add';
      shelfId: string;
      filterCategoryId?: string | null;
    }
  | null;

const EMPTY_SLOT_DEFAULT_MM = 200;

type Toast = { kind: 'success' | 'error'; message: string } | null;

export function ShelvesClient({
  unit: initialUnit,
  promoSections,
  products,
  canEdit,
}: Props) {
  const [unit, setUnit] = useState<UnitWithShelves>(initialUnit);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [toast, setToast] = useState<Toast>(null);

  const selectedSlot: ShelfSlot | null = useMemo(() => {
    if (!selectedSlotId) return null;
    for (const shelf of unit.shelves) {
      for (const s of shelf.slots) if (s.id === selectedSlotId) return s;
    }
    return null;
  }, [unit, selectedSlotId]);

  const selectedShelf: ShelfRow | null = useMemo(() => {
    if (!selectedSlotId) return null;
    for (const shelf of unit.shelves) {
      if (shelf.slots.some((s) => s.id === selectedSlotId)) return shelf;
    }
    return null;
  }, [unit, selectedSlotId]);

  // Helpers to update the local unit tree without refetching the page.

  const patchSlot = useCallback(
    (slotId: string, patch: Partial<ShelfSlot>) => {
      setUnit((prev) => ({
        ...prev,
        shelves: prev.shelves.map((sh) => ({
          ...sh,
          slots: sh.slots.map((sl) =>
            sl.id === slotId ? { ...sl, ...patch } : sl
          ),
        })),
      }));
    },
    []
  );

  const dropSlot = useCallback((slotId: string) => {
    setUnit((prev) => ({
      ...prev,
      shelves: prev.shelves.map((sh) => ({
        ...sh,
        slots: sh.slots.filter((sl) => sl.id !== slotId),
      })),
    }));
  }, []);

  const pushSlot = useCallback((shelfId: string, slot: ShelfSlot) => {
    setUnit((prev) => ({
      ...prev,
      shelves: prev.shelves.map((sh) =>
        sh.id === shelfId ? { ...sh, slots: [...sh.slots, slot] } : sh
      ),
    }));
  }, []);

  // Entry point from the canvas: open the product picker instead of
  // prompting for a width. The picker lets the user pick a product (and
  // auto-compute width) or fall back to an empty-placeholder slot.
  const onAddSlot = useCallback((shelfId: string) => {
    setPicker({ mode: 'add', shelfId });
  }, []);

  // After the user makes a choice in 'add' mode, create the slot with the
  // right width based on product × facings, or a default empty width.
  const commitAddSlot = useCallback(
    async (shelfId: string, product: ProductSummary | null) => {
      const shelf = unit.shelves.find((s) => s.id === shelfId);
      const usedMm =
        shelf?.slots.reduce((acc, s) => acc + s.width_mm, 0) ?? 0;
      const remainingMm = Math.max(0, unit.width_mm - usedMm);

      const payload = product
        ? {
            siteId: unit.site_id,
            unitId: unit.id,
            shelfId,
            mainProductId: product.id,
            facingCount: 1,
          }
        : {
            siteId: unit.site_id,
            unitId: unit.id,
            shelfId,
            widthMm: Math.min(EMPTY_SLOT_DEFAULT_MM, Math.max(40, remainingMm)),
            facingCount: 1,
          };

      const res = await addSlotAction(payload);
      if (!res.ok) {
        setToast({ kind: 'error', message: res.message });
        return;
      }

      const nextOrder =
        (shelf?.slots.reduce((acc, s) => Math.max(acc, s.slot_order), 0) ?? 0) +
        1;

      pushSlot(shelfId, {
        id: res.data.id,
        shelf_id: shelfId,
        slot_order: nextOrder,
        width_mm: res.data.widthMm,
        facing_count: res.data.facingCount,
        stack_count: 1,
        currently_stocking: product ? 'MAIN' : 'EMPTY',
        assignment: product
          ? {
              id: 'pending',
              main: product,
              sub_a: null,
              sub_b: null,
            }
          : null,
      });
      setSelectedSlotId(res.data.id);
    },
    [unit.id, unit.site_id, unit.shelves, unit.width_mm, pushSlot]
  );

  const onAdjustFacings = useCallback(
    async (slotId: string, delta: 1 | -1) => {
      const slot = (() => {
        for (const sh of unit.shelves) {
          for (const s of sh.slots) if (s.id === slotId) return s;
        }
        return null;
      })();
      if (!slot) return;

      const nextCount = Math.max(1, Math.min(60, slot.facing_count + delta));
      if (nextCount === slot.facing_count) return;

      const mainProduct = slot.assignment?.main ?? null;
      const baseWidth =
        (mainProduct?.shipper_width_mm as number | null | undefined) ??
        (mainProduct?.width_mm as number | null | undefined) ??
        null;
      const nextWidth =
        baseWidth && baseWidth > 0
          ? baseWidth * nextCount
          : // No main product — scale proportionally from current.
            Math.round(
              (slot.width_mm / slot.facing_count) * nextCount
            );

      patchSlot(slotId, { facing_count: nextCount, width_mm: nextWidth });

      const res = await updateSlotAction({
        siteId: unit.site_id,
        unitId: unit.id,
        slotId,
        widthMm: nextWidth,
        facingCount: nextCount,
      });
      if (!res.ok) setToast({ kind: 'error', message: res.message });
    },
    [unit.id, unit.site_id, unit.shelves, patchSlot]
  );

  const onAdjustStack = useCallback(
    async (slotId: string, delta: 1 | -1) => {
      const slot = (() => {
        for (const sh of unit.shelves) {
          for (const s of sh.slots) if (s.id === slotId) return s;
        }
        return null;
      })();
      if (!slot) return;
      const next = Math.max(1, Math.min(6, slot.stack_count + delta));
      if (next === slot.stack_count) return;
      patchSlot(slotId, { stack_count: next });
      const res = await updateSlotAction({
        siteId: unit.site_id,
        unitId: unit.id,
        slotId,
        stackCount: next,
      });
      if (!res.ok) setToast({ kind: 'error', message: res.message });
    },
    [unit.id, unit.site_id, unit.shelves, patchSlot]
  );

  const onAdjustShelfClearance = useCallback(
    async (shelfId: string, delta: 20 | -20) => {
      const shelf = unit.shelves.find((s) => s.id === shelfId);
      if (!shelf) return;
      const next = Math.max(60, shelf.clearance_mm + delta);
      if (next === shelf.clearance_mm) return;

      setUnit((prev) => ({
        ...prev,
        shelves: prev.shelves.map((sh) =>
          sh.id === shelfId ? { ...sh, clearance_mm: next } : sh
        ),
      }));

      const res = await updateShelfAction({
        siteId: unit.site_id,
        shelfId,
        clearanceMm: next,
      });
      if (!res.ok) setToast({ kind: 'error', message: res.message });
    },
    [unit.site_id, unit.shelves]
  );

  const onSpreadShelf = useCallback(
    async (shelfId: string) => {
      const res = await spreadShelfAction({
        siteId: unit.site_id,
        unitId: unit.id,
        shelfId,
        unitWidthMm: unit.width_mm,
      });
      if (!res.ok) {
        setToast({ kind: 'error', message: res.message });
        return;
      }
      setToast({
        kind: 'success',
        message:
          res.data.added > 0
            ? `Spread shelf — ${res.data.added} facings added.`
            : 'Shelf already fills the width.',
      });
      // Refresh server data so the updated facings + widths flow back.
      // A small delay gives the DB + revalidate time to flush.
      setTimeout(() => {
        window.location.reload();
      }, 150);
    },
    [unit.id, unit.site_id, unit.width_mm]
  );

  const onSuggestSimilar = useCallback(
    (slotId: string) => {
      const slot = (() => {
        for (const sh of unit.shelves) {
          for (const s of sh.slots) if (s.id === slotId) return s;
        }
        return null;
      })();
      if (!slot || !slot.assignment?.main) return;
      const shelf = unit.shelves.find((s) =>
        s.slots.some((x) => x.id === slotId)
      );
      if (!shelf) return;
      setPicker({
        mode: 'add',
        shelfId: shelf.id,
        filterCategoryId: slot.assignment.main.category_id ?? null,
      });
    },
    [unit.shelves]
  );

  const onUpdateSlot = useCallback(
    async (
      slotId: string,
      patch: {
        widthMm?: number;
        facingCount?: number;
        stackCount?: number;
        currentlyStocking?: SlotStockingState;
      }
    ) => {
      const localPatch: Partial<ShelfSlot> = {};
      if (patch.widthMm !== undefined) localPatch.width_mm = patch.widthMm;
      if (patch.facingCount !== undefined)
        localPatch.facing_count = patch.facingCount;
      if (patch.stackCount !== undefined)
        localPatch.stack_count = patch.stackCount;
      if (patch.currentlyStocking !== undefined)
        localPatch.currently_stocking = patch.currentlyStocking;
      patchSlot(slotId, localPatch);

      const res = await updateSlotAction({
        siteId: unit.site_id,
        unitId: unit.id,
        slotId,
        ...patch,
      });
      if (!res.ok) {
        setToast({ kind: 'error', message: res.message });
      }
    },
    [unit.site_id, unit.id, patchSlot]
  );

  const onDeleteSlot = useCallback(
    async (slotId: string) => {
      dropSlot(slotId);
      if (selectedSlotId === slotId) setSelectedSlotId(null);
      const res = await deleteSlotAction({
        siteId: unit.site_id,
        unitId: unit.id,
        slotId,
      });
      if (!res.ok) setToast({ kind: 'error', message: res.message });
    },
    [unit.id, unit.site_id, selectedSlotId, dropSlot]
  );

  const openPicker = useCallback(
    (slotId: string, kind: 'main' | 'sub_a' | 'sub_b') => {
      setPicker({ mode: 'assign', slotId, kind });
    },
    []
  );

  const onPickerChoose = useCallback(
    async (product: ProductSummary | null) => {
      if (!picker) return;

      if (picker.mode === 'add') {
        setPicker(null);
        await commitAddSlot(picker.shelfId, product);
        return;
      }

      const { slotId, kind } = picker;
      setPicker(null);

      // Optimistic local update.
      setUnit((prev) => ({
        ...prev,
        shelves: prev.shelves.map((sh) => ({
          ...sh,
          slots: sh.slots.map((sl) => {
            if (sl.id !== slotId) return sl;
            const current = sl.assignment ?? {
              id: 'pending',
              main: null,
              sub_a: null,
              sub_b: null,
            };
            const next = { ...current };
            next[kind] = product;
            return { ...sl, assignment: next };
          }),
        })),
      }));

      const payload = {
        siteId: unit.site_id,
        unitId: unit.id,
        slotId,
        ...(kind === 'main'
          ? { mainProductId: product?.id ?? null }
          : kind === 'sub_a'
          ? { subAProductId: product?.id ?? null }
          : { subBProductId: product?.id ?? null }),
      };
      const res = await assignSlotProducts(payload);
      if (!res.ok) setToast({ kind: 'error', message: res.message });
    },
    [picker, unit.id, unit.site_id, commitAddSlot]
  );

  const totalSlotWidthByShelf = useMemo(() => {
    const map = new Map<string, number>();
    for (const sh of unit.shelves) {
      map.set(
        sh.id,
        sh.slots.reduce((acc, s) => acc + s.width_mm, 0)
      );
    }
    return map;
  }, [unit.shelves]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        height: '100vh',
        padding: '22px 28px 20px',
        boxSizing: 'border-box',
        minHeight: 620,
      }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Link
          href={`/sites/${unit.site_id}/planogram`}
          style={{
            fontSize: 12,
            color: 'var(--ml-text-muted)',
            textDecoration: 'none',
            letterSpacing: '0.02em',
          }}
        >
          ← Back to planogram
        </Link>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: 'var(--ml-text-primary)',
          }}
        >
          Shelves · {unit.label}
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ml-text-muted)' }}>
          {unit.unit_type_name} · {unit.width_mm} × {unit.height_mm} mm ·{' '}
          {unit.shelves.length} shelves.{' '}
          {canEdit
            ? 'Click an empty shelf to add a slot.'
            : 'Read-only for your role.'}
        </p>
      </header>

      <div
        style={{
          display: 'flex',
          gap: 14,
          flex: 1,
          minHeight: 0,
        }}
      >
        <ShelfCanvas
          unit={unit}
          promoSections={promoSections}
          canEdit={canEdit}
          selectedSlotId={selectedSlotId}
          totalSlotWidthByShelf={totalSlotWidthByShelf}
          onSelectSlot={setSelectedSlotId}
          onAddSlot={onAddSlot}
        />
        <SlotInspector
          unitLabel={unit.label}
          shelf={selectedShelf}
          slot={selectedSlot}
          canEdit={canEdit}
          promoSections={promoSections}
          unitWidthMm={unit.width_mm}
          usedOnShelfMm={
            selectedShelf
              ? totalSlotWidthByShelf.get(selectedShelf.id) ?? 0
              : 0
          }
          onUpdate={(patch) =>
            selectedSlot ? onUpdateSlot(selectedSlot.id, patch) : undefined
          }
          onAdjustFacings={(delta) =>
            selectedSlot ? onAdjustFacings(selectedSlot.id, delta) : undefined
          }
          onAdjustStack={(delta) =>
            selectedSlot ? onAdjustStack(selectedSlot.id, delta) : undefined
          }
          onAdjustShelfClearance={(delta) =>
            selectedShelf
              ? onAdjustShelfClearance(selectedShelf.id, delta)
              : undefined
          }
          onSpreadShelf={() =>
            selectedShelf ? onSpreadShelf(selectedShelf.id) : undefined
          }
          onSuggestSimilar={() =>
            selectedSlot ? onSuggestSimilar(selectedSlot.id) : undefined
          }
          onDelete={() =>
            selectedSlot ? onDeleteSlot(selectedSlot.id) : undefined
          }
          onPickProduct={openPicker}
          onClose={() => setSelectedSlotId(null)}
        />
      </div>

      {picker &&
        (() => {
          const contextShelf =
            picker.mode === 'add'
              ? unit.shelves.find((s) => s.id === picker.shelfId) ?? null
              : selectedShelf;
          const kind: 'main' | 'sub_a' | 'sub_b' =
            picker.mode === 'add' ? 'main' : picker.kind;
          const filterCategoryId =
            picker.mode === 'add' ? picker.filterCategoryId ?? null : null;
          return (
            <ProductPicker
              products={products}
              targetShelf={contextShelf}
              mode={picker.mode}
              kind={kind}
              filterCategoryId={filterCategoryId}
              onClose={() => setPicker(null)}
              onChoose={onPickerChoose}
            />
          );
        })()}

      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            padding: '10px 16px',
            borderRadius: 'var(--ml-radius-md)',
            background:
              toast.kind === 'success'
                ? 'linear-gradient(90deg, var(--ml-gold-light), var(--ml-gold-mid), var(--ml-gold-dark))'
                : 'var(--ml-red)',
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 500,
            boxShadow: '0 10px 30px rgba(65, 64, 66, 0.25)',
            maxWidth: 360,
            zIndex: 60,
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
