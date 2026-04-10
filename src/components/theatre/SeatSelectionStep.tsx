import React, { useState, useEffect } from 'react';
import { type SelectedSeat } from './SeatMapViewer';
import { SeatMapViewer } from './SeatMapViewer';
import { ZoneOverviewMap } from './ZoneOverviewMap';
import { ZoneSeatPicker } from './ZoneSeatPicker';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { ZONE_ARCS } from './theatreConstants';

interface SeatSelectionStepProps {
  venueId: string;
  showInstanceId: string;
  maxSeats: number;
  selectedSeats: SelectedSeat[];
  onSeatToggle: (seat: SelectedSeat) => void;
  eventTitle: string;
  eventDate: string;
}

const translations = {
  el: {
    selectSeats: 'Επιλογή Θέσεων',
    selectedCount: 'Επιλεγμένες',
    of: 'από',
  },
  en: {
    selectSeats: 'Select Seats',
    selectedCount: 'Selected',
    of: 'of',
  },
};

interface ActiveZone {
  id: string;
  name: string;
  color: string;
  seatCount: number;
}

export const SeatSelectionStep: React.FC<SeatSelectionStepProps> = ({
  venueId,
  showInstanceId,
  maxSeats,
  selectedSeats,
  onSeatToggle,
  eventTitle,
  eventDate,
}) => {
  const { language } = useLanguage();
  const t = translations[language];
  const [activeZone, setActiveZone] = useState<ActiveZone | null>(null);
  const [useHorseshoe, setUseHorseshoe] = useState<boolean | null>(null);

  // Detect venue type: if zones match ZONE_ARCS keys, use horseshoe; otherwise use flat SeatMapViewer
  useEffect(() => {
    const detect = async () => {
      const { data: zones } = await supabase
        .from('venue_zones')
        .select('name')
        .eq('venue_id', venueId);

      if (!zones || zones.length === 0) {
        setUseHorseshoe(false);
        return;
      }

      // Check if any zone name matches the horseshoe arc definitions
      const hasArcZones = zones.some((z) => ZONE_ARCS[z.name] !== undefined);
      setUseHorseshoe(hasArcZones);
    };

    setUseHorseshoe(null);
    setActiveZone(null);
    detect();
  }, [venueId]);

  // Still loading venue type detection
  if (useHorseshoe === null) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <div className="animate-pulse text-sm">...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="space-y-1">
        <h3 className="font-semibold text-sm">{eventTitle}</h3>
        <p className="text-xs text-muted-foreground">{eventDate}</p>
      </div>

      {/* Selection counter */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">
          {t.selectSeats}
        </Badge>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium">
            {t.selectedCount}: {selectedSeats.length} {t.of} {maxSeats}
          </span>
          {/* Seat dots - cap at 10 to avoid overflow */}
          <div className="flex gap-0.5">
            {Array.from({ length: Math.min(maxSeats, 10) }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i < selectedSeats.length
                    ? 'bg-primary'
                    : 'bg-muted-foreground/20'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Venue-appropriate seat map */}
      {useHorseshoe ? (
        // Horseshoe amphitheatre flow (zone overview → zone detail)
        activeZone ? (
          <ZoneSeatPicker
            venueId={venueId}
            showInstanceId={showInstanceId}
            zoneId={activeZone.id}
            zoneName={activeZone.name}
            zoneColor={activeZone.color}
            maxSeats={maxSeats}
            selectedSeats={selectedSeats}
            onSeatToggle={onSeatToggle}
            onBack={() => setActiveZone(null)}
          />
        ) : (
          <ZoneOverviewMap
            venueId={venueId}
            showInstanceId={showInstanceId}
            selectedSeats={selectedSeats}
            onZoneClick={(zone) =>
              setActiveZone({ id: zone.id, name: zone.name, color: zone.color })
            }
          />
        )
      ) : (
        // Flat coordinate-based seat map (original viewer)
        <SeatMapViewer
          venueId={venueId}
          showInstanceId={showInstanceId}
          maxSeats={maxSeats}
          selectedSeats={selectedSeats}
          onSeatToggle={onSeatToggle}
        />
      )}

      {/* All selected seats summary (shown in overview mode for horseshoe, always for flat) */}
      {(useHorseshoe ? !activeZone : true) && selectedSeats.length > 0 && (
        <div className="flex flex-wrap gap-1 px-1 pt-1 border-t">
          {selectedSeats.map((s) => (
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
