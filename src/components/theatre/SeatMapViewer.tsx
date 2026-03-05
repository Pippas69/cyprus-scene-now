import React, { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import { ZoomIn, ZoomOut, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Types ──

interface VenueZone {
  id: string;
  name: string;
  description: string | null;
  color: string;
  sort_order: number;
}

interface VenueSeat {
  id: string;
  zone_id: string;
  row_label: string;
  seat_number: number;
  seat_label: string;
  x: number;
  y: number;
  seat_type: string;
  is_active: boolean;
}

interface SoldSeat {
  venue_seat_id: string;
  status: string;
  held_until: string | null;
}

export interface SelectedSeat {
  seatId: string;
  label: string;
  zoneName: string;
  zoneId: string;
  zoneColor: string;
  rowLabel: string;
  seatNumber: number;
}

interface SeatMapViewerProps {
  venueId: string;
  showInstanceId: string;
  maxSeats: number;
  selectedSeats: SelectedSeat[];
  onSeatToggle: (seat: SelectedSeat) => void;
}

const translations = {
  el: {
    stage: 'ΣΚΗΝΗ',
    frontOfTheatre: 'ΜΠΡΟΣΤΑ ΑΠΟ ΤΗ ΣΚΗΝΗ',
    available: 'Διαθέσιμη',
    unavailable: 'Μη διαθέσιμη',
    selected: 'Επιλεγμένη',
    wheelchair: 'ΑμεΑ',
    dragToMove: 'σύρετε για μετακίνηση',
    seats: 'Θέσεις',
    loading: 'Φόρτωση χάρτη θέσεων...',
    row: 'Σειρά',
    seat: 'Θέση',
    zone: 'Ζώνη',
  },
  en: {
    stage: 'STAGE',
    frontOfTheatre: 'FRONT OF THEATER',
    available: 'Available',
    unavailable: 'Unavailable',
    selected: 'Selected',
    wheelchair: 'Wheelchair',
    dragToMove: 'drag to move',
    seats: 'Seats',
    loading: 'Loading seat map...',
    row: 'Row',
    seat: 'Seat',
    zone: 'Zone',
  },
};

// ── Seat colors ──
const SEAT_COLORS = {
  unavailable: 'hsl(var(--muted-foreground) / 0.15)',
  selected: 'hsl(var(--primary))',
  wheelchair: '#3b82f6',
};

// ── Component ──

export const SeatMapViewer: React.FC<SeatMapViewerProps> = ({
  venueId,
  showInstanceId,
  maxSeats,
  selectedSeats,
  onSeatToggle,
}) => {
  const { language } = useLanguage();
  const t = translations[language];

  const [zones, setZones] = useState<VenueZone[]>([]);
  const [seats, setSeats] = useState<VenueSeat[]>([]);
  const [soldSeats, setSoldSeats] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Pan & zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Tooltip
  const [tooltip, setTooltip] = useState<{
    seat: VenueSeat;
    zone: VenueZone;
    x: number;
    y: number;
  } | null>(null);

  // ── Load data ──
  useEffect(() => {
    const isNewInstance = showInstanceId === '__new__';

    const loadData = async (isInitial = false) => {
      if (isInitial) setLoading(true);

      if (isInitial) {
        const [zonesRes, seatsRes] = await Promise.all([
          supabase
            .from('venue_zones')
            .select('*')
            .eq('venue_id', venueId)
            .order('sort_order'),
          supabase
            .from('venue_seats')
            .select('*')
            .eq('venue_id', venueId)
            .eq('is_active', true),
        ]);

        if (zonesRes.data) setZones(zonesRes.data as VenueZone[]);
        if (seatsRes.data) setSeats(seatsRes.data as VenueSeat[]);
      }

      if (!isNewInstance) {
        const soldRes = await supabase
          .from('show_instance_seats')
          .select('venue_seat_id, status, held_until')
          .eq('show_instance_id', showInstanceId)
          .in('status', ['sold', 'held']);

        if (soldRes.data) {
          const now = new Date();
          const soldIds = new Set(
            (soldRes.data as SoldSeat[])
              .filter(s => {
                if (s.status === 'sold') return true;
                if (s.status === 'held' && s.held_until) {
                  return new Date(s.held_until) > now;
                }
                return false;
              })
              .map(s => s.venue_seat_id)
          );
          setSoldSeats(soldIds);
        }
      } else {
        setSoldSeats(new Set());
      }
      if (isInitial) setLoading(false);
    };

    loadData(true);

    // Poll every 15s to pick up newly sold/held seats
    if (!isNewInstance) {
      const interval = setInterval(() => loadData(false), 15_000);
      return () => clearInterval(interval);
    }
  }, [venueId, showInstanceId]);

  // ── Compute bounds ──
  const bounds = React.useMemo(() => {
    if (seats.length === 0) return { minX: 0, maxX: 1000, minY: 0, maxY: 1000 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const s of seats) {
      if (s.x < minX) minX = s.x;
      if (s.x > maxX) maxX = s.x;
      if (s.y < minY) minY = s.y;
      if (s.y > maxY) maxY = s.y;
    }
    return { minX: minX - 30, maxX: maxX + 30, minY: minY - 30, maxY: maxY + 80 };
  }, [seats]);

  const viewWidth = bounds.maxX - bounds.minX;
  const viewHeight = bounds.maxY - bounds.minY;

  // ── Zone lookup ──
  const zoneMap = React.useMemo(() => {
    const m = new Map<string, VenueZone>();
    zones.forEach(z => m.set(z.id, z));
    return m;
  }, [zones]);

  // ── Selection helpers ──
  const selectedIds = React.useMemo(
    () => new Set(selectedSeats.map(s => s.seatId)),
    [selectedSeats]
  );

  // Pre-compute row labels
  const rowLabels = React.useMemo(() => {
    const rowMap = new Map<string, { minX: number; maxX: number; y: number }>();
    for (const seat of seats) {
      const cx = seat.x - bounds.minX;
      const cy = seat.y - bounds.minY;
      const key = `${seat.zone_id}-${seat.row_label}`;
      const existing = rowMap.get(key);
      if (!existing) {
        rowMap.set(key, { minX: cx, maxX: cx, y: cy });
      } else {
        if (cx < existing.minX) existing.minX = cx;
        if (cx > existing.maxX) existing.maxX = cx;
      }
    }
    const labels: React.ReactNode[] = [];
    const rowLabelsSeen = new Set<string>();
    rowMap.forEach((pos, key) => {
      const rowLabel = key.split('-').pop()!;
      const labelKey = `${rowLabel}-${Math.round(pos.y)}`;
      if (rowLabelsSeen.has(labelKey)) return;
      rowLabelsSeen.add(labelKey);
      labels.push(
        <text
          key={`row-left-${key}`}
          x={pos.minX - 18}
          y={pos.y + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={9}
          fontWeight={600}
          fill="hsl(var(--muted-foreground))"
          className="select-none"
        >
          {rowLabel}
        </text>
      );
    });
    return labels;
  }, [seats, bounds]);

  const handleSeatClick = useCallback(
    (seat: VenueSeat) => {
      if (soldSeats.has(seat.id)) return;
      const zone = zoneMap.get(seat.zone_id);
      if (!zone) return;

      const seatData: SelectedSeat = {
        seatId: seat.id,
        label: seat.seat_label,
        zoneName: zone.name,
        zoneId: zone.id,
        zoneColor: zone.color,
        rowLabel: seat.row_label,
        seatNumber: seat.seat_number,
      };

      // If already selected → deselect; if at max → don't add
      if (selectedIds.has(seat.id)) {
        onSeatToggle(seatData);
      } else if (selectedSeats.length < maxSeats) {
        onSeatToggle(seatData);
      }
    },
    [soldSeats, zoneMap, selectedIds, selectedSeats.length, maxSeats, onSeatToggle]
  );

  // ── Pan handlers ──
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only pan on the background, not on seats
    if ((e.target as HTMLElement).dataset.seat) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY };
    panOffset.current = { ...pan };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({
      x: panOffset.current.x + dx,
      y: panOffset.current.y + dy,
    });
  }, [isPanning]);

  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // ── Zoom ──
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.3, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.3, 0.5));

  // Pinch-to-zoom
  const lastTouchDist = useRef<number | null>(null);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastTouchDist.current !== null) {
        const delta = (dist - lastTouchDist.current) * 0.005;
        setZoom(z => Math.max(0.5, Math.min(3, z + delta)));
      }
      lastTouchDist.current = dist;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = null;
  }, []);

  // ── Render seat ──
  const SEAT_W = 20;
  const SEAT_H = 18;
  const renderSeat = (seat: VenueSeat) => {
    const isSold = soldSeats.has(seat.id);
    const isSelected = selectedIds.has(seat.id);
    const isWheelchair = seat.seat_type === 'wheelchair';
    const zone = zoneMap.get(seat.zone_id);

    let fill: string;
    if (isSelected) fill = SEAT_COLORS.selected;
    else if (isSold) fill = SEAT_COLORS.unavailable;
    else if (isWheelchair) fill = SEAT_COLORS.wheelchair;
    else fill = zone?.color || '#94a3b8'; // Use zone color for available seats

    const cx = seat.x - bounds.minX;
    // Row A (high y value = front) appears at bottom, stage at top
    const cy = seat.y - bounds.minY;

    // Cinema-style chair shape
    const seatPath = `
      M ${cx - SEAT_W/2 + 2} ${cy + SEAT_H/2}
      L ${cx - SEAT_W/2 + 2} ${cy - SEAT_H/2 + 4}
      Q ${cx - SEAT_W/2 + 2} ${cy - SEAT_H/2}, ${cx - SEAT_W/2 + 6} ${cy - SEAT_H/2}
      L ${cx + SEAT_W/2 - 6} ${cy - SEAT_H/2}
      Q ${cx + SEAT_W/2 - 2} ${cy - SEAT_H/2}, ${cx + SEAT_W/2 - 2} ${cy - SEAT_H/2 + 4}
      L ${cx + SEAT_W/2 - 2} ${cy + SEAT_H/2}
      Z
    `;

    return (
      <g
        key={seat.id}
        className={cn(
          'transition-all duration-150',
          !isSold && 'cursor-pointer',
          isSold && 'opacity-40 cursor-not-allowed'
        )}
        onClick={() => handleSeatClick(seat)}
        onPointerEnter={(e) => {
          if (zone) {
            setTooltip({ seat, zone, x: e.clientX, y: e.clientY });
          }
        }}
        onPointerLeave={() => setTooltip(null)}
        data-seat="true"
      >
        {/* Chair backrest (rounded top) */}
        <path
          data-seat="true"
          d={seatPath}
          fill={fill}
          stroke={isSelected ? 'white' : 'rgba(0,0,0,0.15)'}
          strokeWidth={isSelected ? 2 : 0.5}
          className={cn(!isSold && !isSelected && 'hover:opacity-80')}
        />
        {/* Small seat cushion */}
        <rect
          data-seat="true"
          x={cx - SEAT_W/2 + 3}
          y={cy + 2}
          width={SEAT_W - 6}
          height={SEAT_H/3}
          rx={2}
          fill={isSelected ? 'hsl(var(--primary-foreground) / 0.3)' : 'rgba(0,0,0,0.1)'}
          className="pointer-events-none"
        />
        {/* Seat label (only visible at higher zoom) */}
        {zoom >= 1.2 && (
          <text
            data-seat="true"
            x={cx}
            y={cy - 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={7}
            fill={isSelected ? 'white' : isSold ? 'hsl(var(--muted-foreground))' : 'white'}
            className="pointer-events-none select-none"
            fontWeight={isSelected ? 700 : 500}
          >
            {seat.seat_number}
          </text>
        )}
      </g>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="animate-pulse text-sm">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Legend - show zones with their colors */}
      <div className="flex flex-wrap items-center justify-center gap-3 md:gap-5 px-2">
        {zones.map(zone => (
          <div key={zone.id} className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 rounded"
              style={{ backgroundColor: zone.color }}
            />
            <span className="text-xs text-muted-foreground">{zone.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded" style={{ backgroundColor: SEAT_COLORS.unavailable }} />
          <span className="text-xs text-muted-foreground">{t.unavailable}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded" style={{ backgroundColor: SEAT_COLORS.selected }} />
          <span className="text-xs text-muted-foreground">{t.selected}</span>
        </div>
      </div>

      {/* Zoom controls + drag hint */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary"
            onClick={handleZoomIn}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary"
            onClick={handleZoomOut}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Move className="h-3 w-3" />
          {t.dragToMove}
        </span>
      </div>

      {/* Seat map container */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl border bg-background"
        style={{ height: 'min(65vh, 500px)', touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <svg
          viewBox={`0 0 ${viewWidth} ${viewHeight + 60}`}
          className="w-full h-full"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'center center',
          }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Stage indicator at bottom */}
          <g>
            {/* Stage curved line */}
            <path
              d={`M ${viewWidth * 0.15} ${viewHeight + 20} Q ${viewWidth * 0.5} ${viewHeight + 50} ${viewWidth * 0.85} ${viewHeight + 20}`}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <text
              x={viewWidth / 2}
              y={viewHeight + 35}
              textAnchor="middle"
              fontSize={14}
              fontWeight={700}
              fill="hsl(var(--primary))"
              className="select-none"
            >
              {t.stage}
            </text>
            <text
              x={viewWidth / 2}
              y={viewHeight + 50}
              textAnchor="middle"
              fontSize={9}
              fill="hsl(var(--muted-foreground))"
              className="select-none"
            >
              {t.frontOfTheatre}
            </text>
          </g>

          {/* Row labels */}
          {rowLabels}

          {/* All seats */}
          {seats.map(renderSeat)}
        </svg>
      </div>

      {/* Tooltip (portal-style) */}
      {tooltip && (
        <div
          className="fixed z-[9999] bg-popover text-popover-foreground shadow-lg rounded-lg px-3 py-2 text-xs pointer-events-none border"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 40,
          }}
        >
          <div className="font-semibold">{tooltip.seat.seat_label}</div>
          <div className="text-muted-foreground">
            {t.zone}: {tooltip.zone.name}
          </div>
        </div>
      )}

      {/* Selected seats summary */}
      {selectedSeats.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-2">
          {selectedSeats.map(s => (
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
