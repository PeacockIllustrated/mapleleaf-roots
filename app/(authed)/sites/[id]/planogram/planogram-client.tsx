'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  placeSiteUnit,
  updateSiteUnit,
  deleteSiteUnit,
} from '@/lib/configurator/actions';
import { useConfigurator } from '@/lib/configurator/store';
import type {
  PlacedUnit,
  PromoSectionSummary,
  Rotation,
  UnitTypeSummary,
} from '@/lib/configurator/types';
import { UnitLibraryRail } from '@/components/configurator/UnitLibraryRail';
import { UnitInspector } from '@/components/configurator/UnitInspector';

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
  canEdit: boolean;
}

type Toast = { kind: 'success' | 'error'; message: string } | null;

export function PlanogramClient({
  siteId,
  siteName,
  unitTypes,
  promoSections,
  initialUnits,
  canEdit,
}: Props) {
  const setUnits = useConfigurator((s) => s.setUnits);
  const addPending = useConfigurator((s) => s.addPending);
  const upgradePending = useConfigurator((s) => s.upgradePending);
  const removePending = useConfigurator((s) => s.removePending);
  const updateUnit = useConfigurator((s) => s.updateUnit);
  const removeUnitLocal = useConfigurator((s) => s.removeUnit);

  const [toast, setToast] = useState<Toast>(null);
  const placingLock = useRef(0);

  useEffect(() => {
    setUnits(initialUnits);
  }, [initialUnits, setUnits]);

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
      const defaultLabel = autoLabel(type);

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
      const res = await updateSiteUnit({
        siteId,
        unitId: id,
        ...rest,
      });
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

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        height: 'calc(100vh - 140px)',
        minHeight: 560,
      }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
          Drag units from the left onto the floor plan. Snap grid: 100mm.
          {canEdit ? '' : ' Read-only for your role.'}
        </p>
      </header>

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
          sitePlanogramId={siteId}
          promoSections={promoSections}
          onDropUnit={onDrop}
          onMove={onMove}
        />
        <UnitInspector
          promoSections={promoSections}
          onUpdate={onInspectorUpdate}
          onDelete={onInspectorDelete}
        />
      </div>

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
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

/**
 * Generate a sensible auto-label based on the unit type and existing count.
 * Users rename immediately via the inspector.
 */
function autoLabel(t: UnitTypeSummary): string {
  const store = useConfigurator.getState();
  const sameType = store.units.filter((u) => u.unit_type_id === t.id).length + 1;
  const base = t.display_name.split(' ').slice(0, 2).join(' ');
  return `${base} ${sameType}`;
}
