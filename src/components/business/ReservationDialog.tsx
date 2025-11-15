import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Users, Phone, MapPin } from 'lucide-react';
import { format } from 'date-fns';

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
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    reservation_name: '',
    party_size: '',
    seating_preference: 'no_preference',
    preferred_time: new Date(eventStartAt),
    phone_number: '',
    special_requests: '',
  });

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
      setFormData({
        reservation_name: '',
        party_size: '',
        seating_preference: 'no_preference',
        preferred_time: new Date(eventStartAt),
        phone_number: '',
        special_requests: '',
      });
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error(t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reservation_name">{t.name} *</Label>
            <Input
              id="reservation_name"
              value={formData.reservation_name}
              onChange={(e) => setFormData({ ...formData, reservation_name: e.target.value })}
              placeholder={t.namePlaceholder}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="party_size">
              <Users className="inline h-4 w-4 mr-1" />
              {t.partySize} *
            </Label>
            <Input
              id="party_size"
              type="number"
              min="1"
              max="50"
              value={formData.party_size}
              onChange={(e) => setFormData({ ...formData, party_size: e.target.value })}
              placeholder={t.partySizePlaceholder}
              required
            />
          </div>

          {seatingOptions.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="seating_preference">
                <MapPin className="inline h-4 w-4 mr-1" />
                {t.seating}
              </Label>
              <Select
                value={formData.seating_preference}
                onValueChange={(value) => setFormData({ ...formData, seating_preference: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_preference">{t.noPreference}</SelectItem>
                  {seatingOptions.includes('indoor') && (
                    <SelectItem value="indoor">{t.indoor}</SelectItem>
                  )}
                  {seatingOptions.includes('outdoor') && (
                    <SelectItem value="outdoor">{t.outdoor}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>
              <CalendarIcon className="inline h-4 w-4 mr-1" />
              {t.preferredTime}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  {format(formData.preferred_time, 'PPP p')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.preferred_time}
                  onSelect={(date) => date && setFormData({ ...formData, preferred_time: date })}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number">
              <Phone className="inline h-4 w-4 mr-1" />
              {t.phone}
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
              placeholder={t.specialRequestsPlaceholder}
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              {t.cancel}
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {t.submit}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
