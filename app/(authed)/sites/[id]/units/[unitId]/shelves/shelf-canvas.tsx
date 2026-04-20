'use client';

import { useMemo, useState } from 'react';
import type { PromoSectionSummary } from '@/lib/configurator/types';
import type { ShelfRow, ShelfSlot, UnitWithShelves } from '@/lib/shelf/types';

interface Props {
  unit: UnitWithShelves;
  promoSections: PromoSectionSummary[];
  canEdit: boolean;
  selectedSlotId: string | null;
  totalSlotWidthByShelf: Map<string, number>;
  onSelectSlot: (slotId: string | null) => void;
  onAddSlot: (shelfId: string) => void;
}

const HEADER_MM = 80;
const PLINTH_MM = 140;
const SHELF_THICKNESS_MM = 16;

/**
 * ShelfCanvas — SVG elevation view of a single unit.
 *
 * Coordinate system is mm (viewBox = unit width × unit height). Each slot
 * renders one rectangle per facing with a thin divider, matching real shelf
 * planograms. The slot zone above each shelf can be tinted by the shelf's
 * promo section for at-a-glance zoning.
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
      const slotTopY = cursor;
      const slotBottomY = cursor + s.clearance_mm;
      const plateTopY = slotBottomY;
      const plateBottomY = plateTopY + SHELF_THICKNESS_MM;
      cursor = plateBottomY;
      return { shelf: s, slotTopY, slotBottomY, plateTopY, plateBottomY };
    });
    const totalUsedMm = cursor + PLINTH_MM;
    return { rows, totalUsedMm };
  }, [unit.shelves]);

  const unitHeight = Math.max(unit.height_mm, layout.totalUsedMm);
  const unitFillOutside = '#F5F2EE';

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
        overflow: 'auto',
      }}
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
        viewBox={`-40 -10 ${unit.width_mm + 80} ${unitHeight + 20}`}
        preserveAspectRatio="xMidYMin meet"
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: '100%',
          background: unitFillOutside,
          borderRadius: 6,
        }}
      >
        <rect
          x={0}
          y={0}
          width={unit.width_mm}
          height={unitHeight}
          fill="#FFFFFF"
          stroke="#414042"
          strokeWidth={3}
        />

        <rect
          x={0}
          y={0}
          width={unit.width_mm}
          height={HEADER_MM}
          fill="#F5F2EE"
        />
        <text
          x={10}
          y={HEADER_MM / 2 + 8}
          fontSize={28}
          fontFamily="Poppins, system-ui, sans-serif"
          fontWeight={500}
          letterSpacing={2}
          fill="#757578"
        >
          HEADER
        </text>
        <line
          x1={0}
          x2={unit.width_mm}
          y1={HEADER_MM}
          y2={HEADER_MM}
          stroke="#414042"
          strokeWidth={1}
        />

        {layout.rows.map(
          ({ shelf, slotTopY, slotBottomY, plateTopY, plateBottomY }) => {
            const totalSlots = totalSlotWidthByShelf.get(shelf.id) ?? 0;
            const remaining = Math.max(0, unit.width_mm - totalSlots);
            const shelfPromo =
              (shelf.promo_section_id && promoById.get(shelf.promo_section_id)) ||
              (unit.promo_section_id && promoById.get(unit.promo_section_id)) ||
              null;

            return (
              <g key={shelf.id}>
                {shelfPromo && (
                  <rect
                    x={0}
                    y={slotTopY}
                    width={unit.width_mm}
                    height={slotBottomY - slotTopY}
                    fill={shelfPromo.hex_colour}
                    opacity={0.06}
                  />
                )}

                {shelf.slots.reduce<{
                  x: number;
                  nodes: React.ReactElement[];
                }>(
                  (acc, slot) => {
                    acc.nodes.push(
                      <SlotShape
                        key={slot.id}
                        slot={slot}
                        x={acc.x}
                        topY={slotTopY}
                        bottomY={slotBottomY}
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

                {remaining > 0 && (
                  <AddSlotZone
                    x={totalSlots}
                    y={slotTopY}
                    width={remaining}
                    height={slotBottomY - slotTopY}
                    disabled={!canEdit}
                    onClick={() => onAddSlot(shelf.id)}
                  />
                )}

                <rect
                  x={0}
                  y={plateTopY}
                  width={unit.width_mm}
                  height={plateBottomY - plateTopY}
                  fill="#414042"
                />

                <text
                  x={-10}
                  y={slotBottomY - 4}
                  fontSize={14}
                  fontFamily="Poppins, system-ui, sans-serif"
                  fontWeight={500}
                  textAnchor="end"
                  fill="#414042"
                >
                  {shelf.shelf_order}
                </text>

                <ShelfBudgetPill
                  shelfId={shelf.id}
                  x={unit.width_mm + 8}
                  y={slotTopY + 8}
                  usedMm={totalSlots}
                  totalMm={unit.width_mm}
                />
              </g>
            );
          }
        )}

        <rect
          x={0}
          y={unitHeight - PLINTH_MM}
          width={unit.width_mm}
          height={PLINTH_MM}
          fill="#F5F2EE"
        />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface SlotShapeProps {
  slot: ShelfSlot;
  x: number;
  topY: number;
  bottomY: number;
  selected: boolean;
  promoHex: string | null;
  onSelect: () => void;
}

function SlotShape({
  slot,
  x,
  topY,
  bottomY,
  selected,
  promoHex,
  onSelect,
}: SlotShapeProps) {
  const [hover, setHover] = useState(false);
  const height = bottomY - topY;
  const width = slot.width_mm;
  const facings = Math.max(1, slot.facing_count);
  const facingW = width / facings;

  const product =
    slot.assignment?.main ??
    slot.assignment?.sub_a ??
    slot.assignment?.sub_b ??
    null;

  const stroke = selected ? '#E12828' : hover ? '#414042' : '#8E8E90';
  const strokeWidth = selected ? 3 : hover ? 2 : 1;

  // A neutral off-white for the product box, slightly warmer on hover.
  const productFill = '#FFFFFF';
  const backFill = promoHex ?? '#EDECE7';

  // Product label sizing — scales with facing width so it remains legible.
  const labelSize = Math.max(13, Math.min(20, facingW / 11));
  const brandSize = Math.max(10, Math.min(14, facingW / 18));

  return (
    <g
      style={{ cursor: 'pointer', transition: 'opacity 150ms' }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <rect
        x={x}
        y={topY}
        width={width}
        height={height}
        fill={backFill}
        opacity={0.45}
      />

      {Array.from({ length: facings }).map((_, i) => {
        const fx = x + i * facingW;
        const productBoxTop =
          bottomY - Math.min(height * 0.82, product?.height_mm ?? height * 0.82);
        const productBoxHeight = bottomY - productBoxTop - 4;
        return (
          <g key={`f-${i}`}>
            {/* Facing product box */}
            <rect
              x={fx + 3}
              y={productBoxTop}
              width={facingW - 6}
              height={productBoxHeight}
              fill={productFill}
              stroke={promoHex ?? '#D6D5CF'}
              strokeWidth={0.75}
              rx={3}
              ry={3}
            />
            {/* Subtle inner tint for empty facings */}
            {!product && (
              <rect
                x={fx + 3}
                y={productBoxTop}
                width={facingW - 6}
                height={productBoxHeight}
                fill={backFill}
                opacity={0.35}
                rx={3}
                ry={3}
                pointerEvents="none"
              />
            )}
            {product && (
              <>
                <text
                  x={fx + facingW / 2}
                  y={productBoxTop + productBoxHeight / 2 + labelSize / 3}
                  fontSize={labelSize}
                  fontFamily="Poppins, system-ui, sans-serif"
                  fontWeight={500}
                  fill="#414042"
                  textAnchor="middle"
                  pointerEvents="none"
                >
                  {initials(product.brand ?? product.name)}
                </text>
                <text
                  x={fx + facingW / 2}
                  y={bottomY - 8}
                  fontSize={brandSize}
                  fontFamily="Poppins, system-ui, sans-serif"
                  fontWeight={300}
                  fill="#757578"
                  textAnchor="middle"
                  pointerEvents="none"
                >
                  {truncate(product.brand ?? product.name, facingW / 14)}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* Slot outline + selection/hover ring, drawn on top */}
      <rect
        x={x}
        y={topY}
        width={width}
        height={height}
        fill="transparent"
        stroke={stroke}
        strokeWidth={strokeWidth}
        pointerEvents="none"
      />

      {/* Slot order indicator */}
      <text
        x={x + 6}
        y={topY + 18}
        fontSize={12}
        fontFamily="ui-monospace, Menlo, monospace"
        fill={selected ? '#E12828' : '#757578'}
        pointerEvents="none"
      >
        #{slot.slot_order}
      </text>
      {facings > 1 && (
        <text
          x={x + width - 8}
          y={topY + 18}
          fontSize={11}
          fontFamily="Poppins, system-ui, sans-serif"
          fontWeight={500}
          fill="#757578"
          textAnchor="end"
          pointerEvents="none"
        >
          ×{facings}
        </text>
      )}

      {!product && (
        <text
          x={x + width / 2}
          y={topY + height / 2 + 4}
          fontSize={12}
          fontFamily="Poppins, system-ui, sans-serif"
          fontWeight={400}
          fill="#9A9A9A"
          fontStyle="italic"
          textAnchor="middle"
          pointerEvents="none"
        >
          Empty slot
        </text>
      )}
    </g>
  );
}

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

interface AddSlotZoneProps {
  x: number;
  y: number;
  width: number;
  height: number;
  disabled: boolean;
  onClick: () => void;
}

function AddSlotZone({
  x,
  y,
  width,
  height,
  disabled,
  onClick,
}: AddSlotZoneProps) {
  const [hover, setHover] = useState(false);
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
        x={x + 6}
        y={y + 6}
        width={Math.max(0, width - 12)}
        height={Math.max(0, height - 12)}
        fill={hover ? 'rgba(225, 40, 40, 0.05)' : 'transparent'}
        stroke={disabled ? 'transparent' : hover ? '#E12828' : '#BFBFBF'}
        strokeWidth={hover ? 1.5 : 1}
        strokeDasharray="10 6"
        rx={4}
        ry={4}
        style={{ transition: 'stroke 150ms, fill 150ms' }}
      />
      {!disabled && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 6}
          fontSize={Math.min(20, Math.max(12, height / 9))}
          fontFamily="Poppins, system-ui, sans-serif"
          fontWeight={500}
          textAnchor="middle"
          fill={hover ? '#E12828' : '#757578'}
          pointerEvents="none"
          style={{ transition: 'fill 150ms' }}
        >
          + Add slot
        </text>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------

interface ShelfBudgetPillProps {
  shelfId: string;
  x: number;
  y: number;
  usedMm: number;
  totalMm: number;
}

function ShelfBudgetPill({
  x,
  y,
  usedMm,
  totalMm,
}: ShelfBudgetPillProps) {
  const over = usedMm > totalMm;
  const pct = Math.min(100, Math.round((usedMm / totalMm) * 100));
  const text = `${usedMm}/${totalMm} mm · ${pct}%`;
  const width = Math.max(110, text.length * 8);
  const height = 22;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={height / 2}
        ry={height / 2}
        fill={over ? 'rgba(225, 40, 40, 0.12)' : 'rgba(65, 64, 66, 0.08)'}
        stroke={over ? '#E12828' : '#D6D5CF'}
        strokeWidth={0.5}
      />
      <text
        x={x + width / 2}
        y={y + height / 2 + 4}
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
