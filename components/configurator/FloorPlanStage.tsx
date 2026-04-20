'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, FastLayer, Rect, Line, Group, Text } from 'react-konva';
import Konva from 'konva';
import { useConfigurator } from '@/lib/configurator/store';
import type {
  PlacedUnit,
  PromoSectionSummary,
  Rotation,
} from '@/lib/configurator/types';
import {
  DEFAULT_PX_PER_MM,
  SNAP_MM,
  STAGE_HEIGHT_MM,
  STAGE_WIDTH_MM,
} from '@/lib/configurator/types';
import { brandColors } from '@/lib/tokens/brand';

// Konva renders to canvas and can't read CSS custom properties, so we
// reference the raw hex values from the brand tokens file.
const PALETTE = {
  red: brandColors.red,
  charcoal: brandColors.charcoal,
  lightGrey: brandColors.lightGrey,
  offWhite: brandColors.offWhite,
  white: brandColors.white,
  gridMinor: 'rgba(65, 64, 66, 0.04)',
  gridMajor: 'rgba(65, 64, 66, 0.10)',
  boundsFill: '#FFFFFF',
  beyondBoundsFill: '#EDECE7',
} as const;

interface Props {
  promoSections: PromoSectionSummary[];
  onDropUnit: (args: { unitTypeId: string; xMm: number; yMm: number }) => void;
  onMove: (args: { id: string; xMm: number; yMm: number }) => void;
  shopBounds?: { widthMm: number; heightMm: number } | null;
}

function rotatedFootprint(
  wMm: number,
  dMm: number,
  rot: Rotation
): { w: number; h: number } {
  const turned = rot === 90 || rot === 270;
  return turned ? { w: dMm, h: wMm } : { w: wMm, h: dMm };
}

function snap(mm: number): number {
  return Math.round(mm / SNAP_MM) * SNAP_MM;
}

/**
 * FloorPlanStage — Konva canvas for the configurator.
 *
 * Perf notes:
 *   - Grid + background + shop-bounds mask live in a FastLayer (no events,
 *     no hit-testing). This pins those many-child shapes to the fastest
 *     Konva render path.
 *   - Unit shapes live in a regular Layer but each shape is memoised so a
 *     state change that doesn't affect it won't re-render its Konva nodes.
 *   - Grid lines are only recomputed when the zoom factor changes.
 *   - Pointer move doesn't enter React — Konva handles drag natively; we
 *     only commit to Zustand on dragEnd after snapping.
 */
export default function FloorPlanStage({
  promoSections,
  onDropUnit,
  onMove,
  shopBounds,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);

  const units = useConfigurator((s) => s.units);
  const pending = useConfigurator((s) => s.pending);
  const selectedId = useConfigurator((s) => s.selectedId);
  const zoom = useConfigurator((s) => s.zoom);
  const setZoom = useConfigurator((s) => s.setZoom);
  const select = useConfigurator((s) => s.select);

  const [cursorMm, setCursorMm] = useState<{ x: number; y: number } | null>(
    null
  );

  const pxPerMm = DEFAULT_PX_PER_MM * zoom;
  const stageWidthPx = STAGE_WIDTH_MM * pxPerMm;
  const stageHeightPx = STAGE_HEIGHT_MM * pxPerMm;

  // HTML5 drag-and-drop + wheel-zoom bridge on the scroll wrapper.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    function onDragOver(e: DragEvent) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    }

    function onDrop(e: DragEvent) {
      e.preventDefault();
      const unitTypeId = e.dataTransfer?.getData('application/x-unit-type-id');
      if (!unitTypeId || !wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const scrollLeft = wrapperRef.current.scrollLeft;
      const scrollTop = wrapperRef.current.scrollTop;
      const clientX = e.clientX - rect.left + scrollLeft;
      const clientY = e.clientY - rect.top + scrollTop;
      const xMm = snap(clientX / pxPerMm);
      const yMm = snap(clientY / pxPerMm);
      onDropUnit({ unitTypeId, xMm, yMm });
    }

    function onWheel(e: WheelEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      const next = Math.max(0.25, Math.min(2, zoom + delta));
      setZoom(next);
    }

    el.addEventListener('dragover', onDragOver);
    el.addEventListener('drop', onDrop);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('drop', onDrop);
      el.removeEventListener('wheel', onWheel);
    };
  }, [pxPerMm, onDropUnit, zoom, setZoom]);

  // Pointer tracking for the status chip.
  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left + wrapperRef.current.scrollLeft) / pxPerMm;
    const y = (e.clientY - rect.top + wrapperRef.current.scrollTop) / pxPerMm;
    setCursorMm({ x: Math.round(x), y: Math.round(y) });
  }

  // Grid lines — memoised by zoom. Minor every 100mm, major every 500mm.
  const gridLines = useMemo(() => {
    const lines: React.ReactElement[] = [];
    const minor = SNAP_MM;
    const major = SNAP_MM * 5;
    for (let x = 0; x <= STAGE_WIDTH_MM; x += minor) {
      const isMajor = x % major === 0;
      lines.push(
        <Line
          key={`v-${x}`}
          points={[x * pxPerMm, 0, x * pxPerMm, stageHeightPx]}
          stroke={isMajor ? PALETTE.gridMajor : PALETTE.gridMinor}
          strokeWidth={1}
          listening={false}
        />
      );
    }
    for (let y = 0; y <= STAGE_HEIGHT_MM; y += minor) {
      const isMajor = y % major === 0;
      lines.push(
        <Line
          key={`h-${y}`}
          points={[0, y * pxPerMm, stageWidthPx, y * pxPerMm]}
          stroke={isMajor ? PALETTE.gridMajor : PALETTE.gridMinor}
          strokeWidth={1}
          listening={false}
        />
      );
    }
    return lines;
  }, [pxPerMm, stageHeightPx, stageWidthPx]);

  const promoColour = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of promoSections) map.set(p.id, p.hex_colour);
    return (id: string | null): string =>
      (id && map.get(id)) || PALETTE.lightGrey;
  }, [promoSections]);

  return (
    <div
      ref={wrapperRef}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setCursorMm(null)}
      style={{
        position: 'relative',
        flex: 1,
        overflow: 'auto',
        background: PALETTE.beyondBoundsFill,
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-lg)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) select(null);
      }}
    >
      <Stage
        ref={stageRef}
        width={stageWidthPx}
        height={stageHeightPx}
        onClick={(e) => {
          if (e.target === e.target.getStage()) select(null);
        }}
      >
        <FastLayer>
          <Rect
            x={0}
            y={0}
            width={stageWidthPx}
            height={stageHeightPx}
            fill={PALETTE.beyondBoundsFill}
          />
          {shopBounds && (
            <Rect
              x={0}
              y={0}
              width={shopBounds.widthMm * pxPerMm}
              height={shopBounds.heightMm * pxPerMm}
              fill={PALETTE.boundsFill}
            />
          )}
          {gridLines}
          {shopBounds && (
            <Rect
              x={0}
              y={0}
              width={shopBounds.widthMm * pxPerMm}
              height={shopBounds.heightMm * pxPerMm}
              stroke={PALETTE.charcoal}
              strokeWidth={1.5}
              dash={[12, 6]}
              listening={false}
            />
          )}
        </FastLayer>

        <Layer>
          {units.map((u) => (
            <MemoUnitShape
              key={u.id}
              unit={u}
              selected={selectedId === u.id}
              pxPerMm={pxPerMm}
              fill={promoColour(u.promo_section_id)}
              onSelect={select}
              onMoveEnd={onMove}
            />
          ))}
          {pending.map((p) => {
            const { w, h } = rotatedFootprint(
              p.unit_type.width_mm,
              p.unit_type.depth_mm,
              p.rotation_degrees
            );
            return (
              <Group
                key={p.tempId}
                x={p.floor_x * pxPerMm}
                y={p.floor_y * pxPerMm}
                opacity={0.55}
                listening={false}
              >
                <Rect
                  width={w * pxPerMm}
                  height={h * pxPerMm}
                  fill={PALETTE.lightGrey}
                  stroke={PALETTE.charcoal}
                  strokeWidth={1}
                  dash={[6, 4]}
                  cornerRadius={2}
                />
                <Text
                  text={`Placing ${p.unit_type.display_name}…`}
                  x={6}
                  y={6}
                  fontSize={10}
                  fill={PALETTE.charcoal}
                  fontStyle="italic"
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>

      {cursorMm && (
        <div
          style={{
            position: 'sticky',
            left: 10,
            bottom: 10,
            display: 'inline-flex',
            padding: '4px 10px',
            background: 'rgba(65, 64, 66, 0.78)',
            color: '#FFFFFF',
            fontSize: 11,
            fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
            borderRadius: 9999,
            marginLeft: 10,
            marginTop: `-${32}px`,
            alignItems: 'center',
            width: 'fit-content',
            pointerEvents: 'none',
          }}
        >
          {cursorMm.x} × {cursorMm.y} mm
        </div>
      )}
    </div>
  );
}

interface UnitShapeProps {
  unit: PlacedUnit;
  selected: boolean;
  pxPerMm: number;
  fill: string;
  onSelect: (id: string) => void;
  onMoveEnd: (args: { id: string; xMm: number; yMm: number }) => void;
}

function UnitShape({
  unit,
  selected,
  pxPerMm,
  fill,
  onSelect,
  onMoveEnd,
}: UnitShapeProps) {
  const { w, h } = rotatedFootprint(
    unit.unit_type.width_mm,
    unit.unit_type.depth_mm,
    unit.rotation_degrees
  );
  const widthPx = w * pxPerMm;
  const heightPx = h * pxPerMm;

  return (
    <Group
      x={unit.floor_x * pxPerMm}
      y={unit.floor_y * pxPerMm}
      draggable
      onClick={() => onSelect(unit.id)}
      onTap={() => onSelect(unit.id)}
      onDragEnd={(e) => {
        const xMm = snap(e.target.x() / pxPerMm);
        const yMm = snap(e.target.y() / pxPerMm);
        e.target.position({ x: xMm * pxPerMm, y: yMm * pxPerMm });
        onMoveEnd({ id: unit.id, xMm, yMm });
      }}
    >
      <Rect
        width={widthPx}
        height={heightPx}
        fill={fill}
        stroke={selected ? PALETTE.red : PALETTE.charcoal}
        strokeWidth={selected ? 2 : 1}
        cornerRadius={2}
      />
      <Text
        text={unit.label}
        x={6}
        y={6}
        width={widthPx - 12}
        fontSize={Math.max(9, Math.min(12, widthPx / 10))}
        fontStyle="500"
        fontFamily="Poppins, system-ui, sans-serif"
        fill={PALETTE.charcoal}
        ellipsis
        wrap="none"
      />
    </Group>
  );
}

const MemoUnitShape = memo(UnitShape, (a, b) => {
  return (
    a.selected === b.selected &&
    a.pxPerMm === b.pxPerMm &&
    a.fill === b.fill &&
    a.onSelect === b.onSelect &&
    a.onMoveEnd === b.onMoveEnd &&
    a.unit.id === b.unit.id &&
    a.unit.floor_x === b.unit.floor_x &&
    a.unit.floor_y === b.unit.floor_y &&
    a.unit.rotation_degrees === b.unit.rotation_degrees &&
    a.unit.label === b.unit.label &&
    a.unit.promo_section_id === b.unit.promo_section_id &&
    a.unit.unit_type.width_mm === b.unit.unit_type.width_mm &&
    a.unit.unit_type.depth_mm === b.unit.unit_type.depth_mm
  );
});
