import React from 'react';
import { SeatMapViewer, type SelectedSeat } from './SeatMapViewer';
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
          {/* Seat dots */}
          <div className="flex gap-0.5">
            {Array.from({ length: maxSeats }).map((_, i) => (
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

      {/* The seat map */}
      <SeatMapViewer
        venueId={venueId}
        showInstanceId={showInstanceId}
        maxSeats={maxSeats}
        selectedSeats={selectedSeats}
        onSeatToggle={onSeatToggle}
      />
    </div>
  );
};
