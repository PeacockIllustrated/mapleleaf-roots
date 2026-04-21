'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PromoSectionSummary } from '@/lib/configurator/types';
import type {
  ShelfRow,
  ShelfSlot,
  UnitPosSlot,
  UnitWithShelves,
} from '@/lib/shelf/types';
import { displayShelfLabel } from '@/lib/shelf/types';

interface Props {
  unit: UnitWithShelves;
  promoSections: PromoSectionSummary[];
  canEdit: boolean;
  selectedSlotId: string | null;
  totalSlotWidthByShelf: Map<string, number>;
  /** Ids of POS positions the user has flagged for redelivery in this session. */
  pendingFlagIds: Set<string>;
  /** Ids of POS positions that already have an artwork assignment. */
  artworkSetIds: Set<string>;
  onSelectSlot: (slotId: string | null) => void;
  onAddSlot: (shelfId: string) => void;
  onTogglePosFlag: (posSlotId: string, label: string) => void;
  onSetPosArtwork: (posSlotId: string) => void;
}

type ViewBox = { x: number; y: number; w: number; h: number };

function fmtViewBox(v: ViewBox): string {
  return `${v.x} ${v.y} ${v.w} ${v.h}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Quick-start, gentle-landing curve — feels responsive on click. */
function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

const TOP_RAIL_MM = 40; // thin internal title rail (unit label + type)
const PLINTH_MM = 100; // base plinth (internal)
const SHELF_THICKNESS_MM = 14;
const SHELF_EDGE_MM = 40; // front price-strip zone below each slot row
const GUTTER_MM = 90; // left-of-unit for shelf numbers; right-of-unit for budget pill
const POS_ARM_MM = 80; // vertical arms between unit top and external POS poster
const POS_MARGIN_MM = 30; // breathing space above the external POS
const POS_FALLBACK_W_MM = 1000;
const POS_FALLBACK_H_MM = 250;

/**
 * ShelfCanvas — elevation view of a single unit.
 *
 * Vertical anatomy (top → bottom):
 *
 *   ┌─ EXTERNAL POS poster (on arms, above the unit) ────┐
 *   │                                                    │
 *   ├─ arms ─────────────────────────────────────────────┤
 *   ┌─ Top rail (unit label + type) ─────────────────────┐
 *   │   Shelf N slot zone (products on shelf N)          │
 *   │   Shelf N edge strip (price strip + promo)         │
 *   │   Shelf N plate (charcoal band)                    │
 *   │   … repeat for each shelf …                        │
 *   ├────────────────────────────────────────────────────┤
 *   │   Base plinth                                      │
 *   └────────────────────────────────────────────────────┘
 *
 * The unit type's POS header slots (HEADER_BOARD_* etc) hang on arms
 * above the unit, outside the carcass height — that matches how they're
 * fitted in-store and frees every mm of the unit's internal height for
 * products. Each shelf's edge strip is tinted by its promo section,
 * giving somewhere for price cards and wobbler design to live visually
 * without cluttering the product zone.
 */
export function ShelfCanvas({
  unit,
  promoSections,
  canEdit,
  selectedSlotId,
  totalSlotWidthByShelf,
  pendingFlagIds,
  artworkSetIds,
  onSelectSlot,
  onAddSlot,
  onTogglePosFlag,
  onSetPosArtwork,
}: Props) {
  const promoById = useMemo(() => {
    const m = new Map<string, PromoSectionSummary>();
    for (const p of promoSections) m.set(p.id, p);
    return m;
  }, [promoSections]);

  const layout = useMemo(() => {
    let cursor = TOP_RAIL_MM;
    const rows = unit.shelves.map((s) => {
      const zoneTopY = cursor;
      const zoneBottomY = cursor + s.clearance_mm;
      const edgeTopY = zoneBottomY - SHELF_EDGE_MM;
      const plateTopY = zoneBottomY;
      const plateBottomY = plateTopY + SHELF_THICKNESS_MM;
      cursor = plateBottomY;
      return {
        shelf: s,
        zoneTopY,
        zoneBottomY,
        edgeTopY,
        plateTopY,
        plateBottomY,
      };
    });
    const totalUsedMm = cursor + PLINTH_MM;
    return { rows, totalUsedMm };
  }, [unit.shelves]);

  // The unit's physical height is fixed. We use unit.height_mm directly
  // even if the sum of clearances briefly overflows (caller hands off
  // redistribution to resizeShelfClearance, so this is rare).
  const unitHeight = unit.height_mm;

  const headerPosSlots = useMemo(
    () =>
      unit.pos_slots.filter(
        (p) =>
          /header/i.test(p.pos_slot_type.code) ||
          /topper/i.test(p.pos_slot_type.code) ||
          /crown/i.test(p.pos_slot_type.code)
      ),
    [unit.pos_slots]
  );

  const unitPromo =
    (unit.promo_section_id && promoById.get(unit.promo_section_id)) || null;

  // External POS poster sizing — the physical poster goes above the unit,
  // hanging on arms from the carcass. We fit its real dimensions into a
  // sensible on-screen rectangle centred above the unit.
  const headerSlot = headerPosSlots[0] ?? null;
  const posNativeW = headerSlot?.pos_slot_type.width_mm ?? POS_FALLBACK_W_MM;
  const posNativeH = headerSlot?.pos_slot_type.height_mm ?? POS_FALLBACK_H_MM;
  const posMaxW = Math.min(posNativeW, unit.width_mm * 0.9);
  const posScale = posMaxW / posNativeW;
  const posPaperW = posNativeW * posScale;
  const posPaperH = posNativeH * posScale;
  const posPaperX = (unit.width_mm - posPaperW) / 2;
  const posPaperY = -(POS_ARM_MM + posPaperH);
  const viewboxTopY = posPaperY - POS_MARGIN_MM;

  // --- Railed zoom/pan -----------------------------------------------------
  // Overview shows the whole unit + the external POS. Focusing a shelf
  // animates the SVG viewBox to frame just that shelf (external POS drops
  // out of view). Arrow keys cycle shelves while focused; Esc / overview
  // button exits.

  const overviewViewBox: ViewBox = useMemo(
    () => ({
      x: -GUTTER_MM,
      y: viewboxTopY,
      w: unit.width_mm + GUTTER_MM * 2,
      h: unitHeight - viewboxTopY + 40,
    }),
    [unit.width_mm, unitHeight, viewboxTopY]
  );

  const shelfViewBoxFor = useCallback(
    (index: number): ViewBox | null => {
      const row = layout.rows[index];
      if (!row) return null;
      const { zoneTopY, plateBottomY } = row;
      // The shelf itself spans zoneTopY → plateBottomY. We pad the viewBox
      // generously above and below so the shelf sits squarely in the middle
      // of its frame rather than squashed against the top (the SVG uses
      // xMidYMid meet, so any extra viewBox height reads as centred padding).
      const shelfHeight = plateBottomY - zoneTopY;
      const padding = Math.max(60, shelfHeight * 0.55);
      return {
        x: -GUTTER_MM / 2,
        y: zoneTopY - padding,
        w: unit.width_mm + GUTTER_MM,
        h: shelfHeight + padding * 2,
      };
    },
    [layout.rows, unit.width_mm]
  );

  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [viewBox, setViewBox] = useState<ViewBox>(overviewViewBox);
  const animRef = useRef<number | null>(null);

  // When the unit's intrinsic overview box changes (e.g. shelf count edit),
  // make sure an unfocused canvas reflects the new overview.
  useEffect(() => {
    if (focusedIndex === null) setViewBox(overviewViewBox);
  }, [overviewViewBox, focusedIndex]);

  useEffect(() => {
    const target =
      focusedIndex === null
        ? overviewViewBox
        : shelfViewBoxFor(focusedIndex) ?? overviewViewBox;
    const from = viewBox;
    // Overview <-> shelf gets a longer, gentler curve; shelf <-> shelf
    // hops are shorter so wheel nav feels responsive.
    const isHop =
      focusedIndex !== null &&
      from.w === target.w &&
      from.h === target.h;
    const duration = isHop ? 260 : 420;
    const ease = isHop ? easeOutQuint : easeInOut;
    const start = performance.now();
    if (animRef.current !== null) cancelAnimationFrame(animRef.current);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = ease(t);
      setViewBox({
        x: lerp(from.x, target.x, e),
        y: lerp(from.y, target.y, e),
        w: lerp(from.w, target.w, e),
        h: lerp(from.h, target.h, e),
      });
      if (t < 1) animRef.current = requestAnimationFrame(tick);
      else animRef.current = null;
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedIndex, overviewViewBox, shelfViewBoxFor]);

  // Keyboard: Esc to overview, Up/Down to cycle shelves when focused.
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Only intercept when the canvas container has focus or hover.
      const target = containerRef.current;
      if (!target) return;
      if (
        !target.contains(document.activeElement as Node) &&
        !target.matches(':hover')
      )
        return;

      if (e.key === 'Escape' && focusedIndex !== null) {
        e.preventDefault();
        setFocusedIndex(null);
      } else if (focusedIndex !== null && e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((i) => (i === null || i === 0 ? i : i - 1));
      } else if (focusedIndex !== null && e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((i) => {
          if (i === null) return null;
          return i < unit.shelves.length - 1 ? i + 1 : i;
        });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusedIndex, unit.shelves.length]);

  // Mouse-wheel shelf navigation — only while a shelf is focused. Throttled
  // so a trackpad flick doesn't skip past the end. Wheel up → shelf above
  // (lower index in data-order, a physically higher shelf on screen).
  const wheelLockRef = useRef<number>(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (focusedIndex === null) return;
      if (Math.abs(e.deltaY) < 4) return;
      e.preventDefault();
      const now = performance.now();
      if (now - wheelLockRef.current < 280) return;
      wheelLockRef.current = now;
      const dir = e.deltaY > 0 ? 1 : -1;
      setFocusedIndex((i) => {
        if (i === null) return null;
        const next = i + dir;
        if (next < 0 || next > unit.shelves.length - 1) return i;
        return next;
      });
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [focusedIndex, unit.shelves.length]);

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: 'var(--ml-off-white)',
        border: '0.5px solid var(--ml-border-default)',
        borderRadius: 'var(--ml-radius-lg)',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        overflow: 'hidden',
        position: 'relative',
      }}
      ref={containerRef}
      tabIndex={0}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelectSlot(null);
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ml-text-muted)',
          }}
        >
          Elevation — customer view
        </span>
        <span
          style={{
            fontSize: 11,
            fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
            color: 'var(--ml-text-muted)',
          }}
        >
          {unit.width_mm} × {unit.height_mm} mm
        </span>
      </div>

      <svg
        viewBox={fmtViewBox(viewBox)}
        preserveAspectRatio="xMidYMid meet"
        onClick={() => onSelectSlot(null)}
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: '100%',
          background: '#F5F2EE',
          borderRadius: 8,
        }}
      >
        {/* Ambient floor — softer than the frame so the unit pops */}
        <rect
          x={-GUTTER_MM}
          y={unitHeight + 8}
          width={unit.width_mm + GUTTER_MM * 2}
          height={24}
          fill="rgba(65, 64, 66, 0.06)"
        />

        {/* External POS header — hangs above the unit on arms, outside the
            unit's physical height. */}
        <ExternalPosHeader
          unitWidthMm={unit.width_mm}
          paperX={posPaperX}
          paperY={posPaperY}
          paperW={posPaperW}
          paperH={posPaperH}
          headerSlot={headerSlot}
          promo={unitPromo}
          flagged={!!headerSlot && pendingFlagIds.has(headerSlot.id)}
          artworkSet={!!headerSlot && artworkSetIds.has(headerSlot.id)}
          canEdit={canEdit}
          onToggleFlag={onTogglePosFlag}
          onSetArtwork={onSetPosArtwork}
        />

        {/* Unit frame */}
        <rect
          x={0}
          y={0}
          width={unit.width_mm}
          height={unitHeight}
          fill="#FFFFFF"
          stroke="#414042"
          strokeWidth={3}
          rx={4}
          ry={4}
        />

        {/* Top rail — thin internal title band just inside the frame. */}
        <TopRail
          widthMm={unit.width_mm}
          unitLabel={unit.label}
          unitTypeName={unit.unit_type_name}
        />

        {layout.rows.map(
          ({ shelf, zoneTopY, zoneBottomY, edgeTopY, plateTopY, plateBottomY }) => {
            const usedMm = totalSlotWidthByShelf.get(shelf.id) ?? 0;
            const remaining = Math.max(0, unit.width_mm - usedMm);
            const shelfPromo =
              (shelf.promo_section_id && promoById.get(shelf.promo_section_id)) ||
              unitPromo;

            return (
              <g key={shelf.id}>
                {/* Slot zone background — subtle promo wash */}
                {shelfPromo && (
                  <rect
                    x={0}
                    y={zoneTopY}
                    width={unit.width_mm}
                    height={zoneBottomY - zoneTopY}
                    fill={shelfPromo.hex_colour}
                    opacity={0.05}
                  />
                )}

                {/* Slots with products */}
                {shelf.slots.reduce<{ x: number; nodes: React.ReactElement[] }>(
                  (acc, slot) => {
                    acc.nodes.push(
                      <SlotShape
                        key={slot.id}
                        slot={slot}
                        x={acc.x}
                        topY={zoneTopY}
                        shelfEdgeTopY={edgeTopY}
                        selected={slot.id === selectedSlotId}
                        promoHex={shelfPromo?.hex_colour ?? null}
                        onSelect={() => onSelectSlot(slot.id)}
                      />
                    );
                    acc.x += slot.width_mm;
                    return acc;
                  },
                  { x: 0, nodes: [] }
                ).nodes}

                {/* Add-slot affordance on the remaining span */}
                {remaining > 0 && (
                  <AddSlotZone
                    x={usedMm}
                    topY={zoneTopY}
                    shelfEdgeTopY={edgeTopY}
                    width={remaining}
                    disabled={!canEdit}
                    onClick={() => onAddSlot(shelf.id)}
                    firstOnShelf={shelf.slots.length === 0}
                  />
                )}

                {/* Shelf edge — price strip zone (front face of the plate) */}
                <ShelfEdge
                  x={0}
                  y={edgeTopY}
                  width={unit.width_mm}
                  height={zoneBottomY - edgeTopY}
                  promoHex={shelfPromo?.hex_colour ?? null}
                  shelfLabel={String(
                    displayShelfLabel(shelf.shelf_order, unit.shelves.length)
                  )}
                  hasProducts={shelf.slots.some(
                    (s) => s.assignment?.main || s.assignment?.sub_a || s.assignment?.sub_b
                  )}
                  posSlotForStrip={
                    unit.pos_slots.find(
                      (p) =>
                        p.position_label ===
                        `SHELF_${shelf.shelf_order}`
                    ) ?? null
                  }
                  flaggedIds={pendingFlagIds}
                  artworkSetIds={artworkSetIds}
                  canEdit={canEdit}
                  onToggleFlag={onTogglePosFlag}
                  onSetArtwork={onSetPosArtwork}
                />

                {/* Shelf plate */}
                <rect
                  x={0}
                  y={plateTopY}
                  width={unit.width_mm}
                  height={plateBottomY - plateTopY}
                  fill="#3A393B"
                />
                <rect
                  x={0}
                  y={plateTopY}
                  width={unit.width_mm}
                  height={1}
                  fill="rgba(255, 255, 255, 0.12)"
                />

                {/* Shelf index in the left gutter — clickable focus pill. */}
                <ShelfNumberPill
                  cx={-26}
                  cy={(zoneTopY + zoneBottomY) / 2}
                  label={displayShelfLabel(
                    shelf.shelf_order,
                    unit.shelves.length
                  )}
                  active={
                    focusedIndex !== null &&
                    layout.rows[focusedIndex]?.shelf.id === shelf.id
                  }
                  onClick={() => {
                    const idx = layout.rows.findIndex(
                      (r) => r.shelf.id === shelf.id
                    );
                    if (idx < 0) return;
                    setFocusedIndex((prev) => (prev === idx ? null : idx));
                  }}
                />

                {/* Shelf budget pill in the right gutter */}
                <ShelfBudgetPill
                  x={unit.width_mm + 12}
                  y={(zoneTopY + zoneBottomY) / 2 - 12}
                  usedMm={usedMm}
                  totalMm={unit.width_mm}
                />
              </g>
            );
          }
        )}

        {/* Base plinth */}
        <rect
          x={0}
          y={unitHeight - PLINTH_MM}
          width={unit.width_mm}
          height={PLINTH_MM}
          fill="#ECE9E2"
        />
        <rect
          x={0}
          y={unitHeight - PLINTH_MM}
          width={unit.width_mm}
          height={1}
          fill="rgba(65, 64, 66, 0.18)"
        />
      </svg>

      {/* Overview escape hatch — only shown when a shelf is focused.
          Otherwise the shelf numbers in the gutter are the primary nav. */}
      {focusedIndex !== null && (
        <button
          type="button"
          onClick={() => setFocusedIndex(null)}
          style={{
            position: 'absolute',
            left: 14,
            top: 14,
            height: 30,
            padding: '0 14px',
            background: 'rgba(255, 255, 255, 0.95)',
            border: '0.5px solid var(--ml-border-default)',
            borderRadius: 999,
            fontFamily: 'inherit',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.04em',
            color: 'var(--ml-text-primary)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 6px 18px rgba(65, 64, 66, 0.1)',
          }}
        >
          ← Overview
        </button>
      )}

      {/* Inline help — only when focused */}
      {focusedIndex !== null && (
        <div
          style={{
            position: 'absolute',
            right: 14,
            top: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            background: 'rgba(255, 255, 255, 0.92)',
            border: '0.5px solid var(--ml-border-default)',
            borderRadius: 999,
            fontSize: 11,
            color: 'var(--ml-text-muted)',
            boxShadow: '0 6px 18px rgba(65, 64, 66, 0.1)',
          }}
        >
          <span
            style={{
              fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
              color: 'var(--ml-text-primary)',
              fontWeight: 500,
            }}
          >
            Shelf{' '}
            {unit.shelves[focusedIndex]
              ? displayShelfLabel(
                  unit.shelves[focusedIndex].shelf_order,
                  unit.shelves.length
                )
              : ''}
          </span>
          <span style={{ opacity: 0.6 }}>·</span>
          <span>↑ ↓ or scroll · Esc overview</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shelf number pill — in-canvas focus affordance
// ---------------------------------------------------------------------------

function ShelfNumberPill({
  cx,
  cy,
  label,
  active,
  onClick,
}: {
  cx: number;
  cy: number;
  label: number;
  active: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const r = 28;
  const fill = active ? '#E12828' : hover ? '#414042' : '#FFFFFF';
  const stroke = active ? '#E12828' : hover ? '#414042' : 'rgba(65, 64, 66, 0.25)';
  const textColor = active || hover ? '#FFFFFF' : '#414042';
  return (
    <g
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
      <text
        x={cx}
        y={cy + 10}
        fontSize={28}
        fontFamily="Poppins, system-ui, sans-serif"
        fontWeight={500}
        fill={textColor}
        textAnchor="middle"
        pointerEvents="none"
      >
        {label}
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Top rail — thin title band at the top of the unit (label + type code)
// ---------------------------------------------------------------------------

function TopRail({
  widthMm,
  unitLabel,
  unitTypeName,
}: {
  widthMm: number;
  unitLabel: string;
  unitTypeName: string;
}) {
  return (
    <g>
      <rect
        x={0}
        y={0}
        width={widthMm}
        height={TOP_RAIL_MM}
        fill="#262627"
      />
      <text
        x={18}
        y={TOP_RAIL_MM / 2 + 7}
        fontSize={20}
        fontFamily="Poppins, system-ui, sans-serif"
        fontWeight={500}
        letterSpacing={1.4}
        fill="#E6E7E7"
      >
        {unitLabel.toUpperCase()}
      </text>
      <text
        x={widthMm - 18}
        y={TOP_RAIL_MM / 2 + 6}
        fontSize={13}
        fontFamily="Poppins, system-ui, sans-serif"
        fontWeight={300}
        letterSpacing={2.2}
        fill="rgba(230, 231, 231, 0.7)"
        textAnchor="end"
      >
        {unitTypeName.toUpperCase()}
      </text>
      <line
        x1={0}
        x2={widthMm}
        y1={TOP_RAIL_MM}
        y2={TOP_RAIL_MM}
        stroke="rgba(65, 64, 66, 0.3)"
        strokeWidth={1}
      />
    </g>
  );
}

// ---------------------------------------------------------------------------
// External POS header — poster hanging on arms above the unit carcass
// ---------------------------------------------------------------------------

function ExternalPosHeader({
  unitWidthMm,
  paperX,
  paperY,
  paperW,
  paperH,
  headerSlot,
  promo,
  flagged,
  artworkSet,
  canEdit,
  onToggleFlag,
  onSetArtwork,
}: {
  unitWidthMm: number;
  paperX: number;
  paperY: number;
  paperW: number;
  paperH: number;
  headerSlot: UnitPosSlot | null;
  promo: PromoSectionSummary | null;
  flagged: boolean;
  artworkSet: boolean;
  canEdit: boolean;
  onToggleFlag: (id: string, label: string) => void;
  onSetArtwork: (id: string) => void;
}) {
  // Arms rise from the top of the unit (y=0) up to the bottom of the
  // poster. They're inset from the unit's edges so they read as brackets
  // rather than continuations of the carcass.
  const armInset = Math.max(80, unitWidthMm * 0.12);
  const armLeftX = armInset;
  const armRightX = unitWidthMm - armInset;
  const armTopY = paperY + paperH;

  return (
    <g>
      {/* Arms — charcoal posts */}
      <line
        x1={armLeftX}
        x2={armLeftX}
        y1={0}
        y2={armTopY}
        stroke="#414042"
        strokeWidth={6}
        strokeLinecap="round"
      />
      <line
        x1={armRightX}
        x2={armRightX}
        y1={0}
        y2={armTopY}
        stroke="#414042"
        strokeWidth={6}
        strokeLinecap="round"
      />
      {/* Small brackets where the arms meet the poster */}
      <rect
        x={armLeftX - 8}
        y={armTopY - 4}
        width={16}
        height={8}
        rx={2}
        fill="#262627"
      />
      <rect
        x={armRightX - 8}
        y={armTopY - 4}
        width={16}
        height={8}
        rx={2}
        fill="#262627"
      />

      {/* The POS poster itself */}
      <PosPoster
        x={paperX}
        y={paperY}
        width={paperW}
        height={paperH}
        promo={promo}
        headerSlot={headerSlot}
        flagged={flagged}
        artworkSet={artworkSet}
        canEdit={canEdit}
        onToggleFlag={
          headerSlot
            ? () =>
                onToggleFlag(
                  headerSlot.id,
                  `${headerSlot.pos_slot_type.display_name} (top header)`
                )
            : undefined
        }
        onSetArtwork={
          headerSlot ? () => onSetArtwork(headerSlot.id) : undefined
        }
      />
    </g>
  );
}

// ---------------------------------------------------------------------------
// POS poster — brand-coloured printed artwork placeholder with hover flag
// ---------------------------------------------------------------------------

function PosPoster({
  x,
  y,
  width,
  height,
  promo,
  headerSlot,
  flagged,
  artworkSet,
  canEdit,
  onToggleFlag,
  onSetArtwork,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  promo: PromoSectionSummary | null;
  headerSlot: UnitPosSlot | null;
  flagged: boolean;
  artworkSet: boolean;
  canEdit: boolean;
  onToggleFlag?: () => void;
  onSetArtwork?: () => void;
}) {
  const [hover, setHover] = useState(false);
  const bg = promo?.hex_colour ?? '#FAF8F4';
  const accent = '#E12828';
  const stripeW = Math.max(12, width * 0.04);
  const headline = promo
    ? promo.display_name.toUpperCase()
    : headerSlot
    ? headerSlot.pos_slot_type.display_name.toUpperCase()
    : 'HEADER POSTER';

  return (
    <g
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Paper background in the promo colour */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={bg}
        stroke="#414042"
        strokeWidth={1.4}
        rx={3}
        ry={3}
      />

      {/* Printed-artwork decoration — left accent stripe + diagonal pattern */}
      <rect
        x={x}
        y={y}
        width={stripeW}
        height={height}
        fill={accent}
        rx={3}
        ry={3}
      />
      <g opacity={0.22}>
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={i}
            x1={x + stripeW + i * (width / 6)}
            y1={y}
            x2={x + stripeW + i * (width / 6) - height * 0.6}
            y2={y + height}
            stroke="#FFFFFF"
            strokeWidth={Math.max(2, width * 0.012)}
          />
        ))}
      </g>

      {/* Big headline — promo section / POS slot */}
      <text
        x={x + stripeW + 18}
        y={y + height / 2 + height * 0.04}
        fontSize={Math.max(18, Math.min(56, height * 0.45))}
        fontFamily="Poppins, system-ui, sans-serif"
        fontWeight={900}
        letterSpacing={1.8}
        fill="#FFFFFF"
      >
        {headline}
      </text>

      {/* Small caption — POS size + material, like a print-brief summary */}
      {headerSlot && (
        <text
          x={x + stripeW + 18}
          y={y + height - 14}
          fontSize={Math.max(10, Math.min(14, height * 0.11))}
          fontFamily="ui-monospace, Menlo, monospace"
          fill="rgba(255, 255, 255, 0.85)"
        >
          {headerSlot.pos_slot_type.width_mm}×{headerSlot.pos_slot_type.height_mm} mm ·{' '}
          {headerSlot.pos_slot_type.default_material.toLowerCase().replace(/_/g, ' ')}
        </text>
      )}

      {/* Hover action icons — top-right corner.
          Flag: add to bulk redelivery. Artwork: open assignment dialog.
          Artwork badge persists once set so the user sees the state. */}
      {canEdit && onSetArtwork && (hover || artworkSet) && (
        <ArtworkBadge
          cx={x + width - 20}
          cy={y + 20}
          set={artworkSet}
          onClick={(e) => {
            e.stopPropagation();
            onSetArtwork();
          }}
        />
      )}
      {onToggleFlag && (hover || flagged) && (
        <FlagBadge
          cx={x + width - 20 - (canEdit && onSetArtwork ? 34 : 0)}
          cy={y + 20}
          flagged={flagged}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFlag();
          }}
        />
      )}
    </g>
  );
}

function ArtworkBadge({
  cx,
  cy,
  set,
  onClick,
}: {
  cx: number;
  cy: number;
  set: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const r = 14;
  return (
    <g
      style={{ cursor: 'pointer' }}
      onClick={onClick}
      role="button"
      aria-label={set ? 'Edit POS artwork' : 'Set POS artwork'}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={set ? '#5DCAA5' : '#FFFFFF'}
        stroke={set ? '#2F7B5E' : '#414042'}
        strokeWidth={1.5}
      />
      <text
        x={cx}
        y={cy + 5}
        fontSize={14}
        fontFamily="Poppins, system-ui, sans-serif"
        fontWeight={700}
        fill={set ? '#FFFFFF' : '#414042'}
        textAnchor="middle"
        pointerEvents="none"
      >
        ✎
      </text>
    </g>
  );
}

function FlagBadge({
  cx,
  cy,
  flagged,
  onClick,
}: {
  cx: number;
  cy: number;
  flagged: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const r = 14;
  const fill = flagged ? '#E12828' : '#FFFFFF';
  const stroke = flagged ? '#E12828' : '#414042';
  const textColor = flagged ? '#FFFFFF' : '#414042';
  return (
    <g
      style={{ cursor: 'pointer' }}
      onClick={onClick}
      role="button"
      aria-label={flagged ? 'Unflag POS' : 'Flag POS for redelivery'}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
      <text
        x={cx}
        y={cy + 5}
        fontSize={16}
        fontFamily="Poppins, system-ui, sans-serif"
        fontWeight={700}
        fill={textColor}
        textAnchor="middle"
        pointerEvents="none"
      >
        ⚑
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Shelf edge — price-strip zone under each slot row
// ---------------------------------------------------------------------------

function ShelfEdge({
  x,
  y,
  width,
  height,
  promoHex,
  shelfLabel,
  hasProducts,
  posSlotForStrip,
  flaggedIds,
  artworkSetIds,
  canEdit,
  onToggleFlag,
  onSetArtwork,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  promoHex: string | null;
  shelfLabel: string;
  hasProducts: boolean;
  posSlotForStrip: UnitPosSlot | null;
  flaggedIds: Set<string>;
  artworkSetIds: Set<string>;
  canEdit: boolean;
  onToggleFlag: (id: string, label: string) => void;
  onSetArtwork: (id: string) => void;
}) {
  const [hover, setHover] = useState(false);
  const hasPromo = !!promoHex;
  const barFill = promoHex ?? '#ECE9E2';
  const flagged = posSlotForStrip
    ? flaggedIds.has(posSlotForStrip.id)
    : false;

  // Text colour — on coloured strips use pure white for strongest contrast;
  // on the neutral fallback, stay charcoal.
  const onBrand = hasPromo;
  const textFill = onBrand ? '#FFFFFF' : '#414042';

  return (
    <g
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <rect x={x} y={y} width={width} height={height} fill={barFill} />
      {/* Strip highlights (top/bottom hairlines) */}
      <rect x={x} y={y} width={width} height={1.2} fill="rgba(0, 0, 0, 0.15)" />
      <rect
        x={x}
        y={y + height - 1}
        width={width}
        height={1}
        fill="rgba(255, 255, 255, 0.22)"
      />
      {/* Decorative artwork band — subtle diagonal stripes to signal this
         is live printed real estate, not a blank gap. */}
      {hasPromo && (
        <g opacity={0.18}>
          {Array.from({ length: Math.ceil(width / 120) }).map((_, i) => (
            <line
              key={i}
              x1={x + i * 120}
              y1={y}
              x2={x + i * 120 + height * 0.6}
              y2={y + height}
              stroke="#FFFFFF"
              strokeWidth={Math.max(2, height * 0.08)}
            />
          ))}
        </g>
      )}
      {/* Price-card labels */}
      {hasProducts && (
        <>
          <text
            x={x + 10}
            y={y + height / 2 + 5}
            fontSize={Math.max(12, Math.min(16, height * 0.42))}
            fontFamily="Poppins, system-ui, sans-serif"
            fontWeight={700}
            letterSpacing={1.6}
            fill={textFill}
          >
            SHELF {shelfLabel}
          </text>
          <text
            x={x + width - 40}
            y={y + height / 2 + 5}
            fontSize={Math.max(10, Math.min(13, height * 0.32))}
            fontFamily="Poppins, system-ui, sans-serif"
            fontWeight={500}
            letterSpacing={1.1}
            textAnchor="end"
            fill={textFill}
            opacity={0.85}
          >
            {posSlotForStrip
              ? posSlotForStrip.pos_slot_type.display_name.toUpperCase()
              : 'PRICE STRIP'}
          </text>
        </>
      )}
      {/* Hover/persistent action icons — right edge of the strip */}
      {posSlotForStrip &&
        canEdit &&
        (hover || artworkSetIds.has(posSlotForStrip.id)) && (
          <ArtworkBadge
            cx={x + width - 18}
            cy={y + height / 2}
            set={artworkSetIds.has(posSlotForStrip.id)}
            onClick={(e) => {
              e.stopPropagation();
              onSetArtwork(posSlotForStrip.id);
            }}
          />
        )}
      {posSlotForStrip && (hover || flagged) && (
        <FlagBadge
          cx={x + width - 18 - (canEdit ? 34 : 0)}
          cy={y + height / 2}
          flagged={flagged}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFlag(
              posSlotForStrip.id,
              `${posSlotForStrip.pos_slot_type.display_name} · shelf ${shelfLabel}`
            );
          }}
        />
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Slot shape — one rectangle per facing, product image or initials fallback
// ---------------------------------------------------------------------------

interface SlotShapeProps {
  slot: ShelfSlot;
  x: number;
  topY: number;
  shelfEdgeTopY: number;
  selected: boolean;
  promoHex: string | null;
  onSelect: () => void;
}

function SlotShape({
  slot,
  x,
  topY,
  shelfEdgeTopY,
  selected,
  promoHex,
  onSelect,
}: SlotShapeProps) {
  const [hover, setHover] = useState(false);
  const bottomY = shelfEdgeTopY;
  const height = bottomY - topY;
  const width = slot.width_mm;
  const facings = Math.max(1, slot.facing_count);
  const facingW = width / facings;

  const product =
    slot.assignment?.main ??
    slot.assignment?.sub_a ??
    slot.assignment?.sub_b ??
    null;

  const outlineStroke = selected
    ? '#E12828'
    : hover
    ? '#414042'
    : 'rgba(65, 64, 66, 0.0)';
  const outlineWidth = selected ? 3 : hover ? 1.6 : 0;

  const labelSize = Math.max(12, Math.min(20, facingW / 12));
  const brandSize = Math.max(10, Math.min(13, facingW / 18));

  // Product box — as tall as stack_count × facing_height would suggest,
  // capped by the shelf's available room. When the desired height exceeds
  // the available room, we flag it as an "over-height" state and render
  // the boxes in red so the user can decide: remove/restock fewer, or
  // raise the shelf height.
  const singleFacingHeight =
    product?.shipper_height_mm ?? product?.height_mm ?? null;
  const stack = Math.max(1, slot.stack_count);
  const availableHeight = height - 14;
  const desiredHeight =
    singleFacingHeight !== null ? singleFacingHeight * stack : null;
  const overflow =
    desiredHeight !== null && desiredHeight > availableHeight;
  const productBoxHeight =
    desiredHeight !== null
      ? Math.min(availableHeight, desiredHeight)
      : availableHeight;
  const productBoxTop = bottomY - 8 - productBoxHeight;
  const singleRowHeight = productBoxHeight / stack;

  // Product box — slightly warm white so it lifts off a promo tint.
  // When over-height, we switch to a red wash + red outline so the
  // problem reads instantly without blocking the user from keeping it.
  const productFill = overflow ? '#FFE9E9' : '#FFFFFF';
  const innerStroke = overflow
    ? '#E12828'
    : promoHex ?? 'rgba(65, 64, 66, 0.22)';

  return (
    <g
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Hover / selection halo */}
      {(hover || selected) && (
        <rect
          x={x - 1}
          y={topY - 1}
          width={width + 2}
          height={height + 2}
          fill={selected ? 'rgba(225, 40, 40, 0.04)' : 'rgba(65, 64, 66, 0.03)'}
          rx={3}
          ry={3}
          pointerEvents="none"
        />
      )}

      {Array.from({ length: facings }).map((_, i) => {
        const fx = x + i * facingW;
        return (
          <g key={`f-${i}`}>
            <rect
              x={fx + 2}
              y={productBoxTop}
              width={facingW - 4}
              height={productBoxHeight}
              fill={productFill}
              stroke={innerStroke}
              strokeWidth={0.75}
              rx={3}
              ry={3}
            />
            {/* Stack dividers */}
            {stack > 1 &&
              Array.from({ length: stack - 1 }).map((_, r) => (
                <line
                  key={`div-${r}`}
                  x1={fx + 2}
                  x2={fx + facingW - 2}
                  y1={productBoxTop + (r + 1) * singleRowHeight}
                  y2={productBoxTop + (r + 1) * singleRowHeight}
                  stroke={innerStroke}
                  strokeWidth={0.5}
                  strokeDasharray="3 3"
                />
              ))}
            {product?.image_url &&
              Array.from({ length: stack }).map((_, r) => (
                <image
                  key={`img-${r}`}
                  href={product.image_url as string}
                  x={fx + 6}
                  y={productBoxTop + r * singleRowHeight + 2}
                  width={facingW - 12}
                  height={Math.max(0, singleRowHeight - 6)}
                  preserveAspectRatio="xMidYMax meet"
                  style={{ pointerEvents: 'none' }}
                />
              ))}
            {product && !product.image_url && (
              <>
                <text
                  x={fx + facingW / 2}
                  y={productBoxTop + productBoxHeight / 2 + labelSize / 3}
                  fontSize={labelSize}
                  fontFamily="Poppins, system-ui, sans-serif"
                  fontWeight={600}
                  fill="#414042"
                  textAnchor="middle"
                  pointerEvents="none"
                >
                  {initials(product.brand ?? product.name)}
                </text>
                <text
                  x={fx + facingW / 2}
                  y={productBoxTop + productBoxHeight - 6}
                  fontSize={brandSize}
                  fontFamily="Poppins, system-ui, sans-serif"
                  fontWeight={400}
                  fill="#757578"
                  textAnchor="middle"
                  pointerEvents="none"
                >
                  {truncate(product.brand ?? product.name, facingW / 14)}
                </text>
              </>
            )}
            {!product && i === 0 && (
              <text
                x={x + width / 2}
                y={productBoxTop + productBoxHeight / 2 + 5}
                fontSize={12}
                fontFamily="Poppins, system-ui, sans-serif"
                fontWeight={400}
                fill="#B7B7B7"
                fontStyle="italic"
                textAnchor="middle"
                pointerEvents="none"
              >
                Empty slot
              </text>
            )}
          </g>
        );
      })}

      {/* Slot outline */}
      <rect
        x={x}
        y={topY}
        width={width}
        height={height}
        fill="transparent"
        stroke={outlineStroke}
        strokeWidth={outlineWidth}
        rx={2}
        ry={2}
        pointerEvents="none"
      />

      {/* Slot metadata */}
      <text
        x={x + 6}
        y={topY + 18}
        fontSize={11}
        fontFamily="ui-monospace, Menlo, monospace"
        fill={selected ? '#E12828' : 'rgba(117, 117, 120, 0.75)'}
        pointerEvents="none"
      >
        #{slot.slot_order}
      </text>
      {(facings > 1 || slot.stack_count > 1) && (
        <text
          x={x + width - 8}
          y={topY + 18}
          fontSize={11}
          fontFamily="Poppins, system-ui, sans-serif"
          fontWeight={500}
          fill={overflow ? '#E12828' : 'rgba(117, 117, 120, 0.9)'}
          textAnchor="end"
          pointerEvents="none"
        >
          {`${facings}w${slot.stack_count > 1 ? ` × ${slot.stack_count}h` : ''}`}
        </text>
      )}

      {/* Over-height warning ribbon — product box is red, this tag names it */}
      {overflow && (
        <g pointerEvents="none">
          <rect
            x={x + 6}
            y={topY + 26}
            width={Math.min(120, width - 12)}
            height={18}
            rx={3}
            ry={3}
            fill="#E12828"
          />
          <text
            x={x + 12}
            y={topY + 39}
            fontSize={10}
            fontFamily="Poppins, system-ui, sans-serif"
            fontWeight={500}
            letterSpacing={0.6}
            fill="#FFFFFF"
          >
            ⚠ OVER HEIGHT
          </text>
        </g>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------

function initials(s: string): string {
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

function truncate(s: string, maxChars: number): string {
  const n = Math.max(6, Math.floor(maxChars));
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1)}…`;
}

// ---------------------------------------------------------------------------
// Add-slot affordance
// ---------------------------------------------------------------------------

function AddSlotZone({
  x,
  topY,
  shelfEdgeTopY,
  width,
  disabled,
  onClick,
  firstOnShelf,
}: {
  x: number;
  topY: number;
  shelfEdgeTopY: number;
  width: number;
  disabled: boolean;
  onClick: () => void;
  firstOnShelf: boolean;
}) {
  const [hover, setHover] = useState(false);
  const height = shelfEdgeTopY - topY;
  const inset = 8;
  const w = Math.max(0, width - inset * 2);
  const h = Math.max(0, height - inset * 2);

  return (
    <g
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={(e) => {
        if (disabled) return;
        e.stopPropagation();
        onClick();
      }}
      style={{ cursor: disabled ? 'default' : 'pointer' }}
    >
      <rect
        x={x + inset}
        y={topY + inset}
        width={w}
        height={h}
        fill={hover ? 'rgba(225, 40, 40, 0.04)' : 'rgba(65, 64, 66, 0.02)'}
        stroke={disabled ? 'transparent' : hover ? '#E12828' : 'rgba(65, 64, 66, 0.28)'}
        strokeWidth={hover ? 1.8 : 1}
        strokeDasharray="10 6"
        rx={6}
        ry={6}
        style={{ transition: 'stroke 180ms, fill 180ms' }}
      />
      {!disabled && (
        <g pointerEvents="none">
          <text
            x={x + width / 2}
            y={topY + h / 2 + (firstOnShelf ? -4 : 6)}
            fontSize={Math.min(22, Math.max(13, h / 9))}
            fontFamily="Poppins, system-ui, sans-serif"
            fontWeight={500}
            textAnchor="middle"
            fill={hover ? '#E12828' : '#8E8E90'}
            style={{ transition: 'fill 180ms' }}
          >
            + Add slot
          </text>
          {firstOnShelf && (
            <text
              x={x + width / 2}
              y={topY + h / 2 + 18}
              fontSize={Math.min(13, Math.max(10, h / 16))}
              fontFamily="Poppins, system-ui, sans-serif"
              fontWeight={400}
              textAnchor="middle"
              fill="rgba(117, 117, 120, 0.75)"
            >
              Pick a product to start this shelf
            </text>
          )}
        </g>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------

function ShelfBudgetPill({
  x,
  y,
  usedMm,
  totalMm,
}: {
  x: number;
  y: number;
  usedMm: number;
  totalMm: number;
}) {
  const over = usedMm > totalMm;
  const pct = Math.min(100, Math.round((usedMm / totalMm) * 100));
  const text = `${usedMm}/${totalMm} mm`;
  const width = 132;
  const height = 24;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={height / 2}
        ry={height / 2}
        fill={over ? 'rgba(225, 40, 40, 0.10)' : '#FFFFFF'}
        stroke={over ? '#E12828' : 'rgba(65, 64, 66, 0.18)'}
        strokeWidth={0.75}
      />
      {/* Inner fill bar */}
      <rect
        x={x + 6}
        y={y + height - 6}
        width={(width - 12) * (pct / 100)}
        height={2.5}
        rx={1.5}
        ry={1.5}
        fill={over ? '#E12828' : '#414042'}
      />
      <text
        x={x + width / 2}
        y={y + height / 2 + 3}
        fontSize={11}
        fontFamily="ui-monospace, Menlo, monospace"
        fill={over ? '#E12828' : '#414042'}
        textAnchor="middle"
      >
        {text}
      </text>
    </g>
  );
}
