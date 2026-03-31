import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import { ZoomIn, ZoomOut, Move, Maximize } from 'lucide-react';
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
    available: 'Διαθέσιμη',
    unavailable: 'Μη διαθέσιμη',
    selected: 'Επιλεγμένη',
    wheelchair: 'ΑμεΑ',
    dragToMove: 'σύρετε για μετακίνηση',
    loading: 'Φόρτωση χάρτη θέσεων...',
    zone: 'Ζώνη',
    resetView: 'Πλήρης προβολή',
  },
  en: {
    stage: 'STAGE',
    available: 'Available',
    unavailable: 'Unavailable',
    selected: 'Selected',
    wheelchair: 'Wheelchair',
    dragToMove: 'drag to move',
    loading: 'Loading seat map...',
    zone: 'Zone',
    resetView: 'Fit all',
  },
};

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

  // Pan & zoom
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
      if (isInitial) {
        setLoading(true);

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
            .eq('is_active', true)
            .limit(5000),
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

    if (!isNewInstance) {
      const interval = setInterval(() => loadData(false), 15_000);
      return () => clearInterval(interval);
    }
  }, [venueId, showInstanceId]);

  // ── Compute SVG viewBox bounds from seat data ──
  const PAD = 60;
  const STAGE_EXTRA = 80;

  const bounds = useMemo(() => {
    if (seats.length === 0) return { minX: 0, maxX: 1200, minY: 0, maxY: 900 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const s of seats) {
      if (s.x < minX) minX = s.x;
      if (s.x > maxX) maxX = s.x;
      if (s.y < minY) minY = s.y;
      if (s.y > maxY) maxY = s.y;
    }
    return {
      minX: minX - PAD,
      maxX: maxX + PAD,
      minY: minY - PAD,
      maxY: maxY + PAD + STAGE_EXTRA,
    };
  }, [seats]);

  const svgW = bounds.maxX - bounds.minX;
  const svgH = bounds.maxY - bounds.minY;

  // ── Zone lookup ──
  const zoneMap = useMemo(() => {
    const m = new Map<string, VenueZone>();
    zones.forEach(z => m.set(z.id, z));
    return m;
  }, [zones]);

  const selectedIds = useMemo(
    () => new Set(selectedSeats.map(s => s.seatId)),
    [selectedSeats]
  );

  const isHighDensity = seats.length > 500;
  const seatRadius = isHighDensity ? 3 : 6;

  // ── Reset view ──
  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!loading && seats.length > 0) resetView();
  }, [loading, seats.length, resetView]);

  // ── Stage rendering ──
  const stageElements = useMemo(() => {
    if (seats.length === 0) return null;

    const stageCX = (bounds.maxX - bounds.minX) / 2;
    const maxSeatY = Math.max(...seats.map(s => s.y));
    const stageCY = maxSeatY + 30 - bounds.minY;
    const stageR = isHighDensity ? 60 : 80;

    const x1 = stageCX - stageR;
    const x2 = stageCX + stageR;

    return (
      <g>
        <path
          d={`M ${x1} ${stageCY} A ${stageR} ${stageR} 0 0 0 ${x2} ${stageCY} Z`}
          fill="hsl(var(--primary) / 0.12)"
          stroke="hsl(var(--primary) / 0.5)"
          strokeWidth={1.5}
        />
        <text
          x={stageCX}
          y={stageCY - stageR / 3}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={isHighDensity ? 10 : 14}
          fontWeight={700}
          fill="hsl(var(--primary))"
          className="select-none pointer-events-none"
        >
          {t.stage}
        </text>
      </g>
    );
  }, [seats, bounds, t.stage, isHighDensity]);

  // ── Seat click handler ──
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

      if (selectedIds.has(seat.id)) {
        onSeatToggle(seatData);
      } else if (selectedSeats.length < maxSeats) {
        onSeatToggle(seatData);
      }
    },
    [soldSeats, zoneMap, selectedIds, selectedSeats.length, maxSeats, onSeatToggle]
  );

  // ── Pan handlers with clamping ──
  const clampPan = useCallback((p: { x: number; y: number }) => {
    const maxPanX = svgW * zoom * 0.3;
    const maxPanY = svgH * zoom * 0.3;
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, p.x)),
      y: Math.max(-maxPanY, Math.min(maxPanY, p.y)),
    };
  }, [svgW, svgH, zoom]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
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
    setPan(clampPan({
      x: panOffset.current.x + dx,
      y: panOffset.current.y + dy,
    }));
  }, [isPanning, clampPan]);

  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.3, 4));
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
        setZoom(z => Math.max(0.5, Math.min(4, z + delta)));
      }
      lastTouchDist.current = dist;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom(z => Math.max(0.5, Math.min(4, z + delta)));
  }, []);

  // ── Render seats as simple circles (high performance) ──
  const seatElements = useMemo(() => {
    return seats.map(seat => {
      const isSold = soldSeats.has(seat.id);
      const isSelected = selectedIds.has(seat.id);
      const isWheelchair = seat.seat_type === 'wheelchair';
      const zone = zoneMap.get(seat.zone_id);

      let fill: string;
      if (isSelected) fill = SEAT_COLORS.selected;
      else if (isSold) fill = SEAT_COLORS.unavailable;
      else if (isWheelchair) fill = SEAT_COLORS.wheelchair;
      else fill = zone?.color || 'hsl(var(--muted-foreground) / 0.45)';

      const cx = seat.x - bounds.minX;
      const cy = seat.y - bounds.minY;

      return (
        <circle
          key={seat.id}
          data-seat="true"
          cx={cx}
          cy={cy}
          r={seatRadius}
          fill={fill}
          stroke={isSelected ? 'white' : 'rgba(0,0,0,0.1)'}
          strokeWidth={isSelected ? 1.5 : 0.3}
          className={cn(
            'transition-colors duration-75',
            !isSold && 'cursor-pointer',
            isSold && 'opacity-30 cursor-not-allowed'
          )}
          onClick={() => handleSeatClick(seat)}
          onPointerEnter={(e) => {
            if (zone) setTooltip({ seat, zone, x: e.clientX, y: e.clientY });
          }}
          onPointerLeave={() => setTooltip(null)}
        />
      );
    });
  }, [seats, soldSeats, selectedIds, zoneMap, bounds, seatRadius, handleSeatClick]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="animate-pulse text-sm">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 px-2">
        {zones.map(zone => (
          <div key={zone.id} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }} />
            <span className="text-[11px] text-muted-foreground">{zone.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SEAT_COLORS.unavailable }} />
          <span className="text-[11px] text-muted-foreground">{t.unavailable}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SEAT_COLORS.selected }} />
          <span className="text-[11px] text-muted-foreground">{t.selected}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={resetView}>
            <Maximize className="h-3.5 w-3.5" />
            {t.resetView}
          </Button>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Move className="h-3 w-3" />
          {t.dragToMove}
        </span>
      </div>

      {/* Map */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl border bg-background"
        style={{ height: 'min(65vh, 550px)', touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-full"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'center center',
          }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Stage */}
          {stageElements}

          {/* All seats */}
          {seatElements}
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-[9999] bg-popover text-popover-foreground shadow-lg rounded-lg px-3 py-2 text-xs pointer-events-none border"
          style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
        >
          <div className="font-semibold">{tooltip.seat.seat_label}</div>
          <div className="text-muted-foreground">
            {t.zone}: {tooltip.zone.name}
          </div>
        </div>
      )}

      {/* Selected seats */}
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
