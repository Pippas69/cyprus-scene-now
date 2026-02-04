import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Clock, Calendar, Users, Settings } from 'lucide-react';

interface DirectReservationSettingsProps {
  businessId: string;
  language: 'el' | 'en';
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

interface TimeSlot {
  time: string;
  capacity: number;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const DirectReservationSettings = ({ businessId, language }: DirectReservationSettingsProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ReservationSettings>({
    accepts_direct_reservations: false,
    reservation_capacity_type: 'daily',
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
      title: 'Ρυθμίσεις Κρατήσεων',
      description: 'Διαμορφώστε τον τρόπο που οι πελάτες μπορούν να κάνουν κρατήσεις απευθείας',
      enableReservations: 'Αποδοχή Άμεσων Κρατήσεων',
      enableDescription: 'Επιτρέψτε στους πελάτες να κάνουν κρατήσεις μέσω του προφίλ σας',
      capacityType: 'Τύπος Χωρητικότητας',
      dailyLimit: 'Ημερήσιο Όριο',
      timeSlots: 'Χρονικές Θέσεις',
      dailyLimitValue: 'Μέγιστες Κρατήσεις ανά Ημέρα',
      availableDays: 'Διαθέσιμες Ημέρες',
      monday: 'Δευτέρα',
      tuesday: 'Τρίτη',
      wednesday: 'Τετάρτη',
      thursday: 'Πέμπτη',
      friday: 'Παρασκευή',
      saturday: 'Σάββατο',
      sunday: 'Κυριακή',
      reservationHours: 'Ώρες Κρατήσεων',
      opensAt: 'Από',
      closesAt: 'Έως',
      seatingOptions: 'Επιλογές Θέσεων',
      indoor: 'Εσωτερικός Χώρος',
      outdoor: 'Εξωτερικός Χώρος',
      requiresApproval: 'Απαιτείται Έγκριση',
      requiresApprovalDescription: 'Χειροκίνητη έγκριση κρατήσεων πριν την επιβεβαίωση',
      save: 'Αποθήκευση',
      saving: 'Αποθήκευση...',
      success: 'Οι ρυθμίσεις αποθηκεύτηκαν',
      error: 'Σφάλμα αποθήκευσης',
      timeSlotTime: 'Ώρα',
      timeSlotCapacity: 'Θέσεις',
      addSlot: 'Προσθήκη Θέσης',
      removeSlot: 'Αφαίρεση',
    },
    en: {
      title: 'Reservation Settings',
      description: 'Configure how customers can make reservations directly',
      enableReservations: 'Accept Direct Reservations',
      enableDescription: 'Allow customers to make reservations through your profile',
      capacityType: 'Capacity Type',
      dailyLimit: 'Daily Limit',
      timeSlots: 'Time Slots',
      dailyLimitValue: 'Max Reservations per Day',
      availableDays: 'Available Days',
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
      reservationHours: 'Reservation Hours',
      opensAt: 'From',
      closesAt: 'To',
      seatingOptions: 'Seating Options',
      indoor: 'Indoor',
      outdoor: 'Outdoor',
      requiresApproval: 'Requires Approval',
      requiresApprovalDescription: 'Manually approve reservations before confirmation',
      save: 'Save',
      saving: 'Saving...',
      success: 'Settings saved',
      error: 'Error saving settings',
      timeSlotTime: 'Time',
      timeSlotCapacity: 'Capacity',
      addSlot: 'Add Slot',
      removeSlot: 'Remove',
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
        // Parse time slots from JSONB
        let parsedTimeSlots: TimeSlot[] | null = null;
        if (data.reservation_time_slots && Array.isArray(data.reservation_time_slots)) {
          parsedTimeSlots = data.reservation_time_slots as unknown as TimeSlot[];
        }
        
        setSettings({
          accepts_direct_reservations: data.accepts_direct_reservations ?? false,
          reservation_capacity_type: (data.reservation_capacity_type as 'daily' | 'time_slots') ?? 'daily',
          daily_reservation_limit: data.daily_reservation_limit,
          reservation_time_slots: parsedTimeSlots,
          reservation_days: data.reservation_days ?? [],
          reservation_opens_at: data.reservation_opens_at,
          reservation_closes_at: data.reservation_closes_at,
          reservation_seating_options: data.reservation_seating_options ?? [],
          reservation_requires_approval: data.reservation_requires_approval ?? true,
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
      // Convert time slots to JSON-compatible format
      const timeSlotsJson = settings.reservation_capacity_type === 'time_slots' && settings.reservation_time_slots
        ? JSON.parse(JSON.stringify(settings.reservation_time_slots))
        : null;

      const { error } = await supabase
        .from('businesses')
        .update({
          accepts_direct_reservations: settings.accepts_direct_reservations,
          reservation_capacity_type: settings.reservation_capacity_type,
          daily_reservation_limit: settings.reservation_capacity_type === 'daily' ? settings.daily_reservation_limit : null,
          reservation_time_slots: timeSlotsJson,
          reservation_days: settings.reservation_days,
          reservation_opens_at: settings.reservation_opens_at,
          reservation_closes_at: settings.reservation_closes_at,
          reservation_seating_options: settings.reservation_seating_options,
          reservation_requires_approval: settings.reservation_requires_approval,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t.title}
          </CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enable-reservations">{t.enableReservations}</Label>
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
            <>
              {/* Capacity Type */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t.capacityType}
                </Label>
                <Select
                  value={settings.reservation_capacity_type}
                  onValueChange={(value: 'daily' | 'time_slots') =>
                    setSettings((prev) => ({ ...prev, reservation_capacity_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t.dailyLimit}</SelectItem>
                    <SelectItem value="time_slots">{t.timeSlots}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Daily Limit */}
              {settings.reservation_capacity_type === 'daily' && (
                <div className="space-y-2">
                  <Label htmlFor="daily-limit">{t.dailyLimitValue}</Label>
                  <NumberInput
                    value={settings.daily_reservation_limit ?? 20}
                    onChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        daily_reservation_limit: value,
                      }))
                    }
                    min={1}
                    max={999}
                  />
                </div>
              )}

              {/* Time Slots */}
              {settings.reservation_capacity_type === 'time_slots' && (
                <div className="space-y-3">
                  <Label>{t.timeSlots}</Label>
                  {settings.reservation_time_slots?.map((slot, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        type="time"
                        value={slot.time}
                        onChange={(e) => updateTimeSlot(index, 'time', e.target.value)}
                        className="w-32"
                      />
                      <NumberInput
                        value={slot.capacity}
                        onChange={(value) => updateTimeSlot(index, 'capacity', value)}
                        min={1}
                        max={999}
                        className="w-24"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeTimeSlot(index)}
                      >
                        {t.removeSlot}
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addTimeSlot}>
                    {t.addSlot}
                  </Button>
                </div>
              )}

              {/* Available Days */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t.availableDays}
                </Label>
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
              </div>

              {/* Reservation Hours */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t.reservationHours}
                </Label>
                <div className="flex gap-4 items-center">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t.opensAt}</Label>
                    <Input
                      type="time"
                      value={settings.reservation_opens_at ?? ''}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, reservation_opens_at: e.target.value || null }))
                      }
                      className="w-32"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t.closesAt}</Label>
                    <Input
                      type="time"
                      value={settings.reservation_closes_at ?? ''}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, reservation_closes_at: e.target.value || null }))
                      }
                      className="w-32"
                    />
                  </div>
                </div>
              </div>

              {/* Seating Options */}
              <div className="space-y-3">
                <Label>{t.seatingOptions}</Label>
                <div className="flex gap-4">
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
              </div>

              {/* Requires Approval */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="requires-approval">{t.requiresApproval}</Label>
                  <p className="text-sm text-muted-foreground">{t.requiresApprovalDescription}</p>
                </div>
                <Switch
                  id="requires-approval"
                  checked={settings.reservation_requires_approval}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, reservation_requires_approval: checked }))
                  }
                />
              </div>
            </>
          )}

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.saving}
              </>
            ) : (
              t.save
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
