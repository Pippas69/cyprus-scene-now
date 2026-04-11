import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { fetchAllRows } from '@/lib/fetchAllRows';
import type { SelectedSeat } from './SeatMapViewer';
import { PEFKIOS_SECTIONS, PEFKIOS_ZONE_NAMES, type PefkiosSectionKey } from './pefkiosConstants';

interface VenueZone {
  id: string;
  name: string;
  description: string | null;
  color: string;
  sort_order: number;
}

interface PefkiosOverviewMapProps {
  venueId: string;
  showInstanceId: string;
  selectedSeats: SelectedSeat[];
  onZoneClick: (zone: VenueZone & { seatCount: number }) => void;
}

const translations = {
  el: {
    stage: 'ΣΚΗΝΗ',
    available: 'διαθέσιμες',
    selectZone: 'Επιλέξτε τμήμα για να δείτε τις θέσεις',
    loading: 'Φόρτωση...',
    left: 'Αριστερά',
    center: 'Κέντρο',
    right: 'Δεξιά',
  },
  en: {
    stage: 'STAGE',
    available: 'available',
    selectZone: 'Select a section to view seats',
    loading: 'Loading...',
    left: 'Left',
    center: 'Center',
    right: 'Right',
  },
};

// SVG layout constants
const SVG_W = 600;
const SVG_H = 480;
const STAGE_Y = SVG_H - 60;
const STAGE_W = 180;
const STAGE_H = 40;

// Section block dimensions
const SECTION_W = 150;
const SECTION_H = 260;
const GAP = 20;

// Section positions (center of each block, before rotation)
const SECTION_POSITIONS: Record<PefkiosSectionKey, { cx: number; cy: number }> = {
  'Αριστερά': { cx: SVG_W / 2 - SECTION_W - GAP, cy: STAGE_Y - SECTION_H / 2 - 60 },
  'Κέντρο': { cx: SVG_W / 2, cy: STAGE_Y - SECTION_H / 2 - 60 },
  'Δεξιά': { cx: SVG_W / 2 + SECTION_W + GAP, cy: STAGE_Y - SECTION_H / 2 - 60 },
};

export const PefkiosOverviewMap: React.FC<PefkiosOverviewMapProps> = ({
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

  // Sort zones in the correct order: Left, Center, Right
  const orderedZones = [...zones].sort((a, b) => {
    const order = PEFKIOS_ZONE_NAMES.indexOf(a.name as PefkiosSectionKey) - PEFKIOS_ZONE_NAMES.indexOf(b.name as PefkiosSectionKey);
    return order !== 0 ? order : a.sort_order - b.sort_order;
  });

  return (
    <div className="w-full h-full flex flex-col">
      <p className="text-xs text-muted-foreground text-center py-2">{t.selectZone}</p>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pb-2">
        {orderedZones.map((zone) => (
          <div key={zone.id} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: zone.color }} />
            <span className="text-[11px] text-muted-foreground">
              {language === 'el' ? zone.name : zone.name === 'Αριστερά' ? t.left : zone.name === 'Κέντρο' ? t.center : t.right}
            </span>
          </div>
        ))}
      </div>

      <div className="relative w-full h-full flex-1" style={{ margin: '0 auto' }}>
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* Stage */}
          <rect
            x={SVG_W / 2 - STAGE_W / 2}
            y={STAGE_Y - STAGE_H / 2}
            width={STAGE_W}
            height={STAGE_H}
            rx={8}
            fill="hsl(var(--primary) / 0.12)"
            stroke="hsl(var(--primary) / 0.5)"
            strokeWidth={2}
          />
          <text
            x={SVG_W / 2}
            y={STAGE_Y}
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

          {/* Section blocks */}
          {orderedZones.map((zone) => {
            const sectionKey = zone.name as PefkiosSectionKey;
            const section = PEFKIOS_SECTIONS[sectionKey];
            const pos = SECTION_POSITIONS[sectionKey];
            if (!section || !pos) return null;

            const total = seatCounts[zone.id] || 0;
            const sold = soldCounts[zone.id] || 0;
            const available = total - sold;
            const selected = selectedPerZone[zone.id] || 0;
            const isHovered = hoveredZone === zone.id;

            // Draw rows of dots to represent seats
            const numRows = 13; // Α-Ν
            const dotsPerRow = Math.ceil(total / numRows);
            const dotR = 3;
            const rowH = (SECTION_H - 20) / numRows;
            const blockX = pos.cx - SECTION_W / 2;
            const blockY = pos.cy - SECTION_H / 2;

            return (
              <g
                key={zone.id}
                className="cursor-pointer"
                onClick={() => onZoneClick({ ...zone, seatCount: total })}
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onZoneClick({ ...zone, seatCount: total });
                }}
                transform={`rotate(${section.rotationDeg}, ${pos.cx}, ${STAGE_Y})`}
              >
                {/* Section background */}
                <rect
                  x={blockX}
                  y={blockY}
                  width={SECTION_W}
                  height={SECTION_H}
                  rx={6}
                  fill={zone.color}
                  fillOpacity={isHovered ? 0.2 : 0.08}
                  stroke={zone.color}
                  strokeWidth={isHovered || selected > 0 ? 2.5 : 1}
                  strokeOpacity={isHovered ? 0.8 : 0.4}
                  className="transition-all duration-150"
                />

                {/* Seat dot rows */}
                {Array.from({ length: numRows }).map((_, rowIdx) => {
                  const rowY = blockY + 14 + rowIdx * rowH;
                  // Vary dots per row slightly (fewer at front, more at back)
                  const rowDots = Math.max(3, Math.min(dotsPerRow + 2, Math.round(dotsPerRow * (0.6 + rowIdx * 0.04))));
                  const dotSpacing = (SECTION_W - 20) / Math.max(rowDots - 1, 1);

                  return Array.from({ length: rowDots }).map((_, dotIdx) => (
                    <circle
                      key={`${rowIdx}-${dotIdx}`}
                      cx={blockX + 10 + dotIdx * dotSpacing}
                      cy={rowY}
                      r={dotR}
                      fill={zone.color}
                      fillOpacity={isHovered ? 0.7 : 0.45}
                      className="pointer-events-none"
                    />
                  ));
                })}

                {/* Section label */}
                <text
                  x={pos.cx}
                  y={pos.cy - 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={14}
                  fontWeight={700}
                  fill={zone.color}
                  className="select-none pointer-events-none"
                >
                  {language === 'el' ? zone.name : zone.name === 'Αριστερά' ? t.left : zone.name === 'Κέντρο' ? t.center : t.right}
                </text>

                {/* Available count */}
                <text
                  x={pos.cx}
                  y={pos.cy + 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fill="hsl(var(--muted-foreground))"
                  className="select-none pointer-events-none"
                >
                  {available} {t.available}
                </text>

                {/* Selected badge */}
                {selected > 0 && (
                  <>
                    <circle
                      cx={pos.cx + SECTION_W / 2 - 10}
                      cy={blockY + 14}
                      r={10}
                      fill="hsl(var(--primary))"
                    />
                    <text
                      x={pos.cx + SECTION_W / 2 - 10}
                      y={blockY + 15}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={10}
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
        </svg>
      </div>
    </div>
  );
};
