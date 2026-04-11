import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { fetchAllRows } from '@/lib/fetchAllRows';
import type { SelectedSeat } from './SeatMapViewer';
import { CX, CY, INNER_R, OUTER_R, ZONE_ARCS, annularSectorPath, midPoint } from './theatreConstants';

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
      const [zonesRes, allSeats] = await Promise.all([
        supabase
          .from('venue_zones')
          .select('id, name, description, color, sort_order')
          .eq('venue_id', venueId)
          .order('sort_order'),
        fetchAllRows<{ id: string; zone_id: string }>(
          (from, to) =>
            supabase
              .from('venue_seats')
              .select('id, zone_id')
              .eq('venue_id', venueId)
              .eq('is_active', true)
              .range(from, to)
        ),
      ]);

      const zoneData = (zonesRes.data || []) as VenueZone[];
      setZones(zoneData);

      const counts: Record<string, number> = {};
      for (const s of allSeats) {
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
          for (const seat of allSeats) {
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
        <svg viewBox="0 20 600 420" className="w-full" preserveAspectRatio="xMidYMid meet">
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
                onClick={() => onZoneClick({ ...zone, seatCount: total } as any)}
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
            y={390}
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
            y={405}
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
