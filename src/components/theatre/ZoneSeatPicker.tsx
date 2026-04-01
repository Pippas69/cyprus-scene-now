import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { SelectedSeat } from './SeatMapViewer';
import { ZONE_ARCS, ROW_ORDER, toRad, annularSectorPath } from './theatreConstants';

interface VenueSeat {
  id: string;
  zone_id: string;
  row_label: string;
  seat_number: number;
  seat_label: string;
  seat_type: string;
  is_active: boolean;
}

interface ZoneSeatPickerProps {
  venueId: string;
  showInstanceId: string;
  zoneId: string;
  zoneName: string;
  zoneColor: string;
  maxSeats: number;
  selectedSeats: SelectedSeat[];
  onSeatToggle: (seat: SelectedSeat) => void;
  onBack: () => void;
}

const translations = {
  el: {
    back: 'Πίσω στις ζώνες',
    loading: 'Φόρτωση θέσεων...',
    available: 'Διαθέσιμη',
    sold: 'Πωλημένη',
    selected: 'Επιλεγμένη',
    noSeats: 'Δεν υπάρχουν θέσεις σε αυτή τη ζώνη',
    stage: 'ΣΚΗΝΗ',
  },
  en: {
    back: 'Back to zones',
    loading: 'Loading seats...',
    available: 'Available',
    sold: 'Sold',
    selected: 'Selected',
    noSeats: 'No seats in this zone',
    stage: 'STAGE',
  },
};

const HC = { x: 500, y: 760 };
const BASE_RADIUS = 180;
const ROW_SPACING = 44;
const SEAT_RADIUS = 12;
const SECTION_GAP = 92;
const EDGE_PAD_DEG = 3;
const UPPER_SECTION_INSET_DEG = 8;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const ZoneSeatPicker: React.FC<ZoneSeatPickerProps> = ({
  venueId,
  showInstanceId,
  zoneId,
  zoneName,
  zoneColor,
  maxSeats,
  selectedSeats,
  onSeatToggle,
  onBack,
}) => {
  const { language } = useLanguage();
  const t = translations[language];

  const [seats, setSeats] = useState<VenueSeat[]>([]);
  const [soldSeatIds, setSoldSeatIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const seatsRes = await supabase
        .from('venue_seats')
        .select('id, zone_id, row_label, seat_number, seat_label, seat_type, is_active')
        .eq('venue_id', venueId)
        .eq('zone_id', zoneId)
        .eq('is_active', true)
        .order('row_label')
        .order('seat_number')
        .limit(1000);

      const loadedSeats = (seatsRes.data || []) as VenueSeat[];
      setSeats(loadedSeats);

      if (showInstanceId !== '__new__') {
        const seatIds = loadedSeats.map((seat) => seat.id);

        if (seatIds.length > 0) {
          const soldRes = await supabase
            .from('show_instance_seats')
            .select('venue_seat_id, status, held_until')
            .eq('show_instance_id', showInstanceId)
            .in('venue_seat_id', seatIds)
            .in('status', ['sold', 'held']);

          if (soldRes.data) {
            const now = new Date();
            setSoldSeatIds(
              new Set(
                soldRes.data
                  .filter((seat: any) => {
                    if (seat.status === 'sold') return true;
                    if (seat.status === 'held' && seat.held_until) return new Date(seat.held_until) > now;
                    return false;
                  })
                  .map((seat: any) => seat.venue_seat_id)
              )
            );
          } else {
            setSoldSeatIds(new Set());
          }
        } else {
          setSoldSeatIds(new Set());
        }
      } else {
        setSoldSeatIds(new Set());
      }

      setLoading(false);
    };

    load();
  }, [venueId, zoneId, showInstanceId]);

  const selectedIds = useMemo(() => new Set(selectedSeats.map((seat) => seat.seatId)), [selectedSeats]);

  const rowGroups = useMemo(() => {
    const grouped = new Map<string, VenueSeat[]>();

    for (const seat of seats) {
      const existing = grouped.get(seat.row_label) || [];
      existing.push(seat);
      grouped.set(seat.row_label, existing);
    }

    const entries = Array.from(grouped.entries());
    entries.sort((a, b) => {
      const indexA = ROW_ORDER.indexOf(a[0]);
      const indexB = ROW_ORDER.indexOf(b[0]);

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      return a[0].localeCompare(b[0]);
    });

    return entries;
  }, [seats]);

  const overviewArc = ZONE_ARCS[zoneName];
  const zoneMidDeg = ((overviewArc?.startDeg ?? 200) + (overviewArc?.endDeg ?? 340)) / 2;

  const maxSeatsInRow = useMemo(
    () => rowGroups.reduce((max, [, rowSeats]) => Math.max(max, rowSeats.length), 0),
    [rowGroups]
  );

  const detailSpanDeg = useMemo(
    () => clamp(maxSeatsInRow * 4.8, 104, 176),
    [maxSeatsInRow]
  );

  const detailStartDeg = zoneMidDeg - detailSpanDeg / 2;
  const detailEndDeg = zoneMidDeg + detailSpanDeg / 2;
  // Split at the boundary between Ι and Κ — rows Α-Ι are the inner (near-stage) section,
  // rows Κ-Σ are the outer section. The gap appears between Ι and Κ.
  const SPLIT_ROW = 'Κ'; // first row of the outer section
  const splitRowOrderIdx = ROW_ORDER.indexOf(SPLIT_ROW);

  const lowerSectionRowCount = useMemo(() => {
    // "lower section" = inner/near-stage rows (Α through Ι)
    // Count how many rows in this zone fall before the split point
    let count = 0;
    for (const [rowLabel] of rowGroups) {
      const idx = ROW_ORDER.indexOf(rowLabel);
      if (idx !== -1 && idx < splitRowOrderIdx) {
        count++;
      } else if (idx === -1) {
        // Non-standard row labels go to inner section
        count++;
      }
    }
    // If all rows are on one side of the split, no gap needed
    if (count === 0 || count === rowGroups.length) return rowGroups.length;
    return count;
  }, [rowGroups, splitRowOrderIdx]);

  const rowLayouts = useMemo(() => {
    return rowGroups.map(([rowLabel, rowSeats], rowIdx) => {
      const isLowerSection = rowIdx < lowerSectionRowCount;
      const localRowIdx = isLowerSection ? rowIdx : rowIdx - lowerSectionRowCount;
      const radius = isLowerSection
        ? BASE_RADIUS + localRowIdx * ROW_SPACING
        : BASE_RADIUS + lowerSectionRowCount * ROW_SPACING + SECTION_GAP + localRowIdx * ROW_SPACING;

      const startDeg = detailStartDeg + EDGE_PAD_DEG + (isLowerSection ? 0 : UPPER_SECTION_INSET_DEG);
      const endDeg = detailEndDeg - EDGE_PAD_DEG - (isLowerSection ? 0 : UPPER_SECTION_INSET_DEG);

      return {
        rowLabel,
        rowSeats: [...rowSeats].sort((a, b) => a.seat_number - b.seat_number),
        radius,
        isLowerSection,
        startDeg,
        endDeg,
      };
    });
  }, [rowGroups, lowerSectionRowCount, detailStartDeg, detailEndDeg]);

  const seatPositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();

    rowLayouts.forEach(({ rowSeats, radius, startDeg, endDeg }) => {
      rowSeats.forEach((seat, seatIdx) => {
        const angle = rowSeats.length === 1
          ? (startDeg + endDeg) / 2
          : startDeg + (seatIdx / (rowSeats.length - 1)) * (endDeg - startDeg);

        const rad = toRad(angle);
        positions.set(seat.id, {
          x: HC.x + radius * Math.cos(rad),
          y: HC.y + radius * Math.sin(rad),
        });
      });
    });

    return positions;
  }, [rowLayouts]);

  const outermostRadius = rowLayouts.length > 0 ? rowLayouts[rowLayouts.length - 1].radius + SEAT_RADIUS + 28 : BASE_RADIUS + 80;
  const titleRadius = outermostRadius + 46;
  const stageRadius = Math.max(72, BASE_RADIUS - 78);
  const svgMinWidth = Math.max(980, maxSeatsInRow * 30);

  const viewBox = useMemo(() => {
    if (seatPositions.size === 0) return '0 0 1200 900';

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    seatPositions.forEach(({ x, y }) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

    const boundaryAngles = [detailStartDeg, zoneMidDeg, detailEndDeg].map(toRad);
    boundaryAngles.forEach((rad) => {
      const bx = HC.x + outermostRadius * Math.cos(rad);
      const by = HC.y + outermostRadius * Math.sin(rad);
      minX = Math.min(minX, bx);
      minY = Math.min(minY, by);
      maxX = Math.max(maxX, bx);
      maxY = Math.max(maxY, by);
    });

    const titleRad = toRad(zoneMidDeg);
    const titleX = HC.x + titleRadius * Math.cos(titleRad);
    const titleY = HC.y + titleRadius * Math.sin(titleRad);
    minX = Math.min(minX, titleX);
    minY = Math.min(minY, titleY);
    maxX = Math.max(maxX, titleX);
    maxY = Math.max(maxY, titleY);

    const stageRad = toRad(zoneMidDeg);
    const stageX = HC.x + stageRadius * Math.cos(stageRad);
    const stageY = HC.y + stageRadius * Math.sin(stageRad);
    minX = Math.min(minX, stageX);
    minY = Math.min(minY, stageY);
    maxX = Math.max(maxX, stageX);
    maxY = Math.max(maxY, stageY);

    const padX = 90;
    const padTop = 90;
    const padBottom = 80;
    const width = maxX - minX + padX * 2;
    const height = maxY - minY + padTop + padBottom;

    return `${minX - padX} ${minY - padTop} ${width} ${height}`;
  }, [seatPositions, detailStartDeg, zoneMidDeg, detailEndDeg, outermostRadius, titleRadius, stageRadius]);

  const lowerSection = rowLayouts.slice(0, lowerSectionRowCount);
  const upperSection = rowLayouts.slice(lowerSectionRowCount);

  const handleSeatClick = useCallback(
    (seat: VenueSeat) => {
      if (soldSeatIds.has(seat.id)) return;

      const seatData: SelectedSeat = {
        seatId: seat.id,
        label: seat.seat_label,
        zoneName,
        zoneId,
        zoneColor,
        rowLabel: seat.row_label,
        seatNumber: seat.seat_number,
      };

      if (selectedIds.has(seat.id) || selectedSeats.length < maxSeats) {
        onSeatToggle(seatData);
      }
    },
    [soldSeatIds, zoneName, zoneId, zoneColor, selectedIds, selectedSeats.length, maxSeats, onSeatToggle]
  );

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        <div className="animate-pulse text-sm">{t.loading}</div>
      </div>
    );
  }

  if (rowGroups.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t.noSeats}</p>;
  }

  const zoneLetter = zoneName.replace('Τμήμα ', '');

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8 gap-1 px-2 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.back}
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: zoneColor }} />
          <span className="text-sm font-semibold">{zoneName}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-1.5">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 text-[8px]"
            style={{ borderColor: zoneColor, color: zoneColor }}
          >
            1
          </div>
          <span className="text-[11px] text-muted-foreground">{t.available}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/60 text-[8px] text-muted-foreground/50">
            1
          </div>
          <span className="text-[11px] text-muted-foreground">{t.sold}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[8px] text-primary-foreground">
            1
          </div>
          <span className="text-[11px] text-muted-foreground">{t.selected}</span>
        </div>
      </div>

      <div className="w-full overflow-auto rounded-md" style={{ maxHeight: '72vh', WebkitOverflowScrolling: 'touch' }}>
        <svg
          viewBox={viewBox}
          className="block h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          style={{ minWidth: `${svgMinWidth}px` }}
        >
          <text
            x={HC.x + titleRadius * Math.cos(toRad(zoneMidDeg))}
            y={HC.y + titleRadius * Math.sin(toRad(zoneMidDeg))}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={34}
            fontWeight={800}
            fill={zoneColor}
            opacity={0.9}
            className="pointer-events-none select-none"
          >
            {zoneLetter}
          </text>

          {lowerSection.length > 0 && (
            <path
              d={annularSectorPath(
                HC.x,
                HC.y,
                Math.max(48, lowerSection[0].radius - 28),
                lowerSection[lowerSection.length - 1].radius + 26,
                detailStartDeg,
                detailEndDeg
              )}
              fill={zoneColor}
              fillOpacity={0.06}
              stroke={zoneColor}
              strokeOpacity={0.24}
              strokeWidth={1.5}
            />
          )}

          {upperSection.length > 0 && (
            <path
              d={annularSectorPath(
                HC.x,
                HC.y,
                upperSection[0].radius - 28,
                upperSection[upperSection.length - 1].radius + 26,
                detailStartDeg + UPPER_SECTION_INSET_DEG,
                detailEndDeg - UPPER_SECTION_INSET_DEG
              )}
              fill={zoneColor}
              fillOpacity={0.06}
              stroke={zoneColor}
              strokeOpacity={0.24}
              strokeWidth={1.5}
            />
          )}

          <path
            d={`M ${HC.x + outermostRadius * Math.cos(toRad(detailStartDeg))} ${HC.y + outermostRadius * Math.sin(toRad(detailStartDeg))} A ${outermostRadius} ${outermostRadius} 0 ${Math.abs(detailEndDeg - detailStartDeg) > 180 ? 1 : 0} 1 ${HC.x + outermostRadius * Math.cos(toRad(detailEndDeg))} ${HC.y + outermostRadius * Math.sin(toRad(detailEndDeg))}`}
            fill="none"
            stroke="hsl(var(--destructive) / 0.7)"
            strokeWidth={3}
            strokeLinecap="round"
          />

          {upperSection.length > 0 && (
            <>
              <path
                d={`M ${HC.x + (lowerSection[lowerSection.length - 1].radius + 22) * Math.cos(toRad(detailStartDeg))} ${HC.y + (lowerSection[lowerSection.length - 1].radius + 22) * Math.sin(toRad(detailStartDeg))} A ${lowerSection[lowerSection.length - 1].radius + 22} ${lowerSection[lowerSection.length - 1].radius + 22} 0 ${Math.abs(detailEndDeg - detailStartDeg) > 180 ? 1 : 0} 1 ${HC.x + (lowerSection[lowerSection.length - 1].radius + 22) * Math.cos(toRad(detailEndDeg))} ${HC.y + (lowerSection[lowerSection.length - 1].radius + 22) * Math.sin(toRad(detailEndDeg))}`}
                fill="none"
                stroke={zoneColor}
                strokeOpacity={0.2}
                strokeWidth={1.5}
                strokeDasharray="6 6"
              />
              <path
                d={`M ${HC.x + (upperSection[0].radius - 22) * Math.cos(toRad(detailStartDeg + UPPER_SECTION_INSET_DEG))} ${HC.y + (upperSection[0].radius - 22) * Math.sin(toRad(detailStartDeg + UPPER_SECTION_INSET_DEG))} A ${upperSection[0].radius - 22} ${upperSection[0].radius - 22} 0 ${Math.abs(detailEndDeg - detailStartDeg) > 180 ? 1 : 0} 1 ${HC.x + (upperSection[0].radius - 22) * Math.cos(toRad(detailEndDeg - UPPER_SECTION_INSET_DEG))} ${HC.y + (upperSection[0].radius - 22) * Math.sin(toRad(detailEndDeg - UPPER_SECTION_INSET_DEG))}`}
                fill="none"
                stroke={zoneColor}
                strokeOpacity={0.2}
                strokeWidth={1.5}
                strokeDasharray="6 6"
              />
            </>
          )}

          {rowLayouts.map(({ rowLabel, radius, startDeg, endDeg }) => {
            const leftAngle = toRad(startDeg - 4);
            const rightAngle = toRad(endDeg + 4);
            const leftX = HC.x + radius * Math.cos(leftAngle);
            const leftY = HC.y + radius * Math.sin(leftAngle);
            const rightX = HC.x + radius * Math.cos(rightAngle);
            const rightY = HC.y + radius * Math.sin(rightAngle);

            return (
              <React.Fragment key={`label-${rowLabel}`}>
                <text
                  x={leftX}
                  y={leftY}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={12}
                  fontWeight={700}
                  fill="hsl(var(--muted-foreground))"
                  className="pointer-events-none select-none"
                >
                  {rowLabel}
                </text>
                <text
                  x={rightX}
                  y={rightY}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontSize={12}
                  fontWeight={700}
                  fill="hsl(var(--muted-foreground))"
                  className="pointer-events-none select-none"
                >
                  {rowLabel}
                </text>
              </React.Fragment>
            );
          })}

          {rowLayouts.flatMap(({ rowSeats }) =>
            rowSeats.map((seat) => {
              const position = seatPositions.get(seat.id);
              if (!position) return null;

              const isSold = soldSeatIds.has(seat.id);
              const isSelected = selectedIds.has(seat.id);
              const atMax = selectedSeats.length >= maxSeats && !isSelected;
              const isHovered = hoveredSeat === seat.id;

              let fill = 'transparent';
              let stroke = zoneColor;
              let textColor = zoneColor;
              let strokeWidth = 1.6;
              let opacity = 1;
              let cursor: React.CSSProperties['cursor'] = 'pointer';

              if (isSold) {
                fill = 'hsl(var(--muted) / 0.75)';
                stroke = 'hsl(var(--border))';
                textColor = 'hsl(var(--muted-foreground) / 0.45)';
                cursor = 'not-allowed';
              } else if (isSelected) {
                fill = 'hsl(var(--primary))';
                stroke = 'hsl(var(--primary))';
                textColor = 'hsl(var(--primary-foreground))';
                strokeWidth = 2;
              } else if (atMax) {
                opacity = 0.35;
                cursor = 'not-allowed';
              } else if (isHovered) {
                fill = zoneColor;
                textColor = 'hsl(var(--background))';
                strokeWidth = 2.2;
              }

              return (
                <g
                  key={seat.id}
                  style={{ cursor, opacity }}
                  onClick={() => handleSeatClick(seat)}
                  onMouseEnter={() => setHoveredSeat(seat.id)}
                  onMouseLeave={() => setHoveredSeat(null)}
                >
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r={SEAT_RADIUS}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                  />
                  <text
                    x={position.x}
                    y={position.y + 0.5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={8}
                    fontWeight={700}
                    fill={textColor}
                    className="pointer-events-none select-none"
                  >
                    {seat.seat_number}
                  </text>
                </g>
              );
            })
          )}

          <text
            x={HC.x + stageRadius * Math.cos(toRad(zoneMidDeg))}
            y={HC.y + stageRadius * Math.sin(toRad(zoneMidDeg))}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={14}
            fontWeight={800}
            fill="hsl(var(--primary) / 0.55)"
            letterSpacing="0.08em"
            className="pointer-events-none select-none"
          >
            ↓ {t.stage}
          </text>
        </svg>
      </div>

      {selectedSeats.filter((seat) => seat.zoneId === zoneId).length > 0 && (
        <div className="flex flex-wrap gap-1 border-t px-1 pt-1">
          {selectedSeats
            .filter((seat) => seat.zoneId === zoneId)
            .map((seat) => (
              <button
                key={seat.seatId}
                onClick={() => onSeatToggle(seat)}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/80"
              >
                {seat.label}
                <span className="text-[10px] opacity-70">✕</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};