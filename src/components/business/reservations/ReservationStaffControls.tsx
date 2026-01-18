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

interface ReservationStaffControlsProps {
  businessId: string;
  language: 'el' | 'en';
}

interface SlotAvailability {
  slot_time: string;
  capacity: number;
  booked: number;
  available: number;
  is_closed: boolean;
}

export const ReservationStaffControls = ({ businessId, language }: ReservationStaffControlsProps) => {
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
    <div className="space-y-6">
      {/* Global Pause Control */}
      <Card className={isPaused ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30' : 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30'}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${isPaused ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                <Power className={`h-6 w-6 ${isPaused ? 'text-red-600' : 'text-green-600'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className="text-base font-semibold">{t.globalPause}</Label>
                  <Badge variant={isPaused ? 'destructive' : 'default'} className={!isPaused ? 'bg-green-500' : ''}>
                    {isPaused ? t.paused : t.active}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{t.globalPauseDescription}</p>
              </div>
            </div>
            <Switch
              checked={isPaused}
              onCheckedChange={handleGlobalPauseToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Date Selection & Slots */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t.slotStatus}
                {isToday && (
                  <Badge variant="outline" className="ml-2 bg-primary/10">
                    {t.liveView}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{t.description}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {t.refresh}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Picker */}
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'PPP', { locale: language === 'el' ? el : enUS })}
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
              >
                {t.today}
              </Button>
            )}
          </div>

          {/* Slots Grid */}
          {slots.length === 0 ? (
            <div className="text-center py-8 bg-muted/50 rounded-lg">
              <Clock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">{t.noSlots}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {slots.map((slot) => (
                <div
                  key={slot.slot_time}
                  className={`p-4 rounded-lg border transition-colors ${
                    slot.is_closed
                      ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                      : slot.available === 0
                      ? 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800'
                      : 'bg-card border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-lg">{slot.slot_time}</span>
                    </div>
                    {slot.is_closed ? (
                      <Badge variant="destructive">{t.closed}</Badge>
                    ) : slot.available === 0 ? (
                      <Badge variant="secondary">Full</Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-500">{slot.available} {t.available}</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-muted-foreground text-xs">{t.capacity}</p>
                      <p className="font-semibold">{slot.capacity}</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-muted-foreground text-xs">{t.booked}</p>
                      <p className="font-semibold text-orange-600">{slot.booked}</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-muted-foreground text-xs">{t.available}</p>
                      <p className="font-semibold text-green-600">{slot.available}</p>
                    </div>
                  </div>

                  <Button
                    variant={slot.is_closed ? 'default' : 'destructive'}
                    size="sm"
                    className="w-full"
                    onClick={() => handleSlotToggle(slot.slot_time, slot.is_closed)}
                    disabled={updatingSlot === slot.slot_time}
                  >
                    {updatingSlot === slot.slot_time ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : slot.is_closed ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {t.openSlot}
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        {t.closeSlot}
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
