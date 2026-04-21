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
  onSelectSlot: (slotId: string | null) => void;
  onAddSlot: (shelfId: string) => void;
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

const HEADER_MM = 360;
const PLINTH_MM = 160;
const SHELF_THICKNESS_MM = 14;
const SHELF_EDGE_MM = 40; // front price-strip zone below each slot row
const GUTTER_MM = 60; // left-of-unit for shelf numbers; right-of-unit for budget pill

/**
 * ShelfCanvas — elevation view of a single unit.
 *
 * Vertical anatomy (top → bottom):
 *
 *   ┌─ HEADER zone ──────────────────────────────────────┐
 *   │   UNIT name band + framed POS poster placeholder   │
 *   ├────────────────────────────────────────────────────┤
 *   │   Shelf N slot zone (products on shelf N)          │
 *   │   Shelf N edge strip (price strip + promo)         │
 *   │   Shelf N plate (charcoal band)                    │
 *   │   … repeat for each shelf …                        │
 *   ├────────────────────────────────────────────────────┤
 *   │   Base plinth                                      │
 *   └────────────────────────────────────────────────────┘
 *
 * The unit type's POS positions (HEADER_BOARD_* etc) are rendered as
 * sized rectangles inside the header zone so the user can see the
 * printable real estate. Each shelf's edge strip is tinted by its promo
 * section, giving somewhere for price cards and wobbler design to live
 * visually without cluttering the product zone.
 */
export function ShelfCanvas({
  unit,
  promoSections,
  canEdit,
  selectedSlotId,
  totalSlotWidthByShelf,
  onSelectSlot,
  onAddSlot,
}: Props) {
  const promoById = useMemo(() => {
    const m = new Map<string, PromoSectionSummary>();
    for (const p of promoSections) m.set(p.id, p);
    return m;
  }, [promoSections]);

  const layout = useMemo(() => {
    let cursor = HEADER_MM;
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

  const unitHeight = Math.max(unit.height_mm, layout.totalUsedMm);

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

  // --- Railed zoom/pan -----------------------------------------------------
  // Overview shows the whole unit. Focusing a shelf animates the SVG viewBox
  // to frame just that shelf (with a little context above + below). Arrow
  // keys cycle shelves while focused; Esc / overview button exits.

  const overviewViewBox: ViewBox = useMemo(
    () => ({
      x: -GUTTER_MM,
      y: -20,
      w: unit.width_mm + GUTTER_MM * 2,
      h: unitHeight + 40,
    }),
    [unit.width_mm, unitHeight]
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

        <HeaderZone
          widthMm={unit.width_mm}
          unitLabel={unit.label}
          unitTypeName={unit.unit_type_name}
          posSlots={headerPosSlots}
          promo={unitPromo}
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

                {/* Shelf index in the left gutter (reversed — bottom = 1) */}
                <text
                  x={-14}
                  y={(zoneTopY + zoneBottomY) / 2 + 5}
                  fontSize={16}
                  fontFamily="Poppins, system-ui, sans-serif"
                  fontWeight={500}
                  textAnchor="end"
                  fill="#9A9A9A"
                >
                  {displayShelfLabel(shelf.shelf_order, unit.shelves.length)}
                </text>

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

      {/* Navigation rail — shelf chips for zoom-to-shelf + overview toggle */}
      <nav
        aria-label="Shelf navigation"
        style={{
          position: 'absolute',
          left: 10,
          top: 72,
          bottom: 24,
          width: 36,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 6,
          padding: 4,
          background: 'rgba(255, 255, 255, 0.92)',
          border: '0.5px solid var(--ml-border-default)',
          borderRadius: 999,
          boxShadow: '0 6px 18px rgba(65, 64, 66, 0.1)',
          overflow: 'hidden',
        }}
      >
        <RailButton
          label="All"
          active={focusedIndex === null}
          onClick={() => setFocusedIndex(null)}
          ariaLabel="Show full unit"
        />
        {unit.shelves.map((s, i) => {
          const label = displayShelfLabel(s.shelf_order, unit.shelves.length);
          return (
            <RailButton
              key={s.id}
              label={String(label)}
              active={focusedIndex === i}
              onClick={() => setFocusedIndex(i)}
              ariaLabel={`Focus shelf ${label}`}
            />
          );
        })}
      </nav>

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

function RailButton({
  label,
  active,
  ariaLabel,
  onClick,
}: {
  label: string;
  active: boolean;
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={onClick}
      style={{
        height: 28,
        width: '100%',
        flexShrink: 0,
        borderRadius: 999,
        border: '0.5px solid transparent',
        background: active ? '#414042' : 'transparent',
        color: active ? '#FFFFFF' : '#414042',
        fontFamily: 'Poppins, system-ui, sans-serif',
        fontWeight: 500,
        fontSize: 11,
        cursor: 'pointer',
        transition:
          'background var(--ml-motion-fast) var(--ml-ease-out), color var(--ml-motion-fast) var(--ml-ease-out)',
      }}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Header zone — unit name strip + framed POS poster placeholders
// ---------------------------------------------------------------------------

function HeaderZone({
  widthMm,
  unitLabel,
  unitTypeName,
  posSlots,
  promo,
}: {
  widthMm: number;
  unitLabel: string;
  unitTypeName: string;
  posSlots: UnitPosSlot[];
  promo: PromoSectionSummary | null;
}) {
  const titleStripMm = 48;
  const frameTop = titleStripMm + 20;
  const frameBottom = HEADER_MM - 24;
  const frameHeight = frameBottom - frameTop;
  const frameWidth = widthMm - 60;
  const frameX = (widthMm - frameWidth) / 2;

  // The first "header-type" POS slot defines the paper size; if missing,
  // we still draw a sensible placeholder so the zone feels intentional.
  const headerSlot = posSlots[0] ?? null;
  const posW = headerSlot?.pos_slot_type.width_mm ?? Math.min(1000, widthMm - 120);
  const posH = headerSlot?.pos_slot_type.height_mm ?? 250;

  // Fit the paper into the frame.
  const scale = Math.min(
    (frameWidth - 20) / posW,
    (frameHeight - 20) / posH
  );
  const paperW = posW * scale;
  const paperH = posH * scale;
  const paperX = frameX + (frameWidth - paperW) / 2;
  const paperY = frameTop + (frameHeight - paperH) / 2;

  return (
    <g>
      {/* Title strip */}
      <rect
        x={0}
        y={0}
        width={widthMm}
        height={titleStripMm}
        fill="#262627"
      />
      <text
        x={18}
        y={titleStripMm / 2 + 7}
        fontSize={22}
        fontFamily="Poppins, system-ui, sans-serif"
        fontWeight={500}
        letterSpacing={1.4}
        fill="#E6E7E7"
      >
        {unitLabel.toUpperCase()}
      </text>
      <text
        x={widthMm - 18}
        y={titleStripMm / 2 + 7}
        fontSize={14}
        fontFamily="Poppins, system-ui, sans-serif"
        fontWeight={300}
        letterSpacing={2.2}
        fill="rgba(230, 231, 231, 0.7)"
        textAnchor="end"
      >
        {unitTypeName.toUpperCase()}
      </text>

      {/* POS header frame (the box where the poster hangs) */}
      <rect
        x={frameX}
        y={frameTop}
        width={frameWidth}
        height={frameHeight}
        fill="#FAF8F4"
        stroke="rgba(65, 64, 66, 0.2)"
        strokeWidth={1}
        rx={3}
        ry={3}
      />

      {/* The poster placeholder */}
      <g>
        <rect
          x={paperX}
          y={paperY}
          width={paperW}
          height={paperH}
          fill={promo?.hex_colour ?? '#FFFFFF'}
          stroke="#414042"
          strokeWidth={1.4}
          rx={2}
          ry={2}
        />
        {promo && (
          <rect
            x={paperX}
            y={paperY}
            width={paperW}
            height={paperH}
            fill="#FFFFFF"
            opacity={0.72}
            rx={2}
            ry={2}
          />
        )}
        <text
          x={paperX + paperW / 2}
          y={paperY + paperH / 2 + 2}
          fontSize={Math.max(14, Math.min(34, paperH * 0.3))}
          fontFamily="Poppins, system-ui, sans-serif"
          fontWeight={700}
          letterSpacing={1.2}
          fill={promo ? '#414042' : '#B7B7B7'}
          textAnchor="middle"
        >
          {headerSlot
            ? headerSlot.pos_slot_type.display_name.toUpperCase()
            : 'HEADER POSTER'}
        </text>
        {headerSlot && (
          <text
            x={paperX + paperW / 2}
            y={paperY + paperH - 12}
            fontSize={Math.max(9, Math.min(12, paperH * 0.12))}
            fontFamily="ui-monospace, Menlo, monospace"
            fill="#757578"
            textAnchor="middle"
          >
            {headerSlot.pos_slot_type.width_mm}×{headerSlot.pos_slot_type.height_mm} mm ·{' '}
            {headerSlot.pos_slot_type.default_material.toLowerCase().replace(/_/g, ' ')}
          </text>
        )}
      </g>

      {/* Divider between header and first slot zone */}
      <line
        x1={0}
        x2={widthMm}
        y1={HEADER_MM}
        y2={HEADER_MM}
        stroke="rgba(65, 64, 66, 0.3)"
        strokeWidth={1}
      />
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
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  promoHex: string | null;
  shelfLabel: string;
  hasProducts: boolean;
}) {
  const barFill = promoHex ?? '#ECE9E2';
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={barFill}
      />
      {/* Subtle top + bottom highlight so it reads as a strip */}
      <rect x={x} y={y} width={width} height={1.2} fill="rgba(0, 0, 0, 0.15)" />
      <rect
        x={x}
        y={y + height - 1}
        width={width}
        height={1}
        fill="rgba(255, 255, 255, 0.22)"
      />
      {/* Inline price-card labels: bite-sized reminders the shelf edge is live */}
      {hasProducts && (
        <>
          <text
            x={x + 10}
            y={y + height / 2 + 5}
            fontSize={14}
            fontFamily="Poppins, system-ui, sans-serif"
            fontWeight={700}
            letterSpacing={1.6}
            fill={promoHex ? '#414042' : '#9A9A9A'}
          >
            SHELF {shelfLabel}
          </text>
          <text
            x={x + width - 10}
            y={y + height / 2 + 5}
            fontSize={11}
            fontFamily="Poppins, system-ui, sans-serif"
            fontWeight={500}
            letterSpacing={1.1}
            textAnchor="end"
            fill={promoHex ? '#414042' : '#9A9A9A'}
            opacity={0.82}
          >
            PRICE STRIP
          </text>
        </>
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

  // Product box — slightly warm white so it lifts off a promo tint.
  const productFill = '#FFFFFF';
  const innerStroke = promoHex ?? 'rgba(65, 64, 66, 0.22)';

  const labelSize = Math.max(12, Math.min(20, facingW / 12));
  const brandSize = Math.max(10, Math.min(13, facingW / 18));

  // Product box occupies the middle-ish portion of the slot zone. When a
  // stack_count > 1 is set, the box grows vertically up to stack_count ×
  // per-unit facing height, capped by the shelf clearance.
  const singleFacingHeight =
    product?.shipper_height_mm ?? product?.height_mm ?? null;
  const stack = Math.max(1, slot.stack_count);
  const productBoxHeight = Math.min(
    height - 14,
    singleFacingHeight
      ? singleFacingHeight * stack
      : height - 14
  );
  const productBoxTop = bottomY - 8 - productBoxHeight;
  const singleRowHeight =
    productBoxHeight / stack;

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
          fill="rgba(117, 117, 120, 0.9)"
          textAnchor="end"
          pointerEvents="none"
        >
          {`${facings}w${slot.stack_count > 1 ? ` × ${slot.stack_count}h` : ''}`}
        </text>
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
