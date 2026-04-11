import React, { useState, useEffect } from 'react';
import { type SelectedSeat } from './SeatMapViewer';
import { SeatMapViewer } from './SeatMapViewer';
import { ZoneOverviewMap } from './ZoneOverviewMap';
import { ZoneSeatPicker } from './ZoneSeatPicker';
import { PefkiosOverviewMap } from './PefkiosOverviewMap';
import { PefkiosSeatPicker } from './PefkiosSeatPicker';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { ZONE_ARCS } from './theatreConstants';
import { isPefkiosVenue } from './pefkiosConstants';

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

type VenueType = 'horseshoe' | 'pefkios' | 'flat' | null;

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
  const [venueType, setVenueType] = useState<VenueType>(null);

  // Detect venue type
  useEffect(() => {
    const detect = async () => {
      const { data: zones } = await supabase
        .from('venue_zones')
        .select('name')
        .eq('venue_id', venueId);

      if (!zones || zones.length === 0) {
        setVenueType('flat');
        return;
      }

      const zoneNames = zones.map((z) => z.name);

      // Check Pefkios first (Αριστερά/Κέντρο/Δεξιά)
      if (isPefkiosVenue(zoneNames)) {
        setVenueType('pefkios');
        return;
      }

      // Check horseshoe (Τμήμα Α, Β, etc.)
      const hasArcZones = zoneNames.some((name) => ZONE_ARCS[name] !== undefined);
      setVenueType(hasArcZones ? 'horseshoe' : 'flat');
    };

    setVenueType(null);
    setActiveZone(null);
    detect();
  }, [venueId]);

  // Still loading venue type detection
  if (venueType === null) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <div className="animate-pulse text-sm">...</div>
      </div>
    );
  }

  const isZoneBased = venueType === 'horseshoe' || venueType === 'pefkios';

  return (
    <div className="flex flex-col h-full gap-4">
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
            {t.selectedCount}: {activeZone ? selectedSeats.filter(s => s.zoneId === activeZone.id).length : selectedSeats.length} {t.of} {activeZone ? activeZone.seatCount : maxSeats}
          </span>
          {/* Seat dots - cap at 10 to avoid overflow */}
          <div className="flex gap-0.5">
            {Array.from({ length: Math.min(activeZone ? activeZone.seatCount : maxSeats, 10) }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i < (activeZone ? selectedSeats.filter(s => s.zoneId === activeZone.id).length : selectedSeats.length)
                    ? 'bg-primary'
                    : 'bg-muted-foreground/20'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Venue-appropriate seat map - flex-1 to fill remaining height */}
      <div className="flex-1 min-h-0">
      {venueType === 'horseshoe' ? (
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
            onZoneClick={(zone) => {
              const count = (zone as any).seatCount ?? 0;
              setActiveZone({ id: zone.id, name: zone.name, color: zone.color, seatCount: count });
            }}
          />
        )
      ) : venueType === 'pefkios' ? (
        // Pefkios 3-section flow (overview → section detail)
        activeZone ? (
          <PefkiosSeatPicker
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
          <PefkiosOverviewMap
            venueId={venueId}
            showInstanceId={showInstanceId}
            selectedSeats={selectedSeats}
            onZoneClick={(zone) => {
              setActiveZone({ id: zone.id, name: zone.name, color: zone.color, seatCount: zone.seatCount });
            }}
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
      </div>

      {/* All selected seats summary (shown in overview mode for zone-based, always for flat) */}
      {(isZoneBased ? !activeZone : true) && selectedSeats.length > 0 && (
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
