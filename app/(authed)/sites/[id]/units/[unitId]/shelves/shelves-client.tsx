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
  resizeShelfClearance as resizeShelfClearanceAction,
} from '@/lib/shelf/actions';
import { ShelfCanvas } from './shelf-canvas';
import { SlotInspector } from './slot-inspector';
import { ProductPicker } from './product-picker';
import { PosIssuesDialog, type PosIssue } from './pos-issues-dialog';
import {
  PosArtworkDialog,
  type PosArtworkAssignment,
} from './pos-artwork-dialog';
import {
  reportPosIssue as reportPosIssueAction,
  requestPosRedelivery as requestPosRedeliveryAction,
} from '@/lib/pos/actions';

interface Props {
  unit: UnitWithShelves;
  promoSections: PromoSectionSummary[];
  products: ProductSummary[];
  canEdit: boolean;
  canRequestRedelivery: boolean;
  posIssues: PosIssue[];
  posArtwork: PosArtworkAssignment[];
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
  canRequestRedelivery,
  posIssues,
  posArtwork,
}: Props) {
  const [unit, setUnit] = useState<UnitWithShelves>(initialUnit);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [posDialogOpen, setPosDialogOpen] = useState(false);
  const [pendingFlags, setPendingFlags] = useState<
    Array<{ posSlotId: string; label: string }>
  >([]);
  const [pendingPanelOpen, setPendingPanelOpen] = useState(false);
  const [submittingBulk, setSubmittingBulk] = useState(false);

  const pendingFlagIds = useMemo(
    () => new Set(pendingFlags.map((f) => f.posSlotId)),
    [pendingFlags]
  );

  const artworkByPosSlot = useMemo(() => {
    const m = new Map<string, PosArtworkAssignment>();
    for (const a of posArtwork) m.set(a.unit_type_pos_slot_id, a);
    return m;
  }, [posArtwork]);
  const artworkSetIds = useMemo(
    () => new Set(posArtwork.map((a) => a.unit_type_pos_slot_id)),
    [posArtwork]
  );

  const [artworkTarget, setArtworkTarget] = useState<string | null>(null);
  const onSetArtworkTarget = useCallback((posSlotId: string) => {
    setArtworkTarget(posSlotId);
  }, []);
  const artworkPosSlot = useMemo(
    () =>
      artworkTarget
        ? unit.pos_slots.find((p) => p.id === artworkTarget) ?? null
        : null,
    [artworkTarget, unit.pos_slots]
  );

  const onTogglePosFlag = useCallback(
    (posSlotId: string, label: string) => {
      setPendingFlags((prev) => {
        const exists = prev.some((f) => f.posSlotId === posSlotId);
        if (exists) return prev.filter((f) => f.posSlotId !== posSlotId);
        return [...prev, { posSlotId, label }];
      });
    },
    []
  );

  const submitBulkRedelivery = useCallback(async () => {
    if (pendingFlags.length === 0) return;
    setSubmittingBulk(true);
    try {
      // 1) Record each flag as a fresh MISSING issue.
      for (const f of pendingFlags) {
        const res = await reportPosIssueAction({
          siteId: unit.site_id,
          unitId: unit.id,
          siteUnitId: unit.id,
          unitTypePosSlotId: f.posSlotId,
          reason: 'MISSING',
          notes: null,
        });
        if (!res.ok) {
          setToast({ kind: 'error', message: res.message });
          setSubmittingBulk(false);
          return;
        }
      }
      // 2) Roll all open issues on this site into a single redelivery quote.
      const q = await requestPosRedeliveryAction({ siteId: unit.site_id });
      if (!q.ok) {
        setToast({ kind: 'error', message: q.message });
        setSubmittingBulk(false);
        return;
      }
      setPendingFlags([]);
      setPendingPanelOpen(false);
      window.location.assign(
        `/sites/${unit.site_id}/quotes/${q.data.quoteRef}`
      );
    } catch (err) {
      setToast({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Submit failed',
      });
    } finally {
      setSubmittingBulk(false);
    }
  }, [pendingFlags, unit.id, unit.site_id]);

  const openPosIssueCount = useMemo(
    () =>
      posIssues.filter(
        (i) => i.status === 'REPORTED' || i.status === 'ACKNOWLEDGED'
      ).length,
    [posIssues]
  );

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

      // The unit's physical height is fixed — resize takes/gives mm from
      // a neighbour shelf so the sum of clearances stays constant.
      const res = await resizeShelfClearanceAction({
        siteId: unit.site_id,
        unitId: unit.id,
        shelfId,
        deltaMm: delta,
      });
      if (!res.ok) {
        setToast({ kind: 'error', message: res.message });
        return;
      }
      setUnit((prev) => ({
        ...prev,
        shelves: prev.shelves.map((sh) => {
          if (sh.id === res.data.targetId) {
            return { ...sh, clearance_mm: res.data.targetClearance };
          }
          if (sh.id === res.data.donorId) {
            return { ...sh, clearance_mm: res.data.donorClearance };
          }
          return sh;
        }),
      }));
    },
    [unit.id, unit.site_id, unit.shelves]
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
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
        </div>

        <button
          type="button"
          onClick={() => setPosDialogOpen(true)}
          style={{
            height: 36,
            padding: '0 14px',
            background:
              openPosIssueCount > 0
                ? 'var(--ml-action-primary)'
                : 'transparent',
            color:
              openPosIssueCount > 0 ? '#FFFFFF' : 'var(--ml-charcoal)',
            border:
              openPosIssueCount > 0
                ? 0
                : '1px solid var(--ml-charcoal)',
            borderRadius: 'var(--ml-radius-md)',
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          POS issues
          {openPosIssueCount > 0 && (
            <span
              style={{
                minWidth: 20,
                height: 20,
                padding: '0 6px',
                borderRadius: 9999,
                background: 'rgba(255, 255, 255, 0.22)',
                color: '#FFFFFF',
                fontSize: 10,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {openPosIssueCount}
            </span>
          )}
        </button>
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
          pendingFlagIds={pendingFlagIds}
          artworkSetIds={artworkSetIds}
          onSelectSlot={setSelectedSlotId}
          onAddSlot={onAddSlot}
          onTogglePosFlag={onTogglePosFlag}
          onSetPosArtwork={onSetArtworkTarget}
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
          totalShelves={unit.shelves.length}
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

      <PosIssuesDialog
        open={posDialogOpen}
        onClose={() => setPosDialogOpen(false)}
        siteId={unit.site_id}
        unitId={unit.id}
        siteUnitId={unit.id}
        posSlots={unit.pos_slots}
        existingIssues={posIssues}
        canRequestRedelivery={canRequestRedelivery}
      />

      <PosArtworkDialog
        open={artworkTarget !== null}
        onClose={() => setArtworkTarget(null)}
        siteId={unit.site_id}
        unitId={unit.id}
        siteUnitId={unit.id}
        posSlot={artworkPosSlot}
        existing={
          artworkPosSlot ? artworkByPosSlot.get(artworkPosSlot.id) ?? null : null
        }
        canEdit={canEdit}
      />

      {pendingFlags.length > 0 && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 22,
            zIndex: 70,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 0,
            minWidth: 360,
            maxWidth: 520,
            background: 'var(--ml-surface-panel)',
            border: '0.5px solid var(--ml-border-default)',
            borderRadius: 'var(--ml-radius-lg)',
            boxShadow: '0 18px 40px rgba(65, 64, 66, 0.22)',
            overflow: 'hidden',
          }}
        >
          <button
            type="button"
            onClick={() => setPendingPanelOpen((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 16px',
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  background: 'var(--ml-action-primary)',
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {pendingFlags.length}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--ml-text-primary)',
                }}
              >
                POS flagged for redelivery
              </span>
            </span>
            <span style={{ fontSize: 11, color: 'var(--ml-text-muted)' }}>
              {pendingPanelOpen ? 'Hide' : 'Review'}
            </span>
          </button>

          {pendingPanelOpen && (
            <>
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: '0 8px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  maxHeight: 260,
                  overflowY: 'auto',
                  borderTop: '0.5px solid var(--ml-border-default)',
                }}
              >
                {pendingFlags.map((f) => (
                  <li
                    key={f.posSlotId}
                    style={{
                      padding: '8px 10px',
                      background: 'var(--ml-off-white)',
                      borderRadius: 'var(--ml-radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      fontSize: 12,
                      color: 'var(--ml-text-primary)',
                    }}
                  >
                    <span>{f.label}</span>
                    <button
                      type="button"
                      onClick={() =>
                        onTogglePosFlag(f.posSlotId, f.label)
                      }
                      aria-label="Remove from bulk order"
                      style={{
                        background: 'transparent',
                        border: 0,
                        color: 'var(--ml-text-muted)',
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              {canRequestRedelivery && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderTop: '0.5px solid var(--ml-border-default)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setPendingFlags([])}
                    disabled={submittingBulk}
                    style={{
                      height: 32,
                      padding: '0 12px',
                      background: 'transparent',
                      color: 'var(--ml-text-muted)',
                      border: '0.5px solid var(--ml-border-default)',
                      borderRadius: 'var(--ml-radius-md)',
                      fontFamily: 'inherit',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={submitBulkRedelivery}
                    disabled={submittingBulk}
                    style={{
                      height: 32,
                      padding: '0 16px',
                      background: 'var(--ml-action-primary)',
                      color: '#FFFFFF',
                      border: 0,
                      borderRadius: 'var(--ml-radius-md)',
                      fontFamily: 'inherit',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: submittingBulk ? 'wait' : 'pointer',
                      opacity: submittingBulk ? 0.7 : 1,
                    }}
                  >
                    {submittingBulk
                      ? 'Submitting…'
                      : `Bulk order ${pendingFlags.length} POS`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
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
