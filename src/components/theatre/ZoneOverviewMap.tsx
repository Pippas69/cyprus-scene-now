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
    seats: 'θέσεις',
    selectZone: 'Επιλέξτε ζώνη για να δείτε τις θέσεις',
    loading: 'Φόρτωση...',
    selected: 'επιλ.',
  },
  en: {
    stage: 'STAGE',
    available: 'available',
    seats: 'seats',
    selectZone: 'Select a zone to view seats',
    loading: 'Loading...',
    selected: 'sel.',
  },
};

/**
 * Zone layout config for the Pattihio horseshoe.
 * Each zone gets a position in a simplified horseshoe SVG.
 * We use a card/block approach arranged in a horseshoe pattern.
 */
const ZONE_LAYOUT: Record<string, { cx: number; cy: number; w: number; h: number; angle?: number }> = {
  // Πλατεία - center front
  'Πλατεία': { cx: 300, cy: 200, w: 140, h: 70 },
  // Τμήμα Δ - upper left  
  'Τμήμα Δ': { cx: 165, cy: 110, w: 110, h: 55, angle: 25 },
  // Τμήμα Ε - upper right
  'Τμήμα Ε': { cx: 435, cy: 110, w: 110, h: 55, angle: -25 },
  // Τμήμα Γ - center left
  'Τμήμα Γ': { cx: 120, cy: 195, w: 90, h: 50, angle: 45 },
  // Τμήμα Β - left wing
  'Τμήμα Β': { cx: 80, cy: 290, w: 90, h: 50, angle: 65 },
  // Τμήμα Ζ - right wing
  'Τμήμα Ζ': { cx: 480, cy: 195, w: 90, h: 50, angle: -45 },
  // Τμήμα Α - far left
  'Τμήμα Α': { cx: 60, cy: 390, w: 80, h: 45, angle: 80 },
  // Τμήμα Η - far right
  'Τμήμα Η': { cx: 520, cy: 290, w: 90, h: 50, angle: -65 },
  // Τμήμα Θ - far right bottom
  'Τμήμα Θ': { cx: 540, cy: 390, w: 80, h: 45, angle: -80 },
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

      // Count seats per zone
      const counts: Record<string, number> = {};
      for (const s of (seatsRes.data || [])) {
        counts[s.zone_id] = (counts[s.zone_id] || 0) + 1;
      }
      setSeatCounts(counts);

      // Count sold seats per zone
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

          // Map sold seat IDs back to zones
          const zoneSold: Record<string, number> = {};
          for (const seat of (seatsRes.data || [])) {
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

  // Count selected seats per zone
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
        <svg viewBox="0 0 600 480" className="w-full" preserveAspectRatio="xMidYMid meet">
          {/* Stage */}
          <path
            d="M 220 390 A 80 80 0 0 0 380 390 Z"
            fill="hsl(var(--primary) / 0.15)"
            stroke="hsl(var(--primary) / 0.5)"
            strokeWidth={2}
          />
          <text
            x={300}
            y={370}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={14}
            fontWeight={700}
            fill="hsl(var(--primary))"
            className="select-none pointer-events-none"
          >
            {t.stage}
          </text>

          {/* Zone blocks */}
          {zones.map((zone) => {
            const layout = ZONE_LAYOUT[zone.name];
            if (!layout) return null;

            const total = seatCounts[zone.id] || 0;
            const sold = soldCounts[zone.id] || 0;
            const available = total - sold;
            const selected = selectedPerZone[zone.id] || 0;

            return (
              <g
                key={zone.id}
                className="cursor-pointer"
                onClick={() => onZoneClick(zone)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onZoneClick(zone);
                }}
              >
                <g transform={`translate(${layout.cx}, ${layout.cy}) rotate(${layout.angle || 0})`}>
                  {/* Background rect */}
                  <rect
                    x={-layout.w / 2}
                    y={-layout.h / 2}
                    width={layout.w}
                    height={layout.h}
                    rx={8}
                    fill={zone.color}
                    opacity={0.2}
                    stroke={zone.color}
                    strokeWidth={selected > 0 ? 3 : 1.5}
                    className="transition-all duration-150 hover:opacity-40"
                  />
                  {/* Zone name */}
                  <text
                    x={0}
                    y={-6}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={12}
                    fontWeight={700}
                    fill={zone.color}
                    className="select-none pointer-events-none"
                  >
                    {zone.name}
                  </text>
                  {/* Availability text */}
                  <text
                    x={0}
                    y={12}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={9}
                    fill="hsl(var(--muted-foreground))"
                    className="select-none pointer-events-none"
                  >
                    {available} {t.available}
                  </text>
                  {/* Selected badge */}
                  {selected > 0 && (
                    <>
                      <circle
                        cx={layout.w / 2 - 6}
                        cy={-layout.h / 2 + 6}
                        r={10}
                        fill="hsl(var(--primary))"
                      />
                      <text
                        x={layout.w / 2 - 6}
                        y={-layout.h / 2 + 7}
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
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
