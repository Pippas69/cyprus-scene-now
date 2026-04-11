import React from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check } from 'lucide-react';
import { SeatSelectionStep } from './SeatSelectionStep';
import { type SelectedSeat } from './SeatMapViewer';
import { useLanguage } from '@/hooks/useLanguage';

interface FullscreenSeatSelectorProps {
  venueId: string;
  showInstanceId: string;
  maxSeats: number;
  selectedSeats: SelectedSeat[];
  onSeatToggle: (seat: SelectedSeat) => void;
  eventTitle: string;
  eventDate: string;
  onClose: () => void;
  onDone: () => void;
}

const translations = {
  el: {
    selectSeats: 'Επιλογή Θέσεων',
    done: 'Έτοιμο',
    selected: 'Επιλεγμένες',
  },
  en: {
    selectSeats: 'Select Seats',
    done: 'Done',
    selected: 'Selected',
  },
};

export const FullscreenSeatSelector: React.FC<FullscreenSeatSelectorProps> = ({
  venueId,
  showInstanceId,
  maxSeats,
  selectedSeats,
  onSeatToggle,
  eventTitle,
  eventDate,
  onClose,
  onDone,
}) => {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2.5 border-b border-border/50 bg-background">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">{language === 'el' ? 'Πίσω' : 'Back'}</span>
        </button>
        <div className="text-center flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{eventTitle}</p>
          {eventDate && <p className="text-[11px] text-muted-foreground truncate">{eventDate}</p>}
        </div>
        <div className="w-8" /> {/* Spacer for centering */}
      </div>

      {/* Seat map - takes all available space */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <SeatSelectionStep
          venueId={venueId}
          showInstanceId={showInstanceId}
          maxSeats={maxSeats}
          selectedSeats={selectedSeats}
          onSeatToggle={onSeatToggle}
          eventTitle={eventTitle}
          eventDate={eventDate}
        />
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-border/50 bg-background px-3 py-2.5 safe-area-bottom">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            {t.selected}: <span className="font-semibold text-foreground">{selectedSeats.length}</span>
          </span>
          <Button
            size="sm"
            onClick={onDone}
            disabled={selectedSeats.length === 0}
            className="gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            {t.done}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
