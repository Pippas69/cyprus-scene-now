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
  const PAD = 50;
  const STAGE_EXTRA = 100; // extra space below seats for stage

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

  // ── Reset view to fit all seats ──
  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Auto-fit on initial load
  useEffect(() => {
    if (!loading && seats.length > 0) {
      resetView();
    }
  }, [loading, seats.length, resetView]);

  // ── Compute zone boundary data for radial lines & labels ──
  const { zoneBoundaryLines, zoneLabels } = useMemo(() => {
    if (seats.length === 0 || zones.length === 0) return { zoneBoundaryLines: [], zoneLabels: [] };

    // Stage center (used as radial origin)
    const stageCX = (bounds.minX + bounds.maxX) / 2;
    // Stage is at bottom of seat area — find max Y of seats and go a bit further
    const maxSeatY = Math.max(...seats.map(s => s.y));
    const stageCY = maxSeatY + 40;

    // Group seats by zone
    const seatsByZone = new Map<string, VenueSeat[]>();
    for (const s of seats) {
      if (!seatsByZone.has(s.zone_id)) seatsByZone.set(s.zone_id, []);
      seatsByZone.get(s.zone_id)!.push(s);
    }

    // Compute angle range for each zone
    interface ZoneAngleInfo {
      zone: VenueZone;
      minAngle: number;
      maxAngle: number;
      avgAngle: number;
      minR: number;
      maxR: number;
    }

    const zoneAngles: ZoneAngleInfo[] = [];
    for (const z of zones) {
      const zSeats = seatsByZone.get(z.id);
      if (!zSeats || zSeats.length === 0) continue;
      let minA = Infinity, maxA = -Infinity, sumA = 0;
      let minR = Infinity, maxR = -Infinity;
      for (const s of zSeats) {
        const dx = s.x - stageCX;
        const dy = stageCY - s.y;
        const angle = Math.atan2(dy, dx);
        const r = Math.sqrt(dx * dx + dy * dy);
        sumA += angle;
        if (angle < minA) minA = angle;
        if (angle > maxA) maxA = angle;
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
      }
      zoneAngles.push({
        zone: z,
        minAngle: minA,
        maxAngle: maxA,
        avgAngle: sumA / zSeats.length,
        minR,
        maxR,
      });
    }

    // Sort by average angle (left to right = high angle to low)
    zoneAngles.sort((a, b) => b.avgAngle - a.avgAngle);

    const lines: React.ReactNode[] = [];
    const labels: React.ReactNode[] = [];

    // Draw boundary lines between adjacent zones
    for (let i = 0; i < zoneAngles.length - 1; i++) {
      const left = zoneAngles[i];
      const right = zoneAngles[i + 1];
      const gapAngle = (left.minAngle + right.maxAngle) / 2;

      const innerR = Math.min(left.minR, right.minR) - 10;
      const outerR = Math.max(left.maxR, right.maxR) + 10;

      const x1 = stageCX + innerR * Math.cos(gapAngle) - bounds.minX;
      const y1 = stageCY - innerR * Math.sin(gapAngle) - bounds.minY;
      const x2 = stageCX + outerR * Math.cos(gapAngle) - bounds.minX;
      const y2 = stageCY - outerR * Math.sin(gapAngle) - bounds.minY;

      lines.push(
        <line
          key={`boundary-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="hsl(var(--border))"
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.6}
        />
      );
    }

    // Zone labels placed at outer edge of each zone
    for (const za of zoneAngles) {
      const labelR = za.maxR + 25;
      const lx = stageCX + labelR * Math.cos(za.avgAngle) - bounds.minX;
      const ly = stageCY - labelR * Math.sin(za.avgAngle) - bounds.minY;

      labels.push(
        <g key={`zlabel-${za.zone.id}`}>
          <text
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={isHighDensity ? 9 : 11}
            fontWeight={700}
            fill={za.zone.color}
            stroke="hsl(var(--background))"
            strokeWidth={3}
            paintOrder="stroke"
            className="select-none pointer-events-none"
          >
            {za.zone.name}
          </text>
        </g>
      );
    }

    return { zoneBoundaryLines: lines, zoneLabels: labels };
  }, [seats, zones, bounds, isHighDensity]);

  // ── Stage rendering data ──
  const stageElements = useMemo(() => {
    if (seats.length === 0) return null;

    const stageCX = (bounds.minX + bounds.maxX) / 2 - bounds.minX;
    const maxSeatY = Math.max(...seats.map(s => s.y));
    const stageCY = maxSeatY + 40 - bounds.minY;
    const stageR = 80;

    // Semicircle arc (opening upward toward seats)
    const x1 = stageCX - stageR;
    const y1 = stageCY;
    const x2 = stageCX + stageR;
    const y2 = stageCY;

    return (
      <g>
        {/* Filled semicircle */}
        <path
          d={`M ${x1} ${y1} A ${stageR} ${stageR} 0 0 0 ${x2} ${y2} Z`}
          fill="hsl(var(--primary) / 0.15)"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
        />
        <text
          x={stageCX}
          y={stageCY - stageR / 3}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={14}
          fontWeight={700}
          fill="hsl(var(--primary))"
          className="select-none pointer-events-none"
        >
          {t.stage}
        </text>
      </g>
    );
  }, [seats, bounds, t.stage]);

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

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.max(0.5, Math.min(3, z + delta)));
  }, []);

  // ── Precomputed stage center for rotation ──
  const stageCenter = useMemo(() => {
    if (seats.length === 0) return { cx: 0, cy: 0 };
    const maxSeatY = Math.max(...seats.map(s => s.y));
    return {
      cx: (bounds.minX + bounds.maxX) / 2 - bounds.minX,
      cy: maxSeatY + 40 - bounds.minY,
    };
  }, [seats, bounds]);

  // ── Render seat ──
  const SEAT_W = isHighDensity ? 8 : 20;
  const SEAT_H = isHighDensity ? 8 : 18;

  const renderSeat = useCallback((seat: VenueSeat) => {
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

    const angleDeg = Math.atan2(stageCenter.cy - cy, cx - stageCenter.cx) * (180 / Math.PI);
    const rotation = 90 - angleDeg;

    return (
      <g
        key={seat.id}
        className={cn(
          'transition-colors duration-100',
          !isSold && 'cursor-pointer',
          isSold && 'opacity-40 cursor-not-allowed'
        )}
        onClick={() => handleSeatClick(seat)}
        onPointerEnter={(e) => {
          if (zone) setTooltip({ seat, zone, x: e.clientX, y: e.clientY });
        }}
        onPointerLeave={() => setTooltip(null)}
        data-seat="true"
        transform={`rotate(${rotation}, ${cx}, ${cy})`}
      >
        {isHighDensity ? (
          // Simple circle for high density
          <circle
            data-seat="true"
            cx={cx}
            cy={cy}
            r={3.5}
            fill={fill}
            stroke={isSelected ? 'white' : 'rgba(0,0,0,0.15)'}
            strokeWidth={isSelected ? 1.5 : 0.3}
          />
        ) : (
          <>
            <path
              data-seat="true"
              d={`
                M ${cx - SEAT_W/2 + 2} ${cy + SEAT_H/2}
                L ${cx - SEAT_W/2 + 2} ${cy - SEAT_H/2 + 4}
                Q ${cx - SEAT_W/2 + 2} ${cy - SEAT_H/2}, ${cx - SEAT_W/2 + 6} ${cy - SEAT_H/2}
                L ${cx + SEAT_W/2 - 6} ${cy - SEAT_H/2}
                Q ${cx + SEAT_W/2 - 2} ${cy - SEAT_H/2}, ${cx + SEAT_W/2 - 2} ${cy - SEAT_H/2 + 4}
                L ${cx + SEAT_W/2 - 2} ${cy + SEAT_H/2}
                Z
              `}
              fill={fill}
              stroke={isSelected ? 'white' : 'rgba(0,0,0,0.15)'}
              strokeWidth={isSelected ? 2 : 0.5}
            />
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
          </>
        )}
        {zoom >= (isHighDensity ? 2.0 : 1.2) && (
          <text
            data-seat="true"
            x={cx}
            y={cy - 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={isHighDensity ? 5 : 7}
            fill={isSelected ? 'white' : isSold ? 'hsl(var(--muted-foreground))' : 'white'}
            className="pointer-events-none select-none"
            fontWeight={isSelected ? 700 : 500}
          >
            {seat.seat_number}
          </text>
        )}
      </g>
    );
  }, [soldSeats, selectedIds, zoneMap, bounds, stageCenter, handleSeatClick, zoom, isHighDensity, SEAT_W, SEAT_H]);

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
      <div className="flex flex-wrap items-center justify-center gap-3 md:gap-5 px-2">
        {zones.map(zone => (
          <div key={zone.id} className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: zone.color }} />
            <span className="text-xs text-muted-foreground">{zone.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: SEAT_COLORS.unavailable }} />
          <span className="text-xs text-muted-foreground">{t.unavailable}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: SEAT_COLORS.selected }} />
          <span className="text-xs text-muted-foreground">{t.selected}</span>
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
          {/* Zone boundary lines */}
          {zoneBoundaryLines}

          {/* Stage */}
          {stageElements}

          {/* All seats */}
          {seats.map(renderSeat)}

          {/* Zone labels (on top of seats) */}
          {zoneLabels}
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
