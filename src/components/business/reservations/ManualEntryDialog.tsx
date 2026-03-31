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
import { getDigitCount } from '@/lib/phoneValidation';

const CYPRUS_CITIES = ['Λευκωσία', 'Λεμεσός', 'Λάρνακα', 'Πάφος', 'Παραλίμνι', 'Αγία Νάπα', 'Αμμόχωστος'];

type EntryType = 'direct' | 'ticket' | 'reservation' | 'hybrid';

interface SeatingTypeOption {
  id: string;
  seating_type: string;
}

interface TicketTierOption {
  id: string;
  name: string;
  price_cents: number;
}

interface TableOption {
  id: string;
  label: string;
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
  const [city, setCity] = useState('');
  const [partySize, setPartySize] = useState('1');
  const [dateTime, setDateTime] = useState('');
  const [seatingPreference, setSeatingPreference] = useState('');
  const [notes, setNotes] = useState('');
  const [minAge, setMinAge] = useState('');
  const [minCharge, setMinCharge] = useState('');
  const [seatingTypeId, setSeatingTypeId] = useState('');
  const [ticketTierId, setTicketTierId] = useState('');
  const [tableId, setTableId] = useState('');
  const [saving, setSaving] = useState(false);
  const [eventSeatingTypes, setEventSeatingTypes] = useState<SeatingTypeOption[]>([]);
  const [ticketTiers, setTicketTiers] = useState<TicketTierOption[]>([]);
  const [tables, setTables] = useState<TableOption[]>([]);

  const t = {
    el: {
      titleDirect: 'Προσθήκη κράτησης',
      titleTicket: 'Προσθήκη εισιτηρίου',
      titleReservation: 'Προσθήκη κράτησης',
      titleHybrid: 'Προσθήκη',
      name: 'Όνομα',
      phone: 'Τηλέφωνο',
      partySize: 'Αριθμός ατόμων',
      dateTime: 'Ημερομηνία & ώρα',
      seating: 'Θέση',
      notes: 'Σημειώσεις',
      save: 'Αποθήκευση',
      cancel: 'Ακύρωση',
      nameRequired: 'Το όνομα είναι υποχρεωτικό',
      phoneRequired: 'Το τηλέφωνο είναι υποχρεωτικό',
      saved: 'Προστέθηκε επιτυχώς!',
      error: 'Σφάλμα κατά την αποθήκευση',
      indoor: 'Εσωτερικά',
      outdoor: 'Εξωτερικά',
      minAge: 'Ελάχιστη ηλικία',
      age: 'Ηλικία',
      minCharge: 'Ελάχιστη χρέωση (€)',
      seatingType: 'Τύπος θέσης',
      ticketPrice: 'Τιμή εισιτηρίου (€)',
      ticketType: 'Τύπος εισιτηρίου',
      table: 'Τραπέζι',
      selectOption: 'Επιλέξτε...',
    },
    en: {
      titleDirect: 'Add reservation',
      titleTicket: 'Add ticket',
      titleReservation: 'Add reservation',
      titleHybrid: 'Add entry',
      name: 'Name',
      phone: 'Phone',
      partySize: 'Party size',
      dateTime: 'Date & time',
      seating: 'Seating',
      notes: 'Notes',
      save: 'Save',
      cancel: 'Cancel',
      nameRequired: 'Name is required',
      phoneRequired: 'Phone is required',
      saved: 'Added successfully!',
      error: 'Error saving',
      indoor: 'Indoor',
      outdoor: 'Outdoor',
      minAge: 'Minimum age',
      age: 'Age',
      minCharge: 'Minimum charge (€)',
      seatingType: 'Seating type',
      ticketPrice: 'Ticket price (€)',
      ticketType: 'Ticket type',
      table: 'Table',
      selectOption: 'Select...',
    },
  };

  const txt = t[language];

  const getTitle = () => {
    switch (entryType) {
      case 'direct': return txt.titleDirect;
      case 'ticket': return txt.titleTicket;
      case 'reservation': return txt.titleReservation;
      case 'hybrid': return txt.titleHybrid;
    }
  };

  // Fetch seating types for event
  useEffect(() => {
    if (!eventId || entryType === 'direct' || entryType === 'ticket') {
      setEventSeatingTypes([]);
      return;
    }
    supabase
      .from('reservation_seating_types')
      .select('id, seating_type')
      .eq('event_id', eventId)
      .then(({ data }) => setEventSeatingTypes(data || []));
  }, [eventId, entryType]);

  // Fetch ticket tiers for ticket events
  useEffect(() => {
    if (!eventId || (entryType !== 'ticket' && entryType !== 'hybrid')) {
      setTicketTiers([]);
      return;
    }
    supabase
      .from('ticket_tiers')
      .select('id, name, price_cents')
      .eq('event_id', eventId)
      .eq('active', true)
      .order('sort_order')
      .then(({ data }) => setTicketTiers(data || []));
  }, [eventId, entryType]);

  // No auto-select — tier is optional for manual entries

  // Fetch floor plan tables for business
  useEffect(() => {
    if (entryType === 'ticket' || entryType === 'direct') {
      setTables([]);
      return;
    }
    supabase
      .from('floor_plan_tables')
      .select('id, label')
      .eq('business_id', businessId)
      .order('sort_order')
      .then(({ data }) => setTables((data || []).filter(t => t.label)));
  }, [businessId, entryType]);

  const resetForm = () => {
    setName('');
    setPhone('');
    setCity('');
    setPartySize('1');
    setDateTime('');
    setSeatingPreference('');
    setNotes('');
    setMinAge('');
    setMinCharge('');
    setSeatingTypeId('');
    setTicketTierId('');
    setTableId('');
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error(txt.nameRequired);
      return;
    }
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      toast.error(txt.phoneRequired);
      return;
    }
    if (getDigitCount(trimmedPhone) < 8) {
      toast.error(language === 'el' ? 'Το τηλέφωνο πρέπει να έχει τουλάχιστον 8 ψηφία' : 'Phone must be at least 8 digits');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (entryType === 'ticket' && eventId) {
        // Create ticket_order first (tickets.order_id FK)
        const orderId = crypto.randomUUID();
        const resolvedTierId = ticketTierId || null;

        const selectedTier = resolvedTierId ? ticketTiers.find(t => t.id === resolvedTierId) : null;
        const priceCents = selectedTier?.price_cents ?? 0;
        const customerEmail = user.email || `manual+${orderId}@noemail.local`;

        const { error: orderError } = await supabase.from('ticket_orders').insert({
          id: orderId,
          business_id: businessId,
          event_id: eventId,
          user_id: user.id,
          customer_name: trimmedName,
          customer_email: customerEmail,
          customer_phone: phone.trim() || null,
          status: 'completed',
          subtotal_cents: priceCents,
          total_cents: priceCents,
        } as any);
        if (orderError) throw orderError;

        const { error } = await supabase.from('tickets').insert({
          event_id: eventId,
          user_id: user.id,
          guest_name: trimmedName,
          guest_age: minAge ? parseInt(minAge) : null,
          guest_city: city.trim() || null,
          status: 'valid',
          is_manual_entry: true,
          manual_status: null,
          order_id: orderId,
          tier_id: resolvedTierId,
          staff_memo: notes.trim() || null,
        } as any);
        if (error) throw error;
      } else {
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

        if (minAge) insertData.min_age = parseInt(minAge);
        if (minCharge) insertData.prepaid_min_charge_cents = Math.round(parseFloat(minCharge) * 100);
        if (seatingTypeId) insertData.seating_type_id = seatingTypeId;

        if (entryType === 'direct') {
          insertData.business_id = businessId;
          if (dateTime && dateTime.trim()) {
            const parsed = new Date(dateTime);
            if (!isNaN(parsed.getTime())) {
              insertData.preferred_time = parsed.toISOString();
            }
          }
          if (seatingPreference) {
            insertData.seating_preference = seatingPreference;
          }
        } else {
          insertData.event_id = eventId;
        }

        const { data: reservationData, error } = await supabase
          .from('reservations')
          .insert(insertData as any)
          .select('id')
          .single();
        if (error) throw error;

        // Assign table if selected
        if (tableId && reservationData?.id) {
          await supabase.from('reservation_table_assignments').insert({
            reservation_id: reservationData.id,
            table_id: tableId,
          } as any);
        }
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

  const fieldClass = "space-y-1";
  const labelClass = "text-[11px] sm:text-xs text-muted-foreground";
  const inputClass = "h-8 sm:h-9 text-xs sm:text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-sm sm:text-base">{getTitle()}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 -mr-1">
          {/* Name */}
          <div className={fieldClass}>
            <Label className={labelClass}>{txt.name} *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={txt.name}
              autoFocus
              className={inputClass}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
          </div>

          {/* Phone */}
          <div className={fieldClass}>
            <Label className={labelClass}>{txt.phone} *</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={txt.phone}
              type="tel"
              className={inputClass}
            />
          </div>

          {/* === TICKET: City === */}
          {entryType === 'ticket' && (
            <div className={fieldClass}>
              <Label className={labelClass}>{language === 'el' ? 'Πόλη' : 'City'}</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={language === 'el' ? 'Πόλη' : 'City'}
                className={inputClass}
              />
            </div>
          )}

          {/* === DIRECT: Date & Time === */}
          {entryType === 'direct' && (
            <div className={fieldClass}>
              <Label className={labelClass}>{txt.dateTime}</Label>
              <Input
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                type="datetime-local"
                className={inputClass}
              />
            </div>
          )}

          {/* === Party size: direct, reservation, hybrid === */}
          {entryType !== 'ticket' && (
            <div className={fieldClass}>
              <Label className={labelClass}>{txt.partySize}</Label>
              <Input
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                type="number"
                min="1"
                max="50"
                className={inputClass}
              />
            </div>
          )}

          {/* === TICKET: Min age === */}
          {(entryType === 'ticket' || entryType === 'reservation' || entryType === 'hybrid') && (
            <div className={fieldClass}>
              <Label className={labelClass}>{entryType === 'ticket' ? txt.age : txt.minAge}</Label>
              <Input
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                type="number"
                min="0"
                max="99"
                placeholder="18"
                className={inputClass}
              />
            </div>
          )}

          {/* === TICKET: Ticket tier selector === */}
          {entryType === 'ticket' && ticketTiers.length > 0 && (
            <div className={fieldClass}>
              <Label className={labelClass}>{txt.ticketType}</Label>
              <Select value={ticketTierId} onValueChange={setTicketTierId}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder={txt.selectOption} />
                </SelectTrigger>
                <SelectContent>
                  {ticketTiers.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>
                      {tier.name} — €{(tier.price_cents / 100).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
...
          {/* === RESERVATION/HYBRID: Min charge === */}
          {(entryType === 'reservation' || entryType === 'hybrid') && (
            <div className={fieldClass}>
              <Label className={labelClass}>{txt.minCharge}</Label>
              <Input
                value={minCharge}
                onChange={(e) => setMinCharge(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className={inputClass}
              />
            </div>
          )}

          {/* === RESERVATION/HYBRID: Seating type === */}
          {(entryType === 'reservation' || entryType === 'hybrid') && eventSeatingTypes.length > 0 && (
            <div className={fieldClass}>
              <Label className={labelClass}>{txt.seatingType}</Label>
              <Select value={seatingTypeId} onValueChange={setSeatingTypeId}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder={txt.selectOption} />
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

          {/* === DIRECT: Seating preference === */}
          {entryType === 'direct' && (
            <div className={fieldClass}>
              <Label className={labelClass}>{txt.seating}</Label>
              {seatingOptions && seatingOptions.length > 0 ? (
                <Select value={seatingPreference} onValueChange={setSeatingPreference}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder={txt.selectOption} />
                  </SelectTrigger>
                  <SelectContent>
                    {seatingOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={seatingPreference} onValueChange={setSeatingPreference}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder={txt.selectOption} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indoor">{txt.indoor}</SelectItem>
                    <SelectItem value="outdoor">{txt.outdoor}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* === RESERVATION/HYBRID: Table === */}
          {(entryType === 'reservation' || entryType === 'hybrid') && tables.length > 0 && (
            <div className={fieldClass}>
              <Label className={labelClass}>{txt.table}</Label>
              <Select value={tableId} onValueChange={setTableId}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder={txt.selectOption} />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((tbl) => (
                    <SelectItem key={tbl.id} value={tbl.id}>
                      {tbl.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes - all types */}
          <div className={fieldClass}>
            <Label className={labelClass}>{txt.notes}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={txt.notes}
              rows={2}
              className="resize-none text-xs sm:text-sm"
            />
          </div>
        </div>

        {/* Actions - sticky bottom */}
        <div className="flex gap-2 pt-3 border-t border-border mt-2">
          <Button
            variant="outline"
            className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
            onClick={() => { resetForm(); onOpenChange(false); }}
            disabled={saving}
          >
            {txt.cancel}
          </Button>
          <Button
            className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {txt.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
