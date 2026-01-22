import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Loader2, Power, Calendar as CalendarIcon, Clock, Users, XCircle, CheckCircle2, RefreshCw } from 'lucide-react';
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
  const [isPaused, setIsPaused] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [updatingSlot, setUpdatingSlot] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const text = {
    el: {
      title: 'Έλεγχος Staff',
      description: 'Διαχειριστείτε τη διαθεσιμότητα σε πραγματικό χρόνο',
      globalPause: 'Παύση Όλων των Κρατήσεων',
      globalPauseDescription: 'Κλείστε προσωρινά όλες τις κρατήσεις',
      paused: 'ΚΛΕΙΣΤΟ',
      active: 'ΑΝΟΙΧΤΟ',
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
    },
    en: {
      title: 'Staff Controls',
      description: 'Manage availability in real-time',
      globalPause: 'Pause All Reservations',
      globalPauseDescription: 'Temporarily close all reservations',
      paused: 'CLOSED',
      active: 'OPEN',
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
    },
  };

  const t = text[language];

  useEffect(() => {
    fetchData();
  }, [businessId, selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch business pause status
      const { data: business } = await supabase
        .from('businesses')
        .select('reservations_globally_paused')
        .eq('id', businessId)
        .single();

      if (business) {
        setIsPaused(business.reservations_globally_paused ?? false);
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
        setSlots((slotsData as SlotAvailability[]) || []);
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

  const handleGlobalPauseToggle = async (paused: boolean) => {
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ 
          reservations_globally_paused: paused,
          updated_at: new Date().toISOString()
        })
        .eq('id', businessId);

      if (error) throw error;

      setIsPaused(paused);
      toast.success(paused ? t.paused : t.active);
    } catch (error) {
      console.error('Error updating pause status:', error);
      toast.error(t.error);
    }
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
      {/* Global Pause Control */}
      <Card className={isPaused ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30' : 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30'}>
        <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            
            <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex-shrink-0 flex items-center justify-center ${isPaused ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
              <Power className={`h-3.5 w-3.5 sm:h-5 sm:w-5 ${isPaused ? 'text-red-600' : 'text-green-600'}`} />
            </div>
            <div className="flex-1 min-w-0 pr-14 sm:pr-16">
              <Label className="text-[10px] sm:text-sm font-semibold whitespace-nowrap">{t.globalPause}</Label>
              <p className="text-[9px] sm:text-xs text-muted-foreground whitespace-nowrap">{t.globalPauseDescription}</p>
            </div>
            <Switch
              checked={isPaused}
              onCheckedChange={handleGlobalPauseToggle}
              className="flex-shrink-0 scale-90 sm:scale-100"
            />
          </div>
        </CardContent>
      </Card>

      {/* Date Selection & Slots */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <div className="relative">
            {/* Refresh button top-right - absolute corner position */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh} 
              disabled={refreshing}
              className="absolute right-2 top-0 -translate-y-1/2 h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-auto px-1.5 lg:px-3 text-[10px] sm:text-xs"
            >
              <RefreshCw className={`h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden lg:inline ml-1.5">{t.refresh}</span>
            </Button>
            
            <CardTitle className="flex items-center gap-1 sm:gap-2 text-[11px] sm:text-base whitespace-nowrap pr-10 sm:pr-20">
              <Clock className="h-3.5 w-3.5 sm:h-5 sm:w-5 flex-shrink-0" />
              <span>{t.slotStatus}</span>
              {isToday && (
                <Badge variant="outline" className="ml-0.5 sm:ml-1 bg-primary/10 text-[8px] sm:text-xs px-1 sm:px-1.5 py-0">
                  {t.liveView}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-[9px] sm:text-xs whitespace-nowrap mt-0.5 sm:mt-1">{t.description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Picker */}
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal h-8 sm:h-10 px-2 sm:px-3 flex-1 min-w-0"
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate text-[11px] sm:text-sm">
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
                className="h-8 sm:h-10 px-2 sm:px-3 text-[11px] sm:text-sm whitespace-nowrap"
              >
                {t.today}
              </Button>
            )}
          </div>

          {/* Slots Grid */}
          {slots.length === 0 ? (
            <div className="text-center py-6 sm:py-8 bg-muted/50 rounded-lg">
              <Clock className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-xs sm:text-sm text-muted-foreground">{t.noSlots}</p>
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
                    className={`relative rounded-lg sm:rounded-xl border-2 transition-all shadow-sm overflow-hidden ${
                      slot.is_closed
                        ? 'bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-700'
                        : slot.available === 0
                        ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700'
                        : 'bg-card border-green-300 dark:border-green-700'
                    }`}
                  >
                    {/* Header with time */}
                    <div className={`px-3 py-2 sm:px-4 sm:py-3 ${
                      slot.is_closed 
                        ? 'bg-red-100 dark:bg-red-900/50' 
                        : slot.available === 0
                        ? 'bg-amber-100 dark:bg-amber-900/50'
                        : 'bg-green-100 dark:bg-green-900/50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Clock className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${
                            slot.is_closed 
                              ? 'text-red-600 dark:text-red-400' 
                              : slot.available === 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-green-600 dark:text-green-400'
                          }`} />
                          <span className="font-bold text-sm sm:text-lg whitespace-nowrap">{timeDisplay}</span>
                        </div>
                        {slot.is_closed ? (
                          <Badge variant="destructive" className="text-[9px] sm:text-xs font-semibold">
                            {t.closed}
                          </Badge>
                        ) : slot.available === 0 ? (
                          <Badge variant="secondary" className="bg-amber-500 text-white text-[9px] sm:text-xs font-semibold">
                            Full
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500 text-white text-[9px] sm:text-xs font-semibold whitespace-nowrap">
                            {slot.available} {t.available}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="p-3 sm:p-4">
                      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <div className="text-center p-2 sm:p-3 bg-muted/30 rounded-lg border border-border/50">
                          <p className="text-[8px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5 sm:mb-1 whitespace-nowrap">
                            {t.capacity}
                          </p>
                          <p className="font-bold text-base sm:text-xl">{slot.capacity}</p>
                        </div>
                        <div className="text-center p-2 sm:p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                          <p className="text-[8px] sm:text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-medium mb-0.5 sm:mb-1 whitespace-nowrap">
                            {t.booked}
                          </p>
                          <p className="font-bold text-base sm:text-xl text-amber-600 dark:text-amber-400">{slot.booked}</p>
                        </div>
                        <div className="text-center p-2 sm:p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-[8px] sm:text-[10px] uppercase tracking-wider text-green-600 dark:text-green-400 font-medium mb-0.5 sm:mb-1 whitespace-nowrap">
                            {t.available}
                          </p>
                          <p className="font-bold text-base sm:text-xl text-green-600 dark:text-green-400">{slot.available}</p>
                        </div>
                      </div>

                      <Button
                        variant={slot.is_closed ? 'default' : 'outline'}
                        size="sm"
                        className={`w-full font-semibold text-xs sm:text-sm h-8 sm:h-9 ${
                          slot.is_closed 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/50'
                        }`}
                        onClick={() => handleSlotToggle(slot.slot_time, slot.is_closed)}
                        disabled={updatingSlot === slot.slot_time}
                      >
                        {updatingSlot === slot.slot_time ? (
                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                        ) : slot.is_closed ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            {t.openSlot}
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
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
