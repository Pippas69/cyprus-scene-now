import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Loader2, Calendar as CalendarIcon, Clock, XCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [acceptsReservations, setAcceptsReservations] = useState<boolean | null>(null);
  const [globallyPaused, setGloballyPaused] = useState<boolean | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [updatingSlot, setUpdatingSlot] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const text = {
    el: {
      title: 'Έλεγχος Staff',
      description: 'Διαχειριστείτε τη διαθεσιμότητα σε πραγματικό χρόνο',
      selectDate: 'Επιλέξτε Ημερομηνία',
      slotStatus: 'Κατάσταση Slots',
      capacity: 'Χωρητικότητα',
      booked: 'Κρατημένα',
      available: 'Διαθέσιμα',
      closeSlot: 'Κλείσιμο',
      openSlot: 'Άνοιγμα',
      closed: 'Κλειστό',
      noSlots: 'Δεν υπάρχουν slots για αυτή την ημέρα',
      refresh: 'Ανανέωση',
      slotClosed: 'Το slot έκλεισε',
      slotOpened: 'Το slot άνοιξε',
      error: 'Σφάλμα',
      today: 'Σήμερα',
      liveView: 'Live Προβολή',
      reservationsDisabled: 'Οι κρατήσεις είναι απενεργοποιημένες από τις Ρυθμίσεις.',
      reservationsPaused: 'Οι κρατήσεις είναι προσωρινά σε παύση.',
    },
    en: {
      title: 'Staff Controls',
      description: 'Manage availability in real-time',
      selectDate: 'Select Date',
      slotStatus: 'Slot Status',
      capacity: 'Capacity',
      booked: 'Booked',
      available: 'Available',
      closeSlot: 'Close',
      openSlot: 'Open',
      closed: 'Closed',
      noSlots: 'No slots for this day',
      refresh: 'Refresh',
      slotClosed: 'Slot closed',
      slotOpened: 'Slot opened',
      error: 'Error',
      today: 'Today',
      liveView: 'Live View',
      reservationsDisabled: 'Reservations are disabled from Settings.',
      reservationsPaused: 'Reservations are temporarily paused.',
    },
  };

  const t = text[language];

  useEffect(() => {
    fetchData();
  }, [businessId, selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch business reservation master switches
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('accepts_direct_reservations, reservations_globally_paused')
        .eq('id', businessId)
        .maybeSingle();

      if (businessError) {
        console.error('Error fetching business reservation flags:', businessError);
      }

      const accepts = business?.accepts_direct_reservations === true;
      const paused = business?.reservations_globally_paused === true;
      setAcceptsReservations(accepts);
      setGloballyPaused(paused);

      // If reservations are disabled/paused, show no slots (master switch)
      if (!accepts || paused) {
        setSlots([]);
        return;
      }

      // Fetch slots availability using RPC
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const { data: slotsData, error } = await supabase.rpc('get_slots_availability', {
        p_business_id: businessId,
        p_date: formattedDate,
      });

      if (error) {
        console.error('Error fetching slots:', error);
        setSlots([]);
      } else {
        // Cap booked to never exceed capacity (duplicate/overlapping slots can inflate the count)
        const cappedSlots = ((slotsData as SlotAvailability[]) || []).map(slot => {
          const cappedBooked = Math.min(slot.booked, slot.capacity);
          const cappedAvailable = Math.max(slot.capacity - cappedBooked, 0);
          return {
            ...slot,
            booked: cappedBooked,
            available: cappedAvailable,
          };
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
        // Open the slot - delete the closure record
        const { error } = await supabase
          .from('reservation_slot_closures')
          .delete()
          .eq('business_id', businessId)
          .eq('closure_date', formattedDate)
          .eq('slot_time', slotTime);

        if (error) throw error;
        toast.success(t.slotOpened);
      } else {
        // Close the slot - insert a closure record
        const { error } = await supabase
          .from('reservation_slot_closures')
          .insert({
            business_id: businessId,
            closure_date: formattedDate,
            slot_time: slotTime,
          });

        if (error) throw error;
        toast.success(t.slotClosed);
      }

      // Refresh the slots
      await fetchData();
    } catch (error) {
      console.error('Error toggling slot:', error);
      toast.error(t.error);
    } finally {
      setUpdatingSlot(null);
    }
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Date Selection & Slots */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span>{language === 'el' ? 'Διαθεσιμότητα' : 'Availability'}</span>
                {isToday && (
                  <Badge className="ml-1 bg-primary/15 text-primary border-0 text-[9px] sm:text-xs px-1.5 py-0">
                    {t.liveView}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-[10px] sm:text-xs mt-0.5">{t.description}</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh} 
              disabled={refreshing}
              className="h-8 px-3 text-xs border-border/50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-1.5">{t.refresh}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Picker */}
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal h-9 sm:h-10 px-3 flex-1 min-w-0 border-border/50 bg-card/50"
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                  <span className="truncate text-xs sm:text-sm">
                    {format(
                      selectedDate,
                      isMobile ? 'dd MMM yyyy' : 'PPP',
                      { locale: language === 'el' ? el : enUS }
                    )}
                  </span>
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
            {!isToday && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedDate(new Date())}
                className="h-9 sm:h-10 px-3 text-xs sm:text-sm"
              >
                {t.today}
              </Button>
            )}
          </div>

          {/* Slots Grid */}
          {slots.length === 0 ? (
            <div className="text-center py-8 sm:py-10 rounded-xl border border-dashed border-border/50 bg-muted/20">
              <Clock className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs sm:text-sm text-muted-foreground">
                {acceptsReservations === false
                  ? t.reservationsDisabled
                  : globallyPaused === true
                  ? t.reservationsPaused
                  : t.noSlots}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4">
              {slots.map((slot) => {
                const timeDisplay = slot.time_from && slot.time_to 
                  ? `${slot.time_from} - ${slot.time_to}`
                  : slot.slot_time;
                
                return (
                  <div
                    key={slot.slot_time}
                    className={`relative rounded-xl border transition-all overflow-hidden ${
                      slot.is_closed
                        ? 'border-destructive/40 bg-destructive/5'
                        : slot.available === 0
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-primary/30 bg-primary/5'
                    }`}
                  >
                    {/* Header */}
                    <div className={`px-3 py-2.5 sm:px-4 sm:py-3 border-b ${
                      slot.is_closed 
                        ? 'border-destructive/20 bg-destructive/10' 
                        : slot.available === 0
                        ? 'border-amber-500/20 bg-amber-500/10'
                        : 'border-primary/20 bg-primary/10'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className={`h-4 w-4 sm:h-4.5 sm:w-4.5 ${
                            slot.is_closed 
                              ? 'text-destructive' 
                              : slot.available === 0
                              ? 'text-amber-500'
                              : 'text-primary'
                          }`} />
                          <span className="font-semibold text-sm sm:text-base">{timeDisplay}</span>
                        </div>
                        {slot.is_closed ? (
                          <Badge variant="destructive" className="text-[9px] sm:text-xs">
                            {t.closed}
                          </Badge>
                        ) : slot.available === 0 ? (
                          <Badge className="bg-amber-500 text-white text-[9px] sm:text-xs border-0">
                            Full
                          </Badge>
                        ) : (
                          <Badge className="bg-primary text-primary-foreground text-[9px] sm:text-xs border-0">
                            {slot.available} {t.available}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="p-3 sm:p-4">
                      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <div className="text-center p-2 sm:p-3 rounded-lg bg-muted/30 border border-border/30">
                          <p className="text-[8px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
                            {t.capacity}
                          </p>
                          <p className="font-bold text-base sm:text-xl">{slot.capacity}</p>
                        </div>
                        <div className="text-center p-2 sm:p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <p className="text-[8px] sm:text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-medium mb-0.5">
                            {t.booked}
                          </p>
                          <p className="font-bold text-base sm:text-xl text-amber-600 dark:text-amber-400">{slot.booked}</p>
                        </div>
                        <div className="text-center p-2 sm:p-3 rounded-lg bg-primary/10 border border-primary/20">
                          <p className="text-[8px] sm:text-[10px] uppercase tracking-wider text-primary font-medium mb-0.5">
                            {t.available}
                          </p>
                          <p className="font-bold text-base sm:text-xl text-primary">{slot.available}</p>
                        </div>
                      </div>

                      <Button
                        variant={slot.is_closed ? 'default' : 'outline'}
                        size="sm"
                        className={`w-full font-semibold text-xs sm:text-sm h-8 sm:h-9 ${
                          slot.is_closed 
                            ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                            : 'border-destructive/50 text-destructive hover:bg-destructive/10'
                        }`}
                        onClick={() => handleSlotToggle(slot.slot_time, slot.is_closed)}
                        disabled={updatingSlot === slot.slot_time}
                      >
                        {updatingSlot === slot.slot_time ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : slot.is_closed ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                            {t.openSlot}
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5 mr-1.5" />
                            {t.closeSlot}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
