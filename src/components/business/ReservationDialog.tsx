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
    preferred_time: eventStartAt,
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
      console.error('Error fetching capacity:', error);
    } finally {
      setCapacityLoading(false);
    }
  };

  const text = {
    el: {
      title: 'Κάντε Κράτηση',
      description: `Κάντε κράτηση για ${eventTitle}`,
      name: 'Όνομα Κράτησης',
      namePlaceholder: 'π.χ. Γιάννης Παπαδόπουλος',
      partySize: 'Αριθμός Ατόμων',
      partySizePlaceholder: 'π.χ. 4',
      seating: 'Προτίμηση Καθίσματος',
      indoor: 'Εσωτερικός Χώρος',
      outdoor: 'Εξωτερικός Χώρος',
      noPreference: 'Χωρίς Προτίμηση',
      preferredTime: 'Προτιμώμενη Ώρα',
      phone: 'Τηλέφωνο',
      phonePlaceholder: 'π.χ. 6912345678',
      specialRequests: 'Ειδικές Απαιτήσεις',
      specialRequestsPlaceholder: 'π.χ. Τραπέζι δίπλα στο παράθυρο, αλλεργίες...',
      submit: 'Υποβολή Κράτησης',
      cancel: 'Ακύρωση',
      success: 'Η κράτηση υποβλήθηκε επιτυχώς!',
      error: 'Σφάλμα κατά την υποβολή της κράτησης',
      selectDate: 'Επιλέξτε ημερομηνία',
    },
    en: {
      title: 'Make a Reservation',
      description: `Make a reservation for ${eventTitle}`,
      name: 'Reservation Name',
      namePlaceholder: 'e.g. John Smith',
      partySize: 'Party Size',
      partySizePlaceholder: 'e.g. 4',
      seating: 'Seating Preference',
      indoor: 'Indoor',
      outdoor: 'Outdoor',
      noPreference: 'No Preference',
      preferredTime: 'Preferred Time',
      phone: 'Phone Number',
      phonePlaceholder: 'e.g. 6912345678',
      specialRequests: 'Special Requests',
      specialRequestsPlaceholder: 'e.g. Window table, allergies...',
      submit: 'Submit Reservation',
      cancel: 'Cancel',
      success: 'Reservation submitted successfully!',
      error: 'Error submitting reservation',
      selectDate: 'Pick a date',
    },
  };

  const t = text[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('reservations').insert({
        event_id: eventId,
        user_id: userId,
        reservation_name: formData.reservation_name,
        party_size: parseInt(formData.party_size),
        seating_preference: formData.seating_preference,
        preferred_time: formData.preferred_time.toISOString(),
        phone_number: formData.phone_number || null,
        special_requests: formData.special_requests || null,
        status: 'pending',
      });

      if (error) throw error;

      toast.success(t.success);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error(t.error);
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          <Users className="inline h-4 w-4 mr-1" />
          {t.name}
        </Label>
        <Input
          id="name"
          value={formData.reservation_name}
          onChange={(e) => setFormData({ ...formData, reservation_name: e.target.value })}
          placeholder={t.namePlaceholder}
          required
          className="h-11"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="party-size">
            <Users className="inline h-4 w-4 mr-1" />
            {t.partySize}
          </Label>
          <Input
            id="party-size"
            type="number"
            min="1"
            value={formData.party_size}
            onChange={(e) => setFormData({ ...formData, party_size: e.target.value })}
            placeholder={t.partySizePlaceholder}
            required
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="seating">
            <MapPin className="inline h-4 w-4 mr-1" />
            {t.seating}
          </Label>
          <Select
            value={formData.seating_preference}
            onValueChange={(value) => setFormData({ ...formData, seating_preference: value })}
          >
            <SelectTrigger id="seating" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no_preference">{t.noPreference}</SelectItem>
              {seatingOptions.includes('indoor') && <SelectItem value="indoor">{t.indoor}</SelectItem>}
              {seatingOptions.includes('outdoor') && <SelectItem value="outdoor">{t.outdoor}</SelectItem>}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>
          <CalendarIcon className="inline h-4 w-4 mr-1" />
          {t.preferredTime}
        </Label>
        {isMobile ? (
          <Drawer open={calendarOpen} onOpenChange={setCalendarOpen}>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 justify-start text-left font-normal"
              onClick={() => setCalendarOpen(true)}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.preferred_time ? format(formData.preferred_time, 'PPP') : <span>{t.selectDate}</span>}
            </Button>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>{t.preferredTime}</DrawerTitle>
                <DrawerDescription>{t.selectDate}</DrawerDescription>
              </DrawerHeader>
              <div className="p-4">
                <Calendar
                  mode="single"
                  selected={formData.preferred_time}
                  onSelect={(date) => {
                    if (date) {
                      setFormData({ ...formData, preferred_time: date });
                      setCalendarOpen(false);
                    }
                  }}
                  initialFocus
                  className="rounded-md border"
                />
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.preferred_time ? format(formData.preferred_time, 'PPP') : <span>{t.selectDate}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.preferred_time}
                onSelect={(date) => date && setFormData({ ...formData, preferred_time: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">
          <Phone className="inline h-4 w-4 mr-1" />
          {t.phone}
        </Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone_number}
          onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
          placeholder={t.phonePlaceholder}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="special-requests">{t.specialRequests}</Label>
        <Textarea
          id="special-requests"
          value={formData.special_requests}
          onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
          placeholder={t.specialRequestsPlaceholder}
          rows={3}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-11">
          {t.cancel}
        </Button>
        <Button type="submit" disabled={loading} className="flex-1 h-11">
          {t.submit}
        </Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{t.title}</DrawerTitle>
            <DrawerDescription>{t.description}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
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
