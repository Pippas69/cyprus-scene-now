import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Star } from 'lucide-react';
import { getDigitCount } from '@/lib/phoneValidation';
import { NOTES_MAX_WORDS, countWords, limitWords } from '@/lib/wordLimit';

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
  onSuccess: (optimistic?: OptimisticEntry) => void;
}

export type OptimisticEntry =
  | {
      kind: 'ticket';
      row: {
        id: string;
        order_id: string;
        ticket_id: string;
        guest_name: string;
        guest_age: number | null;
        guest_city: string | null;
        buyer_phone: string | null;
        tier_id: string | null;
        tier_name: string;
        tier_price_cents: number;
        subtotal_cents: number;
        ticket_code: string | null;
        staff_memo: string | null;
        staff_memo_highlighted: boolean;
        is_manual_entry: true;
        manual_status: null;
        checked_in: false;
        status: 'completed';
        created_at: string;
        source: 'purchase';
        is_account_user: false;
        account_city: null;
        care_of: string | null;
      };
    }
  | {
      kind: 'reservation';
      row: Record<string, any>;
    };

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
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [partySize, setPartySize] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [seatingPreference, setSeatingPreference] = useState('');
  const [sourceType, setSourceType] = useState<'profile' | 'offer' | 'walk_in' | 'walk_in_offer' | ''>('');
  const [notes, setNotes] = useState('');
  const [notesHighlighted, setNotesHighlighted] = useState(false);
  const [minAge, setMinAge] = useState('');
  const [minCharge, setMinCharge] = useState('');
  const [seatingTypeId, setSeatingTypeId] = useState('');
  const [ticketTierId, setTicketTierId] = useState('');
  const [tableId, setTableId] = useState('');
  const [isWalkIn, setIsWalkIn] = useState(false);
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
      email: 'Email',
      partySize: 'Αριθμός ατόμων',
      date: 'Ημερομηνία',
      time: 'Ώρα',
      seating: 'Θέση',
      notes: 'Σημειώσεις',
      sourceType: 'Τύπος',
      sourceProfile: 'Προφίλ',
      sourceOffer: 'Προσφορά',
      sourceWalkIn: 'Walk-in',
      sourceWalkInOffer: 'Walk-in Προσφοράς',
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
      walkInToggle: 'Walk-in',
      selectOption: 'Επιλέξτε...',
      cityRequired: 'Η πόλη είναι υποχρεωτική',
      ageRequired: 'Η ηλικία είναι υποχρεωτική',
      minAgeRequired: 'Η ελάχιστη ηλικία είναι υποχρεωτική',
      partySizeRequired: 'Ο αριθμός ατόμων είναι υποχρεωτικός',
      minChargeRequired: 'Η ελάχιστη χρέωση είναι υποχρεωτική',
      ticketTypeRequired: 'Ο τύπος εισιτηρίου είναι υποχρεωτικός',
      highlightNote: 'Επισήμανση ως σημαντική',
      highlightedOn: 'Σημαντική',
    },
    en: {
      titleDirect: 'Add reservation',
      titleTicket: 'Add ticket',
      titleReservation: 'Add reservation',
      titleHybrid: 'Add entry',
      name: 'Name',
      phone: 'Phone',
      email: 'Email',
      partySize: 'Party size',
      date: 'Date',
      time: 'Time',
      seating: 'Seating',
      notes: 'Notes',
      sourceType: 'Type',
      sourceProfile: 'Profile',
      sourceOffer: 'Offer',
      sourceWalkIn: 'Walk-in',
      sourceWalkInOffer: 'Walk-in Offer',
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
      walkInToggle: 'Walk-in',
      selectOption: 'Select...',
      cityRequired: 'City is required',
      ageRequired: 'Age is required',
      minAgeRequired: 'Minimum age is required',
      partySizeRequired: 'Party size is required',
      minChargeRequired: 'Minimum charge is required',
      ticketTypeRequired: 'Ticket type is required',
      highlightNote: 'Mark as important',
      highlightedOn: 'Important',
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
    setEmail('');
    setCity('');
    setPartySize('');
    setDate('');
    setTime('');
    setSeatingPreference('');
    setSourceType('');
    setNotes('');
    setNotesHighlighted(false);
    setMinAge('');
    setMinCharge('');
    setSeatingTypeId('');
    setTicketTierId('');
    setTableId('');
    setIsWalkIn(false);
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

    // === New required-field validations per entryType ===
    // Skip for legacy 'direct' flow to preserve zero-regression behavior.
    if (entryType !== 'direct') {
      // City required for ticket / reservation / hybrid
      if (!city.trim()) {
        toast.error(txt.cityRequired);
        return;
      }
      // Age required (ticket = real age, reservation/hybrid = min age of party)
      if (!minAge.trim()) {
        toast.error(entryType === 'ticket' ? txt.ageRequired : txt.minAgeRequired);
        return;
      }
    }

    if (entryType === 'reservation' || entryType === 'hybrid') {
      // Party size required
      if (!partySize.trim()) {
        toast.error(txt.partySizeRequired);
        return;
      }
      // Min charge: required only when walk-in is OFF (both hybrid & reservation hide it on walk-in)
      const minChargeRequired = !isWalkIn;
      if (minChargeRequired && !minCharge.trim()) {
        toast.error(txt.minChargeRequired);
        return;
      }
      // Ticket tier required when walk-in is ON and tiers exist
      if (isWalkIn && ticketTiers.length > 0 && !ticketTierId) {
        toast.error(txt.ticketTypeRequired);
        return;
      }
    }

    // Ticket entry: tier required when tiers are configured for the event
    if (entryType === 'ticket' && ticketTiers.length > 0 && !ticketTierId) {
      toast.error(txt.ticketTypeRequired);
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (entryType === 'ticket' && eventId) {
        // Create ticket_order first (tickets.order_id FK)
        const orderId = crypto.randomUUID();
        const ticketId = crypto.randomUUID();
        const resolvedTierId = ticketTierId || null;

        const selectedTier = resolvedTierId ? ticketTiers.find(t => t.id === resolvedTierId) : null;
        const priceCents = selectedTier?.price_cents ?? 0;
        const customerEmail = email.trim() || user.email || `manual+${orderId}@noemail.local`;

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
          id: ticketId,
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
          staff_memo_highlighted: notesHighlighted && !!notes.trim(),
        } as any);
        if (error) throw error;

        const optimistic: OptimisticEntry = {
          kind: 'ticket',
          row: {
            id: orderId,
            order_id: orderId,
            ticket_id: ticketId,
            guest_name: trimmedName,
            guest_age: minAge ? parseInt(minAge) : null,
            guest_city: city.trim() || null,
            buyer_phone: phone.trim() || null,
            tier_id: resolvedTierId,
            tier_name: selectedTier?.name || '',
            tier_price_cents: selectedTier?.price_cents || 0,
            subtotal_cents: priceCents,
            ticket_code: null,
            staff_memo: notes.trim() || null,
            staff_memo_highlighted: notesHighlighted && !!notes.trim(),
            is_manual_entry: true,
            manual_status: null,
            checked_in: false,
            status: 'completed',
            created_at: new Date().toISOString(),
            source: 'purchase',
            is_account_user: false,
            account_city: null,
          },
        };

        toast.success(txt.saved);
        resetForm();
        onOpenChange(false);
        onSuccess(optimistic);
        return;
      } else {
        const insertData: Record<string, any> = {
          user_id: user.id,
          reservation_name: trimmedName,
          party_size: partySize ? parseInt(partySize) : null,
          status: 'accepted',
          is_manual_entry: true,
          manual_status: null,
          phone_number: phone.trim() || null,
          special_requests: notes.trim() || null,
          staff_memo: notes.trim() || null,
          staff_memo_highlighted: notesHighlighted && !!notes.trim(),
          source: isWalkIn ? 'walk_in' : (sourceType || null),
          email: email.trim() || null,
        };

        if (minAge) insertData.min_age = parseInt(minAge);
        if (isWalkIn && ticketTierId) {
          const selectedWalkInTier = ticketTiers.find((tier) => tier.id === ticketTierId);
          if (selectedWalkInTier) {
            insertData.ticket_credit_cents = selectedWalkInTier.price_cents;
          }
        }
        const shouldSaveMinCharge = !isWalkIn && (entryType === 'hybrid' || entryType === 'reservation' || entryType === 'direct');
        if (shouldSaveMinCharge && minCharge) insertData.prepaid_min_charge_cents = Math.round(parseFloat(minCharge) * 100);
        if (!isWalkIn && seatingTypeId) insertData.seating_type_id = seatingTypeId;
        if (city.trim() && entryType !== 'direct') {
          insertData.guest_city = city.trim();
        }

        if (entryType === 'direct') {
          insertData.business_id = businessId;
          if (date.trim()) {
            const dateStr = date.trim();
            const timeStr = time.trim() || '00:00';
            const parsed = new Date(`${dateStr}T${timeStr}`);
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
          .select('id, business_id, user_id, reservation_name, party_size, status, created_at, phone_number, preferred_time, seating_preference, special_requests, business_notes, staff_memo, confirmation_code, qr_code_token, transaction_code, checked_in_at, auto_created_from_tickets, ticket_credit_cents, actual_spend_cents, seating_type_id, prepaid_min_charge_cents, event_id, is_manual_entry, manual_status, min_age, source, cancellation_reason, email, guest_ages, guest_city')
          .single();
        if (error) throw error;

        if (tableId && reservationData?.id) {
          await supabase.from('reservation_table_assignments').insert({
            reservation_id: reservationData.id,
            table_id: tableId,
          } as any);
        }

        toast.success(txt.saved);
        resetForm();
        onOpenChange(false);
        onSuccess({ kind: 'reservation', row: { ...reservationData, profiles: null, offer_purchase: null } });
        return;
      }
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
          {/* 1. Name (required) */}
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

          {/* 2. Phone (required) */}
          <div className={fieldClass}>
            <Label className={labelClass}>{txt.phone} *</Label>
            <PhoneInput
              value={phone}
              onChange={setPhone}
              language={language}
              selectClassName={inputClass}
              inputClassName={inputClass}
            />
          </div>

          {/* === TICKET: City === */}
          {entryType === 'ticket' && (
            <div className={fieldClass}>
              <Label className={labelClass}>{language === 'el' ? 'Πόλη' : 'City'} *</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder={language === 'el' ? 'Επιλέξτε πόλη...' : 'Select city...'} />
                </SelectTrigger>
                <SelectContent>
                  {CYPRUS_CITIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 3. Date (direct mode) */}
          {entryType === 'direct' && (
            <div className={fieldClass}>
              <Label className={labelClass}>{txt.date}</Label>
              <Input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                type="date"
                className={inputClass}
              />
            </div>
          )}

          {/* 4. Time (direct mode) */}
          {entryType === 'direct' && (
            <div className={fieldClass}>
              <Label className={labelClass}>{txt.time}</Label>
              <Input
                value={time}
                onChange={(e) => setTime(e.target.value)}
                type="time"
                className={inputClass}
              />
            </div>
          )}

          {/* 5. Party size (not ticket) */}
          {entryType !== 'ticket' && (
            <div className={fieldClass}>
              <Label className={labelClass}>
                {txt.partySize}
                {(entryType === 'reservation' || entryType === 'hybrid') && ' *'}
              </Label>
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

          {/* 6. Source type (direct mode) */}
          {entryType === 'direct' && (
            <div className={fieldClass}>
              <Label className={labelClass}>{txt.sourceType}</Label>
              <Select value={sourceType} onValueChange={(v) => setSourceType(v as any)}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder={txt.selectOption} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profile">{txt.sourceProfile}</SelectItem>
                  <SelectItem value="offer">{txt.sourceOffer}</SelectItem>
                  <SelectItem value="walk_in">{txt.sourceWalkIn}</SelectItem>
                  <SelectItem value="walk_in_offer">{txt.sourceWalkInOffer}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 7. Email (direct mode) */}
          {entryType === 'direct' && (
            <div className={fieldClass}>
              <Label className={labelClass}>{txt.email}</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={txt.email}
                type="email"
                className={inputClass}
              />
            </div>
          )}

          {/* === TICKET: Min age === */}
          {(entryType === 'ticket' || entryType === 'reservation' || entryType === 'hybrid') && (
            <div className={fieldClass}>
              <Label className={labelClass}>{entryType === 'ticket' ? txt.age : txt.minAge} *</Label>
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

          {/* === RESERVATION/HYBRID: City === */}
          {(entryType === 'reservation' || entryType === 'hybrid') && (
            <div className={fieldClass}>
              <Label className={labelClass}>{language === 'el' ? 'Πόλη' : 'City'} *</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder={language === 'el' ? 'Επιλέξτε πόλη...' : 'Select city...'} />
                </SelectTrigger>
                <SelectContent>
                  {CYPRUS_CITIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* === RESERVATION/HYBRID: Walk-in toggle === */}
          {(entryType === 'reservation' || entryType === 'hybrid') && (
            <div className="flex items-center justify-between py-1">
              <Label className={labelClass}>{txt.walkInToggle}</Label>
              <Switch checked={isWalkIn} onCheckedChange={setIsWalkIn} />
            </div>
          )}

          {/* === TICKET / Walk-in hybrid/reservation: Ticket tier selector === */}
          {((entryType === 'ticket') || (isWalkIn && (entryType === 'hybrid' || entryType === 'reservation') && ticketTiers.length > 0)) && ticketTiers.length > 0 && (
            <div className={fieldClass}>
              <Label className={labelClass}>{txt.ticketType} *</Label>
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

          {/* === HYBRID: Min charge (hidden when walk-in is ON) === */}
          {entryType === 'hybrid' && !isWalkIn && (
            <div className={fieldClass}>
              <Label className={labelClass}>{txt.minCharge} *</Label>
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

          {/* === RESERVATION: Min charge (hidden when walk-in is ON) === */}
          {entryType === 'reservation' && !isWalkIn && (
            <div className={fieldClass}>
              <Label className={labelClass}>{txt.minCharge} *</Label>
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
          {(entryType === 'reservation' || entryType === 'hybrid') && !isWalkIn && eventSeatingTypes.length > 0 && (
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

          {/* 8. Seating preference (direct mode) */}
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
          {(entryType === 'reservation' || entryType === 'hybrid') && !isWalkIn && tables.length > 0 && (
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

          {/* === RESERVATION/HYBRID: Email === */}
          {(entryType === 'reservation' || entryType === 'hybrid') && (
            <div className={fieldClass}>
              <Label className={labelClass}>{txt.email}</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={txt.email}
                type="email"
                className={inputClass}
              />
            </div>
          )}

          {/* Notes - all types */}
          <div className={fieldClass}>
            <div className="flex items-center justify-between gap-2">
              <Label className={labelClass}>{txt.notes}</Label>
              <button
                type="button"
                onClick={() => setNotesHighlighted((v) => !v)}
                className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                  notesHighlighted
                    ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-300'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
                aria-pressed={notesHighlighted}
              >
                <Star className={`h-3 w-3 ${notesHighlighted ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                <span>{notesHighlighted ? txt.highlightedOn : txt.highlightNote}</span>
              </button>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(limitWords(e.target.value, NOTES_MAX_WORDS))}
              placeholder={txt.notes}
              rows={3}
              className="resize-none text-xs sm:text-sm"
            />
            <div className="text-[10px] text-muted-foreground text-right">
              {countWords(notes)}/{NOTES_MAX_WORDS} {language === 'el' ? 'λέξεις' : 'words'}
            </div>
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
