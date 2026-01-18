import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Users, Phone, MapPin, User, Clock } from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, parse } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { toastTranslations } from '@/translations/toastTranslations';

interface DirectReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  businessName: string;
  language: 'el' | 'en';
  userId: string;
  onSuccess: () => void;
}

interface TimeSlot {
  id?: string;
  timeFrom: string;
  timeTo: string;
  capacity: number;
  days: string[];
  // Legacy support
  time?: string;
}

interface BusinessSettings {
  reservation_capacity_type: 'daily' | 'time_slots';
  daily_reservation_limit: number | null;
  reservation_time_slots: TimeSlot[] | null;
  reservation_days: string[];
  reservation_opens_at: string | null;
  reservation_closes_at: string | null;
  reservation_seating_options: string[];
  reservation_requires_approval: boolean;
  accepts_direct_reservations: boolean;
}

export const DirectReservationDialog = ({
  open,
  onOpenChange,
  businessId,
  businessName,
  language,
  userId,
  onSuccess,
}: DirectReservationDialogProps) => {
  const [formData, setFormData] = useState({
    reservation_name: '',
    party_size: 2,
    seating_preference: 'none',
    preferred_date: new Date(),
    preferred_time: '19:00',
    phone_number: '',
    special_requests: '',
  });
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [availableCapacity, setAvailableCapacity] = useState<number | null>(null);

  const isMobile = useIsMobile();

  const text = {
    el: {
      title: 'Κράτηση Τραπεζιού',
      description: `Κάντε κράτηση στο ${businessName}`,
      reservationName: 'Όνομα Κράτησης',
      namePlaceholder: 'π.χ. Γιάννης Παπαδόπουλος',
      partySize: 'Αριθμός Ατόμων',
      seatingPreference: 'Προτίμηση Θέσης (Προαιρετικό)',
      preferredDate: 'Ημερομηνία',
      preferredTime: 'Ώρα Άφιξης',
      phoneNumber: 'Τηλέφωνο',
      phonePlaceholder: 'π.χ. +30 123 456 7890',
      specialRequests: 'Ειδικές Απαιτήσεις (Προαιρετικό)',
      requestsPlaceholder: 'Οποιεσδήποτε ειδικές απαιτήσεις...',
      submit: 'Επιβεβαίωση Κράτησης',
      submitting: 'Υποβολή...',
      reservationCreated: 'Η κράτηση επιβεβαιώθηκε!',
      reservationPending: 'Η κράτηση υποβλήθηκε και αναμένει έγκριση',
      noPreference: 'Χωρίς Προτίμηση',
      indoor: 'Εσωτερικός Χώρος',
      outdoor: 'Εξωτερικός Χώρος',
      closedDay: 'Η επιχείρηση είναι κλειστή αυτή την ημέρα',
      availableSlots: 'Διαθέσιμες θέσεις',
      fullyBooked: 'Πλήρως κατειλημμένο',
      selectTime: 'Επιλέξτε ώρα',
      noSlotsForDay: 'Δεν υπάρχουν διαθέσιμα slots για αυτή την ημέρα',
      policyTitle: 'Πολιτική Κρατήσεων',
      noShowPolicy: '15 λεπτά περιθώριο - αυτόματη ακύρωση αν δεν γίνει check-in',
      cancellationPolicy: 'Δωρεάν ακύρωση μέχρι 1 ώρα πριν την κράτηση',
      instantConfirmation: 'Άμεση επιβεβαίωση κράτησης',
    },
    en: {
      title: 'Reserve a Table',
      description: `Make a reservation at ${businessName}`,
      reservationName: 'Reservation Name',
      namePlaceholder: 'e.g. John Doe',
      partySize: 'Party Size',
      seatingPreference: 'Seating Preference (Optional)',
      preferredDate: 'Date',
      preferredTime: 'Arrival Time',
      phoneNumber: 'Phone Number',
      phonePlaceholder: 'e.g. +30 123 456 7890',
      specialRequests: 'Special Requests (Optional)',
      requestsPlaceholder: 'Any special requirements...',
      submit: 'Confirm Reservation',
      submitting: 'Submitting...',
      reservationCreated: 'Reservation confirmed!',
      reservationPending: 'Reservation submitted and awaiting approval',
      noPreference: 'No Preference',
      indoor: 'Indoor',
      outdoor: 'Outdoor',
      closedDay: 'Business is closed on this day',
      availableSlots: 'Available slots',
      fullyBooked: 'Fully booked',
      selectTime: 'Select time',
      noSlotsForDay: 'No available slots for this day',
      policyTitle: 'Reservation Policy',
      noShowPolicy: '15 min grace period - auto-cancelled if no check-in',
      cancellationPolicy: 'Free cancellation up to 1 hour before',
      instantConfirmation: 'Instant reservation confirmation',
    },
  };

  const t = text[language];

  useEffect(() => {
    if (open && businessId) {
      fetchSettings();
    }
  }, [open, businessId]);

  useEffect(() => {
    if (settings && formData.preferred_date) {
      fetchCapacity();
    }
  }, [settings, formData.preferred_date]);

  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select(`
          reservation_capacity_type,
          daily_reservation_limit,
          reservation_time_slots,
          reservation_days,
          reservation_opens_at,
          reservation_closes_at,
          reservation_seating_options,
          reservation_requires_approval,
          accepts_direct_reservations
        `)
        .eq('id', businessId)
        .single();

      if (error) throw error;
      
      // Parse time slots from JSON
      let parsedTimeSlots: TimeSlot[] | null = null;
      if (data.reservation_time_slots && Array.isArray(data.reservation_time_slots)) {
        parsedTimeSlots = (data.reservation_time_slots as unknown as TimeSlot[]).map((slot) => ({
          id: slot.id,
          timeFrom: slot.timeFrom || slot.time || '12:00',
          timeTo: slot.timeTo || '14:00',
          capacity: slot.capacity || 10,
          days: slot.days || [],
          time: slot.time,
        }));
      }
      
      setSettings({
        ...data,
        reservation_time_slots: parsedTimeSlots,
      } as BusinessSettings);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchCapacity = async () => {
    try {
      const { data, error } = await supabase.rpc('get_business_available_capacity', {
        p_business_id: businessId,
        p_date: format(formData.preferred_date, 'yyyy-MM-dd'),
      });

      if (error) throw error;

      // Parse the JSONB response
      const capacityData = data as { available?: boolean; capacity_type?: string; remaining_capacity?: number } | null;
      
      if (capacityData?.available && capacityData?.capacity_type === 'daily') {
        setAvailableCapacity(capacityData.remaining_capacity ?? null);
      } else {
        setAvailableCapacity(null);
      }
    } catch (error) {
      console.error('Error fetching capacity:', error);
    }
  };

  const isDateDisabled = (date: Date) => {
    if (!settings?.reservation_days?.length) return false;
    
    const dayName = format(date, 'EEEE').toLowerCase();
    const isBeforeToday = isBefore(startOfDay(date), startOfDay(new Date()));
    
    return isBeforeToday || !settings.reservation_days.includes(dayName);
  };

  // Helper to normalize time string (handles both "HH:mm" and "HH:mm:ss" formats)
  const normalizeTime = (time: string | null): string => {
    if (!time) return '12:00';
    return time.substring(0, 5);
  };

  const getAvailableTimeSlots = (): string[] => {
    if (!settings) return [];

    // Get the selected day name in English (lowercase)
    const selectedDayName = format(formData.preferred_date, 'EEEE').toLowerCase();

    if (settings.reservation_capacity_type === 'time_slots' && settings.reservation_time_slots) {
      // Filter slots by the selected day and extract timeFrom
      const slotsForDay = settings.reservation_time_slots
        .filter((slot) => slot.days && slot.days.includes(selectedDayName))
        .map((slot) => normalizeTime(slot.timeFrom));
      
      // Sort and deduplicate
      return [...new Set(slotsForDay)].sort();
    }

    // Fallback: Check if the selected day is in reservation_days
    if (settings.reservation_days && !settings.reservation_days.includes(selectedDayName)) {
      return []; // No slots for this day
    }

    // Generate time slots based on opens/closes (legacy fallback)
    const slots: string[] = [];
    const opens = normalizeTime(settings.reservation_opens_at);
    const closes = normalizeTime(settings.reservation_closes_at) || '22:00';

    let current = parse(opens, 'HH:mm', new Date());
    const end = parse(closes, 'HH:mm', new Date());

    // Safety check for invalid dates
    if (isNaN(current.getTime()) || isNaN(end.getTime())) {
      console.error('Invalid time values:', { opens, closes });
      return [];
    }

    while (isBefore(current, end) || format(current, 'HH:mm') === format(end, 'HH:mm')) {
      slots.push(format(current, 'HH:mm'));
      current = new Date(current.getTime() + 30 * 60 * 1000);
    }

    return slots;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.reservation_name.trim()) {
      toast.error(language === 'el' ? 'Παρακαλώ εισάγετε όνομα' : 'Please enter a name');
      return;
    }

    if (!formData.phone_number.trim()) {
      toast.error(language === 'el' ? 'Παρακαλώ εισάγετε τηλέφωνο' : 'Please enter a phone number');
      return;
    }

    // Combine date and time
    const preferredDateTime = new Date(formData.preferred_date);
    const [hours, minutes] = formData.preferred_time.split(':').map(Number);
    preferredDateTime.setHours(hours, minutes, 0, 0);

    setLoading(true);
    try {
      const status = settings?.reservation_requires_approval ? 'pending' : 'accepted';

      const { data: reservation, error } = await supabase
        .from('reservations')
        .insert({
          business_id: businessId,
          user_id: userId,
          reservation_name: formData.reservation_name,
          party_size: formData.party_size,
          seating_preference: formData.seating_preference && formData.seating_preference !== 'none' ? formData.seating_preference : null,
          preferred_time: preferredDateTime.toISOString(),
          phone_number: formData.phone_number,
          special_requests: formData.special_requests || null,
          status,
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification
      try {
        await supabase.functions.invoke('send-reservation-notification', {
          body: { reservationId: reservation.id, type: 'new' },
        });
      } catch (emailError) {
        console.error('Email error:', emailError);
      }

      toast.success(
        status === 'pending' ? t.reservationPending : t.reservationCreated
      );
      onSuccess();
      onOpenChange(false);

      // Reset form
      setFormData({
        reservation_name: '',
        party_size: 2,
        seating_preference: 'none',
        preferred_date: new Date(),
        preferred_time: settings?.reservation_opens_at?.substring(0, 5) || '19:00',
        phone_number: '',
        special_requests: '',
      });
    } catch (error: any) {
      console.error('Reservation error:', error);
      toast.error(error.message || toastTranslations[language].error);
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = getAvailableTimeSlots();

  // Set default time when date changes and slots are available
  useEffect(() => {
    if (timeSlots.length > 0 && !timeSlots.includes(formData.preferred_time)) {
      setFormData((prev) => ({ ...prev, preferred_time: timeSlots[0] }));
    }
  }, [formData.preferred_date, timeSlots.length]);

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {settingsLoading ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          {language === 'el' ? 'Φόρτωση...' : 'Loading...'}
        </div>
      ) : (
        <>
          {/* Policy Info */}
          <div className="bg-muted/50 border rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t.policyTitle}</p>
            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span>{t.instantConfirmation}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>{t.noShowPolicy}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <span>{t.cancellationPolicy}</span>
              </div>
            </div>
          </div>

          {/* Capacity indicator */}
          {availableCapacity !== null && (
            <div
              className={`p-3 rounded-lg ${
                availableCapacity === 0
                  ? 'bg-destructive/10 text-destructive'
                  : availableCapacity < 5
                  ? 'bg-warning/10 text-warning'
                  : 'bg-success/10 text-success'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="font-medium">
                  {availableCapacity === 0
                    ? t.fullyBooked
                    : `${availableCapacity} ${t.availableSlots}`}
                </span>
              </div>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="reservation_name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t.reservationName}
            </Label>
            <Input
              id="reservation_name"
              value={formData.reservation_name}
              onChange={(e) => setFormData({ ...formData, reservation_name: e.target.value })}
              placeholder={t.namePlaceholder}
              required
            />
          </div>

          {/* Party Size */}
          <div className="space-y-2">
            <Label htmlFor="party_size" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t.partySize}
            </Label>
            <Input
              id="party_size"
              type="number"
              min="1"
              max="50"
              value={formData.party_size}
              onChange={(e) => setFormData({ ...formData, party_size: parseInt(e.target.value) || 1 })}
              required
              disabled={availableCapacity === 0}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {t.preferredDate}
            </Label>
            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.preferred_date, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.preferred_date}
                  onSelect={(date) => {
                    if (date) {
                      setFormData({ ...formData, preferred_date: date });
                      setShowCalendar(false);
                    }
                  }}
                  disabled={isDateDisabled}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {t.preferredTime}
            </Label>
            {timeSlots.length === 0 ? (
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground text-center">
                {t.noSlotsForDay}
              </div>
            ) : (
              <Select
                value={formData.preferred_time}
                onValueChange={(value) => setFormData({ ...formData, preferred_time: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.selectTime} />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone_number" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {t.phoneNumber}
            </Label>
            <Input
              id="phone_number"
              type="tel"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              placeholder={t.phonePlaceholder}
              required
            />
          </div>

          {/* Seating Preference (Optional) */}
          {settings?.reservation_seating_options && settings.reservation_seating_options.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="seating_preference" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {t.seatingPreference}
              </Label>
              <Select
                value={formData.seating_preference}
                onValueChange={(value) => setFormData({ ...formData, seating_preference: value })}
              >
                <SelectTrigger id="seating_preference">
                  <SelectValue placeholder={t.noPreference} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.noPreference}</SelectItem>
                  {settings.reservation_seating_options.includes('indoor') && (
                    <SelectItem value="indoor">{t.indoor}</SelectItem>
                  )}
                  {settings.reservation_seating_options.includes('outdoor') && (
                    <SelectItem value="outdoor">{t.outdoor}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Special Requests (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="special_requests">{t.specialRequests}</Label>
            <Textarea
              id="special_requests"
              value={formData.special_requests}
              onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
              placeholder={t.requestsPlaceholder}
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || availableCapacity === 0 || timeSlots.length === 0}>
            {loading ? t.submitting : (availableCapacity === 0 || timeSlots.length === 0) ? t.fullyBooked : t.submit}
          </Button>
        </>
      )}
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t.title}</DrawerTitle>
            <DrawerDescription>{t.description}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 max-h-[70vh] overflow-y-auto">{formContent}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
};
