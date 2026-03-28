import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type EntryType = 'direct' | 'ticket' | 'reservation' | 'hybrid';

interface SeatingTypeOption {
  id: string;
  seating_type: string;
}

interface ManualEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  language: 'el' | 'en';
  entryType: EntryType;
  eventId?: string | null;
  seatingOptions?: string[];
  onSuccess: () => void;
}

export const ManualEntryDialog = ({
  open,
  onOpenChange,
  businessId,
  language,
  entryType,
  eventId,
  seatingOptions,
  onSuccess,
}: ManualEntryDialogProps) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState('1');
  const [preferredTime, setPreferredTime] = useState('');
  const [seatingPreference, setSeatingPreference] = useState('');
  const [notes, setNotes] = useState('');
  const [minAge, setMinAge] = useState('');
  const [minCharge, setMinCharge] = useState('');
  const [seatingTypeId, setSeatingTypeId] = useState('');
  const [saving, setSaving] = useState(false);
  const [eventSeatingTypes, setEventSeatingTypes] = useState<SeatingTypeOption[]>([]);

  const t = {
    el: {
      title: 'Προσθήκη',
      name: 'Όνομα',
      phone: 'Τηλέφωνο',
      partySize: 'Αριθμός ατόμων',
      time: 'Ώρα',
      seating: 'Θέση',
      notes: 'Σημειώσεις',
      save: 'Αποθήκευση',
      cancel: 'Ακύρωση',
      nameRequired: 'Το όνομα είναι υποχρεωτικό',
      saved: 'Προστέθηκε επιτυχώς!',
      error: 'Σφάλμα κατά την αποθήκευση',
      indoor: 'Εσωτερικά',
      outdoor: 'Εξωτερικά',
      minAge: 'Ελάχιστη ηλικία',
      minCharge: 'Ελάχιστη χρέωση (€)',
      seatingType: 'Τύπος θέσης',
    },
    en: {
      title: 'Add',
      name: 'Name',
      phone: 'Phone',
      partySize: 'Party size',
      time: 'Time',
      seating: 'Seating',
      notes: 'Notes',
      save: 'Save',
      cancel: 'Cancel',
      nameRequired: 'Name is required',
      saved: 'Added successfully!',
      error: 'Error saving',
      indoor: 'Indoor',
      outdoor: 'Outdoor',
      minAge: 'Minimum age',
      minCharge: 'Minimum charge (€)',
      seatingType: 'Seating type',
    },
  };

  const txt = t[language];
  const showPartySize = entryType !== 'ticket';
  const showTime = entryType === 'direct';
  const showSeating = entryType === 'direct' || entryType === 'reservation' || entryType === 'hybrid';
  const showSeatingType = (entryType === 'reservation' || entryType === 'hybrid') && eventSeatingTypes.length > 0;
  const showMinAge = entryType !== 'direct';
  const showMinCharge = entryType !== 'ticket';

  // Fetch seating types for the event
  useEffect(() => {
    if (!eventId || entryType === 'direct' || entryType === 'ticket') {
      setEventSeatingTypes([]);
      return;
    }
    supabase
      .from('reservation_seating_types')
      .select('id, seating_type')
      .eq('event_id', eventId)
      .then(({ data }) => {
        setEventSeatingTypes(data || []);
      });
  }, [eventId, entryType]);

  const resetForm = () => {
    setName('');
    setPhone('');
    setPartySize('1');
    setPreferredTime('');
    setSeatingPreference('');
    setNotes('');
    setMinAge('');
    setMinCharge('');
    setSeatingTypeId('');
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error(txt.nameRequired);
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (entryType === 'ticket' && eventId) {
        // For ticket-only events, insert into tickets table
        const { error } = await supabase.from('tickets').insert({
          event_id: eventId,
          guest_name: trimmedName,
          guest_age: minAge ? parseInt(minAge) : null,
          status: 'valid',
          is_manual_entry: true,
          manual_status: null,
          order_id: crypto.randomUUID(),
          tier_id: '',
        } as any);
        if (error) throw error;
      } else {
        // Insert into reservations table
        // DO NOT set user_id for manual entries — it would link to business owner's profile in CRM
        const insertData: Record<string, any> = {
          user_id: user.id,
          reservation_name: trimmedName,
          party_size: parseInt(partySize) || 1,
          status: 'accepted',
          is_manual_entry: true,
          manual_status: null,
          phone_number: phone.trim() || null,
          special_requests: notes.trim() || null,
        };

        // Min age
        if (minAge) {
          insertData.min_age = parseInt(minAge);
        }

        // Min charge in cents
        if (minCharge) {
          insertData.prepaid_min_charge_cents = Math.round(parseFloat(minCharge) * 100);
        }

        // Seating type
        if (seatingTypeId) {
          insertData.seating_type_id = seatingTypeId;
        }

        if (entryType === 'direct') {
          insertData.business_id = businessId;
          if (preferredTime) {
            insertData.preferred_time = new Date(preferredTime).toISOString();
          }
          if (seatingPreference) {
            insertData.seating_preference = seatingPreference;
          }
        } else {
          // Event-based reservation
          insertData.event_id = eventId;
        }

        const { error } = await supabase.from('reservations').insert(insertData as any);
        if (error) throw error;
      }

      toast.success(txt.saved);
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error('Error saving manual entry:', err);
      toast.error(txt.error);
    } finally {
      setSaving(false);
    }
  };

  const seatingTypeTranslations: Record<string, Record<string, string>> = {
    el: { table: 'Τραπέζι', sofa: 'Καναπές', vip: 'VIP', bar: 'Bar' },
    en: { table: 'Table', sofa: 'Sofa', vip: 'VIP', bar: 'Bar' },
  };

  const translateSeatingType = (type: string) => {
    return seatingTypeTranslations[language]?.[type.toLowerCase()] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{txt.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-sm">{txt.name} *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={txt.name}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label className="text-sm">{txt.phone}</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={txt.phone}
              type="tel"
            />
          </div>

          {/* Party size */}
          {showPartySize && (
            <div className="space-y-1.5">
              <Label className="text-sm">{txt.partySize} *</Label>
              <Input
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                type="number"
                min="1"
                max="50"
              />
            </div>
          )}

          {/* Min age */}
          {showMinAge && (
            <div className="space-y-1.5">
              <Label className="text-sm">{txt.minAge}</Label>
              <Input
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
                type="number"
                min="0"
                max="99"
                placeholder="18"
              />
            </div>
          )}

          {/* Min charge */}
          {showMinCharge && (
            <div className="space-y-1.5">
              <Label className="text-sm">{txt.minCharge}</Label>
              <Input
                value={minCharge}
                onChange={(e) => setMinCharge(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          )}

          {/* Seating type (event-based) */}
          {showSeatingType && (
            <div className="space-y-1.5">
              <Label className="text-sm">{txt.seatingType}</Label>
              <Select value={seatingTypeId} onValueChange={setSeatingTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder={txt.seatingType} />
                </SelectTrigger>
                <SelectContent>
                  {eventSeatingTypes.map((st) => (
                    <SelectItem key={st.id} value={st.id}>
                      {translateSeatingType(st.seating_type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Preferred time - direct only */}
          {showTime && (
            <div className="space-y-1.5">
              <Label className="text-sm">{txt.time}</Label>
              <Input
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                type="datetime-local"
              />
            </div>
          )}

          {/* Seating - direct/reservation/hybrid */}
          {showSeating && !showSeatingType && (seatingOptions && seatingOptions.length > 0 ? (
            <div className="space-y-1.5">
              <Label className="text-sm">{txt.seating}</Label>
              <Select value={seatingPreference} onValueChange={setSeatingPreference}>
                <SelectTrigger>
                  <SelectValue placeholder={txt.seating} />
                </SelectTrigger>
                <SelectContent>
                  {seatingOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : entryType === 'direct' ? (
            <div className="space-y-1.5">
              <Label className="text-sm">{txt.seating}</Label>
              <Select value={seatingPreference} onValueChange={setSeatingPreference}>
                <SelectTrigger>
                  <SelectValue placeholder={txt.seating} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indoor">{txt.indoor}</SelectItem>
                  <SelectItem value="outdoor">{txt.outdoor}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null)}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm">{txt.notes}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={txt.notes}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { resetForm(); onOpenChange(false); }}
              disabled={saving}
            >
              {txt.cancel}
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {txt.save}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
