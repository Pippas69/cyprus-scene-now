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
import { CalendarIcon, Users, Phone, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { toastTranslations, formatToastMessage } from '@/translations/toastTranslations';
import { validationTranslations } from '@/translations/validationTranslations';
import { reservationSchema } from '@/lib/reservationValidation';

interface ReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  eventStartAt: string;
  seatingOptions: string[];
  language: 'el' | 'en';
  userId: string;
  onSuccess: () => void;
}

export const ReservationDialog = ({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  eventStartAt,
  seatingOptions,
  language,
  userId,
  onSuccess,
}: ReservationDialogProps) => {
  const [formData, setFormData] = useState({
    reservation_name: '',
    party_size: 2,
    seating_preference: '',
    preferred_time: new Date(eventStartAt),
    phone_number: '',
    special_requests: ''
  });
  const [loading, setLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [availableCapacity, setAvailableCapacity] = useState<number | null>(null);
  const [capacityLoading, setCapacityLoading] = useState(false);

  const isMobile = useIsMobile();

  useEffect(() => {
    if (open && eventId) {
      fetchAvailableCapacity();
    }
  }, [open, eventId]);

  const fetchAvailableCapacity = async () => {
    setCapacityLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_available_capacity', { p_event_id: eventId });
      if (error) throw error;
      setAvailableCapacity(data);
    } catch (error) {
      // Silent fail - capacity check is not critical
    } finally {
      setCapacityLoading(false);
    }
  };

  const text = {
    el: {
      title: 'Νέα Κράτηση',
      description: `Κάντε κράτηση για ${eventTitle}`,
      reservationName: 'Όνομα Κράτησης',
      namePlaceholder: 'π.χ. Γιάννης Παπαδόπουλος',
      partySize: 'Αριθμός Ατόμων',
      seatingPreference: 'Προτίμηση Θέσης',
      preferredTime: 'Προτιμώμενη Ώρα',
      phoneNumber: 'Τηλέφωνο',
      phonePlaceholder: 'π.χ. +30 123 456 7890',
      specialRequests: 'Ειδικές Απαιτήσεις',
      requestsPlaceholder: 'Οποιεσδήποτε ειδικές απαιτήσεις...',
      submit: 'Υποβολή',
      submitting: 'Υποβολή...',
      success: 'Επιτυχία',
      error: 'Σφάλμα',
      reservationCreated: 'Η κράτηση δημιουργήθηκε επιτυχώς!',
      noPreference: 'Χωρίς Προτίμηση',
      indoor: 'Εσωτερικός Χώρος',
      outdoor: 'Εξωτερικός Χώρος',
    },
    en: {
      title: 'New Reservation',
      description: `Make a reservation for ${eventTitle}`,
      reservationName: 'Reservation Name',
      namePlaceholder: 'e.g. John Doe',
      partySize: 'Party Size',
      seatingPreference: 'Seating Preference',
      preferredTime: 'Preferred Time',
      phoneNumber: 'Phone Number',
      phonePlaceholder: 'e.g. +30 123 456 7890',
      specialRequests: 'Special Requests',
      requestsPlaceholder: 'Any special requirements...',
      submit: 'Submit',
      submitting: 'Submitting...',
      success: 'Success',
      error: 'Error',
      reservationCreated: 'Reservation created successfully!',
      noPreference: 'No Preference',
      indoor: 'Indoor',
      outdoor: 'Outdoor',
    },
  };

  const t = text[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate with Zod schema
    try {
      reservationSchema.parse(formData);
    } catch (error: any) {
      if (error.issues && error.issues[0]) {
        toast.error(error.issues[0].message);
      } else {
        toast.error(validationTranslations[language].required);
      }
      return;
    }
    
    // Additional capacity check
    if (availableCapacity !== null && formData.party_size > availableCapacity) {
      toast.error(formatToastMessage(toastTranslations[language].capacityExceeded, { available: availableCapacity }));
      return;
    }

    setLoading(true);
    try {
      const { data: reservation, error } = await supabase.from('reservations').insert({
        event_id: eventId,
        user_id: userId,
        reservation_name: formData.reservation_name,
        party_size: formData.party_size,
        seating_preference: formData.seating_preference || null,
        preferred_time: formData.preferred_time.toISOString(),
        phone_number: formData.phone_number || null,
        special_requests: formData.special_requests || null,
      }).select().single();

      if (error) throw error;

      try {
        await supabase.functions.invoke('send-reservation-notification', {
          body: { reservationId: reservation.id, type: 'new' }
        });
      } catch (emailError) {
        console.error('Email error:', emailError);
      }

      toast.success(toastTranslations[language].reservationCreated);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Reservation error:', error);
      
      // Handle specific error types
      if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('RLS')) {
        toast.error(language === 'el' 
          ? 'Δεν έχετε δικαίωμα να κάνετε κράτηση. Παρακαλώ συνδεθείτε ξανά.' 
          : 'You don\'t have permission to make a reservation. Please log in again.');
      } else if (error.code === '23503' || error.message?.includes('foreign key')) {
        toast.error(language === 'el' 
          ? 'Η εκδήλωση δεν είναι διαθέσιμη για κράτηση.' 
          : 'This event is not available for reservations.');
      } else if (error.message?.includes('capacity')) {
        const match = error.message.match(/Available slots: (\d+)/);
        const available = match ? match[1] : '0';
        toast.error(formatToastMessage(toastTranslations[language].capacityExceeded, { available }));
        fetchAvailableCapacity();
      } else if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
        toast.error(language === 'el' 
          ? 'Η συνεδρία σας έληξε. Παρακαλώ συνδεθείτε ξανά.' 
          : 'Your session has expired. Please log in again.');
      } else {
        toast.error(language === 'el' 
          ? `Σφάλμα κράτησης: ${error.message}` 
          : `Reservation error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {capacityLoading ? (
        <div className="text-sm text-muted-foreground">
          {language === 'el' ? 'Έλεγχος διαθεσιμότητας...' : 'Checking availability...'}
        </div>
      ) : availableCapacity !== null && (
        <div className={`p-3 rounded-lg ${
          availableCapacity === 0 
            ? 'bg-destructive/10 text-destructive' 
            : availableCapacity < 10 
            ? 'bg-warning/10 text-warning' 
            : 'bg-success/10 text-success'
        }`}>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="font-medium">
              {availableCapacity === 0 
                ? (language === 'el' ? 'Πλήρως Κατειλημμένο' : 'Fully Booked')
                : language === 'el'
                ? `${availableCapacity} Διαθέσιμες Θέσεις`
                : `${availableCapacity} Available Slots`
              }
            </span>
          </div>
        </div>
      )}

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

      <div className="space-y-2">
        <Label htmlFor="party_size" className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          {t.partySize}
        </Label>
        <Input
          id="party_size"
          type="number"
          min="1"
          max={availableCapacity !== null ? availableCapacity : undefined}
          value={formData.party_size}
          onChange={(e) => setFormData({ ...formData, party_size: parseInt(e.target.value) || 1 })}
          required
          disabled={availableCapacity === 0}
        />
        {availableCapacity !== null && availableCapacity < formData.party_size && (
          <p className="text-sm text-destructive">
            {language === 'el'
              ? `Μέγιστος αριθμός ατόμων: ${availableCapacity}`
              : `Maximum party size: ${availableCapacity}`
            }
          </p>
        )}
      </div>

      {seatingOptions && seatingOptions.length > 0 && (
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
              <SelectItem value="">{t.noPreference}</SelectItem>
              {seatingOptions.includes('indoor') && <SelectItem value="indoor">{t.indoor}</SelectItem>}
              {seatingOptions.includes('outdoor') && <SelectItem value="outdoor">{t.outdoor}</SelectItem>}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="preferred_time" className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4" />
          {t.preferredTime}
        </Label>
        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(formData.preferred_time, 'PPP p')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={formData.preferred_time}
              onSelect={(date) => {
                if (date) {
                  setFormData({ ...formData, preferred_time: date });
                  setShowCalendar(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

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
        />
      </div>

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

      <Button 
        type="submit" 
        className="w-full" 
        disabled={loading || availableCapacity === 0 || (availableCapacity !== null && formData.party_size > availableCapacity)}
      >
        {loading ? t.submitting : availableCapacity === 0 ? (language === 'el' ? 'Πλήρως Κατειλημμένο' : 'Fully Booked') : t.submit}
      </Button>
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
          <div className="px-4 pb-4">
            {formContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
};
