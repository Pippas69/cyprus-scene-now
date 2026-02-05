import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Users, Phone, MapPin, User, Clock, Ban } from 'lucide-react';
import { format, isBefore, startOfDay, parse } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { toastTranslations } from '@/translations/toastTranslations';
import { expandSlotsForDay, normalizeTime } from '@/lib/timeSlots';
import { ReservationSuccessDialog } from '@/components/user/ReservationSuccessDialog';
import { useClosedSlots } from '@/hooks/useClosedSlots';
import { useClosedDates } from '@/hooks/useClosedDates';
import { useSlotAvailability } from '@/hooks/useSlotAvailability';

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
  maxPartySize?: number;
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
  const [successDialog, setSuccessDialog] = useState<{
    open: boolean;
    reservation: {
      confirmation_code: string;
      qr_code_token: string;
      reservation_name: string;
      party_size: number;
      preferred_time: string;
      business_name: string;
    } | null;
  }>({ open: false, reservation: null });

  const isMobile = useIsMobile();
  
  // Fetch closed slots for the selected date
  const { closedSlots } = useClosedSlots(businessId, formData.preferred_date);
  
  // Fetch all fully closed dates for the calendar
  const { closedDates } = useClosedDates(businessId);

  // We'll fetch slot availability after we know the available time slots
  // This is initialized here but will be used after getAvailableTimeSlots is called

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
      closedSlot: 'Κλειστό',
      policyTitle: 'Πολιτική Κρατήσεων',
      noShowPolicy: 'Περιθώριο 15 λεπτά. (Ακύρωση αν δεν γίνει check in)',
      cancellationPolicy: 'Μετά από 3 ακυρώσεις, περιορισμός 2 εβδομάδων.',
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
      closedSlot: 'Closed',
      policyTitle: 'Reservation Policy',
      noShowPolicy: '15 min grace. (Cancel if no check-in)',
      cancellationPolicy: 'After 3 cancellations, 2-week restriction.',
      instantConfirmation: 'Instant reservation confirmation',
    },
  };

  const t = text[language];

  const getSlotMaxPartySizeForTime = (timeHHmm: string): number => {
    const fallback = 50;
    const slots = settings?.reservation_time_slots;
    if (!slots?.length) return fallback;

    const selectedDayName = format(formData.preferred_date, 'EEEE').toLowerCase();
    const [h, m] = timeHHmm.split(':').map((x) => parseInt(x, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return fallback;
    const tMin = h * 60 + m;

    const toMin = (hhmm: string) => {
      const [hh, mm] = hhmm.split(':').map((x) => parseInt(x, 10));
      if (Number.isNaN(hh) || Number.isNaN(mm)) return NaN;
      return hh * 60 + mm;
    };

    const match = slots.find((s) => {
      if (!s.days?.includes(selectedDayName)) return false;
      const from = toMin(s.timeFrom || s.time || '00:00');
      const to = toMin(s.timeTo || '00:00');
      if (Number.isNaN(from) || Number.isNaN(to)) return false;

      // Overnight window (e.g. 22:00 -> 02:00)
      if (to <= from) {
        const tAdj = tMin < from ? tMin + 1440 : tMin;
        const toAdj = to + 1440;
        return tAdj >= from && tAdj < toAdj;
      }

      return tMin >= from && tMin < to;
    });

    return Math.max(1, match?.maxPartySize ?? fallback);
  };

  const slotMaxPartySize = getSlotMaxPartySizeForTime(formData.preferred_time);

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
          maxPartySize: slot.maxPartySize ?? 50,
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
    if (!settings) return false;
    if (settings.accepts_direct_reservations === false) return true;
    if (!settings.reservation_days?.length && !settings.reservation_time_slots?.length) return false;
    
    const dayName = format(date, 'EEEE').toLowerCase();
    const isBeforeToday = isBefore(startOfDay(date), startOfDay(new Date()));

    const hasDayEnabled = settings.reservation_days?.length
      ? settings.reservation_days.includes(dayName)
      : true;

    const hasSlotWindowForDay =
      settings.reservation_capacity_type === 'time_slots' && settings.reservation_time_slots?.length
        ? settings.reservation_time_slots.some((slot) => slot.days?.includes(dayName))
        : true;
    
    // Check if this date is fully closed by the business
    const dateStr = format(date, 'yyyy-MM-dd');
    const isFullyClosed = closedDates.has(dateStr);
    
    return isBeforeToday || !hasDayEnabled || !hasSlotWindowForDay || isFullyClosed;
  };
  
  // Custom modifiers for the calendar to show closed/unavailable dates with reduced opacity
  const closedDatesModifiers = {
    closed: (date: Date) => closedDates.has(format(date, 'yyyy-MM-dd')),
    unavailable: (date: Date) => isDateDisabled(date),
  };
  
  const closedDatesModifiersStyles = {
    closed: { opacity: 0.35 },
    unavailable: { opacity: 0.35 },
  };

  const getRawTimeSlots = (): string[] => {
    if (!settings) return [];

    const selectedDayName = format(formData.preferred_date, 'EEEE').toLowerCase();

    // Preferred path: use business-defined arrival windows (timeFrom -> timeTo)
    if (settings.reservation_capacity_type === 'time_slots' && settings.reservation_time_slots) {
      return expandSlotsForDay(settings.reservation_time_slots, selectedDayName, 30);
    }

    // Fallback: Check if the selected day is in reservation_days
    if (settings.reservation_days && !settings.reservation_days.includes(selectedDayName)) {
      return [];
    }

    // Legacy fallback: generate slots from opens/closes
    const slots: string[] = [];
    const opens = normalizeTime(settings.reservation_opens_at);
    const closes = normalizeTime(settings.reservation_closes_at) || '22:00';

    let current = parse(opens, 'HH:mm', new Date());
    const end = parse(closes, 'HH:mm', new Date());

    if (isNaN(current.getTime()) || isNaN(end.getTime())) {
      console.error('Invalid time values:', { opens, closes });
      return [];
    }

    while (current < end) {
      slots.push(format(current, 'HH:mm'));
      current = new Date(current.getTime() + 30 * 60 * 1000);
    }

    return slots;
  };

  const rawTimeSlots = getRawTimeSlots();
  
  // Fetch availability for all raw slots to know which are fully booked
  const { fullyBookedSlots, loading: availabilityLoading } = useSlotAvailability(
    businessId,
    formData.preferred_date,
    rawTimeSlots
  );

  // Filter out fully booked and closed slots from the display
  const getAvailableTimeSlots = (): string[] => {
    return rawTimeSlots.filter(slot => !fullyBookedSlots.has(slot) && !closedSlots.has(slot));
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
      // Always use atomic booking so capacity is reduced for the correct slot window
      // and maxPartySize is enforced.
      const { data: booking, error } = await supabase.rpc('book_slot_atomically', {
        p_business_id: businessId,
        p_user_id: userId,
        p_date: format(formData.preferred_date, 'yyyy-MM-dd'),
        p_slot_time: formData.preferred_time,
        p_party_size: formData.party_size,
        p_reservation_name: formData.reservation_name,
        p_phone_number: formData.phone_number,
        p_seating_preference:
          formData.seating_preference && formData.seating_preference !== 'none' ? formData.seating_preference : null,
        p_special_requests: formData.special_requests || null,
        p_is_offer_based: false,
      });

      if (error) throw error;

      const result = booking as
        | {
            success: boolean;
            error?: string;
            message?: string;
            reservation_id?: string;
            confirmation_code?: string;
            qr_token?: string;
            preferred_time?: string;
            max_party_size?: number;
          }
        | null;

      if (!result?.success) {
        const msg =
          result?.error === 'PARTY_TOO_LARGE'
            ? language === 'el'
              ? `Μέγιστο ${result?.max_party_size ?? ''} άτομα για αυτό το slot.`
              : `Max ${result?.max_party_size ?? ''} people for this slot.`
            : result?.message || toastTranslations[language].error;
        throw new Error(msg);
      }

      // Send notification
      try {
        await supabase.functions.invoke('send-reservation-notification', {
          body: { reservationId: result.reservation_id, type: 'new' },
        });
      } catch (emailError) {
        console.error('Email error:', emailError);
      }

      // Close the form dialog
      onOpenChange(false);
      
      // Always accepted in atomic booking flow
      setSuccessDialog({
        open: true,
        reservation: {
          confirmation_code: result.confirmation_code || '',
          qr_code_token: result.qr_token || '',
          reservation_name: formData.reservation_name,
          party_size: formData.party_size,
          preferred_time: result.preferred_time || preferredDateTime.toISOString(),
          business_name: businessName,
        },
      });
      
      onSuccess();

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
  // Skip closed slots when auto-selecting
  useEffect(() => {
    if (timeSlots.length > 0) {
      const currentSlotClosed = closedSlots.has(formData.preferred_time);
      const currentSlotMissing = !timeSlots.includes(formData.preferred_time);
      
      if (currentSlotClosed || currentSlotMissing) {
        // Find the first open slot
        const firstOpenSlot = timeSlots.find(slot => !closedSlots.has(slot));
        if (firstOpenSlot) {
          setFormData((prev) => ({ ...prev, preferred_time: firstOpenSlot }));
        }
      }
    }
  }, [formData.preferred_date, timeSlots.length, closedSlots]);

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
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">{t.policyTitle}</p>
            <div className="flex flex-col gap-1 text-[10px] sm:text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                <span className="whitespace-nowrap">{t.instantConfirmation}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                <span className="whitespace-nowrap">{t.noShowPolicy}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                <span className="whitespace-nowrap">{t.cancellationPolicy}</span>
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
          <div className="space-y-1.5">
            <Label htmlFor="reservation_name" className="flex items-center gap-2 text-xs sm:text-sm">
              <User className="w-3 h-3 sm:w-4 sm:h-4" />
              {t.reservationName}
            </Label>
            <Input
              id="reservation_name"
              value={formData.reservation_name}
              onChange={(e) => setFormData({ ...formData, reservation_name: e.target.value })}
              placeholder={t.namePlaceholder}
              required
              className="text-xs sm:text-sm h-9 sm:h-10"
            />
          </div>

          {/* Party Size */}
          <div className="space-y-1.5">
            <Label htmlFor="party_size" className="flex items-center gap-2 text-xs sm:text-sm">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              {t.partySize}
            </Label>
            <NumberInput
              value={formData.party_size}
              onChange={(value) => {
                setFormData({
                  ...formData,
                  party_size: Math.min(Math.max(1, value), slotMaxPartySize),
                });
              }}
              min={1}
              max={slotMaxPartySize}
              disabled={availableCapacity === 0}
              className="w-20 sm:w-24 text-xs sm:text-sm h-8 sm:h-10"
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {language === 'el'
                ? `Μέγιστο ${slotMaxPartySize} άτομα ανά κράτηση για αυτό το slot.`
                : `Max ${slotMaxPartySize} people per reservation for this slot.`}
            </p>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-xs sm:text-sm">
              <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              {t.preferredDate}
            </Label>
            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left text-xs sm:text-sm font-normal h-9 sm:h-10">
                  <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
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
                  modifiers={closedDatesModifiers}
                  modifiersStyles={closedDatesModifiersStyles}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-xs sm:text-sm">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              {t.preferredTime}
            </Label>
            {timeSlots.length === 0 ? (
              <div className="p-3 bg-muted rounded-lg text-xs sm:text-sm text-muted-foreground text-center">
                {t.noSlotsForDay}
              </div>
            ) : (
              <Select
                value={closedSlots.has(formData.preferred_time) ? '' : formData.preferred_time}
                onValueChange={(value) => setFormData({ ...formData, preferred_time: value })}
              >
                <SelectTrigger className="text-xs sm:text-sm font-normal h-9 sm:h-10">
                  <SelectValue placeholder={t.selectTime} />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => {
                    const isClosed = closedSlots.has(time);
                    return (
                      <SelectItem 
                        key={time} 
                        value={time} 
                        disabled={isClosed}
                        className={isClosed ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        <div className="flex items-center gap-2">
                          <span className={isClosed ? 'line-through' : ''}>{time}</span>
                          {isClosed && (
                            <span className="flex items-center gap-1 text-destructive text-[10px] sm:text-xs">
                              <Ban className="h-3 w-3" />
                              {t.closedSlot}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone_number" className="flex items-center gap-2 text-xs sm:text-sm">
              <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
              {t.phoneNumber}
            </Label>
            <Input
              id="phone_number"
              type="tel"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              placeholder={t.phonePlaceholder}
              required
              className="text-xs sm:text-sm h-9 sm:h-10"
            />
          </div>

          {/* Seating Preference (Optional) */}
          {settings?.reservation_seating_options && settings.reservation_seating_options.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="seating_preference" className="flex items-center gap-2 text-xs sm:text-sm">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                {t.seatingPreference}
              </Label>
              <Select
                value={formData.seating_preference}
                onValueChange={(value) => setFormData({ ...formData, seating_preference: value })}
              >
                <SelectTrigger id="seating_preference" className="text-xs sm:text-sm font-normal h-9 sm:h-10">
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
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="special_requests" className="text-xs sm:text-sm">{t.specialRequests}</Label>
            <Textarea
              id="special_requests"
              value={formData.special_requests}
              onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
              placeholder={t.requestsPlaceholder}
              rows={3}
              className="text-xs sm:text-sm"
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
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{t.title}</DrawerTitle>
              <DrawerDescription>{t.description}</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-4 max-h-[70vh] overflow-y-auto">{formContent}</div>
          </DrawerContent>
        </Drawer>
        <ReservationSuccessDialog
          open={successDialog.open}
          onOpenChange={(open) => setSuccessDialog({ ...successDialog, open })}
          reservation={successDialog.reservation}
          language={language}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.title}</DialogTitle>
            <DialogDescription>{t.description}</DialogDescription>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
      <ReservationSuccessDialog
        open={successDialog.open}
        onOpenChange={(open) => setSuccessDialog({ ...successDialog, open })}
        reservation={successDialog.reservation}
        language={language}
      />
    </>
  );
};
