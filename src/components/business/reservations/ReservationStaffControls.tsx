import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Calendar as CalendarIcon, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';

interface ReservationStaffControlsProps {
  businessId: string;
  language: 'el' | 'en';
}

interface SlotAvailability {
  slot_time: string;
  time_from: string;
  time_to: string;
  capacity: number;
  booked: number;
  available: number;
  is_closed: boolean;
}

export const ReservationStaffControls = ({ businessId, language }: ReservationStaffControlsProps) => {
  const [loading, setLoading] = useState(true);
  const [acceptsReservations, setAcceptsReservations] = useState<boolean | null>(null);
  const [globallyPaused, setGloballyPaused] = useState<boolean | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [updatingSlot, setUpdatingSlot] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const t = language === 'el' ? {
    title: 'Διαχείριση Διαθεσιμότητας',
    refresh: 'Ανανέωση',
    available: 'διαθέσιμα',
    booked: 'κρατημένα',
    noSlots: 'Δεν υπάρχουν slots για αυτή την ημέρα',
    reservationsDisabled: 'Οι κρατήσεις είναι απενεργοποιημένες από τις Ρυθμίσεις.',
    reservationsPaused: 'Οι κρατήσεις είναι προσωρινά σε παύση.',
    slotClosed: 'Το slot έκλεισε',
    slotOpened: 'Το slot άνοιξε',
    error: 'Σφάλμα',
  } : {
    title: 'Availability Management',
    refresh: 'Refresh',
    available: 'available',
    booked: 'booked',
    noSlots: 'No slots for this day',
    reservationsDisabled: 'Reservations are disabled from Settings.',
    reservationsPaused: 'Reservations are temporarily paused.',
    slotClosed: 'Slot closed',
    slotOpened: 'Slot opened',
    error: 'Error',
  };

  useEffect(() => {
    fetchData();
  }, [businessId, selectedDate]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [businessId, selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('accepts_direct_reservations, reservations_globally_paused')
        .eq('id', businessId)
        .maybeSingle();

      if (businessError) console.error('Error fetching business reservation flags:', businessError);

      const accepts = business?.accepts_direct_reservations === true;
      const paused = business?.reservations_globally_paused === true;
      setAcceptsReservations(accepts);
      setGloballyPaused(paused);

      if (!accepts || paused) {
        setSlots([]);
        return;
      }

      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const { data: slotsData, error } = await supabase.rpc('get_slots_availability', {
        p_business_id: businessId,
        p_date: formattedDate,
      });

      if (error) {
        console.error('Error fetching slots:', error);
        setSlots([]);
      } else {
        const cappedSlots = ((slotsData as SlotAvailability[]) || []).map(slot => {
          const cappedBooked = Math.min(slot.booked, slot.capacity);
          return { ...slot, booked: cappedBooked, available: Math.max(slot.capacity - cappedBooked, 0) };
        });
        setSlots(cappedSlots);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleSlotToggle = async (slotTime: string, isClosed: boolean) => {
    setUpdatingSlot(slotTime);
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');

      if (isClosed) {
        const { error } = await supabase
          .from('reservation_slot_closures')
          .delete()
          .eq('business_id', businessId)
          .eq('closure_date', formattedDate)
          .eq('slot_time', slotTime);
        if (error) throw error;
        toast.success(t.slotOpened);
      } else {
        const { error } = await supabase
          .from('reservation_slot_closures')
          .insert({ business_id: businessId, closure_date: formattedDate, slot_time: slotTime });
        if (error) throw error;
        toast.success(t.slotClosed);
      }

      await fetchData();
    } catch (error) {
      console.error('Error toggling slot:', error);
      toast.error(t.error);
    } finally {
      setUpdatingSlot(null);
    }
  };

  const dateStr = format(
    selectedDate,
    'd MMMM yyyy',
    { locale: language === 'el' ? el : enUS }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold italic text-foreground">
          {t.title}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-8 px-3 text-xs border-border/40 bg-card/60 gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {t.refresh}
        </Button>
      </div>

      {/* Date Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal h-10 px-3 border-border/30 bg-card/30 hover:bg-card/50 transition-colors"
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm">{dateStr}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            locale={language === 'el' ? el : enUS}
          />
        </PopoverContent>
      </Popover>

      {/* Slots */}
      {slots.length === 0 ? (
        <div className="text-center py-10 rounded-xl border border-dashed border-border/40 bg-muted/10">
          <p className="text-xs sm:text-sm text-muted-foreground">
            {acceptsReservations === false
              ? t.reservationsDisabled
              : globallyPaused === true
              ? t.reservationsPaused
              : t.noSlots}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {slots.map((slot) => {
            const timeDisplay = slot.time_from && slot.time_to
              ? `${slot.time_from} - ${slot.time_to}`
              : slot.slot_time;

            return (
              <div
                key={slot.slot_time}
                className={`flex items-center justify-between rounded-xl border px-4 py-3.5 transition-all ${
                  slot.is_closed
                    ? 'border-destructive/30 bg-destructive/5 opacity-60'
                    : 'border-primary/25 bg-primary/[0.04]'
                }`}
              >
                <div className="min-w-0">
                  <p className={`font-semibold text-sm sm:text-base ${slot.is_closed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {timeDisplay}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {slot.booked}/ {slot.capacity}
                    <span className="mx-1">—</span>
                    {slot.available} {t.available}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {updatingSlot === slot.slot_time ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Switch
                      checked={!slot.is_closed}
                      onCheckedChange={() => handleSlotToggle(slot.slot_time, slot.is_closed)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
