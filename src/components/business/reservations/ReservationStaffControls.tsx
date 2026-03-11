import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Calendar as CalendarIcon, RefreshCw, Edit2, Check, X } from 'lucide-react';
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [acceptsReservations, setAcceptsReservations] = useState<boolean | null>(null);
  const [globallyPaused, setGloballyPaused] = useState<boolean | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [updatingSlot, setUpdatingSlot] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<string>('');
  const mountedRef = useRef(true);

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
    saved: 'Αποθηκεύτηκε!',
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
    saved: 'Saved!',
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchData = useCallback(async (isBackground = false) => {
    try {
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('accepts_direct_reservations, reservations_globally_paused')
        .eq('id', businessId)
        .maybeSingle();

      if (businessError) console.error('Error fetching business reservation flags:', businessError);
      if (!mountedRef.current) return;

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

      if (!mountedRef.current) return;

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
      if (mountedRef.current && !isBackground) {
        setInitialLoading(false);
      }
    }
  }, [businessId, selectedDate]);

  // Initial load
  useEffect(() => {
    setInitialLoading(true);
    fetchData(false);
  }, [businessId, selectedDate]);

  // Background auto-refresh every 30 seconds (no loading spinner)
  useEffect(() => {
    if (editingSlot) return; // Pause refresh while editing
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [fetchData, editingSlot]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData(true);
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

      await fetchData(true);
    } catch (error) {
      console.error('Error toggling slot:', error);
      toast.error(t.error);
    } finally {
      setUpdatingSlot(null);
    }
  };

  const startEditCapacity = (slotTime: string, currentCapacity: number) => {
    setEditingSlot(slotTime);
    setEditDraft(String(currentCapacity));
  };

  const cancelEdit = () => {
    setEditingSlot(null);
    setEditDraft('');
  };

  const saveCapacityEdit = async (slotTime: string) => {
    const newVal = parseInt(editDraft, 10);
    if (isNaN(newVal) || newVal < 1) {
      cancelEdit();
      return;
    }

    try {
      // Update capacity in reservation_time_slots JSON on the business
      const { data: business } = await supabase
        .from('businesses')
        .select('reservation_time_slots')
        .eq('id', businessId)
        .single();

      if (business?.reservation_time_slots && Array.isArray(business.reservation_time_slots)) {
        const updatedSlots = (business.reservation_time_slots as any[]).map((slot: any) => {
          const slotTimeFrom = slot.timeFrom || slot.time;
          if (slotTimeFrom === slotTime) {
            return { ...slot, capacity: newVal };
          }
          return slot;
        });

        const { error } = await supabase
          .from('businesses')
          .update({
            reservation_time_slots: JSON.parse(JSON.stringify(updatedSlots)),
            updated_at: new Date().toISOString(),
          })
          .eq('id', businessId);

        if (error) throw error;
        toast.success(t.saved);
        await fetchData(true);
      }
    } catch (error) {
      console.error('Error updating capacity:', error);
      toast.error(t.error);
    } finally {
      cancelEdit();
    }
  };

  const dateStr = format(
    selectedDate,
    'd MMMM yyyy',
    { locale: language === 'el' ? el : enUS }
  );

  if (initialLoading) {
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
        <h2 className="text-base sm:text-lg font-bold text-foreground">
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
            const isEditing = editingSlot === slot.slot_time;

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
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <span>{slot.booked}/</span>
                    {isEditing ? (
                      <div className="inline-flex items-center gap-1">
                        <input
                          value={editDraft}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === '' || /^\d+$/.test(v)) setEditDraft(v);
                          }}
                          className="h-5 w-14 text-xs px-1 rounded border border-input bg-background text-center focus:outline-none focus:ring-1 focus:ring-ring"
                          inputMode="numeric"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveCapacityEdit(slot.slot_time);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => saveCapacityEdit(slot.slot_time)}>
                          <Check className="h-3 w-3 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={cancelEdit}>
                          <X className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    ) : (
                      <span
                        className="cursor-pointer hover:underline inline-flex items-center gap-0.5"
                        onClick={() => startEditCapacity(slot.slot_time, slot.capacity)}
                      >
                        {slot.capacity}
                        <Edit2 className="h-2.5 w-2.5 opacity-50" />
                      </span>
                    )}
                    <span className="mx-1">—</span>
                    <span>{slot.available} {t.available}</span>
                  </div>
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
