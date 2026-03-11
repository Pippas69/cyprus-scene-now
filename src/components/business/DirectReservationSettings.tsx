import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Clock, Users, Plus, Trash2, Save, Copy, ChevronDown, ChevronUp, Armchair, AlertTriangle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface DirectReservationSettingsProps {
  businessId: string;
  language: 'el' | 'en';
}

interface TimeSlot {
  id: string;
  time: string;
  timeTo: string;
  capacity: number;
  maxPartySize: number;
  days: string[];
}

interface ReservationSettings {
  accepts_direct_reservations: boolean;
  reservation_capacity_type: 'daily' | 'time_slots';
  daily_reservation_limit: number | null;
  reservation_time_slots: TimeSlot[] | null;
  reservation_days: string[];
  reservation_opens_at: string | null;
  reservation_closes_at: string | null;
  reservation_seating_options: string[];
  reservation_requires_approval: boolean;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const generateSlotId = () => Math.random().toString(36).substring(2, 9);

export const DirectReservationSettings = ({ businessId, language }: DirectReservationSettingsProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSlots, setExpandedSlots] = useState<Record<string, boolean>>({});
  const [savedSlotsCount, setSavedSlotsCount] = useState(0);
  const [settings, setSettings] = useState<ReservationSettings>({
    accepts_direct_reservations: false,
    reservation_capacity_type: 'time_slots',
    daily_reservation_limit: null,
    reservation_time_slots: null,
    reservation_days: [],
    reservation_opens_at: null,
    reservation_closes_at: null,
    reservation_seating_options: [],
    reservation_requires_approval: true,
  });

  const text = {
    el: {
      enableReservations: 'Αποδοχή Κρατήσεων',
      enableDescription: 'Επιτρέψτε κρατήσεις μέσω ΦΟΜΟ',
      timeSlots: 'Διαχείριση Κρατήσεων',
      timeSlotsDescription: 'Ρυθμίστε τα χρονικά παράθυρα και τη διαθεσιμότητα',
      slotFrom: 'Από',
      slotTo: 'Έως',
      slotCapacity: 'Χωρητικότητα',
      slotMaxPartySize: 'Max άτομα/κράτηση',
      addSlot: 'Προσθήκη Slot',
      removeSlot: 'Διαγραφή Slot',
      copySlot: 'Αντιγραφή Slot',
      copyToAllDays: 'Εφαρμογή σε όλες τις μέρες',
      monday: 'Δευτέρα', tuesday: 'Τρίτη', wednesday: 'Τετάρτη', thursday: 'Πέμπτη',
      friday: 'Παρασκευή', saturday: 'Σάββατο', sunday: 'Κυριακή',
      mondayShort: 'Δευ', tuesdayShort: 'Τρι', wednesdayShort: 'Τετ', thursdayShort: 'Πεμ',
      fridayShort: 'Παρ', saturdayShort: 'Σαβ', sundayShort: 'Κυρ',
      seatingOptions: 'Επιλογές Θέσεων',
      indoor: 'Εσωτερικός Χώρος',
      outdoor: 'Εξωτερικός Χώρος',
      save: 'Αποθήκευση Αλλαγών',
      saving: 'Αποθήκευση...',
      success: 'Οι ρυθμίσεις αποθηκεύτηκαν',
      error: 'Σφάλμα αποθήκευσης',
      noSlotsWarning: 'Προσθέστε τουλάχιστον ένα χρονικό slot για να δέχεστε κρατήσεις',
      noSlotsToEnableWarning: 'Πρέπει να υπάρχει τουλάχιστον ένα χρονικό slot για ενεργοποίηση κρατήσεων',
      noDaysWarning: 'Επιλέξτε ημέρες για αυτό το slot',
      allDays: 'Όλες τις μέρες',
      slotDays: 'Ημέρες',
      noSeatingSelected: 'Επιλέξτε τουλάχιστον μία επιλογή θέσης',
    },
    en: {
      enableReservations: 'Accept Reservations',
      enableDescription: 'Allow reservations via ΦΟΜΟ',
      timeSlots: 'Reservation Time Slots',
      timeSlotsDescription: 'Each slot is a time window (From-To) with its own capacity and active days',
      slotFrom: 'From',
      slotTo: 'To',
      slotCapacity: 'Capacity',
      slotMaxPartySize: 'Max people/reservation',
      addSlot: 'Add Slot',
      removeSlot: 'Delete Slot',
      copySlot: 'Copy Slot',
      copyToAllDays: 'Apply to all days',
      monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
      friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
      mondayShort: 'Mon', tuesdayShort: 'Tue', wednesdayShort: 'Wed', thursdayShort: 'Thu',
      fridayShort: 'Fri', saturdayShort: 'Sat', sundayShort: 'Sun',
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
      allDays: 'All days',
      slotDays: 'Days',
      noSeatingSelected: 'Select at least one seating option',
    },
  };

  const t = text[language];

  const dayShortTranslations: Record<string, string> = {
    monday: t.mondayShort, tuesday: t.tuesdayShort, wednesday: t.wednesdayShort,
    thursday: t.thursdayShort, friday: t.fridayShort, saturday: t.saturdayShort, sunday: t.sundayShort,
  };

  useEffect(() => {
    fetchSettings();
  }, [businessId]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select(`
          accepts_direct_reservations,
          reservation_capacity_type,
          daily_reservation_limit,
          reservation_time_slots,
          reservation_days,
          reservation_opens_at,
          reservation_closes_at,
          reservation_seating_options,
          reservation_requires_approval
        `)
        .eq('id', businessId)
        .single();

      if (error) throw error;

      if (data) {
        let parsedTimeSlots: TimeSlot[] | null = null;
        if (data.reservation_time_slots && Array.isArray(data.reservation_time_slots)) {
          const rawSlots = data.reservation_time_slots as unknown as any[];
          parsedTimeSlots = rawSlots.map((slot: any) => {
            // Support multiple formats
            if (slot.timeFrom && slot.timeTo) {
              return {
                id: slot.id || generateSlotId(),
                time: slot.timeFrom,
                timeTo: slot.timeTo,
                capacity: slot.capacity || 10,
                maxPartySize: slot.maxPartySize || 7,
                days: slot.days || DAYS,
              };
            } else if (slot.time) {
              const timeHour = parseInt(slot.time.split(':')[0]);
              const toHour = (timeHour + 2) % 24;
              return {
                id: slot.id || generateSlotId(),
                time: slot.time,
                timeTo: slot.timeTo || `${toHour.toString().padStart(2, '0')}:00`,
                capacity: slot.capacity || 10,
                maxPartySize: slot.maxPartySize || 7,
                days: slot.days || DAYS,
              };
            }
            return null;
          }).filter(Boolean) as TimeSlot[];
        }

        setSettings({
          accepts_direct_reservations: data.accepts_direct_reservations ?? false,
          reservation_capacity_type: (data.reservation_capacity_type as 'daily' | 'time_slots') ?? 'time_slots',
          daily_reservation_limit: data.daily_reservation_limit,
          reservation_time_slots: parsedTimeSlots,
          reservation_days: data.reservation_days ?? [],
          reservation_opens_at: data.reservation_opens_at,
          reservation_closes_at: data.reservation_closes_at,
          reservation_seating_options: data.reservation_seating_options ?? [],
          reservation_requires_approval: data.reservation_requires_approval ?? true,
        });
        setSavedSlotsCount(parsedTimeSlots?.length ?? 0);
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
      // Convert to the format used by ReservationSlotManager (timeFrom/timeTo)
      const timeSlotsJson = settings.reservation_time_slots
        ? settings.reservation_time_slots.map(slot => ({
            id: slot.id,
            timeFrom: slot.time,
            timeTo: slot.timeTo,
            capacity: slot.capacity,
            maxPartySize: slot.maxPartySize,
            days: slot.days,
          }))
        : null;

      const allDays = new Set<string>();
      settings.reservation_time_slots?.forEach(slot => {
        slot.days.forEach(day => allDays.add(day));
      });

      const { error } = await supabase
        .from('businesses')
        .update({
          accepts_direct_reservations: settings.accepts_direct_reservations,
          reservation_capacity_type: 'time_slots',
          reservation_time_slots: timeSlotsJson ? JSON.parse(JSON.stringify(timeSlotsJson)) : null,
          reservation_days: Array.from(allDays),
          reservation_opens_at: settings.reservation_opens_at,
          reservation_closes_at: settings.reservation_closes_at,
          reservation_seating_options: settings.reservation_seating_options,
          reservation_requires_approval: settings.reservation_requires_approval,
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId);

      if (error) throw error;
      toast.success(t.success);
      setSavedSlotsCount(settings.reservation_time_slots?.length ?? 0);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(t.error);
    } finally {
      setSaving(false);
    }
  };

  const toggleSeating = async (option: string) => {
    const newOptions = settings.reservation_seating_options.includes(option)
      ? settings.reservation_seating_options.filter(o => o !== option)
      : [...settings.reservation_seating_options, option];

    setSettings(prev => ({ ...prev, reservation_seating_options: newOptions }));

    try {
      const { error } = await supabase.from('businesses').update({
        reservation_seating_options: newOptions,
        updated_at: new Date().toISOString(),
      }).eq('id', businessId);
      if (error) throw error;
    } catch (error) {
      console.error('Error saving seating options:', error);
      toast.error(t.error);
    }
  };

  const addTimeSlot = () => {
    const newSlot: TimeSlot = {
      id: generateSlotId(),
      time: '18:00',
      timeTo: '00:00',
      capacity: 20,
      maxPartySize: 7,
      days: [...DAYS],
    };
    setSettings(prev => ({
      ...prev,
      reservation_time_slots: [...(prev.reservation_time_slots || []), newSlot],
    }));
    setExpandedSlots(prev => ({ ...prev, [newSlot.id]: true }));
  };

  const updateTimeSlot = (slotId: string, field: keyof TimeSlot, value: string | number | string[]) => {
    setSettings(prev => ({
      ...prev,
      reservation_time_slots: prev.reservation_time_slots?.map(slot =>
        slot.id === slotId ? { ...slot, [field]: value } : slot
      ) || [],
    }));
  };

  const toggleSlotDay = (slotId: string, day: string) => {
    setSettings(prev => ({
      ...prev,
      reservation_time_slots: prev.reservation_time_slots?.map(slot => {
        if (slot.id !== slotId) return slot;
        const newDays = slot.days.includes(day)
          ? slot.days.filter(d => d !== day)
          : [...slot.days, day];
        return { ...slot, days: newDays };
      }) || [],
    }));
  };

  const applySlotToAllDays = (slotId: string) => {
    updateTimeSlot(slotId, 'days', [...DAYS]);
  };

  const removeTimeSlot = async (slotId: string) => {
    const remainingSlots = settings.reservation_time_slots?.filter(slot => slot.id !== slotId) || [];
    setSettings(prev => ({
      ...prev,
      reservation_time_slots: remainingSlots.length > 0 ? remainingSlots : null,
    }));

    try {
      const allDays = new Set<string>();
      remainingSlots.forEach(slot => slot.days.forEach(day => allDays.add(day)));
      const timeSlotsJson = remainingSlots.length > 0
        ? remainingSlots.map(slot => ({
            id: slot.id,
            timeFrom: slot.time,
            timeTo: slot.timeTo,
            capacity: slot.capacity,
            maxPartySize: slot.maxPartySize,
            days: slot.days,
          }))
        : null;

      if (remainingSlots.length === 0 && settings.accepts_direct_reservations) {
        setSettings(prev => ({ ...prev, accepts_direct_reservations: false, reservation_time_slots: null }));
        await supabase.from('businesses').update({
          accepts_direct_reservations: false,
          reservation_time_slots: null,
          reservation_days: [],
          updated_at: new Date().toISOString(),
        }).eq('id', businessId);
        setSavedSlotsCount(0);
        toast.success(language === 'el' ? 'Οι κρατήσεις απενεργοποιήθηκαν (δεν υπάρχουν slots)' : 'Reservations disabled (no slots available)');
      } else {
        await supabase.from('businesses').update({
          reservation_time_slots: timeSlotsJson ? JSON.parse(JSON.stringify(timeSlotsJson)) : null,
          reservation_days: Array.from(allDays),
          updated_at: new Date().toISOString(),
        }).eq('id', businessId);
        setSavedSlotsCount(remainingSlots.length);
        toast.success(language === 'el' ? 'Το slot διαγράφηκε' : 'Slot deleted');
      }
    } catch (error) {
      console.error('Error removing slot:', error);
      toast.error(t.error);
      await fetchSettings();
    }
  };

  const duplicateSlot = (slot: TimeSlot) => {
    const newSlot: TimeSlot = { ...slot, id: generateSlotId() };
    setSettings(prev => ({
      ...prev,
      reservation_time_slots: [...(prev.reservation_time_slots || []), newSlot],
    }));
    setExpandedSlots(prev => ({ ...prev, [newSlot.id]: true }));
  };

  const toggleSlotExpanded = (slotId: string) => {
    setExpandedSlots(prev => ({ ...prev, [slotId]: !prev[slotId] }));
  };

  const sortedSlots = [...(settings.reservation_time_slots || [])].sort((a, b) => a.time.localeCompare(b.time));
  const hasValidConfig = settings.reservation_time_slots && settings.reservation_time_slots.length > 0 && settings.reservation_time_slots.every(slot => slot.days.length > 0);
  const hasSavedTimeSlots = savedSlotsCount > 0;
  const canEnableReservations = hasSavedTimeSlots;

  const getDaysLabel = (days: string[]) => {
    if (days.length === 7) return t.allDays;
    if (days.length === 0) return t.noDaysWarning;
    const sortedDays = [...days].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
    return sortedDays.map(d => dayShortTranslations[d]).join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Main Toggle */}
      <div className="rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm p-3 sm:p-4 lg:p-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex-1 min-w-0 pr-12 sm:pr-14">
            <Label htmlFor="enable-reservations" className="text-[11px] sm:text-sm lg:text-base font-semibold whitespace-nowrap">
              {t.enableReservations}
            </Label>
            <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground whitespace-nowrap">
              {t.enableDescription}
            </p>
            {!canEnableReservations && !settings.accepts_direct_reservations && (
              <p className="text-[8px] sm:text-[9px] md:text-[10px] text-orange-600 mt-1.5 flex items-center gap-1 whitespace-nowrap">
                <span>{t.noSlotsToEnableWarning}</span>
              </p>
            )}
          </div>
          <Switch
            id="enable-reservations"
            className="flex-shrink-0 scale-75 md:scale-90 lg:scale-100"
            checked={settings.accepts_direct_reservations}
            disabled={!canEnableReservations && !settings.accepts_direct_reservations}
            onCheckedChange={async (checked) => {
              if (checked && !canEnableReservations) {
                toast.error(t.noSlotsToEnableWarning);
                return;
              }
              setSettings(prev => ({ ...prev, accepts_direct_reservations: checked }));
              try {
                const { error } = await supabase.from('businesses').update({
                  accepts_direct_reservations: checked,
                  updated_at: new Date().toISOString(),
                }).eq('id', businessId);
                if (error) throw error;
                toast.success(checked
                  ? (language === 'el' ? 'Οι κρατήσεις ενεργοποιήθηκαν' : 'Reservations enabled')
                  : (language === 'el' ? 'Οι κρατήσεις απενεργοποιήθηκαν' : 'Reservations disabled'));
              } catch (error) {
                console.error('Error updating reservations status:', error);
                toast.error(t.error);
                setSettings(prev => ({ ...prev, accepts_direct_reservations: !checked }));
              }
            }}
          />
        </div>
      </div>

      {/* Time Slots */}
      <div className="rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm p-4 sm:p-6">
        <div className="mb-4">
          <h3 className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base font-bold text-foreground">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-primary" />
            {t.timeSlots}
          </h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{t.timeSlotsDescription}</p>
        </div>

        <div className="space-y-3">
          {(!settings.reservation_time_slots || settings.reservation_time_slots.length === 0) && (
            <div className="text-center py-8 rounded-xl border border-dashed border-border/40 bg-muted/10">
              <Clock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground px-4">{t.noSlotsWarning}</p>
            </div>
          )}

          {sortedSlots.map(slot => (
            <Collapsible key={slot.id} open={expandedSlots[slot.id] ?? false} onOpenChange={() => toggleSlotExpanded(slot.id)}>
              <div className="rounded-xl border border-border/30 bg-card/30 overflow-hidden">
                <CollapsibleTrigger asChild>
                  <div className="p-3 sm:p-4 cursor-pointer hover:bg-card/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Clock className="h-3 w-3 text-primary" />
                          </div>
                          <span className="font-semibold text-sm sm:text-base text-foreground">
                            {slot.time} - {slot.timeTo}
                          </span>
                        </div>

                        {/* Desktop badges */}
                        <div className="hidden lg:flex items-center gap-2">
                          <Badge className="bg-primary/15 text-primary hover:bg-primary/20 border-0 text-xs px-2.5 py-0.5">
                            <Users className="h-3 w-3 mr-1" />
                            {t.slotCapacity}: {slot.capacity}
                          </Badge>
                          <Badge variant="outline" className="text-xs px-2.5 py-0.5 border-border/50">
                            <Users className="h-3 w-3 mr-1" />
                            {t.slotMaxPartySize}: {slot.maxPartySize}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-1">
                            {getDaysLabel(slot.days)}
                          </span>
                        </div>

                        {/* Tablet badges */}
                        <div className="hidden sm:block lg:hidden">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge className="bg-primary/15 text-primary hover:bg-primary/20 border-0 text-xs px-2 py-0.5">
                              <Users className="h-3 w-3 mr-1" />
                              {t.slotCapacity}: {slot.capacity}
                            </Badge>
                            <Badge variant="outline" className="text-xs px-2 py-0.5 border-border/50">
                              <Users className="h-3 w-3 mr-1" />
                              {t.slotMaxPartySize}: {slot.maxPartySize}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground mt-1.5 block">
                            {getDaysLabel(slot.days)}
                          </span>
                        </div>

                        {/* Mobile badges */}
                        <div className="sm:hidden">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge className="bg-primary/15 text-primary hover:bg-primary/20 border-0 text-[10px] px-2 py-0.5">
                              <Users className="h-2.5 w-2.5 mr-0.5" />
                              {t.slotCapacity}: {slot.capacity}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-border/50">
                              <Users className="h-2.5 w-2.5 mr-0.5" />
                              {t.slotMaxPartySize}: {slot.maxPartySize}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {getDaysLabel(slot.days)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center flex-shrink-0 mt-1">
                        {slot.days.length === 0 && (
                          <Badge variant="destructive" className="text-[9px] sm:text-xs hidden sm:flex mr-2">
                            <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                            {t.noDaysWarning}
                          </Badge>
                        )}
                        {expandedSlots[slot.id]
                          ? <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                          : <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                        }
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 border-t border-border/20 space-y-3 sm:space-y-4">
                    {/* Time Range */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <div>
                        <Label className="text-[10px] sm:text-sm font-medium">{t.slotFrom}</Label>
                        <Input
                          type="time"
                          value={slot.time}
                          onChange={e => updateTimeSlot(slot.id, 'time', e.target.value)}
                          className="mt-1 h-8 sm:h-10 text-[11px] sm:text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] sm:text-sm font-medium">{t.slotTo}</Label>
                        <Input
                          type="time"
                          value={slot.timeTo}
                          onChange={e => updateTimeSlot(slot.id, 'timeTo', e.target.value)}
                          className="mt-1 h-8 sm:h-10 text-[11px] sm:text-sm"
                        />
                      </div>
                    </div>

                    {/* Capacity */}
                    <div>
                      <Label className="text-[10px] sm:text-sm font-medium">{t.slotCapacity}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <NumberInput
                          value={slot.capacity}
                          onChange={value => updateTimeSlot(slot.id, 'capacity', value)}
                          min={1}
                          max={999}
                          className="max-w-[120px] h-8 sm:h-10 text-[11px] sm:text-sm"
                        />
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-[11px] sm:text-sm text-muted-foreground whitespace-nowrap">
                          {language === 'el' ? 'μέγιστες κρατήσεις' : 'max reservations'}
                        </span>
                      </div>
                    </div>

                    {/* Max party size */}
                    <div>
                      <Label className="text-[10px] sm:text-sm font-medium">{t.slotMaxPartySize}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <NumberInput
                          value={slot.maxPartySize}
                          onChange={value => updateTimeSlot(slot.id, 'maxPartySize', value)}
                          min={1}
                          max={50}
                          className="max-w-[120px] h-8 sm:h-10 text-[11px] sm:text-sm"
                        />
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
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleSlotDay(slot.id, day)}
                              className={`py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                              }`}
                            >
                              {dayShortTranslations[day]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/20 gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => duplicateSlot(slot)} className="text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 border-border/40">
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
              </div>
            </Collapsible>
          ))}

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button type="button" variant="outline" onClick={addTimeSlot} className="flex-1 sm:flex-none h-8 sm:h-9 md:h-10 text-[10px] sm:text-xs md:text-sm px-2 sm:px-3 md:px-4 border-border/40">
              <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1 sm:mr-1.5 md:mr-2" />
              {t.addSlot}
            </Button>
            <Button onClick={handleSave} disabled={saving || !hasValidConfig} className="flex-1 sm:flex-none h-8 sm:h-9 md:h-10 text-[10px] sm:text-xs md:text-sm px-2 sm:px-3 md:px-4">
              {saving ? (
                <>
                  <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1 sm:mr-1.5 md:mr-2 animate-spin" />
                  <span className="hidden sm:inline">{t.saving}</span>
                  <span className="sm:hidden">{language === 'el' ? 'Αποθήκ...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1 sm:mr-1.5 md:mr-2" />
                  <span className="hidden sm:inline">{t.save}</span>
                  <span className="sm:hidden">{language === 'el' ? 'Αποθήκευση' : 'Save'}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Seating Options */}
      {settings.accepts_direct_reservations && (
        <div className="rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm p-4 sm:p-6">
          <h3 className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm lg:text-base font-bold text-foreground mb-3">
            <Armchair className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-primary" />
            {t.seatingOptions}
          </h3>
          {settings.reservation_seating_options.length === 0 && (
            <p className="text-[10px] sm:text-sm text-orange-600 mb-3 flex items-center gap-1.5 sm:gap-2">
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
              {t.noSeatingSelected}
            </p>
          )}
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer">
              <Checkbox
                checked={settings.reservation_seating_options.includes('indoor')}
                onCheckedChange={() => toggleSeating('indoor')}
                className="h-3.5 w-3.5 sm:h-4 sm:w-4"
              />
              <span className="text-[11px] sm:text-sm">{t.indoor}</span>
            </label>
            <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer">
              <Checkbox
                checked={settings.reservation_seating_options.includes('outdoor')}
                onCheckedChange={() => toggleSeating('outdoor')}
                className="h-3.5 w-3.5 sm:h-4 sm:w-4"
              />
              <span className="text-[11px] sm:text-sm">{t.outdoor}</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
