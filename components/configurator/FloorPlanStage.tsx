'use client';

import { useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Line, Group, Text } from 'react-konva';
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

// Konva renders to canvas and cannot read CSS custom properties, so we
// reference the raw hex values from the brand tokens file.
const PALETTE = {
  red: brandColors.red,
  charcoal: brandColors.charcoal,
  lightGrey: brandColors.lightGrey,
  offWhite: brandColors.offWhite,
  white: brandColors.white,
  gridLine: 'rgba(65, 64, 66, 0.06)',
} as const;

interface Props {
  sitePlanogramId: string;
  promoSections: PromoSectionSummary[];
  onDropUnit: (args: { unitTypeId: string; xMm: number; yMm: number }) => void;
  onMove: (args: {
    id: string;
    xMm: number;
    yMm: number;
  }) => void;
}

/** Rendered footprint in mm for a given rotation. */
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
 * Renders a 100mm grid, placed units, optimistic pending units, and a
 * selection halo. Parent owns HTML5 drop handling; this component only
 * emits callbacks with mm-space coordinates.
 */
export default function FloorPlanStage({
  promoSections,
  onDropUnit,
  onMove,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);

  const units = useConfigurator((s) => s.units);
  const pending = useConfigurator((s) => s.pending);
  const selectedId = useConfigurator((s) => s.selectedId);
  const zoom = useConfigurator((s) => s.zoom);
  const select = useConfigurator((s) => s.select);

  const pxPerMm = DEFAULT_PX_PER_MM * zoom;
  const stageWidthPx = STAGE_WIDTH_MM * pxPerMm;
  const stageHeightPx = STAGE_HEIGHT_MM * pxPerMm;

  // Bridge HTML5 drag-and-drop → Konva coordinates.
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

    el.addEventListener('dragover', onDragOver);
    el.addEventListener('drop', onDrop);
    return () => {
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('drop', onDrop);
    };
  }, [pxPerMm, onDropUnit]);

  const colourFor = (id: string | null): string => {
    if (!id) return PALETTE.lightGrey;
    const found = promoSections.find((p) => p.id === id);
    return found ? found.hex_colour : PALETTE.lightGrey;
  };

  // Grid lines at SNAP_MM intervals, subtle.
  const gridLines: React.ReactElement[] = [];
  for (let x = 0; x <= STAGE_WIDTH_MM; x += SNAP_MM * 5) {
    gridLines.push(
      <Line
        key={`v-${x}`}
        points={[x * pxPerMm, 0, x * pxPerMm, stageHeightPx]}
        stroke="rgba(65, 64, 66, 0.06)"
        strokeWidth={1}
      />
    );
  }
  for (let y = 0; y <= STAGE_HEIGHT_MM; y += SNAP_MM * 5) {
    gridLines.push(
      <Line
        key={`h-${y}`}
        points={[0, y * pxPerMm, stageWidthPx, y * pxPerMm]}
        stroke="rgba(65, 64, 66, 0.06)"
        strokeWidth={1}
      />
    );
  }

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'relative',
        flex: 1,
        overflow: 'auto',
        background: 'var(--ml-off-white)',
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-lg)',
      }}
      onClick={(e) => {
        // click on empty background → deselect
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
        <Layer listening={false}>
          <Rect
            x={0}
            y={0}
            width={stageWidthPx}
            height={stageHeightPx}
            fill="#FFFFFF"
          />
          {gridLines}
        </Layer>

        <Layer>
          {units.map((u) => (
            <UnitShape
              key={u.id}
              unit={u}
              selected={selectedId === u.id}
              pxPerMm={pxPerMm}
              fill={colourFor(u.promo_section_id)}
              onSelect={() => select(u.id)}
              onMoveEnd={(x, y) => onMove({ id: u.id, xMm: x, yMm: y })}
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
                opacity={0.6}
                listening={false}
              >
                <Rect
                  width={w * pxPerMm}
                  height={h * pxPerMm}
                  fill="var(--ml-light-grey)"
                  stroke="var(--ml-charcoal)"
                  strokeWidth={1}
                  dash={[6, 4]}
                  cornerRadius={2}
                />
                <Text
                  text={`Placing ${p.unit_type.display_name}…`}
                  x={4}
                  y={4}
                  fontSize={10}
                  fill="var(--ml-charcoal)"
                  fontStyle="italic"
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}

interface UnitShapeProps {
  unit: PlacedUnit;
  selected: boolean;
  pxPerMm: number;
  fill: string;
  onSelect: () => void;
  onMoveEnd: (xMm: number, yMm: number) => void;
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
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        const xMm = snap(e.target.x() / pxPerMm);
        const yMm = snap(e.target.y() / pxPerMm);
        e.target.position({ x: xMm * pxPerMm, y: yMm * pxPerMm });
        onMoveEnd(xMm, yMm);
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
        fill="var(--ml-charcoal)"
        ellipsis
        wrap="none"
      />
    </Group>
  );
}
