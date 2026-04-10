import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { SelectedSeat } from './SeatMapViewer';
import { ZONE_ARCS, toRad, annularSectorPath } from './theatreConstants';

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

const HC = { x: 500, y: 900 };
const BASE_RADIUS = 360;
const SECTION_GAP = 28;
const EDGE_PAD_DEG = 2;
const UPPER_SECTION_INSET_DEG = 3;

const OUTER_ROWS = ['Σ', 'Ρ', 'Π', 'Ο', 'Ξ', 'Ν', 'Μ', 'Λ', 'Κ'] as const;
const INNER_ROWS = ['Ι', 'Θ', 'Η', 'Ζ', 'Ε', 'Δ', 'Γ', 'Β', 'Α'] as const;
const FULL_ROWS_DESC = [...OUTER_ROWS, ...INNER_ROWS];
const INNER_COUNT = INNER_ROWS.length;
const OUTER_COUNT = OUTER_ROWS.length;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Dynamic sizing based on density
function getDynamicSizes(maxSeatsInRow: number) {
  if (maxSeatsInRow <= 12) return { seatRadius: 12, rowSpacing: 28 };
  if (maxSeatsInRow <= 20) return { seatRadius: 10, rowSpacing: 24 };
  if (maxSeatsInRow <= 30) return { seatRadius: 8, rowSpacing: 22 };
  return { seatRadius: 7, rowSpacing: 20 };
}

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

  // Zoom & pan state
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const lastTouchDist = useRef<number | null>(null);

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

  // Reset zoom/pan when zone changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [zoneId]);

  const selectedIds = useMemo(() => new Set(selectedSeats.map((seat) => seat.seatId)), [selectedSeats]);

  const seatsByRow = useMemo(() => {
    const grouped = new Map<string, VenueSeat[]>();
    for (const seat of seats) {
      const existing = grouped.get(seat.row_label) || [];
      existing.push(seat);
      grouped.set(seat.row_label, existing);
    }
    return grouped;
  }, [seats]);

  const overviewArc = ZONE_ARCS[zoneName];
  const zoneMidDeg = ((overviewArc?.startDeg ?? 200) + (overviewArc?.endDeg ?? 340)) / 2;

  const maxSeatsInRow = useMemo(() => {
    let max = 0;
    seatsByRow.forEach((rowSeats) => { max = Math.max(max, rowSeats.length); });
    return Math.max(max, 10);
  }, [seatsByRow]);

  const { seatRadius, rowSpacing } = useMemo(() => getDynamicSizes(maxSeatsInRow), [maxSeatsInRow]);

  // Fixed angular seat spacing based on seat size — no global arc span needed

  const rowLayouts = useMemo(() => {
    const outerCounts = OUTER_ROWS.map((label) => (seatsByRow.get(label) || []).length);
    const innerCounts = INNER_ROWS.map((label) => (seatsByRow.get(label) || []).length);

    const getSmoothedCount = (counts: number[], index: number) => {
      const curr = counts[index] ?? 0;
      if (curr === 0) return 0;
      const rawPrev = counts[Math.max(0, index - 1)] ?? 0;
      const rawNext = counts[Math.min(counts.length - 1, index + 1)] ?? 0;
      // Exclude short-row neighbors (< 60% of current) to prevent them from narrowing full rows
      const prev = rawPrev < curr * 0.6 ? curr : rawPrev;
      const next = rawNext < curr * 0.6 ? curr : rawNext;
      return (prev + curr * 2 + next) / 4;
    };

    const getReferenceCount = (counts: number[], index: number) => {
      const nearby = [index - 2, index - 1, index, index + 1, index + 2]
        .map((i) => counts[i] ?? 0)
        .filter((count) => count > 0);

      return nearby.length > 0 ? Math.max(...nearby) : counts[index] ?? 0;
    };

    // --- Compute per-section max smoothed count for unified envelope ---
    const outerSmoothed = outerCounts.map((_, i) => getSmoothedCount(outerCounts, i));
    const innerSmoothed = innerCounts.map((_, i) => getSmoothedCount(innerCounts, i));
    const maxOuterSmoothed = outerSmoothed.length > 0 ? Math.max(...outerSmoothed) : 0;
    const maxInnerSmoothed = innerSmoothed.length > 0 ? Math.max(...innerSmoothed) : 0;

    return FULL_ROWS_DESC.map((rowLabel, idx) => {
      const isOuter = idx < OUTER_COUNT;
      const rowSeats = seatsByRow.get(rowLabel) || [];
      const sectionIndex = isOuter ? idx : idx - OUTER_COUNT;
      const sectionCounts = isOuter ? outerCounts : innerCounts;

      let radius: number;
      if (isOuter) {
        const localIdx = OUTER_COUNT - 1 - idx;
        radius = BASE_RADIUS + INNER_COUNT * rowSpacing + SECTION_GAP + localIdx * rowSpacing;
      } else {
        const innerIdx = idx - OUTER_COUNT;
        const localIdx = INNER_COUNT - 1 - innerIdx;
        radius = BASE_RADIUS + localIdx * rowSpacing;
      }

      const paddingDeg = isOuter ? 4 : 3;
      const seatAngleDeg = ((seatRadius * 2.05) / radius) * (180 / Math.PI);
      const rawSpanDeg = rowSeats.length > 1 ? (rowSeats.length - 1) * seatAngleDeg : 0;
      const smoothedCount = getSmoothedCount(sectionCounts, sectionIndex);
      
      // Detect short rows by comparing to the MAX of nearby rows (not the smoothed average)
      const maxNearby = getReferenceCount(sectionCounts, sectionIndex);
      const isShortRow = rowSeats.length > 0 && maxNearby > 0 && rowSeats.length < maxNearby * 0.6;

      // Use section-wide max smoothed count as envelope for ALL rows (unified alignment)
      const sectionMaxSmoothed = isOuter ? maxOuterSmoothed : maxInnerSmoothed;

      // For short rows, find closest non-short neighbor's smoothed count (same as before)
      let fullEnvelopeCount = sectionMaxSmoothed;
      if (isShortRow) {
        let refCount = sectionMaxSmoothed;
        for (let d = 1; d <= sectionCounts.length; d++) {
          for (const dir of [sectionIndex + d, sectionIndex - d]) {
            if (dir >= 0 && dir < sectionCounts.length) {
              const nc = sectionCounts[dir];
              if (nc >= maxNearby * 0.6) {
                refCount = getSmoothedCount(sectionCounts, dir);
                d = sectionCounts.length; // break outer
                break;
              }
            }
          }
        }
        fullEnvelopeCount = Math.max(refCount, sectionMaxSmoothed);
      }

      // Full row width — use section-wide envelope for consistent alignment
      const fullSpanDeg = rowSeats.length > 0
        ? (sectionMaxSmoothed > 1
          ? (sectionMaxSmoothed - 1) * seatAngleDeg + paddingDeg
          : rawSpanDeg + paddingDeg)
        : 0;

      const fullStartDeg = zoneMidDeg - fullSpanDeg / 2;
      const fullEndDeg = zoneMidDeg + fullSpanDeg / 2;

      // Per-seat step for short rows: same density as a full row at this radius
      const seatStepDeg = isShortRow && fullEnvelopeCount > 1
        ? fullSpanDeg / (fullEnvelopeCount - 1)
        : seatAngleDeg;

      return {
        rowLabel,
        rowSeats: [...rowSeats].sort((a, b) => a.seat_number - b.seat_number),
        radius,
        isOuter,
        fullStartDeg,
        fullEndDeg,
        startDeg: fullStartDeg,
        endDeg: fullEndDeg,
        hasData: rowSeats.length > 0,
        isShortRow,
        seatStepDeg,
        seatAngleDeg,
      };
    });
  }, [seatsByRow, zoneMidDeg, rowSpacing, seatRadius]);

  const seatPositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();

    rowLayouts.forEach(({ rowSeats, radius, fullStartDeg, fullEndDeg, isShortRow, seatStepDeg }) => {
      rowSeats.forEach((seat, seatIdx) => {
        let angle: number;
        if (isShortRow) {
          // Place seats from left edge using same density as full neighboring rows
          angle = fullStartDeg + seatIdx * seatStepDeg;
        } else {
          angle = rowSeats.length === 1
            ? zoneMidDeg
            : fullStartDeg + (seatIdx / (rowSeats.length - 1)) * (fullEndDeg - fullStartDeg);
        }

        const rad = toRad(angle);
        positions.set(seat.id, {
          x: HC.x + radius * Math.cos(rad),
          y: HC.y + radius * Math.sin(rad),
        });
      });
    });

    return positions;
  }, [rowLayouts, zoneMidDeg]);

  // Simple bounding-box viewBox from actual seat positions + row endpoints
  const viewBox = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const expand = (x: number, y: number) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    };

    // Include all row arc endpoints
    rowLayouts.forEach(({ radius, startDeg, endDeg }) => {
      [startDeg, (startDeg + endDeg) / 2, endDeg].forEach((deg) => {
        const rad = toRad(deg);
        expand(HC.x + radius * Math.cos(rad), HC.y + radius * Math.sin(rad));
      });
    });

    // Include seat positions
    seatPositions.forEach(({ x, y }) => expand(x, y));

    // Include stage label area
    const stageR = Math.max(60, BASE_RADIUS - 60);
    const stageRad = toRad(zoneMidDeg);
    expand(HC.x + stageR * Math.cos(stageRad), HC.y + stageR * Math.sin(stageRad));

    const pad = 60;
    const width = maxX - minX + pad * 2;
    const height = maxY - minY + pad * 2;
    return `${minX - pad} ${minY - pad} ${width} ${height}`;
  }, [rowLayouts, seatPositions, zoneMidDeg]);

  // Zoom/pan handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => clamp(z * delta, 0.5, 4));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: pan.x, panY: pan.y };
    }
  }, [pan]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / lastTouchDist.current;
      lastTouchDist.current = dist;
      setZoom((z) => clamp(z * scale, 0.5, 4));
    } else if (e.touches.length === 1 && isDragging) {
      setPan({
        x: dragStart.current.panX + (e.touches[0].clientX - dragStart.current.x),
        y: dragStart.current.panY + (e.touches[0].clientY - dragStart.current.y),
      });
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    lastTouchDist.current = null;
  }, []);

  const handleSeatClick = useCallback(
    (seat: VenueSeat) => {
      if (isDragging) return;
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
    [isDragging, soldSeatIds, zoneName, zoneId, zoneColor, selectedIds, selectedSeats.length, maxSeats, onSeatToggle]
  );

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        <div className="animate-pulse text-sm">{t.loading}</div>
      </div>
    );
  }

  if (seats.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t.noSeats}</p>;
  }

  const zoneLetter = zoneName.replace('Τμήμα ', '');
  const outerSection = rowLayouts.slice(0, OUTER_COUNT);
  const innerSection = rowLayouts.slice(OUTER_COUNT);
  const stageRadius = Math.max(60, BASE_RADIUS - 60);

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

      {/* Zoomable/pannable container */}
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-md touch-none"
        style={{ maxHeight: '72vh', cursor: isDragging ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <svg
          viewBox={viewBox}
          className="block h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          {/* Zone letter title — compact */}
          <text
            x={HC.x + (rowLayouts[0].radius + seatRadius + 36) * Math.cos(toRad(zoneMidDeg))}
            y={HC.y + (rowLayouts[0].radius + seatRadius + 36) * Math.sin(toRad(zoneMidDeg))}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={22}
            fontWeight={800}
            fill={zoneColor}
            opacity={0.8}
            className="pointer-events-none select-none"
          >
            {zoneLetter}
          </text>

          {/* Inner section background */}
          {(() => {
            const innerRows = innerSection.filter(r => r.hasData);
            if (innerRows.length === 0) return null;
            const bgStart = Math.min(...innerRows.map(r => r.startDeg)) - 4;
            const bgEnd = Math.max(...innerRows.map(r => r.endDeg)) + 4;
            return (
              <path
                d={annularSectorPath(
                  HC.x, HC.y,
                  Math.max(48, innerSection[innerSection.length - 1].radius - 20),
                  innerSection[0].radius + 18,
                  bgStart, bgEnd
                )}
                fill={zoneColor}
                fillOpacity={0.05}
                stroke={zoneColor}
                strokeOpacity={0.18}
                strokeWidth={1}
              />
            );
          })()}

          {/* Outer section background */}
          {(() => {
            const outerRows = outerSection.filter(r => r.hasData);
            if (outerRows.length === 0) return null;
            const bgStart = Math.min(...outerRows.map(r => r.startDeg)) - 4;
            const bgEnd = Math.max(...outerRows.map(r => r.endDeg)) + 4;
            return (
              <path
                d={annularSectorPath(
                  HC.x, HC.y,
                  outerSection[outerSection.length - 1].radius - 20,
                  outerSection[0].radius + 18,
                  bgStart, bgEnd
                )}
                fill={zoneColor}
                fillOpacity={0.05}
                stroke={zoneColor}
                strokeOpacity={0.18}
                strokeWidth={1}
              />
            );
          })()}

          {/* Simple section gap divider */}
          {(() => {
            const allRows = rowLayouts.filter(r => r.hasData);
            if (allRows.length === 0) return null;
            const bgStart = Math.min(...allRows.map(r => r.startDeg)) - 2;
            const bgEnd = Math.max(...allRows.map(r => r.endDeg)) + 2;
            const gapR = (innerSection[0].radius + outerSection[outerSection.length - 1].radius) / 2;
            const s = toRad(bgStart);
            const e = toRad(bgEnd);
            return (
              <path
                d={`M ${HC.x + gapR * Math.cos(s)} ${HC.y + gapR * Math.sin(s)} A ${gapR} ${gapR} 0 0 1 ${HC.x + gapR * Math.cos(e)} ${HC.y + gapR * Math.sin(e)}`}
                fill="none"
                stroke={zoneColor}
                strokeOpacity={0.15}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            );
          })()}

          {/* Row labels */}
          {rowLayouts.map(({ rowLabel, radius, startDeg, endDeg, hasData }) => {
            const leftAngle = toRad(startDeg - 3);
            const rightAngle = toRad(endDeg + 3);
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
                  fontSize={10}
                  fontWeight={700}
                  fill="hsl(var(--muted-foreground))"
                  opacity={hasData ? 1 : 0.3}
                  className="pointer-events-none select-none"
                >
                  {rowLabel}
                </text>
                <text
                  x={rightX}
                  y={rightY}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontSize={10}
                  fontWeight={700}
                  fill="hsl(var(--muted-foreground))"
                  opacity={hasData ? 1 : 0.3}
                  className="pointer-events-none select-none"
                >
                  {rowLabel}
                </text>
              </React.Fragment>
            );
          })}

          {/* Seats */}
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
              let strokeWidth = 1.4;
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
                strokeWidth = 2;
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
                    r={seatRadius}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                  />
                  {seatRadius >= 8 && (
                    <text
                      x={position.x}
                      y={position.y + 0.5}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={seat.seat_type === 'wheelchair' ? (seatRadius >= 10 ? 10 : 8) : (seatRadius >= 10 ? 8 : 6)}
                      fontWeight={700}
                      fill={textColor}
                      className="pointer-events-none select-none"
                    >
                      {seat.seat_type === 'wheelchair' ? '♿' : seat.seat_number}
                    </text>
                  )}
                </g>
              );
            })
          )}

          {/* Stage indicator — fixed below inner arc */}
          <text
            x={HC.x + stageRadius * Math.cos(toRad(zoneMidDeg))}
            y={HC.y + stageRadius * Math.sin(toRad(zoneMidDeg))}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            fontWeight={700}
            fill="hsl(var(--primary) / 0.5)"
            letterSpacing="0.1em"
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
