import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Clock, Calendar, Users, Plus, Trash2, Save, AlertTriangle } from 'lucide-react';

interface ReservationSlotManagerProps {
  businessId: string;
  language: 'el' | 'en';
}

interface TimeSlot {
  time: string;
  capacity: number;
}

interface ReservationSettings {
  accepts_direct_reservations: boolean;
  reservations_globally_paused: boolean;
  reservation_time_slots: TimeSlot[] | null;
  reservation_days: string[];
  reservation_seating_options: string[];
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const ReservationSlotManager = ({ businessId, language }: ReservationSlotManagerProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ReservationSettings>({
    accepts_direct_reservations: false,
    reservations_globally_paused: false,
    reservation_time_slots: null,
    reservation_days: [],
    reservation_seating_options: [],
  });

  const text = {
    el: {
      title: 'Ρυθμίσεις Διαθεσιμότητας',
      description: 'Ορίστε τα χρονικά slots και τη χωρητικότητα για τις κρατήσεις σας',
      enableReservations: 'Αποδοχή Κρατήσεων',
      enableDescription: 'Επιτρέψτε κρατήσεις μέσω FOMO (προφίλ & προσφορές)',
      paused: 'Προσωρινή Παύση',
      pausedDescription: 'Οι κρατήσεις είναι προσωρινά κλειστές',
      timeSlots: 'Χρονικά Slots Κρατήσεων',
      timeSlotsDescription: 'Ορίστε τα διαθέσιμα slots και τη χωρητικότητα ανά slot',
      slotTime: 'Ώρα Άφιξης',
      slotCapacity: 'Χωρητικότητα',
      addSlot: 'Προσθήκη Slot',
      removeSlot: 'Αφαίρεση',
      availableDays: 'Διαθέσιμες Ημέρες',
      monday: 'Δευτέρα',
      tuesday: 'Τρίτη',
      wednesday: 'Τετάρτη',
      thursday: 'Πέμπτη',
      friday: 'Παρασκευή',
      saturday: 'Σάββατο',
      sunday: 'Κυριακή',
      seatingOptions: 'Επιλογές Θέσεων',
      indoor: 'Εσωτερικός Χώρος',
      outdoor: 'Εξωτερικός Χώρος',
      save: 'Αποθήκευση Αλλαγών',
      saving: 'Αποθήκευση...',
      success: 'Οι ρυθμίσεις αποθηκεύτηκαν',
      error: 'Σφάλμα αποθήκευσης',
      noSlotsWarning: 'Προσθέστε τουλάχιστον ένα χρονικό slot για να δέχεστε κρατήσεις',
      noDaysWarning: 'Επιλέξτε τουλάχιστον μία ημέρα',
      instantConfirmation: 'Άμεση Επιβεβαίωση',
      instantConfirmationDescription: 'Οι κρατήσεις επιβεβαιώνονται αυτόματα αν υπάρχει διαθεσιμότητα',
      noShowPolicy: 'Πολιτική No-Show',
      noShowPolicyDescription: '15 λεπτά περιθώριο - αυτόματη ακύρωση αν δεν γίνει check-in',
      cancellationPolicy: 'Ελεύθερη Ακύρωση',
      cancellationPolicyDescription: 'Δωρεάν ακύρωση μέχρι 1 ώρα πριν την κράτηση',
    },
    en: {
      title: 'Availability Settings',
      description: 'Set up your time slots and capacity for reservations',
      enableReservations: 'Accept Reservations',
      enableDescription: 'Allow reservations via FOMO (profile & offers)',
      paused: 'Temporarily Paused',
      pausedDescription: 'Reservations are temporarily closed',
      timeSlots: 'Reservation Time Slots',
      timeSlotsDescription: 'Define available slots and capacity per slot',
      slotTime: 'Arrival Time',
      slotCapacity: 'Capacity',
      addSlot: 'Add Slot',
      removeSlot: 'Remove',
      availableDays: 'Available Days',
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
      seatingOptions: 'Seating Options',
      indoor: 'Indoor',
      outdoor: 'Outdoor',
      save: 'Save Changes',
      saving: 'Saving...',
      success: 'Settings saved',
      error: 'Error saving settings',
      noSlotsWarning: 'Add at least one time slot to accept reservations',
      noDaysWarning: 'Select at least one day',
      instantConfirmation: 'Instant Confirmation',
      instantConfirmationDescription: 'Reservations are automatically confirmed if availability exists',
      noShowPolicy: 'No-Show Policy',
      noShowPolicyDescription: '15 minute grace period - auto-cancelled if no check-in',
      cancellationPolicy: 'Free Cancellation',
      cancellationPolicyDescription: 'Free cancellation up to 1 hour before the reservation',
    },
  };

  const t = text[language];

  const dayTranslations: Record<string, string> = {
    monday: t.monday,
    tuesday: t.tuesday,
    wednesday: t.wednesday,
    thursday: t.thursday,
    friday: t.friday,
    saturday: t.saturday,
    sunday: t.sunday,
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
          reservations_globally_paused,
          reservation_time_slots,
          reservation_days,
          reservation_seating_options
        `)
        .eq('id', businessId)
        .single();

      if (error) throw error;

      if (data) {
        let parsedTimeSlots: TimeSlot[] | null = null;
        if (data.reservation_time_slots && Array.isArray(data.reservation_time_slots)) {
          parsedTimeSlots = data.reservation_time_slots as unknown as TimeSlot[];
        }

        setSettings({
          accepts_direct_reservations: data.accepts_direct_reservations ?? false,
          reservations_globally_paused: data.reservations_globally_paused ?? false,
          reservation_time_slots: parsedTimeSlots,
          reservation_days: data.reservation_days ?? [],
          reservation_seating_options: data.reservation_seating_options ?? [],
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
      const timeSlotsJson = settings.reservation_time_slots
        ? JSON.parse(JSON.stringify(settings.reservation_time_slots))
        : null;

      const { error } = await supabase
        .from('businesses')
        .update({
          accepts_direct_reservations: settings.accepts_direct_reservations,
          reservations_globally_paused: settings.reservations_globally_paused,
          reservation_time_slots: timeSlotsJson,
          reservation_days: settings.reservation_days,
          reservation_seating_options: settings.reservation_seating_options,
          reservation_capacity_type: 'time_slots', // Always use slots now
          reservation_requires_approval: false, // Instant confirmation
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId);

      if (error) throw error;
      toast.success(t.success);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(t.error);
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    setSettings((prev) => ({
      ...prev,
      reservation_days: prev.reservation_days.includes(day)
        ? prev.reservation_days.filter((d) => d !== day)
        : [...prev.reservation_days, day],
    }));
  };

  const toggleSeating = (option: string) => {
    setSettings((prev) => ({
      ...prev,
      reservation_seating_options: prev.reservation_seating_options.includes(option)
        ? prev.reservation_seating_options.filter((o) => o !== option)
        : [...prev.reservation_seating_options, option],
    }));
  };

  const addTimeSlot = () => {
    const newSlot: TimeSlot = { time: '18:00', capacity: 10 };
    setSettings((prev) => ({
      ...prev,
      reservation_time_slots: [...(prev.reservation_time_slots || []), newSlot],
    }));
  };

  const updateTimeSlot = (index: number, field: keyof TimeSlot, value: string | number) => {
    setSettings((prev) => ({
      ...prev,
      reservation_time_slots: prev.reservation_time_slots?.map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      ) || [],
    }));
  };

  const removeTimeSlot = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      reservation_time_slots: prev.reservation_time_slots?.filter((_, i) => i !== index) || [],
    }));
  };

  // Sort slots by time
  const sortedSlots = [...(settings.reservation_time_slots || [])].sort((a, b) => 
    a.time.localeCompare(b.time)
  );

  const hasValidConfig = settings.reservation_time_slots && 
    settings.reservation_time_slots.length > 0 && 
    settings.reservation_days.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="enable-reservations" className="text-base font-semibold">
                  {t.enableReservations}
                </Label>
                {settings.accepts_direct_reservations && (
                  <Badge variant="default" className="bg-green-500">
                    {language === 'el' ? 'Ενεργό' : 'Active'}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{t.enableDescription}</p>
            </div>
            <Switch
              id="enable-reservations"
              checked={settings.accepts_direct_reservations}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, accepts_direct_reservations: checked }))
              }
            />
          </div>

          {settings.accepts_direct_reservations && (
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="pause-reservations" className="text-base font-medium text-orange-600 dark:text-orange-400">
                  {t.paused}
                </Label>
                <p className="text-sm text-muted-foreground">{t.pausedDescription}</p>
              </div>
              <Switch
                id="pause-reservations"
                checked={settings.reservations_globally_paused}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, reservations_globally_paused: checked }))
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {settings.accepts_direct_reservations && (
        <>
          {/* Policy Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-green-800 dark:text-green-200">{t.instantConfirmation}</h4>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">{t.instantConfirmationDescription}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-orange-800 dark:text-orange-200">{t.noShowPolicy}</h4>
                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">{t.noShowPolicyDescription}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-800 dark:text-blue-200">{t.cancellationPolicy}</h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">{t.cancellationPolicyDescription}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Time Slots */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t.timeSlots}
              </CardTitle>
              <CardDescription>{t.timeSlotsDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(!settings.reservation_time_slots || settings.reservation_time_slots.length === 0) && (
                <div className="text-center py-8 bg-muted/50 rounded-lg border border-dashed">
                  <Clock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">{t.noSlotsWarning}</p>
                </div>
              )}

              {sortedSlots.map((slot, index) => {
                const originalIndex = settings.reservation_time_slots?.findIndex(s => s.time === slot.time && s.capacity === slot.capacity) ?? index;
                return (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">{t.slotTime}</Label>
                        <Input
                          type="time"
                          value={slot.time}
                          onChange={(e) => updateTimeSlot(originalIndex, 'time', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t.slotCapacity}</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="number"
                            min="1"
                            value={slot.capacity}
                            onChange={(e) => updateTimeSlot(originalIndex, 'capacity', parseInt(e.target.value) || 1)}
                          />
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTimeSlot(originalIndex)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}

              <Button type="button" variant="outline" onClick={addTimeSlot} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                {t.addSlot}
              </Button>
            </CardContent>
          </Card>

          {/* Available Days */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t.availableDays}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {settings.reservation_days.length === 0 && (
                <p className="text-sm text-orange-600 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {t.noDaysWarning}
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day}`}
                      checked={settings.reservation_days.includes(day)}
                      onCheckedChange={() => toggleDay(day)}
                    />
                    <Label htmlFor={`day-${day}`} className="text-sm font-normal cursor-pointer">
                      {dayTranslations[day]}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Seating Options */}
          <Card>
            <CardHeader>
              <CardTitle>{t.seatingOptions}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="seating-indoor"
                    checked={settings.reservation_seating_options.includes('indoor')}
                    onCheckedChange={() => toggleSeating('indoor')}
                  />
                  <Label htmlFor="seating-indoor" className="text-sm font-normal cursor-pointer">
                    {t.indoor}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="seating-outdoor"
                    checked={settings.reservation_seating_options.includes('outdoor')}
                    onCheckedChange={() => toggleSeating('outdoor')}
                  />
                  <Label htmlFor="seating-outdoor" className="text-sm font-normal cursor-pointer">
                    {t.outdoor}
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Save Button */}
      <Button 
        onClick={handleSave} 
        disabled={saving} 
        className="w-full"
        size="lg"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {t.saving}
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            {t.save}
          </>
        )}
      </Button>
    </div>
  );
};
