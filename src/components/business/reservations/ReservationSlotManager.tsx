import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Clock, Calendar, Users, Plus, Trash2, Save, AlertTriangle, Copy, ChevronDown, ChevronUp, Armchair } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
interface ReservationSlotManagerProps {
  businessId: string;
  language: 'el' | 'en';
}
interface TimeSlot {
  id: string;
  timeFrom: string;
  timeTo: string;
  capacity: number;
  maxPartySize: number;
  days: string[];
}
interface ReservationSettings {
  accepts_direct_reservations: boolean;
  reservations_globally_paused: boolean;
  reservation_time_slots: TimeSlot[] | null;
  reservation_seating_options: string[];
}
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const generateSlotId = () => Math.random().toString(36).substring(2, 9);
export const ReservationSlotManager = ({
  businessId,
  language
}: ReservationSlotManagerProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSlots, setExpandedSlots] = useState<Record<string, boolean>>({});
  const [settings, setSettings] = useState<ReservationSettings>({
    accepts_direct_reservations: false,
    reservations_globally_paused: false,
    reservation_time_slots: null,
    reservation_seating_options: []
  });
  const text = {
    el: {
      title: 'Ρυθμίσεις Διαθεσιμότητας',
      description: 'Ορίστε τα χρονικά slots και τη χωρητικότητα για τις κρατήσεις σας',
      enableReservations: 'Αποδοχή Κρατήσεων',
      enableDescription: 'Επιτρέψτε κρατήσεις μέσω ΦΟΜΟ',
      enableDescriptionSub: '(Προφίλ & Προσφορές)',
      paused: 'Προσωρινή Παύση',
      pausedDescription: 'Οι κρατήσεις είναι προσωρινά κλειστές',
      timeSlots: 'Χρονικά Slots Κρατήσεων',
      timeSlotsDescription: 'Κάθε slot είναι ένα χρονικό παράθυρο (Από-Έως) με δική του χωρητικότητα και ημέρες λειτουργίας',
      slotFrom: 'Από',
      slotTo: 'Έως',
      slotCapacity: 'Χωρητικότητα',
      slotMaxPartySize: 'Max άτομα/κράτηση',
      slotDays: 'Ημέρες',
      addSlot: 'Προσθήκη Slot',
      removeSlot: 'Διαγραφή Slot',
      copySlot: 'Αντιγραφή Slot',
      copyToAllDays: 'Εφαρμογή σε όλες τις μέρες',
      copyToSelectedDays: 'Εφαρμογή σε επιλεγμένες μέρες',
      monday: 'Δευτέρα',
      tuesday: 'Τρίτη',
      wednesday: 'Τετάρτη',
      thursday: 'Πέμπτη',
      friday: 'Παρασκευή',
      saturday: 'Σάββατο',
      sunday: 'Κυριακή',
      mondayShort: 'Δευ',
      tuesdayShort: 'Τρι',
      wednesdayShort: 'Τετ',
      thursdayShort: 'Πεμ',
      fridayShort: 'Παρ',
      saturdayShort: 'Σαβ',
      sundayShort: 'Κυρ',
      seatingOptions: 'Επιλογές Θέσεων',
      indoor: 'Εσωτερικός Χώρος',
      outdoor: 'Εξωτερικός Χώρος',
      save: 'Αποθήκευση Αλλαγών',
      saving: 'Αποθήκευση...',
      success: 'Οι ρυθμίσεις αποθηκεύτηκαν',
      error: 'Σφάλμα αποθήκευσης',
      noSlotsWarning: 'Προσθέστε τουλάχιστον ένα χρονικό slot για να δέχεστε κρατήσεις',
      noSlotsToEnableWarning: 'Πρέπει να υπάρχει τουλάχιστον ένα χρονικό slot για να ενεργοποιήσετε τις κρατήσεις',
      noDaysWarning: 'Επιλέξτε ημέρες για αυτό το slot',
      instantConfirmation: 'Άμεση Επιβεβαίωση',
      instantConfirmationDescription: 'Αυτόματη επιβεβαίωση αν υπάρχει διαθεσιμότητα',
      noShowPolicy: 'Πολιτική No-Show',
      noShowPolicyDescription: 'Περιθώριο 15 λεπτά - ακύρωση αν δεν γίνει check-in',
      cancellationPolicy: 'Πολιτική Ακύρωσης',
      cancellationPolicyDescription: 'Μετά από 3 ακυρώσεις, περιορισμός 2 εβδομάδων',
      allDays: 'Όλες τις μέρες',
      selectedDays: 'Επιλεγμένες μέρες',
      timeWindow: 'Χρονικό Παράθυρο',
      slotSummary: 'slot',
      noSeatingSelected: 'Επιλέξτε τουλάχιστον μία επιλογή θέσης'
    },
    en: {
      title: 'Availability Settings',
      description: 'Set up your time slots and capacity for reservations',
      enableReservations: 'Accept Reservations',
      enableDescription: 'Allow reservations via ΦΟΜΟ',
      enableDescriptionSub: '(Profile & Offers)',
      paused: 'Temporarily Paused',
      pausedDescription: 'Reservations are temporarily closed',
      timeSlots: 'Reservation Time Slots',
      timeSlotsDescription: 'Each slot is a time window (From-To) with its own capacity and active days',
      slotFrom: 'From',
      slotTo: 'To',
      slotCapacity: 'Capacity',
      slotMaxPartySize: 'Max people/reservation',
      slotDays: 'Days',
      addSlot: 'Add Slot',
      removeSlot: 'Delete Slot',
      copySlot: 'Copy Slot',
      copyToAllDays: 'Apply to all days',
      copyToSelectedDays: 'Apply to selected days',
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
      mondayShort: 'Mon',
      tuesdayShort: 'Tue',
      wednesdayShort: 'Wed',
      thursdayShort: 'Thu',
      fridayShort: 'Fri',
      saturdayShort: 'Sat',
      sundayShort: 'Sun',
      seatingOptions: 'Seating Options',
      indoor: 'Indoor',
      outdoor: 'Outdoor',
      save: 'Save Changes',
      saving: 'Saving...',
      success: 'Settings saved',
      error: 'Error saving settings',
      noSlotsWarning: 'Add at least one time slot to accept reservations',
      noSlotsToEnableWarning: 'You need at least one time slot to enable reservations',
      noDaysWarning: 'Select days for this slot',
      instantConfirmation: 'Instant Confirmation',
      instantConfirmationDescription: 'Reservations are automatically confirmed if availability exists',
      noShowPolicy: 'No-Show Policy',
      noShowPolicyDescription: '15 minute grace period - auto-cancelled if no check-in',
      cancellationPolicy: 'Cancellation Policy',
      cancellationPolicyDescription: 'After 3 cancellations, two weeks restriction',
      allDays: 'All days',
      selectedDays: 'Selected days',
      timeWindow: 'Time Window',
      slotSummary: 'slot',
      noSeatingSelected: 'Select at least one seating option'
    }
  };
  const t = text[language];
  const dayTranslations: Record<string, string> = {
    monday: t.monday,
    tuesday: t.tuesday,
    wednesday: t.wednesday,
    thursday: t.thursday,
    friday: t.friday,
    saturday: t.saturday,
    sunday: t.sunday
  };
  const dayShortTranslations: Record<string, string> = {
    monday: t.mondayShort,
    tuesday: t.tuesdayShort,
    wednesday: t.wednesdayShort,
    thursday: t.thursdayShort,
    friday: t.fridayShort,
    saturday: t.saturdayShort,
    sunday: t.sundayShort
  };
  useEffect(() => {
    fetchSettings();
  }, [businessId]);
  const fetchSettings = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('businesses').select(`
          accepts_direct_reservations,
          reservations_globally_paused,
          reservation_time_slots,
          reservation_seating_options
        `).eq('id', businessId).single();
      if (error) throw error;
      if (data) {
        let parsedTimeSlots: TimeSlot[] | null = null;
        if (data.reservation_time_slots && Array.isArray(data.reservation_time_slots)) {
          // Handle migration from old format
          const rawSlots = data.reservation_time_slots as unknown as any[];
          parsedTimeSlots = rawSlots.map((slot: any) => {
            if (slot.timeFrom && slot.timeTo) {
              // New format
              return {
                id: slot.id || generateSlotId(),
                timeFrom: slot.timeFrom,
                timeTo: slot.timeTo,
                capacity: slot.capacity || 10,
                maxPartySize: slot.maxPartySize || 7,
                days: slot.days || DAYS
              };
            } else if (slot.time) {
              // Old format - convert to new
              const timeHour = parseInt(slot.time.split(':')[0]);
              const toHour = (timeHour + 2) % 24;
              return {
                id: generateSlotId(),
                timeFrom: slot.time,
                timeTo: `${toHour.toString().padStart(2, '0')}:00`,
                capacity: slot.capacity || 10,
                maxPartySize: 7,
                days: DAYS // Default to all days for migrated slots
              };
            }
            return null;
          }).filter(Boolean) as TimeSlot[];
        }
        setSettings({
          accepts_direct_reservations: data.accepts_direct_reservations ?? false,
          reservations_globally_paused: data.reservations_globally_paused ?? false,
          reservation_time_slots: parsedTimeSlots,
          reservation_seating_options: data.reservation_seating_options ?? []
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async () => {
    setSaving(true);
    try {
      const timeSlotsJson = settings.reservation_time_slots ? JSON.parse(JSON.stringify(settings.reservation_time_slots)) : null;

      // Collect all unique days from slots
      const allDays = new Set<string>();
      settings.reservation_time_slots?.forEach(slot => {
        slot.days.forEach(day => allDays.add(day));
      });
      const {
        error
      } = await supabase.from('businesses').update({
        accepts_direct_reservations: settings.accepts_direct_reservations,
        reservations_globally_paused: settings.reservations_globally_paused,
        reservation_time_slots: timeSlotsJson,
        reservation_days: Array.from(allDays),
        reservation_seating_options: settings.reservation_seating_options,
        reservation_capacity_type: 'time_slots',
        reservation_requires_approval: false,
        updated_at: new Date().toISOString()
      }).eq('id', businessId);
      if (error) throw error;
      toast.success(t.success);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(t.error);
    } finally {
      setSaving(false);
    }
  };
  const toggleSeating = (option: string) => {
    setSettings(prev => ({
      ...prev,
      reservation_seating_options: prev.reservation_seating_options.includes(option) ? prev.reservation_seating_options.filter(o => o !== option) : [...prev.reservation_seating_options, option]
    }));
  };
  const addTimeSlot = () => {
    const newSlot: TimeSlot = {
      id: generateSlotId(),
      timeFrom: '18:00',
      timeTo: '20:00',
      capacity: 10,
      maxPartySize: 7,
      days: [...DAYS] // Default to all days
    };
    setSettings(prev => ({
      ...prev,
      reservation_time_slots: [...(prev.reservation_time_slots || []), newSlot]
    }));
    setExpandedSlots(prev => ({
      ...prev,
      [newSlot.id]: true
    }));
  };
  const updateTimeSlot = (slotId: string, field: keyof TimeSlot, value: string | number | string[]) => {
    setSettings(prev => ({
      ...prev,
      reservation_time_slots: prev.reservation_time_slots?.map(slot => slot.id === slotId ? {
        ...slot,
        [field]: value
      } : slot) || []
    }));
  };
  const toggleSlotDay = (slotId: string, day: string) => {
    setSettings(prev => ({
      ...prev,
      reservation_time_slots: prev.reservation_time_slots?.map(slot => {
        if (slot.id !== slotId) return slot;
        const newDays = slot.days.includes(day) ? slot.days.filter(d => d !== day) : [...slot.days, day];
        return {
          ...slot,
          days: newDays
        };
      }) || []
    }));
  };
  const applySlotToAllDays = (slotId: string) => {
    updateTimeSlot(slotId, 'days', [...DAYS]);
  };
  const removeTimeSlot = async (slotId: string) => {
    const remainingSlots = settings.reservation_time_slots?.filter(slot => slot.id !== slotId) || [];
    setSettings(prev => ({
      ...prev,
      reservation_time_slots: remainingSlots
    }));

    // If no slots remain and reservations are enabled, auto-disable
    if (remainingSlots.length === 0 && settings.accepts_direct_reservations) {
      setSettings(prev => ({
        ...prev,
        accepts_direct_reservations: false
      }));
      try {
        await supabase.from('businesses').update({
          accepts_direct_reservations: false,
          updated_at: new Date().toISOString()
        }).eq('id', businessId);
        toast.success(language === 'el' ? 'Οι κρατήσεις απενεργοποιήθηκαν (δεν υπάρχουν slots)' : 'Reservations disabled (no slots available)');
      } catch (error) {
        console.error('Error auto-disabling reservations:', error);
      }
    }
  };
  const duplicateSlot = (slot: TimeSlot) => {
    const newSlot: TimeSlot = {
      ...slot,
      id: generateSlotId()
    };
    setSettings(prev => ({
      ...prev,
      reservation_time_slots: [...(prev.reservation_time_slots || []), newSlot]
    }));
    setExpandedSlots(prev => ({
      ...prev,
      [newSlot.id]: true
    }));
  };
  const toggleSlotExpanded = (slotId: string) => {
    setExpandedSlots(prev => ({
      ...prev,
      [slotId]: !prev[slotId]
    }));
  };

  // Sort slots by time
  const sortedSlots = [...(settings.reservation_time_slots || [])].sort((a, b) => a.timeFrom.localeCompare(b.timeFrom));
  const hasValidConfig = settings.reservation_time_slots && settings.reservation_time_slots.length > 0 && settings.reservation_time_slots.every(slot => slot.days.length > 0);
  const formatTimeRange = (from: string, to: string) => {
    return `${from} - ${to}`;
  };
  const getDaysLabel = (days: string[]) => {
    if (days.length === 7) return t.allDays;
    if (days.length === 0) return t.noDaysWarning;
    // Sort days in correct order (Monday to Sunday)
    const sortedDays = [...days].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
    return sortedDays.map(d => dayShortTranslations[d]).join(', ');
  };
  if (loading) {
    return <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>;
  }

  // Check if there are valid time slots configured
  const hasTimeSlots = settings.reservation_time_slots && settings.reservation_time_slots.length > 0;
  const canEnableReservations = hasTimeSlots;
  return <div className="space-y-4 sm:space-y-6">
      {/* Main Toggle */}
      <Card>
        <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4 lg:pt-6 lg:pb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex-1 min-w-0 pr-12 sm:pr-14">
              <Label htmlFor="enable-reservations" className="text-[11px] sm:text-sm lg:text-base font-semibold whitespace-nowrap">
                {t.enableReservations}
              </Label>
              <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground whitespace-nowrap">
                {t.enableDescription} {t.enableDescriptionSub}
              </p>
              {/* Show warning if trying to enable without slots */}
              {!canEnableReservations && !settings.accepts_direct_reservations && (
                <p className="text-[6px] sm:text-[9px] md:text-[10px] text-orange-600 mt-1.5 flex items-center gap-1 whitespace-nowrap -ml-5 sm:ml-0">
                  <span className="whitespace-nowrap">{t.noSlotsToEnableWarning}</span>
                </p>
              )}
            </div>
            <Switch id="enable-reservations" className="flex-shrink-0 scale-75 md:scale-90 lg:scale-100" checked={settings.accepts_direct_reservations} disabled={!canEnableReservations && !settings.accepts_direct_reservations} onCheckedChange={async checked => {
            // Prevent enabling if no slots exist
            if (checked && !canEnableReservations) {
              toast.error(t.noSlotsToEnableWarning);
              return;
            }
            setSettings(prev => ({
              ...prev,
              accepts_direct_reservations: checked
            }));
            // Auto-save immediately for this toggle
            try {
              const {
                error
              } = await supabase.from('businesses').update({
                accepts_direct_reservations: checked,
                updated_at: new Date().toISOString()
              }).eq('id', businessId);
              if (error) throw error;
              toast.success(checked ? language === 'el' ? 'Οι κρατήσεις ενεργοποιήθηκαν' : 'Reservations enabled' : language === 'el' ? 'Οι κρατήσεις απενεργοποιήθηκαν' : 'Reservations disabled');
            } catch (error) {
              console.error('Error updating reservations status:', error);
              toast.error(t.error);
              // Revert on error
              setSettings(prev => ({
                ...prev,
                accepts_direct_reservations: !checked
              }));
            }
          }} />
          </div>
        </CardContent>
      </Card>

      {/* Time Slots - Always visible so user can configure before enabling */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base whitespace-nowrap">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            {t.timeSlots}
          </CardTitle>
          <CardDescription className="text-[10px] sm:text-xs">{t.timeSlotsDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(!settings.reservation_time_slots || settings.reservation_time_slots.length === 0) && <div className="text-center py-8 bg-muted/50 rounded-lg border border-dashed">
              <Clock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">{t.noSlotsWarning}</p>
            </div>}

              {sortedSlots.map(slot => <Collapsible key={slot.id} open={expandedSlots[slot.id] ?? false} onOpenChange={() => toggleSlotExpanded(slot.id)}>
                  <Card className="border-2">
                    <CollapsibleTrigger asChild>
                      <div className="p-3 sm:p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {/* Time row with icon */}
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-6 w-6 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                              </div>
                              <span className="font-medium text-sm sm:text-base">
                                {formatTimeRange(slot.timeFrom, slot.timeTo)}
                              </span>
                            </div>
                            
                            {/* Badges row - Desktop: badges + days on same line */}
                            <div className="hidden lg:flex items-center gap-2">
                              <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20 border-0 text-xs px-2.5 py-0.5">
                                <Users className="h-3 w-3 mr-1" />
                                {t.slotCapacity}: {slot.capacity}
                              </Badge>
                              <Badge variant="outline" className="text-xs px-2.5 py-0.5 border-border">
                                <Users className="h-3 w-3 mr-1" />
                                {t.slotMaxPartySize}: {slot.maxPartySize}
                              </Badge>
                              <span className="text-xs text-muted-foreground ml-1">
                                {getDaysLabel(slot.days)}
                              </span>
                            </div>
                            
                            {/* Badges row - Tablet: badges on one line, days below */}
                            <div className="hidden sm:block lg:hidden">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20 border-0 text-xs px-2 py-0.5">
                                  <Users className="h-3 w-3 mr-1" />
                                  {t.slotCapacity}: {slot.capacity}
                                </Badge>
                                <Badge variant="outline" className="text-xs px-2 py-0.5 border-border">
                                  <Users className="h-3 w-3 mr-1" />
                                  {t.slotMaxPartySize}: {slot.maxPartySize}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground mt-1.5 block">
                                {getDaysLabel(slot.days)}
                              </span>
                            </div>
                            
                            {/* Badges row - Mobile: all on same line */}
                            <div className="sm:hidden">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20 border-0 text-[10px] px-2 py-0.5">
                                  <Users className="h-2.5 w-2.5 mr-0.5" />
                                  {t.slotCapacity}: {slot.capacity}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-border">
                                  <Users className="h-2.5 w-2.5 mr-0.5" />
                                  {t.slotMaxPartySize}: {slot.maxPartySize}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {getDaysLabel(slot.days)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Chevron on right */}
                          <div className="flex items-center flex-shrink-0 mt-1">
                            {slot.days.length === 0 && <Badge variant="destructive" className="text-[9px] sm:text-xs hidden sm:flex mr-2">
                                <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                                {t.noDaysWarning}
                              </Badge>}
                            {expandedSlots[slot.id] ? <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />}
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 border-t space-y-3 sm:space-y-4">
                        {/* Time Range */}
                        <div className="grid grid-cols-2 gap-2 sm:gap-4">
                          <div>
                            <Label className="text-[10px] sm:text-sm font-medium">{t.slotFrom}</Label>
                            <Input type="time" value={slot.timeFrom} onChange={e => updateTimeSlot(slot.id, 'timeFrom', e.target.value)} className="mt-1 h-8 sm:h-10 text-[11px] sm:text-sm" />
                          </div>
                          <div>
                            <Label className="text-[10px] sm:text-sm font-medium">{t.slotTo}</Label>
                            <Input type="time" value={slot.timeTo} onChange={e => updateTimeSlot(slot.id, 'timeTo', e.target.value)} className="mt-1 h-8 sm:h-10 text-[11px] sm:text-sm" />
                          </div>
                        </div>

                        {/* Capacity */}
                        <div>
                          <Label className="text-[10px] sm:text-sm font-medium">{t.slotCapacity}</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <NumberInput value={slot.capacity} onChange={value => updateTimeSlot(slot.id, 'capacity', value)} min={1} max={999} className="max-w-[120px] h-8 sm:h-10 text-[11px] sm:text-sm" />
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-[11px] sm:text-sm text-muted-foreground whitespace-nowrap">
                              {language === 'el' ? 'μέγιστες κρατήσεις' : 'max reservations'}
                            </span>
                          </div>
                        </div>

                        {/* Max party size per reservation */}
                        <div>
                          <Label className="text-[10px] sm:text-sm font-medium">{t.slotMaxPartySize}</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <NumberInput value={slot.maxPartySize} onChange={value => updateTimeSlot(slot.id, 'maxPartySize', value)} min={1} max={50} className="max-w-[120px] h-8 sm:h-10 text-[11px] sm:text-sm" />
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-[11px] sm:text-sm text-muted-foreground whitespace-nowrap">
                              {language === 'el' ? 'άτομα ανά κράτηση' : 'people per reservation'}
                            </span>
                          </div>
                        </div>

                        {/* Days Selection */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium">{t.slotDays}</Label>
                            <Button type="button" variant="ghost" size="sm" onClick={() => applySlotToAllDays(slot.id)} className="text-xs h-7">
                              {t.copyToAllDays}
                            </Button>
                          </div>
                          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                            {DAYS.map(day => {
                      const isSelected = slot.days.includes(day);
                      return <button key={day} type="button" onClick={() => toggleSlotDay(slot.id, day)} className={`
                                    py-2 px-1 rounded-lg text-xs font-medium transition-all
                                    ${isSelected ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'}
                                  `}>
                                  {dayShortTranslations[day]}
                                </button>;
                    })}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => duplicateSlot(slot)} className="text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3">
                            <Copy className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                            {t.copySlot}
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeTimeSlot(slot.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3">
                            <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                            <span className="hidden sm:inline">{t.removeSlot}</span>
                            <span className="sm:hidden">{language === 'el' ? 'Διαγραφή' : 'Delete'}</span>
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>)}

              <Button type="button" variant="outline" onClick={addTimeSlot} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                {t.addSlot}
              </Button>
            </CardContent>
          </Card>

      {settings.accepts_direct_reservations && <>
          {/* Policy Info Cards - compact on mobile/tablet */}
          <div className="grid grid-cols-1 gap-2 sm:gap-3">
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
              <CardContent className="py-2 sm:py-3 px-2.5 sm:px-4">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 sm:h-7 sm:w-7 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-[10px] sm:text-xs text-green-800 dark:text-green-200 whitespace-nowrap">{t.instantConfirmation}</h4>
                    <p className="text-[9px] sm:text-[11px] text-green-700 dark:text-green-300 whitespace-nowrap">{t.instantConfirmationDescription}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
              <CardContent className="py-2 sm:py-3 px-2.5 sm:px-4">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 sm:h-7 sm:w-7 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-[10px] sm:text-xs text-orange-800 dark:text-orange-200 whitespace-nowrap">{t.noShowPolicy}</h4>
                    <p className="text-[9px] sm:text-[11px] text-orange-700 dark:text-orange-300 whitespace-nowrap">{t.noShowPolicyDescription}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
              <CardContent className="py-2 sm:py-3 px-2.5 sm:px-4">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 sm:h-7 sm:w-7 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-[10px] sm:text-xs text-blue-800 dark:text-blue-200 whitespace-nowrap">{t.cancellationPolicy}</h4>
                    <p className="text-[9px] sm:text-[11px] text-blue-700 dark:text-blue-300 whitespace-nowrap">{t.cancellationPolicyDescription}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Seating Options */}
          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm lg:text-base">
                <Armchair className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                {t.seatingOptions}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {settings.reservation_seating_options.length === 0 && <p className="text-[10px] sm:text-sm text-orange-600 mb-3 flex items-center gap-1.5 sm:gap-2">
                  <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
                  {t.noSeatingSelected}
                </p>}
              <div className="flex flex-wrap gap-3 sm:gap-4">
                <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer">
                  <Checkbox checked={settings.reservation_seating_options.includes('indoor')} onCheckedChange={() => toggleSeating('indoor')} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-[11px] sm:text-sm">{t.indoor}</span>
                </label>
                <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer">
                  <Checkbox checked={settings.reservation_seating_options.includes('outdoor')} onCheckedChange={() => toggleSeating('outdoor')} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-[11px] sm:text-sm">{t.outdoor}</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving || !hasValidConfig} className="w-full" size="lg">
            {saving ? <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t.saving}
              </> : <>
                <Save className="h-4 w-4 mr-2" />
                {t.save}
              </>}
          </Button>
        </>}
    </div>;
};