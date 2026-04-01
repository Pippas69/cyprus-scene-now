import React, { useState } from 'react';
import { type SelectedSeat } from './SeatMapViewer';
import { ZoneOverviewMap } from './ZoneOverviewMap';
import { ZoneSeatPicker } from './ZoneSeatPicker';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';

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

      {/* 2-step flow: zone overview OR zone detail */}
      {activeZone ? (
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
      )}

      {/* All selected seats summary (shown in overview mode) */}
      {!activeZone && selectedSeats.length > 0 && (
        <div className="flex flex-wrap gap-1 px-1 pt-1 border-t">
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
