import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import type { SelectedSeat } from './SeatMapViewer';

interface VenueZone {
  id: string;
  name: string;
  description: string | null;
  color: string;
  sort_order: number;
}

interface ZoneOverviewMapProps {
  venueId: string;
  showInstanceId: string;
  selectedSeats: SelectedSeat[];
  onZoneClick: (zone: VenueZone) => void;
}

const translations = {
  el: {
    stage: 'ΣΚΗΝΗ',
    available: 'διαθέσιμες',
    selectZone: 'Επιλέξτε ζώνη για να δείτε τις θέσεις',
    loading: 'Φόρτωση...',
    mainEntrance: 'ΚΥΡΙΑ ΕΙΣΟΔΟΣ',
    secondEntrance: "Β' ΕΙΣΟΔΟΣ",
    canteen: 'ΚΑΝΤΙΝΑ',
  },
  en: {
    stage: 'STAGE',
    available: 'available',
    selectZone: 'Select a zone to view seats',
    loading: 'Loading...',
    mainEntrance: 'MAIN ENTRANCE',
    secondEntrance: '2ND ENTRANCE',
    canteen: 'CANTEEN',
  },
};

// Annular sector path generator
function annularSectorPath(
  cx: number, cy: number,
  innerR: number, outerR: number,
  startDeg: number, endDeg: number
): string {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const s = toRad(startDeg);
  const e = toRad(endDeg);
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;

  const ox1 = cx + outerR * Math.cos(s);
  const oy1 = cy + outerR * Math.sin(s);
  const ox2 = cx + outerR * Math.cos(e);
  const oy2 = cy + outerR * Math.sin(e);
  const ix1 = cx + innerR * Math.cos(e);
  const iy1 = cy + innerR * Math.sin(e);
  const ix2 = cx + innerR * Math.cos(s);
  const iy2 = cy + innerR * Math.sin(s);

  return [
    `M ${ox1} ${oy1}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2}`,
    `L ${ix1} ${iy1}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
    'Z',
  ].join(' ');
}

function midPoint(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const mid = ((startDeg + endDeg) / 2) * (Math.PI / 180);
  return { x: cx + r * Math.cos(mid), y: cy + r * Math.sin(mid) };
}

// Zone angle mapping for the Pattihio horseshoe
// Stage at bottom (270°), seats curve upward from ~190° to ~350°
const ZONE_ARCS: Record<string, { startDeg: number; endDeg: number; inner?: number; outer?: number }> = {
  'Τμήμα Α': { startDeg: 190, endDeg: 210 },
  'Τμήμα Β': { startDeg: 212, endDeg: 238 },
  'Τμήμα Γ': { startDeg: 240, endDeg: 258 },
  'Τμήμα Δ': { startDeg: 260, endDeg: 282 },
  'Τμήμα Ε': { startDeg: 284, endDeg: 306 },
  'Τμήμα Ζ': { startDeg: 308, endDeg: 324 },
  'Τμήμα Η': { startDeg: 326, endDeg: 342 },
  'Τμήμα Θ': { startDeg: 344, endDeg: 358 },
  'Πλατεία':  { startDeg: 245, endDeg: 295, inner: 60, outer: 140 },
};

const CX = 300;
const CY = 340;
const INNER_R = 100;
const OUTER_R = 260;

export const ZoneOverviewMap: React.FC<ZoneOverviewMapProps> = ({
  venueId,
  showInstanceId,
  selectedSeats,
  onZoneClick,
}) => {
  const { language } = useLanguage();
  const t = translations[language];

  const [zones, setZones] = useState<VenueZone[]>([]);
  const [seatCounts, setSeatCounts] = useState<Record<string, number>>({});
  const [soldCounts, setSoldCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [zonesRes, seatsRes] = await Promise.all([
        supabase
          .from('venue_zones')
          .select('id, name, description, color, sort_order')
          .eq('venue_id', venueId)
          .order('sort_order'),
        supabase
          .from('venue_seats')
          .select('id, zone_id')
          .eq('venue_id', venueId)
          .eq('is_active', true)
          .limit(5000),
      ]);

      const zoneData = (zonesRes.data || []) as VenueZone[];
      setZones(zoneData);

      const counts: Record<string, number> = {};
      for (const s of seatsRes.data || []) {
        counts[s.zone_id] = (counts[s.zone_id] || 0) + 1;
      }
      setSeatCounts(counts);

      if (showInstanceId !== '__new__') {
        const soldRes = await supabase
          .from('show_instance_seats')
          .select('venue_seat_id, status, held_until')
          .eq('show_instance_id', showInstanceId)
          .in('status', ['sold', 'held']);

        if (soldRes.data) {
          const now = new Date();
          const soldSeatIds = new Set(
            soldRes.data
              .filter((s: any) => {
                if (s.status === 'sold') return true;
                if (s.status === 'held' && s.held_until) return new Date(s.held_until) > now;
                return false;
              })
              .map((s: any) => s.venue_seat_id)
          );
          const zoneSold: Record<string, number> = {};
          for (const seat of seatsRes.data || []) {
            if (soldSeatIds.has(seat.id)) {
              zoneSold[seat.zone_id] = (zoneSold[seat.zone_id] || 0) + 1;
            }
          }
          setSoldCounts(zoneSold);
        }
      }
      setLoading(false);
    };
    load();
  }, [venueId, showInstanceId]);

  const selectedPerZone = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of selectedSeats) {
      map[s.zoneId] = (map[s.zoneId] || 0) + 1;
    }
    return map;
  }, [selectedSeats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="animate-pulse text-sm">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <p className="text-xs text-muted-foreground text-center">{t.selectZone}</p>

      <div className="relative w-full" style={{ maxWidth: 600, margin: '0 auto' }}>
        <svg viewBox="0 0 600 500" className="w-full" preserveAspectRatio="xMidYMid meet">
          {/* Outer theatre boundary */}
          <path
            d={annularSectorPath(CX, CY, OUTER_R + 8, OUTER_R + 12, 188, 352)}
            fill="hsl(var(--muted) / 0.3)"
            stroke="hsl(var(--border))"
            strokeWidth={0.5}
          />

          {/* Zone arcs */}
          {zones.map((zone) => {
            const arc = ZONE_ARCS[zone.name];
            if (!arc) return null;

            const innerR = arc.inner ?? INNER_R;
            const outerR = arc.outer ?? OUTER_R;
            const total = seatCounts[zone.id] || 0;
            const sold = soldCounts[zone.id] || 0;
            const available = total - sold;
            const selected = selectedPerZone[zone.id] || 0;
            const isHovered = hoveredZone === zone.id;
            const labelR = (innerR + outerR) / 2;
            const labelPos = midPoint(CX, CY, labelR, arc.startDeg, arc.endDeg);
            const shortName = zone.name.replace('Τμήμα ', '');

            return (
              <g
                key={zone.id}
                className="cursor-pointer"
                onClick={() => onZoneClick(zone)}
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onZoneClick(zone);
                }}
              >
                <path
                  d={annularSectorPath(CX, CY, innerR, outerR, arc.startDeg, arc.endDeg)}
                  fill={zone.color}
                  fillOpacity={isHovered ? 0.5 : 0.25}
                  stroke={zone.color}
                  strokeWidth={isHovered || selected > 0 ? 3 : 1.2}
                  className="transition-all duration-150"
                />
                {/* Zone label */}
                <text
                  x={labelPos.x}
                  y={labelPos.y - 6}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={zone.name === 'Πλατεία' ? 11 : 14}
                  fontWeight={700}
                  fill={zone.color}
                  className="select-none pointer-events-none"
                >
                  {shortName}
                </text>
                {/* Availability */}
                <text
                  x={labelPos.x}
                  y={labelPos.y + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={8}
                  fill="hsl(var(--muted-foreground))"
                  className="select-none pointer-events-none"
                >
                  {available} {t.available}
                </text>
                {/* Selected badge */}
                {selected > 0 && (
                  <>
                    <circle
                      cx={labelPos.x + 20}
                      cy={labelPos.y - 14}
                      r={9}
                      fill="hsl(var(--primary))"
                    />
                    <text
                      x={labelPos.x + 20}
                      y={labelPos.y - 13}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={9}
                      fontWeight={700}
                      fill="hsl(var(--primary-foreground))"
                      className="select-none pointer-events-none"
                    >
                      {selected}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* Stage semicircle at bottom */}
          <path
            d={`M ${CX - 90} ${CY + 20} A 90 60 0 0 0 ${CX + 90} ${CY + 20} Z`}
            fill="hsl(var(--primary) / 0.12)"
            stroke="hsl(var(--primary) / 0.5)"
            strokeWidth={2}
          />
          <text
            x={CX}
            y={CY + 10}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={13}
            fontWeight={700}
            fill="hsl(var(--primary))"
            letterSpacing="0.12em"
            className="select-none pointer-events-none"
          >
            {t.stage}
          </text>

          {/* Labels: entrances */}
          <text
            x={CX}
            y={30}
            textAnchor="middle"
            fontSize={9}
            fontWeight={600}
            fill="hsl(var(--muted-foreground))"
            letterSpacing="0.08em"
            className="select-none pointer-events-none"
          >
            {t.mainEntrance}
          </text>
          <text
            x={55}
            y={460}
            textAnchor="middle"
            fontSize={8}
            fontWeight={600}
            fill="hsl(var(--muted-foreground))"
            letterSpacing="0.06em"
            className="select-none pointer-events-none"
          >
            {t.secondEntrance}
          </text>
          <text
            x={55}
            y={480}
            textAnchor="middle"
            fontSize={7}
            fill="hsl(var(--muted-foreground))"
            className="select-none pointer-events-none"
          >
            {t.canteen}
          </text>
        </svg>
      </div>
    </div>
  );
};
