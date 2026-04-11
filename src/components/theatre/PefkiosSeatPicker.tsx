import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type { SelectedSeat } from './SeatMapViewer';
import { PEFKIOS_SECTIONS, PEFKIOS_ROW_ORDER, type PefkiosSectionKey } from './pefkiosConstants';

interface VenueSeat {
  id: string;
  zone_id: string;
  row_label: string;
  seat_number: number;
  seat_label: string;
  seat_type: string;
  is_active: boolean;
}

interface PefkiosSeatPickerProps {
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
    back: 'Πίσω στα τμήματα',
    loading: 'Φόρτωση θέσεων...',
    available: 'Διαθέσιμη',
    sold: 'Πωλημένη',
    selected: 'Επιλεγμένη',
    noSeats: 'Δεν υπάρχουν θέσεις σε αυτό το τμήμα',
    stage: 'ΣΚΗΝΗ',
    zoomIn: 'Μεγέθυνση',
    zoomOut: 'Σμίκρυνση',
    fitAll: 'Προσαρμογή',
    dragToMove: 'σύρετε για μετακίνηση',
  },
  en: {
    back: 'Back to sections',
    loading: 'Loading seats...',
    available: 'Available',
    sold: 'Sold',
    selected: 'Selected',
    noSeats: 'No seats in this section',
    stage: 'STAGE',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fitAll: 'Fit all',
    dragToMove: 'drag to move',
  },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const PefkiosSeatPicker: React.FC<PefkiosSeatPickerProps> = ({
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

  // Zoom & pan
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
        .limit(5000);

      const loadedSeats = (seatsRes.data || []) as VenueSeat[];
      setSeats(loadedSeats);

      if (showInstanceId !== '__new__') {
        const seatIds = loadedSeats.map((s) => s.id);
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
                  .filter((s: any) => {
                    if (s.status === 'sold') return true;
                    if (s.status === 'held' && s.held_until) return new Date(s.held_until) > now;
                    return false;
                  })
                  .map((s: any) => s.venue_seat_id)
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

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [zoneId]);

  const selectedIds = useMemo(() => new Set(selectedSeats.map((s) => s.seatId)), [selectedSeats]);

  const seatsByRow = useMemo(() => {
    const grouped = new Map<string, VenueSeat[]>();
    for (const seat of seats) {
      const existing = grouped.get(seat.row_label) || [];
      existing.push(seat);
      grouped.set(seat.row_label, existing);
    }
    // Sort each row by seat_number
    grouped.forEach((rowSeats) => rowSeats.sort((a, b) => a.seat_number - b.seat_number));
    return grouped;
  }, [seats]);

  // Build grid layout
  const sectionKey = zoneName as PefkiosSectionKey;
  const sectionDef = PEFKIOS_SECTIONS[sectionKey];
  const rotationDeg = sectionDef?.rotationDeg ?? 0;

  const maxSeatsInRow = useMemo(() => {
    let max = 0;
    seatsByRow.forEach((rowSeats) => { max = Math.max(max, rowSeats.length); });
    return Math.max(max, 4);
  }, [seatsByRow]);

  // Dynamic sizing
  const seatR = maxSeatsInRow <= 12 ? 14 : maxSeatsInRow <= 20 ? 11 : 9;
  const seatSpacing = seatR * 2.6;
  const rowSpacing = seatR * 2.8;
  const labelWidth = 30;

  // Get active rows in order
  const activeRows = useMemo(() => {
    return PEFKIOS_ROW_ORDER.filter((row) => seatsByRow.has(row));
  }, [seatsByRow]);

  // Compute SVG dimensions
  const gridW = maxSeatsInRow * seatSpacing + labelWidth * 2 + 20;
  const gridH = activeRows.length * rowSpacing + 80; // extra for stage label
  const originX = labelWidth + 10;
  const originY = 20;

  // Seat positions
  const seatPositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();

    activeRows.forEach((rowLabel, rowIdx) => {
      const rowSeats = seatsByRow.get(rowLabel) || [];
      const rowY = originY + (activeRows.length - 1 - rowIdx) * rowSpacing; // Α at bottom
      const totalWidth = (rowSeats.length - 1) * seatSpacing;
      const startX = originX + (maxSeatsInRow * seatSpacing - totalWidth) / 2;

      rowSeats.forEach((seat, seatIdx) => {
        positions.set(seat.id, {
          x: startX + seatIdx * seatSpacing,
          y: rowY,
        });
      });
    });

    return positions;
  }, [activeRows, seatsByRow, seatSpacing, rowSpacing, originX, originY, maxSeatsInRow]);

  const viewBox = useMemo(() => {
    const pad = 30;
    return `${-pad} ${-pad} ${gridW + pad * 2} ${gridH + pad * 2}`;
  }, [gridW, gridH]);

  // Zoom/pan handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => clamp(z * delta, 0.5, 5));
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
      setZoom((z) => clamp(z * scale, 0.5, 5));
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

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

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

  return (
    <div className="w-full space-y-3">
      {/* Header */}
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

      {/* Legend */}
      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-1.5">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 text-[8px]"
            style={{ borderColor: zoneColor, color: zoneColor }}
          >
            {seats.length - soldSeatIds.size - selectedSeats.filter((s) => s.zoneId === zoneId).length}
          </div>
          <span className="text-[11px] text-muted-foreground">{t.available}</span>
        </div>
        {showInstanceId !== '__new__' && (
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/60 text-[8px] text-muted-foreground/50">
              {soldSeatIds.size}
            </div>
            <span className="text-[11px] text-muted-foreground">{t.sold}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[8px] text-primary-foreground">
            {selectedSeats.filter((s) => s.zoneId === zoneId).length}
          </div>
          <span className="text-[11px] text-muted-foreground">{t.selected}</span>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => clamp(z * 1.3, 0.5, 5))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => clamp(z * 0.7, 0.5, 5))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={resetView}>
            <Maximize2 className="h-3 w-3" />
            {t.fitAll}
          </Button>
        </div>
        <span className="text-[10px] text-muted-foreground">⊞ {t.dragToMove}</span>
      </div>

      {/* Seat map */}
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
          {/* Apply section rotation */}
          <g transform={`rotate(${rotationDeg}, ${gridW / 2}, ${gridH / 2})`}>
            {/* Row labels and seats */}
            {activeRows.map((rowLabel, rowIdx) => {
              const rowSeats = seatsByRow.get(rowLabel) || [];
              const rowY = originY + (activeRows.length - 1 - rowIdx) * rowSpacing;

              return (
                <React.Fragment key={rowLabel}>
                  {/* Left row label */}
                  <text
                    x={originX - 14}
                    y={rowY + 1}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize={11}
                    fontWeight={700}
                    fill="hsl(var(--muted-foreground))"
                    className="pointer-events-none select-none"
                  >
                    {rowLabel}
                  </text>

                  {/* Right row label */}
                  <text
                    x={originX + maxSeatsInRow * seatSpacing + 14}
                    y={rowY + 1}
                    textAnchor="start"
                    dominantBaseline="middle"
                    fontSize={11}
                    fontWeight={700}
                    fill="hsl(var(--muted-foreground))"
                    className="pointer-events-none select-none"
                  >
                    {rowLabel}
                  </text>

                  {/* Seats */}
                  {rowSeats.map((seat) => {
                    const pos = seatPositions.get(seat.id);
                    if (!pos) return null;

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
                          cx={pos.x}
                          cy={pos.y}
                          r={seatR}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={strokeWidth}
                        />
                        <text
                          x={pos.x}
                          y={pos.y + 0.5}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={seatR >= 12 ? 9 : 7}
                          fontWeight={700}
                          fill={textColor}
                          className="pointer-events-none select-none"
                        >
                          {seat.seat_number}
                        </text>
                      </g>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {/* Stage indicator */}
            <text
              x={gridW / 2}
              y={originY + activeRows.length * rowSpacing + 30}
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
          </g>
        </svg>
      </div>

      {/* Selected seats in this section */}
      {selectedSeats.filter((s) => s.zoneId === zoneId).length > 0 && (
        <div className="flex flex-wrap gap-1 border-t px-1 pt-1">
          {selectedSeats
            .filter((s) => s.zoneId === zoneId)
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
