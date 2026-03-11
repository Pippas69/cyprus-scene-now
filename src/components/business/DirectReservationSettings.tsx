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
      timeSlots: 'Reservation Management',
      timeSlotsDescription: 'Configure time windows and availability',
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
    <div className="space-y-5">
      {/* Accept Reservations Toggle — Premium Card */}
      <div className="relative rounded-2xl border border-border/20 bg-gradient-to-br from-card/60 to-card/30 backdrop-blur-md p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
              {t.enableReservations}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t.enableDescription}
            </p>
            {!canEnableReservations && !settings.accepts_direct_reservations && (
              <p className="text-[10px] sm:text-xs text-destructive mt-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                {t.noSlotsToEnableWarning}
              </p>
            )}
          </div>
          <Switch
            id="enable-reservations"
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

      {/* Time Slots — Premium Section */}
      <div className="relative rounded-2xl border border-border/20 bg-gradient-to-br from-card/60 to-card/30 backdrop-blur-md shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                {t.timeSlots}
              </h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{t.timeSlotsDescription}</p>
            </div>
          </div>
        </div>

        {/* Slots List */}
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-2.5">
          {(!settings.reservation_time_slots || settings.reservation_time_slots.length === 0) && (
            <div className="text-center py-10 rounded-xl border border-dashed border-border/30 bg-muted/5">
              <div className="h-12 w-12 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">{t.noSlotsWarning}</p>
            </div>
          )}

          {sortedSlots.map((slot, index) => (
            <Collapsible key={slot.id} open={expandedSlots[slot.id] ?? false} onOpenChange={() => toggleSlotExpanded(slot.id)}>
              <div className="rounded-xl border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden transition-all hover:border-border/40">
                <CollapsibleTrigger asChild>
                  <div className="px-4 py-3.5 cursor-pointer transition-colors group">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/12 transition-colors">
                          <Clock className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm sm:text-[15px] text-foreground">
                            {slot.time} - {slot.timeTo}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-primary font-medium bg-primary/8 px-2 py-0.5 rounded-md">
                              <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              {t.slotCapacity}: {slot.capacity}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground font-medium bg-muted/30 px-2 py-0.5 rounded-md">
                              <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              Max: {slot.maxPartySize}
                            </span>
                            <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">
                              {getDaysLabel(slot.days)}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground sm:hidden mt-0.5 block">
                            {getDaysLabel(slot.days)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {slot.days.length === 0 && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-destructive bg-destructive/10 px-2 py-0.5 rounded-md font-medium">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {t.noDaysWarning}
                          </span>
                        )}
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expandedSlots[slot.id] ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-1 border-t border-border/15 space-y-4">
                    {/* Time Range */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.slotFrom}</Label>
                        <Input
                          type="time"
                          value={slot.time}
                          onChange={e => updateTimeSlot(slot.id, 'time', e.target.value)}
                          className="mt-1.5 h-9 sm:h-10 text-xs sm:text-sm rounded-lg border-border/30 bg-background/60"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.slotTo}</Label>
                        <Input
                          type="time"
                          value={slot.timeTo}
                          onChange={e => updateTimeSlot(slot.id, 'timeTo', e.target.value)}
                          className="mt-1.5 h-9 sm:h-10 text-xs sm:text-sm rounded-lg border-border/30 bg-background/60"
                        />
                      </div>
                    </div>

                    {/* Capacity & Max Party — Side by Side */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.slotCapacity}</Label>
                        <NumberInput
                          value={slot.capacity}
                          onChange={value => updateTimeSlot(slot.id, 'capacity', value)}
                          min={1}
                          max={999}
                          className="mt-1.5 h-9 sm:h-10 text-xs sm:text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.slotMaxPartySize}</Label>
                        <NumberInput
                          value={slot.maxPartySize}
                          onChange={value => updateTimeSlot(slot.id, 'maxPartySize', value)}
                          min={1}
                          max={50}
                          className="mt-1.5 h-9 sm:h-10 text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    {/* Days Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.slotDays}</Label>
                        <button
                          type="button"
                          onClick={() => applySlotToAllDays(slot.id)}
                          className="text-[10px] sm:text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                        >
                          {t.copyToAllDays}
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-1.5">
                        {DAYS.map(day => {
                          const isSelected = slot.days.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleSlotDay(slot.id, day)}
                              className={`py-2 rounded-lg text-[10px] sm:text-xs font-semibold transition-all ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'bg-muted/20 text-muted-foreground hover:bg-muted/40'
                              }`}
                            >
                              {dayShortTranslations[day]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Slot Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/15">
                      <button
                        type="button"
                        onClick={() => duplicateSlot(slot)}
                        className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                        {t.copySlot}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTimeSlot(slot.id)}
                        className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-destructive hover:text-destructive/80 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                        {t.removeSlot}
                      </button>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}

          {/* Bottom Actions */}
          <div className="flex items-center gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={addTimeSlot}
              className="h-9 sm:h-10 text-xs sm:text-sm px-4 rounded-xl border-border/30 hover:bg-card/50"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {t.addSlot}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !hasValidConfig}
              className="h-9 sm:h-10 text-xs sm:text-sm px-5 rounded-xl shadow-sm"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              {saving ? t.saving : t.save}
            </Button>
          </div>
        </div>
      </div>

      {/* Seating Options — Premium Card */}
      {settings.accepts_direct_reservations && (
        <div className="relative rounded-2xl border border-border/20 bg-gradient-to-br from-card/60 to-card/30 backdrop-blur-md p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Armchair className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
              {t.seatingOptions}
            </h3>
          </div>
          {settings.reservation_seating_options.length === 0 && (
            <p className="text-xs text-destructive mb-3 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t.noSeatingSelected}
            </p>
          )}
          <div className="flex gap-3">
            {['indoor', 'outdoor'].map(option => {
              const isSelected = settings.reservation_seating_options.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleSeating(option)}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/20 text-muted-foreground hover:bg-muted/40 border border-border/20'
                  }`}
                >
                  {option === 'indoor' ? t.indoor : t.outdoor}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
