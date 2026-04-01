import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SelectedSeat } from './SeatMapViewer';

interface VenueSeat {
  id: string;
  zone_id: string;
  row_label: string;
  seat_number: number;
  seat_label: string;
  seat_type: string;
  is_active: boolean;
}

interface ZoneSeatPickerProps {
  venueId: string;
  showInstanceId: string;
  zoneId: string;
  zoneName: string;
  zoneColor: string;
  maxSeats: number;
  selectedSeats: SelectedSeat[];
  onSeatToggle: (seat: SelectedSeat) => void;
  onBack: () => void;
}

const translations = {
  el: {
    back: 'Πίσω στις ζώνες',
    row: 'Σειρά',
    loading: 'Φόρτωση θέσεων...',
    available: 'Διαθέσιμη',
    sold: 'Πωλημένη',
    selected: 'Επιλεγμένη',
    noSeats: 'Δεν υπάρχουν θέσεις σε αυτή τη ζώνη',
    maxReached: 'Μέγιστος αριθμός θέσεων',
  },
  en: {
    back: 'Back to zones',
    row: 'Row',
    loading: 'Loading seats...',
    available: 'Available',
    sold: 'Sold',
    selected: 'Selected',
    noSeats: 'No seats in this zone',
    maxReached: 'Maximum seats reached',
  },
};

export const ZoneSeatPicker: React.FC<ZoneSeatPickerProps> = ({
  venueId,
  showInstanceId,
  zoneId,
  zoneName,
  zoneColor,
  maxSeats,
  selectedSeats,
  onSeatToggle,
  onBack,
}) => {
  const { language } = useLanguage();
  const t = translations[language];

  const [seats, setSeats] = useState<VenueSeat[]>([]);
  const [soldSeatIds, setSoldSeatIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const seatsRes = await supabase
        .from('venue_seats')
        .select('id, zone_id, row_label, seat_number, seat_label, seat_type, is_active')
        .eq('venue_id', venueId)
        .eq('zone_id', zoneId)
        .eq('is_active', true)
        .order('row_label')
        .order('seat_number')
        .limit(1000);

      setSeats((seatsRes.data || []) as VenueSeat[]);

      if (showInstanceId !== '__new__') {
        const seatIds = (seatsRes.data || []).map((s: any) => s.id);
        if (seatIds.length > 0) {
          const soldRes = await supabase
            .from('show_instance_seats')
            .select('venue_seat_id, status, held_until')
            .eq('show_instance_id', showInstanceId)
            .in('venue_seat_id', seatIds)
            .in('status', ['sold', 'held']);

          if (soldRes.data) {
            const now = new Date();
            setSoldSeatIds(new Set(
              soldRes.data
                .filter((s: any) => {
                  if (s.status === 'sold') return true;
                  if (s.status === 'held' && s.held_until) return new Date(s.held_until) > now;
                  return false;
                })
                .map((s: any) => s.venue_seat_id)
            ));
          }
        }
      }

      setLoading(false);
    };

    load();
  }, [venueId, zoneId, showInstanceId]);

  const selectedIds = useMemo(
    () => new Set(selectedSeats.map(s => s.seatId)),
    [selectedSeats]
  );

  // Group seats by row
  const rowGroups = useMemo(() => {
    const map = new Map<string, VenueSeat[]>();
    for (const seat of seats) {
      const existing = map.get(seat.row_label) || [];
      existing.push(seat);
      map.set(seat.row_label, existing);
    }
    // Sort rows naturally
    const entries = Array.from(map.entries());
    entries.sort((a, b) => {
      const numA = parseInt(a[0]);
      const numB = parseInt(b[0]);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a[0].localeCompare(b[0]);
    });
    return entries;
  }, [seats]);

  const handleSeatClick = useCallback(
    (seat: VenueSeat) => {
      if (soldSeatIds.has(seat.id)) return;

      const seatData: SelectedSeat = {
        seatId: seat.id,
        label: seat.seat_label,
        zoneName,
        zoneId,
        zoneColor,
        rowLabel: seat.row_label,
        seatNumber: seat.seat_number,
      };

      if (selectedIds.has(seat.id)) {
        onSeatToggle(seatData);
      } else if (selectedSeats.length < maxSeats) {
        onSeatToggle(seatData);
      }
    },
    [soldSeatIds, selectedIds, selectedSeats.length, maxSeats, onSeatToggle, zoneName, zoneId, zoneColor]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <div className="animate-pulse text-sm">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-xs h-8 px-2">
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.back}
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zoneColor }} />
          <span className="text-sm font-semibold">{zoneName}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded border-2 flex items-center justify-center text-[9px]" style={{ borderColor: zoneColor, color: zoneColor }}>1</div>
          <span className="text-[11px] text-muted-foreground">{t.available}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded bg-muted-foreground/20 flex items-center justify-center text-[9px] text-muted-foreground/40">1</div>
          <span className="text-[11px] text-muted-foreground">{t.sold}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded flex items-center justify-center text-[9px] text-primary-foreground bg-primary">1</div>
          <span className="text-[11px] text-muted-foreground">{t.selected}</span>
        </div>
      </div>

      {/* Seat grid by row */}
      {rowGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t.noSeats}</p>
      ) : (
        <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
          {rowGroups.map(([rowLabel, rowSeats]) => (
            <div key={rowLabel} className="flex items-center gap-2">
              {/* Row label */}
              <div className="w-8 text-right text-[10px] font-medium text-muted-foreground shrink-0">
                {rowLabel}
              </div>
              {/* Seats */}
              <div className="flex flex-wrap gap-0.5">
                {rowSeats.map((seat) => {
                  const isSold = soldSeatIds.has(seat.id);
                  const isSelected = selectedIds.has(seat.id);
                  const atMax = selectedSeats.length >= maxSeats && !isSelected;

                  return (
                    <button
                      key={seat.id}
                      disabled={isSold || atMax}
                      onClick={() => handleSeatClick(seat)}
                      title={seat.seat_label}
                      className={cn(
                        'w-6 h-6 rounded text-[8px] font-medium transition-all duration-100 flex items-center justify-center',
                        isSold && 'bg-muted-foreground/15 text-muted-foreground/30 cursor-not-allowed',
                        isSelected && 'bg-primary text-primary-foreground shadow-sm',
                        !isSold && !isSelected && !atMax && 'border-2 hover:opacity-80 cursor-pointer',
                        !isSold && !isSelected && atMax && 'border opacity-40 cursor-not-allowed',
                      )}
                      style={
                        !isSold && !isSelected
                          ? { borderColor: zoneColor, color: zoneColor }
                          : undefined
                      }
                    >
                      {seat.seat_number}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected seats chips */}
      {selectedSeats.filter(s => s.zoneId === zoneId).length > 0 && (
        <div className="flex flex-wrap gap-1 px-1 pt-1 border-t">
          {selectedSeats
            .filter(s => s.zoneId === zoneId)
            .map(s => (
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
