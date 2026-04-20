'use client';

import { useMemo, useState } from 'react';
import type { PromoSectionSummary } from '@/lib/configurator/types';
import type { ShelfRow, UnitWithShelves } from '@/lib/shelf/types';

interface Props {
  unit: UnitWithShelves;
  promoSections: PromoSectionSummary[];
  canEdit: boolean;
  selectedSlotId: string | null;
  totalSlotWidthByShelf: Map<string, number>;
  onSelectSlot: (slotId: string | null) => void;
  onAddSlot: (shelfId: string, widthMm: number) => void;
}

const HEADER_MM = 80;
const PLINTH_MM = 140;
const SHELF_THICKNESS_MM = 16;

/**
 * ShelfCanvas — SVG elevation view of a single unit.
 *
 * Coordinate system is mm (viewBox = unit width × unit height). The browser
 * scales to available space. Shelves stack top-to-bottom with cumulative
 * clearance; slots fill the vertical span between their shelf and the one
 * above. Click an empty shelf region to add a slot, click a slot to select.
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

  // Layout: compute shelf vertical positions once per unit/shelf layout.
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

  // The SVG is sized to unit.height_mm; if shelves overflow, extend gracefully.
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
        viewBox={`-10 -10 ${unit.width_mm + 20} ${unitHeight + 20}`}
        preserveAspectRatio="xMidYMin meet"
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: '100%',
          background: unitFillOutside,
          borderRadius: 6,
        }}
      >
        {/* Unit frame */}
        <rect
          x={0}
          y={0}
          width={unit.width_mm}
          height={unitHeight}
          fill="#FFFFFF"
          stroke="#414042"
          strokeWidth={3}
        />

        {/* Header zone */}
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

        {/* Shelves */}
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
                {/* Slot zone background tinted by the shelf's (or unit's) promo */}
                {shelfPromo && (
                  <rect
                    x={0}
                    y={slotTopY}
                    width={unit.width_mm}
                    height={slotBottomY - slotTopY}
                    fill={shelfPromo.hex_colour}
                    opacity={0.08}
                  />
                )}

                {/* Slots sitting on this shelf */}
                {shelf.slots.reduce<{
                  x: number;
                  nodes: React.ReactElement[];
                }>(
                  (acc, slot) => {
                    const slotHeight = slotBottomY - slotTopY;
                    const product =
                      slot.assignment?.main ??
                      slot.assignment?.sub_a ??
                      slot.assignment?.sub_b ??
                      null;
                    const fill =
                      shelfPromo?.hex_colour ?? '#EDECE7';
                    const stroke =
                      slot.id === selectedSlotId ? '#E12828' : '#414042';
                    const strokeWidth =
                      slot.id === selectedSlotId ? 3 : 1;
                    acc.nodes.push(
                      <g
                        key={slot.id}
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSlot(slot.id);
                        }}
                      >
                        <rect
                          x={acc.x}
                          y={slotTopY}
                          width={slot.width_mm}
                          height={slotHeight}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={strokeWidth}
                        />
                        {product && (
                          <g>
                            {/* Facing strip near the base */}
                            <rect
                              x={acc.x + 4}
                              y={slotBottomY - Math.min(slotHeight * 0.85, 240)}
                              width={slot.width_mm - 8}
                              height={Math.min(slotHeight * 0.85, 240) - 4}
                              fill="#FFFFFF"
                              stroke="#414042"
                              strokeWidth={0.5}
                            />
                            <text
                              x={acc.x + 10}
                              y={slotBottomY - 18}
                              fontSize={Math.max(14, slot.width_mm / 12)}
                              fontFamily="Poppins, system-ui, sans-serif"
                              fontWeight={500}
                              fill="#414042"
                            >
                              {truncate(product.name, slot.width_mm / 14)}
                            </text>
                            {product.brand && (
                              <text
                                x={acc.x + 10}
                                y={slotBottomY - 38}
                                fontSize={Math.max(11, slot.width_mm / 16)}
                                fontFamily="Poppins, system-ui, sans-serif"
                                fontWeight={300}
                                fill="#757578"
                              >
                                {truncate(product.brand, slot.width_mm / 16)}
                              </text>
                            )}
                          </g>
                        )}
                        {!product && (
                          <text
                            x={acc.x + slot.width_mm / 2}
                            y={(slotTopY + slotBottomY) / 2 + 6}
                            fontSize={Math.max(14, slot.width_mm / 12)}
                            fontFamily="Poppins, system-ui, sans-serif"
                            fontWeight={400}
                            fill="#757578"
                            textAnchor="middle"
                          >
                            Empty
                          </text>
                        )}
                        <text
                          x={acc.x + 8}
                          y={slotTopY + 22}
                          fontSize={12}
                          fontFamily="ui-monospace, Menlo, monospace"
                          fill={
                            slot.id === selectedSlotId
                              ? '#E12828'
                              : '#757578'
                          }
                        >
                          #{slot.slot_order}
                        </text>
                      </g>
                    );
                    acc.x += slot.width_mm;
                    return acc;
                  },
                  { x: 0, nodes: [] }
                ).nodes}

                {/* Remaining empty area — clickable to add a new slot */}
                {remaining > 0 && (
                  <AddSlotZone
                    x={totalSlots}
                    y={slotTopY}
                    width={remaining}
                    height={slotBottomY - slotTopY}
                    disabled={!canEdit}
                    onConfirm={(widthMm) => onAddSlot(shelf.id, widthMm)}
                  />
                )}

                {/* Shelf plate */}
                <rect
                  x={0}
                  y={plateTopY}
                  width={unit.width_mm}
                  height={plateBottomY - plateTopY}
                  fill="#414042"
                />

                {/* Shelf label on the left gutter */}
                <text
                  x={-4}
                  y={slotBottomY - 4}
                  fontSize={13}
                  fontFamily="Poppins, system-ui, sans-serif"
                  fontWeight={500}
                  textAnchor="end"
                  fill="#414042"
                >
                  {shelf.shelf_order}
                </text>
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
          fill="#F5F2EE"
        />
      </svg>
    </div>
  );
}

function truncate(s: string, maxChars: number): string {
  const n = Math.max(6, Math.floor(maxChars));
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1)}…`;
}

interface AddSlotZoneProps {
  x: number;
  y: number;
  width: number;
  height: number;
  disabled: boolean;
  onConfirm: (widthMm: number) => void;
}

function AddSlotZone({
  x,
  y,
  width,
  height,
  disabled,
  onConfirm,
}: AddSlotZoneProps) {
  const [hover, setHover] = useState(false);

  return (
    <g
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={(e) => {
        if (disabled) return;
        e.stopPropagation();
        const raw = prompt(
          'New slot width (mm)?',
          String(Math.min(300, width))
        );
        if (!raw) return;
        const parsed = Number.parseInt(raw, 10);
        if (!Number.isFinite(parsed) || parsed <= 0) return;
        const clamped = Math.min(parsed, width);
        onConfirm(clamped);
      }}
      style={{ cursor: disabled ? 'default' : 'pointer' }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={hover ? 'rgba(225, 40, 40, 0.06)' : 'transparent'}
        stroke={disabled ? 'transparent' : '#BFBFBF'}
        strokeWidth={1}
        strokeDasharray="8 6"
      />
      {!disabled && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 6}
          fontSize={Math.max(12, height / 10)}
          fontFamily="Poppins, system-ui, sans-serif"
          fontWeight={500}
          textAnchor="middle"
          fill={hover ? '#E12828' : '#757578'}
          pointerEvents="none"
        >
          + Add slot
        </text>
      )}
    </g>
  );
}
