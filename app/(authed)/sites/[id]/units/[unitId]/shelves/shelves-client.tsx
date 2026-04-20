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
} from '@/lib/shelf/actions';
import { ShelfCanvas } from './shelf-canvas';
import { SlotInspector } from './slot-inspector';
import { ProductPicker } from './product-picker';

interface Props {
  unit: UnitWithShelves;
  promoSections: PromoSectionSummary[];
  products: ProductSummary[];
  canEdit: boolean;
}

type PickerTarget = {
  slotId: string;
  kind: 'main' | 'sub_a' | 'sub_b';
} | null;

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

  const onAddSlot = useCallback(
    async (shelfId: string, widthMm: number) => {
      const res = await addSlotAction({
        siteId: unit.site_id,
        unitId: unit.id,
        shelfId,
        widthMm,
        facingCount: 1,
      });
      if (!res.ok) {
        setToast({ kind: 'error', message: res.message });
        return;
      }
      const shelf = unit.shelves.find((s) => s.id === shelfId);
      const nextOrder =
        (shelf?.slots.reduce((acc, s) => Math.max(acc, s.slot_order), 0) ?? 0) + 1;
      pushSlot(shelfId, {
        id: res.data.id,
        shelf_id: shelfId,
        slot_order: nextOrder,
        width_mm: widthMm,
        facing_count: 1,
        currently_stocking: 'EMPTY',
        assignment: null,
      });
      setSelectedSlotId(res.data.id);
    },
    [unit.id, unit.site_id, unit.shelves, pushSlot]
  );

  const onUpdateSlot = useCallback(
    async (
      slotId: string,
      patch: {
        widthMm?: number;
        facingCount?: number;
        currentlyStocking?: SlotStockingState;
      }
    ) => {
      const localPatch: Partial<ShelfSlot> = {};
      if (patch.widthMm !== undefined) localPatch.width_mm = patch.widthMm;
      if (patch.facingCount !== undefined)
        localPatch.facing_count = patch.facingCount;
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
      setPicker({ slotId, kind });
    },
    []
  );

  const onPickerChoose = useCallback(
    async (product: ProductSummary | null) => {
      if (!picker) return;
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
    [picker, unit.id, unit.site_id]
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
        gap: 16,
        height: 'calc(100vh - 88px)',
        minHeight: 560,
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
          onUpdate={(patch) =>
            selectedSlot ? onUpdateSlot(selectedSlot.id, patch) : undefined
          }
          onDelete={() =>
            selectedSlot ? onDeleteSlot(selectedSlot.id) : undefined
          }
          onPickProduct={openPicker}
          onClose={() => setSelectedSlotId(null)}
        />
      </div>

      {picker && (
        <ProductPicker
          products={products}
          targetShelf={selectedShelf}
          kind={picker.kind}
          onClose={() => setPicker(null)}
          onChoose={onPickerChoose}
        />
      )}

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
