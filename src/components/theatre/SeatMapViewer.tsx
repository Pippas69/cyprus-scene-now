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
      if (isInitial) {
        setLoading(true);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
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

  // Detect high-density venue (>500 seats)
  const isHighDensity = seats.length > 500;

  // Pre-compute row labels placed in inter-zone gaps
  const rowLabels = React.useMemo(() => {
    if (seats.length === 0 || zones.length === 0) return [];

    // Group seats by zone_id
    const seatsByZone = new Map<string, VenueSeat[]>();
    for (const s of seats) {
      if (!seatsByZone.has(s.zone_id)) seatsByZone.set(s.zone_id, []);
      seatsByZone.get(s.zone_id)!.push(s);
    }

    // The stage center in our coordinate system
    const stageCX = 600;
    const stageCY = 870;

    // Compute each zone's angular center (average angle of all its seats)
    const zoneAngles: { zoneId: string; avgAngle: number }[] = [];
    zones.forEach(z => {
      const zSeats = seatsByZone.get(z.id);
      if (!zSeats || zSeats.length === 0) return;
      let sumAngle = 0;
      for (const s of zSeats) {
        const dx = s.x - stageCX;
        const dy = stageCY - s.y;
        sumAngle += Math.atan2(dy, dx);
      }
      zoneAngles.push({ zoneId: z.id, avgAngle: sumAngle / zSeats.length });
    });

    // Sort zones by angle descending (left=high angle to right=low angle)
    zoneAngles.sort((a, b) => b.avgAngle - a.avgAngle);

    // For each pair of adjacent zones, find the angular gap midpoint
    const labels: React.ReactNode[] = [];
    const BASE_R = 100;
    const ROW_STEP = 26;
    const ROW_LABELS_ORDER = ['Α','Β','Γ','Δ','Ε','Ζ','Η','Θ','Ι','Κ','Λ','Μ','Ν','Ξ','Ο','Π','Ρ','Σ'];
    const ROW_IDX_MAP: Record<string, number> = {};
    ROW_LABELS_ORDER.forEach((l, i) => { ROW_IDX_MAP[l] = i; });

    for (let i = 0; i < zoneAngles.length - 1; i++) {
      const leftZoneId = zoneAngles[i].zoneId;
      const rightZoneId = zoneAngles[i + 1].zoneId;

      // Find the boundary: min angle of left zone, max angle of right zone
      const leftSeats = seatsByZone.get(leftZoneId) || [];
      const rightSeats = seatsByZone.get(rightZoneId) || [];

      let leftMinAngle = Infinity;
      for (const s of leftSeats) {
        const a = Math.atan2(stageCY - s.y, s.x - stageCX);
        if (a < leftMinAngle) leftMinAngle = a;
      }
      let rightMaxAngle = -Infinity;
      for (const s of rightSeats) {
        const a = Math.atan2(stageCY - s.y, s.x - stageCX);
        if (a > rightMaxAngle) rightMaxAngle = a;
      }

      const gapMidAngle = (leftMinAngle + rightMaxAngle) / 2;

      // Find which rows exist in BOTH adjacent zones
      const leftRows = new Set(leftSeats.map(s => s.row_label));
      const rightRows = new Set(rightSeats.map(s => s.row_label));
      const commonRows = [...leftRows].filter(r => rightRows.has(r) && r !== 'WC');

      for (const rowLabel of commonRows) {
        const rowIdx = ROW_IDX_MAP[rowLabel];
        if (rowIdx === undefined) continue;
        const radius = BASE_R + rowIdx * ROW_STEP;
        const lx = stageCX + radius * Math.cos(gapMidAngle) - bounds.minX;
        const ly = stageCY - radius * Math.sin(gapMidAngle) - bounds.minY;

        labels.push(
          <text
            key={`row-label-${rowLabel}-gap-${i}`}
            x={lx}
            y={ly + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={isHighDensity ? 7 : 9}
            fontWeight={600}
            fill="hsl(var(--muted-foreground))"
            className="select-none"
          >
            {rowLabel}
          </text>
        );
      }
    }
    return labels;
  }, [seats, zones, bounds, isHighDensity]);

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
  const SEAT_W = isHighDensity ? 8 : 20;
  const SEAT_H = isHighDensity ? 8 : 18;
  const renderSeat = (seat: VenueSeat) => {
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

    // Rotate seat to face stage center
    const stageCX = 600 - bounds.minX;
    const stageCY = 870 - bounds.minY;
    const angleDeg = Math.atan2(stageCY - cy, cx - stageCX) * (180 / Math.PI);
    const rotation = 90 - angleDeg;

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
        transform={`rotate(${rotation}, ${cx}, ${cy})`}
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
        {zoom >= (isHighDensity ? 1.8 : 1.2) && (
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
          {/* Stage indicator — small decorative arc at bottom center */}
          <g>
            {(() => {
              const scx = 600 - bounds.minX;
              const scy = 870 - bounds.minY;
              const stageR = 70;
              // Small arc from 150° to 30° (facing upward toward seats)
              const a1 = (150 * Math.PI) / 180;
              const a2 = (30 * Math.PI) / 180;
              const x1 = scx + stageR * Math.cos(a1);
              const y1 = scy - stageR * Math.sin(a1);
              const x2 = scx + stageR * Math.cos(a2);
              const y2 = scy - stageR * Math.sin(a2);
              return (
                <>
                  <path
                    d={`M ${x1} ${y1} A ${stageR} ${stageR} 0 0 0 ${x2} ${y2}`}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />
                  <text
                    x={scx}
                    y={scy - 10}
                    textAnchor="middle"
                    fontSize={14}
                    fontWeight={700}
                    fill="hsl(var(--primary))"
                    className="select-none"
                  >
                    {t.stage}
                  </text>
                </>
              );
            })()}
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
