import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { SelectedSeat } from './SeatMapViewer';
import { ZONE_ARCS, ROW_ORDER, toRad } from './theatreConstants';

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
    row: 'Σειρά',
    loading: 'Φόρτωση θέσεων...',
    available: 'Διαθέσιμη',
    sold: 'Πωλημένη',
    selected: 'Επιλεγμένη',
    noSeats: 'Δεν υπάρχουν θέσεις σε αυτή τη ζώνη',
    maxReached: 'Μέγιστος αριθμός θέσεων',
    stage: 'ΣΚΗΝΗ',
  },
  en: {
    back: 'Back to zones',
    row: 'Row',
    loading: 'Loading seats...',
    available: 'Available',
    sold: 'Sold',
    selected: 'Selected',
    noSeats: 'No seats in this zone',
    maxReached: 'Maximum seats reached',
    stage: 'STAGE',
  },
};

// Horseshoe center for the curved layout
const HC = { x: 500, y: 600 };
const BASE_RADIUS = 120;
const ROW_SPACING = 32;
const SEAT_RADIUS = 10;
const AISLE_GAP_DEG = 3.5; // gap in degrees between two sections

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
  const svgRef = useRef<SVGSVGElement>(null);

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

      setSeats((seatsRes.data || []) as VenueSeat[]);

      if (showInstanceId !== '__new__') {
        const seatIds = (seatsRes.data || []).map((s: any) => s.id);
        if (seatIds.length > 0) {
          const soldRes = await supabase
            .from('show_instance_seats')
            .select('venue_seat_id, status, held_until')
            .eq('show_instance_id', showInstanceId)
            .in('venue_seat_id', seatIds)
            .in('status', ['sold', 'held']);

          if (soldRes.data) {
            const now = new Date();
            setSoldSeatIds(new Set(
              soldRes.data
                .filter((s: any) => {
                  if (s.status === 'sold') return true;
                  if (s.status === 'held' && s.held_until) return new Date(s.held_until) > now;
                  return false;
                })
                .map((s: any) => s.venue_seat_id)
            ));
          }
        }
      }

      setLoading(false);
    };

    load();
  }, [venueId, zoneId, showInstanceId]);

  const selectedIds = useMemo(
    () => new Set(selectedSeats.map(s => s.seatId)),
    [selectedSeats]
  );

  // Group seats by row, sorted by row order
  const rowGroups = useMemo(() => {
    const map = new Map<string, VenueSeat[]>();
    for (const seat of seats) {
      const existing = map.get(seat.row_label) || [];
      existing.push(seat);
      map.set(seat.row_label, existing);
    }
    const entries = Array.from(map.entries());
    entries.sort((a, b) => {
      const idxA = ROW_ORDER.indexOf(a[0]);
      const idxB = ROW_ORDER.indexOf(b[0]);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a[0].localeCompare(b[0]);
    });
    return entries;
  }, [seats]);

  // Get the arc angles for this zone
  const arc = ZONE_ARCS[zoneName];
  const startDeg = arc?.startDeg ?? 200;
  const endDeg = arc?.endDeg ?? 340;

  // Compute seat positions on curved arcs
  const seatPositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    if (!rowGroups.length) return positions;

    rowGroups.forEach(([rowLabel, rowSeats], rowIdx) => {
      const r = BASE_RADIUS + rowIdx * ROW_SPACING;
      const sorted = [...rowSeats].sort((a, b) => a.seat_number - b.seat_number);
      const numSeats = sorted.length;
      
      const padDeg = 1.5;
      const arcStart = startDeg + padDeg;
      const arcEnd = endDeg - padDeg;
      const midDeg = (arcStart + arcEnd) / 2;

      // Split into two halves with an aisle gap
      const halfCount = Math.ceil(numSeats / 2);
      const firstHalf = sorted.slice(0, halfCount);
      const secondHalf = sorted.slice(halfCount);

      // First half: arcStart to midDeg - gap
      const firstEnd = midDeg - AISLE_GAP_DEG;
      firstHalf.forEach((seat, seatIdx) => {
        const angle = firstHalf.length === 1
          ? (arcStart + firstEnd) / 2
          : arcStart + (seatIdx / (firstHalf.length - 1)) * (firstEnd - arcStart);
        const rad = toRad(angle);
        positions.set(seat.id, { x: HC.x + r * Math.cos(rad), y: HC.y + r * Math.sin(rad) });
      });

      // Second half: midDeg + gap to arcEnd
      const secondStart = midDeg + AISLE_GAP_DEG;
      secondHalf.forEach((seat, seatIdx) => {
        const angle = secondHalf.length === 1
          ? (secondStart + arcEnd) / 2
          : secondStart + (seatIdx / (secondHalf.length - 1)) * (arcEnd - secondStart);
        const rad = toRad(angle);
        positions.set(seat.id, { x: HC.x + r * Math.cos(rad), y: HC.y + r * Math.sin(rad) });
      });
    });

    return positions;
  }, [rowGroups, startDeg, endDeg]);

  // Compute viewBox to fit all seats with padding, plus space for title and boundary
  const viewBox = useMemo(() => {
    if (seatPositions.size === 0) return '0 0 1000 500';
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    seatPositions.forEach(({ x, y }) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

    // Also account for boundary arc (outermost row + extra)
    const boundaryR = BASE_RADIUS + rowGroups.length * ROW_SPACING + 16;
    const bStartRad = toRad(startDeg);
    const bEndRad = toRad(endDeg);
    const bMidRad = toRad((startDeg + endDeg) / 2);
    for (const rad of [bStartRad, bEndRad, bMidRad]) {
      const bx = HC.x + boundaryR * Math.cos(rad);
      const by = HC.y + boundaryR * Math.sin(rad);
      minX = Math.min(minX, bx);
      minY = Math.min(minY, by);
      maxX = Math.max(maxX, bx);
      maxY = Math.max(maxY, by);
    }
    
    const padX = 50;
    const padTop = 55; // extra top space for large zone title
    const padBottom = 40;
    const w = maxX - minX + padX * 2;
    const h = maxY - minY + padTop + padBottom;
    return `${minX - padX} ${minY - padTop} ${w} ${h}`;
  }, [seatPositions, rowGroups, startDeg, endDeg]);

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

      if (selectedIds.has(seat.id)) {
        onSeatToggle(seatData);
      } else if (selectedSeats.length < maxSeats) {
        onSeatToggle(seatData);
      }
    },
    [soldSeatIds, selectedIds, selectedSeats.length, maxSeats, onSeatToggle, zoneName, zoneId, zoneColor]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <div className="animate-pulse text-sm">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-xs h-8 px-2">
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.back}
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zoneColor }} />
          <span className="text-sm font-semibold">{zoneName}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[7px]" style={{ borderColor: zoneColor, color: zoneColor }}>1</div>
          <span className="text-[11px] text-muted-foreground">{t.available}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-muted-foreground/20 flex items-center justify-center text-[7px] text-muted-foreground/40">1</div>
          <span className="text-[11px] text-muted-foreground">{t.sold}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] text-primary-foreground bg-primary">1</div>
          <span className="text-[11px] text-muted-foreground">{t.selected}</span>
        </div>
      </div>

      {/* Curved seat map */}
      {rowGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t.noSeats}</p>
      ) : (
        <div className="w-full overflow-hidden" style={{ maxHeight: '55vh' }}>
          <svg
            ref={svgRef}
            viewBox={viewBox}
            className="w-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Large zone title centered at the top */}
            {(() => {
              const midAngle = (startDeg + endDeg) / 2;
              const titleR = BASE_RADIUS + rowGroups.length * ROW_SPACING + 35;
              const rad = toRad(midAngle);
              const tx = HC.x + titleR * Math.cos(rad);
              const ty = HC.y + titleR * Math.sin(rad);
              // Extract the Greek letter from zone name (e.g. "Τμήμα Δ" -> "Δ")
              const zoneLetter = zoneName.split(' ').pop() || zoneName;
              return (
                <text
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={28}
                  fontWeight={800}
                  fill={zoneColor}
                  opacity={0.85}
                  className="select-none pointer-events-none"
                >
                  {zoneLetter}
                </text>
              );
            })()}

            {/* Red/coral theatre boundary arc at outer edge */}
            {rowGroups.length > 0 && (
              <path
                d={(() => {
                  const boundaryR = BASE_RADIUS + rowGroups.length * ROW_SPACING + 12;
                  const s = toRad(startDeg);
                  const e = toRad(endDeg);
                  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
                  const x1 = HC.x + boundaryR * Math.cos(s);
                  const y1 = HC.y + boundaryR * Math.sin(s);
                  const x2 = HC.x + boundaryR * Math.cos(e);
                  const y2 = HC.y + boundaryR * Math.sin(e);
                  return `M ${x1} ${y1} A ${boundaryR} ${boundaryR} 0 ${largeArc} 1 ${x2} ${y2}`;
                })()}
                fill="none"
                stroke="#E85D5D"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            )}

            {/* Zone arc background */}
            {rowGroups.length > 0 && (
              <path
                d={(() => {
                  const innerR = BASE_RADIUS - 8;
                  const outerR = BASE_RADIUS + rowGroups.length * ROW_SPACING + 4;
                  const s = toRad(startDeg);
                  const e = toRad(endDeg);
                  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
                  const ox1 = HC.x + outerR * Math.cos(s);
                  const oy1 = HC.y + outerR * Math.sin(s);
                  const ox2 = HC.x + outerR * Math.cos(e);
                  const oy2 = HC.y + outerR * Math.sin(e);
                  const ix1 = HC.x + innerR * Math.cos(e);
                  const iy1 = HC.y + innerR * Math.sin(e);
                  const ix2 = HC.x + innerR * Math.cos(s);
                  const iy2 = HC.y + innerR * Math.sin(s);
                  return `M ${ox1} ${oy1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
                })()}
                fill={zoneColor}
                fillOpacity={0.06}
                stroke={zoneColor}
                strokeWidth={1}
                strokeOpacity={0.2}
              />
            )}

            {/* Row labels on BOTH sides */}
            {rowGroups.map(([rowLabel], rowIdx) => {
              const r = BASE_RADIUS + rowIdx * ROW_SPACING;
              const leftAngle = toRad(startDeg - 3);
              const rightAngle = toRad(endDeg + 3);
              const lx = HC.x + r * Math.cos(leftAngle);
              const ly = HC.y + r * Math.sin(leftAngle);
              const rx = HC.x + r * Math.cos(rightAngle);
              const ry = HC.y + r * Math.sin(rightAngle);
              return (
                <React.Fragment key={`label-${rowLabel}`}>
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize={8}
                    fontWeight={600}
                    fill="hsl(var(--muted-foreground))"
                    className="select-none pointer-events-none"
                  >
                    {rowLabel}
                  </text>
                  <text
                    x={rx}
                    y={ry}
                    textAnchor="start"
                    dominantBaseline="middle"
                    fontSize={8}
                    fontWeight={600}
                    fill="hsl(var(--muted-foreground))"
                    className="select-none pointer-events-none"
                  >
                    {rowLabel}
                  </text>
                </React.Fragment>
              );
            })}

            {/* Seats */}
            {rowGroups.map(([rowLabel, rowSeats]) =>
              rowSeats.map((seat) => {
                const pos = seatPositions.get(seat.id);
                if (!pos) return null;

                const isSold = soldSeatIds.has(seat.id);
                const isSelected = selectedIds.has(seat.id);
                const atMax = selectedSeats.length >= maxSeats && !isSelected;
                const isHovered = hoveredSeat === seat.id;

                let fill = 'transparent';
                let stroke = zoneColor;
                let strokeWidth = 1.2;
                let textColor = zoneColor;
                let opacity = 1;
                let cursor = 'pointer';

                if (isSold) {
                  fill = 'hsl(var(--muted-foreground) / 0.15)';
                  stroke = 'hsl(var(--muted-foreground) / 0.2)';
                  textColor = 'hsl(var(--muted-foreground) / 0.3)';
                  cursor = 'not-allowed';
                } else if (isSelected) {
                  fill = 'hsl(var(--primary))';
                  stroke = 'hsl(var(--primary))';
                  textColor = 'hsl(var(--primary-foreground))';
                  strokeWidth = 1.5;
                } else if (atMax) {
                  opacity = 0.35;
                  cursor = 'not-allowed';
                } else if (isHovered) {
                  fill = zoneColor;
                  textColor = '#fff';
                  strokeWidth = 2;
                }

                return (
                  <g
                    key={seat.id}
                    className="transition-all duration-100"
                    style={{ cursor, opacity }}
                    onClick={() => handleSeatClick(seat)}
                    onMouseEnter={() => setHoveredSeat(seat.id)}
                    onMouseLeave={() => setHoveredSeat(null)}
                  >
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={SEAT_RADIUS}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 0.5}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={6}
                      fontWeight={500}
                      fill={textColor}
                      className="select-none pointer-events-none"
                    >
                      {seat.seat_number}
                    </text>
                  </g>
                );
              })
            )}

            {/* Stage indicator at the center bottom */}
            {(() => {
              const midAngle = (startDeg + endDeg) / 2;
              const stageR = BASE_RADIUS - 30;
              const rad = toRad(midAngle);
              const sx = HC.x + stageR * Math.cos(rad);
              const sy = HC.y + stageR * Math.sin(rad);
              return (
                <text
                  x={sx}
                  y={sy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fontWeight={700}
                  fill="hsl(var(--primary) / 0.5)"
                  letterSpacing="0.1em"
                  className="select-none pointer-events-none"
                >
                  ↓ {t.stage}
                </text>
              );
            })()}
          </svg>
        </div>
      )}

      {/* Selected seats chips */}
      {selectedSeats.filter(s => s.zoneId === zoneId).length > 0 && (
        <div className="flex flex-wrap gap-1 px-1 pt-1 border-t">
          {selectedSeats
            .filter(s => s.zoneId === zoneId)
            .map(s => (
              <button
                key={s.seatId}
                onClick={() => onSeatToggle(s)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
              >
                {s.label}
                <span className="text-[10px] opacity-70">✕</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};
