'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  placeSiteUnit,
  updateSiteUnit,
  deleteSiteUnit,
  setShopBounds,
  clearShopBounds,
  addShelf as addShelfAction,
  updateShelf as updateShelfAction,
  deleteShelf as deleteShelfAction,
} from '@/lib/configurator/actions';
import { requestFittingQuote } from '@/lib/quote/actions';
import { useConfigurator } from '@/lib/configurator/store';
import type {
  PlacedUnit,
  PromoSectionSummary,
  Rotation,
  ShopBounds,
  UnitTypeSummary,
} from '@/lib/configurator/types';
import { UnitLibraryRail } from '@/components/configurator/UnitLibraryRail';
import { UnitInspector } from '@/components/configurator/UnitInspector';
import { StageToolbar } from '@/components/configurator/StageToolbar';
import { ShopBoundsDialog } from '@/components/configurator/ShopBoundsDialog';

const FloorPlanStage = dynamic(
  () => import('@/components/configurator/FloorPlanStage'),
  { ssr: false }
);

interface Props {
  siteId: string;
  siteName: string;
  unitTypes: UnitTypeSummary[];
  promoSections: PromoSectionSummary[];
  initialUnits: PlacedUnit[];
  initialShopBounds: ShopBounds | null;
  canEdit: boolean;
}

type Toast = { kind: 'success' | 'error'; message: string } | null;

export function PlanogramClient({
  siteId,
  siteName,
  unitTypes,
  promoSections,
  initialUnits,
  initialShopBounds,
  canEdit,
}: Props) {
  const setUnits = useConfigurator((s) => s.setUnits);
  const setShopBoundsLocal = useConfigurator((s) => s.setShopBounds);
  const shopBounds = useConfigurator((s) => s.shopBounds);
  const addPending = useConfigurator((s) => s.addPending);
  const upgradePending = useConfigurator((s) => s.upgradePending);
  const removePending = useConfigurator((s) => s.removePending);
  const updateUnit = useConfigurator((s) => s.updateUnit);
  const removeUnitLocal = useConfigurator((s) => s.removeUnit);
  const addShelfLocal = useConfigurator((s) => s.addShelf);
  const updateShelfLocal = useConfigurator((s) => s.updateShelf);
  const removeShelfLocal = useConfigurator((s) => s.removeShelf);
  const units = useConfigurator((s) => s.units);

  const [toast, setToast] = useState<Toast>(null);
  const [boundsOpen, setBoundsOpen] = useState(false);
  const placingLock = useRef(0);
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    setUnits(initialUnits);
  }, [initialUnits, setUnits]);

  useEffect(() => {
    setShopBoundsLocal(initialShopBounds);
  }, [initialShopBounds, setShopBoundsLocal]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const unitTypeById = useMemo(() => {
    const m = new Map<string, UnitTypeSummary>();
    for (const u of unitTypes) m.set(u.id, u);
    return m;
  }, [unitTypes]);

  const onDrop = useCallback(
    async ({
      unitTypeId,
      xMm,
      yMm,
    }: {
      unitTypeId: string;
      xMm: number;
      yMm: number;
    }) => {
      if (!canEdit) {
        setToast({ kind: 'error', message: 'You can’t edit this planogram.' });
        return;
      }
      const type = unitTypeById.get(unitTypeId);
      if (!type) return;

      const tempId = `pending-${++placingLock.current}-${Date.now()}`;
      const store = useConfigurator.getState();
      const sameType = store.units.filter((u) => u.unit_type_id === type.id).length + 1;
      const base = type.display_name.split(' ').slice(0, 2).join(' ');
      const defaultLabel = `${base} ${sameType}`;

      addPending({
        tempId,
        unit_type: type,
        floor_x: xMm,
        floor_y: yMm,
        rotation_degrees: 0,
        label: defaultLabel,
        promo_section_id: null,
      });

      const res = await placeSiteUnit({
        siteId,
        unitTypeId,
        label: defaultLabel,
        floor_x: xMm,
        floor_y: yMm,
        rotation_degrees: 0,
        promo_section_id: null,
      });

      if (res.ok) {
        upgradePending(tempId, res.data);
      } else {
        removePending(tempId);
        setToast({ kind: 'error', message: res.message });
      }
    },
    [canEdit, siteId, unitTypeById, addPending, upgradePending, removePending]
  );

  const onMove = useCallback(
    async ({
      id,
      xMm,
      yMm,
    }: {
      id: string;
      xMm: number;
      yMm: number;
    }) => {
      updateUnit(id, { floor_x: xMm, floor_y: yMm });
      const res = await updateSiteUnit({
        siteId,
        unitId: id,
        floor_x: xMm,
        floor_y: yMm,
      });
      if (!res.ok) {
        setToast({ kind: 'error', message: res.message });
      }
    },
    [siteId, updateUnit]
  );

  const onInspectorUpdate = useCallback(
    async (args: {
      id: string;
      label?: string;
      rotation_degrees?: Rotation;
      promo_section_id?: string | null;
    }) => {
      const { id, ...rest } = args;
      const res = await updateSiteUnit({ siteId, unitId: id, ...rest });
      if (!res.ok) setToast({ kind: 'error', message: res.message });
    },
    [siteId]
  );

  const onInspectorDelete = useCallback(
    async (id: string) => {
      removeUnitLocal(id);
      const res = await deleteSiteUnit({ siteId, unitId: id });
      if (res.ok) {
        setToast({ kind: 'success', message: 'Unit removed.' });
      } else {
        setToast({ kind: 'error', message: res.message });
      }
    },
    [siteId, removeUnitLocal]
  );

  const onAddShelf = useCallback(
    async (unitId: string) => {
      const u = useConfigurator
        .getState()
        .units.find((x) => x.id === unitId);
      if (!u) return;
      const existing = u.shelves ?? [];
      const maxOrder = existing.reduce(
        (acc, s) => Math.max(acc, s.shelf_order),
        0
      );
      const previous = existing[existing.length - 1];
      const payload = {
        siteId,
        siteUnitId: unitId,
        shelfOrder: maxOrder + 1,
        clearanceMm: previous?.clearance_mm ?? 250,
        depthMm: previous?.depth_mm ?? null,
        isBaseShelf: false,
      };
      const res = await addShelfAction(payload);
      if (!res.ok) {
        setToast({ kind: 'error', message: res.message });
        return;
      }
      router.refresh();
    },
    [siteId, router]
  );

  const onUpdateShelf = useCallback(
    async (
      unitId: string,
      shelfId: string,
      patch: {
        clearanceMm?: number;
        depthMm?: number | null;
        promoSectionId?: string | null;
      }
    ) => {
      // Optimistic local update so the field reflects the change instantly.
      const storePatch: Parameters<typeof updateShelfLocal>[2] = {};
      if (patch.clearanceMm !== undefined)
        storePatch.clearance_mm = patch.clearanceMm;
      if (patch.depthMm !== undefined) storePatch.depth_mm = patch.depthMm;
      if (patch.promoSectionId !== undefined)
        storePatch.promo_section_id = patch.promoSectionId;
      updateShelfLocal(unitId, shelfId, storePatch);

      const res = await updateShelfAction({
        siteId,
        shelfId,
        ...patch,
      });
      if (!res.ok) setToast({ kind: 'error', message: res.message });
    },
    [siteId, updateShelfLocal]
  );

  const onDeleteShelf = useCallback(
    async (unitId: string, shelfId: string) => {
      removeShelfLocal(unitId, shelfId);
      const res = await deleteShelfAction({ siteId, shelfId });
      if (!res.ok) {
        setToast({ kind: 'error', message: res.message });
      }
    },
    [siteId, removeShelfLocal]
  );

  const onRequestQuote = useCallback(async () => {
    if (!canEdit || requesting) return;
    setRequesting(true);
    const res = await requestFittingQuote({ siteId });
    setRequesting(false);
    if (res.ok) {
      setToast({
        kind: 'success',
        message: `Draft quote ${res.quoteRef} created.`,
      });
      router.push(`/sites/${siteId}/quotes/${res.quoteRef}`);
    } else {
      setToast({ kind: 'error', message: res.message });
    }
  }, [canEdit, requesting, siteId, router]);

  async function handleSaveBounds(bounds: ShopBounds) {
    const res = await setShopBounds({
      siteId,
      widthMm: bounds.widthMm,
      heightMm: bounds.heightMm,
    });
    if (!res.ok) {
      setToast({ kind: 'error', message: res.message });
      throw new Error(res.message);
    }
    setShopBoundsLocal(bounds);
  }

  async function handleClearBounds() {
    const res = await clearShopBounds({ siteId });
    if (!res.ok) {
      setToast({ kind: 'error', message: res.message });
      throw new Error(res.message);
    }
    setShopBoundsLocal(null);
  }

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
            href={`/sites/${siteId}`}
            style={{
              fontSize: 12,
              color: 'var(--ml-text-muted)',
              textDecoration: 'none',
              letterSpacing: '0.02em',
            }}
          >
            ← Back to site
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
            Planogram · {siteName}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ml-text-muted)' }}>
            Drag units from the left. Snap grid: 100mm.{' '}
            {shopBounds
              ? `Shop floor ${(shopBounds.widthMm / 1000).toFixed(1)} × ${(
                  shopBounds.heightMm / 1000
                ).toFixed(1)}m.`
              : 'No shop bounds set.'}
            {canEdit ? '' : ' Read-only for your role.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link
            href={`/sites/${siteId}/quotes`}
            style={{
              height: 36,
              padding: '0 14px',
              display: 'inline-flex',
              alignItems: 'center',
              background: 'transparent',
              color: 'var(--ml-charcoal)',
              border: '1px solid var(--ml-charcoal)',
              borderRadius: 'var(--ml-radius-md)',
              fontSize: 12,
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Quotes
          </Link>
          {canEdit && (
            <button
              type="button"
              onClick={onRequestQuote}
              disabled={requesting}
              style={{
                height: 36,
                padding: '0 18px',
                background: 'var(--ml-action-primary)',
                color: '#FFFFFF',
                border: 0,
                borderRadius: 'var(--ml-radius-md)',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.01em',
                cursor: requesting ? 'wait' : 'pointer',
                opacity: requesting ? 0.7 : 1,
              }}
            >
              {requesting ? 'Creating draft…' : 'Request fit-out quote'}
            </button>
          )}
        </div>
      </header>

      <StageToolbar
        canEdit={canEdit}
        shopBounds={shopBounds}
        onEditBounds={() => setBoundsOpen(true)}
      />

      <div
        style={{
          display: 'flex',
          gap: 12,
          flex: 1,
          minHeight: 0,
        }}
      >
        {canEdit && <UnitLibraryRail units={unitTypes} />}
        <FloorPlanStage
          promoSections={promoSections}
          onDropUnit={onDrop}
          onMove={onMove}
          shopBounds={shopBounds}
        />
        <UnitInspector
          siteId={siteId}
          promoSections={promoSections}
          canEdit={canEdit}
          onUpdate={onInspectorUpdate}
          onDelete={onInspectorDelete}
          onAddShelf={onAddShelf}
          onUpdateShelf={onUpdateShelf}
          onDeleteShelf={onDeleteShelf}
        />
      </div>

      <ShopBoundsDialog
        open={boundsOpen}
        initialBounds={shopBounds}
        onClose={() => setBoundsOpen(false)}
        onSave={handleSaveBounds}
        onClear={handleClearBounds}
      />

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
            letterSpacing: '0.01em',
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
