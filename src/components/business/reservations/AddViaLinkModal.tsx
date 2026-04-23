import { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, Link as LinkIcon, Copy, Ticket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEventSupportsWalkIn } from '@/hooks/useEventSupportsWalkIn';
import { translateSeatingType } from '@/lib/seatingTranslations';

export type AddViaLinkEventType =
  | 'ticket' // only-ticket
  | 'reservation' // only-reservation
  | 'ticket_and_reservation'
  | 'ticket_reservation';

interface AddViaLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  eventId: string | null;
  eventType: AddViaLinkEventType | string | null;
  language: 'el' | 'en';
  onCreated?: () => void;
}

interface SeatingOption {
  id: string;
  seating_type: string;
}

const t = {
  el: {
    title: 'Προσθήκη μέσω Link',
    desc: 'Συμπληρώστε τα στοιχεία και θα σταλεί SMS με σύνδεσμο πληρωμής (ισχύει 48 ώρες).',
    name: 'Όνομα πελάτη',
    namePh: 'π.χ. Γιώργος Παπαδόπουλος',
    phone: 'Τηλέφωνο (E.164)',
    phonePh: '+35799123456',
    careOf: 'Care of (υπάλληλος)',
    careOfPh: 'π.χ. Μαρία (προαιρετικό)',
    notes: 'Σημείωση (προαιρετικό)',
    notesPh: 'Π.χ. γενέθλια, αλλεργία...',
    walkInToggle: 'Αποστολή ως Walk-in εισιτήριο',
    walkInHint: 'Ο πελάτης θα λάβει SMS για αγορά walk-in εισιτηρίου αντί για κράτηση τραπεζιού.',
    tickets: 'Αριθμός εισιτηρίων',
    party: 'Άτομα',
    seating: 'Τύπος καθίσματος',
    seatingPh: 'Επιλέξτε τύπο καθίσματος',
    noSeating: 'Δεν υπάρχουν διαθέσιμοι τύποι καθίσματος για αυτή την εκδήλωση.',
    cancel: 'Ακύρωση',
    submit: 'Αποστολή SMS',
    sending: 'Αποστολή...',
    success: 'Το SMS στάλθηκε!',
    successDesc: 'Σύνδεσμος ενεργός για 48 ώρες.',
    copy: 'Αντιγραφή link',
    copied: 'Αντιγράφηκε',
    close: 'Κλείσιμο',
    bookingLink: 'Σύνδεσμος κράτησης',
    requiredName: 'Όνομα υποχρεωτικό',
    requiredPhone: 'Έγκυρο τηλέφωνο E.164 υποχρεωτικό',
    requiredParty: 'Άτομα υποχρεωτικά (≥1)',
    requiredTickets: 'Εισιτήρια υποχρεωτικά (≥1)',
    requiredSeating: 'Τύπος καθίσματος υποχρεωτικός',
  },
  en: {
    title: 'Add via Link',
    desc: 'Fill in the details and an SMS with a payment link will be sent (valid for 48 hours).',
    name: 'Customer name',
    namePh: 'e.g. George Papadopoulos',
    phone: 'Phone (E.164)',
    phonePh: '+35799123456',
    careOf: 'Care of (staff)',
    careOfPh: 'e.g. Maria (optional)',
    notes: 'Note (optional)',
    notesPh: 'e.g. birthday, allergy...',
    walkInToggle: 'Send as Walk-in ticket',
    walkInHint: 'Customer will receive an SMS to purchase a walk-in ticket instead of a table reservation.',
    tickets: 'Number of tickets',
    party: 'Party size',
    seating: 'Seating type',
    seatingPh: 'Select a seating type',
    noSeating: 'No seating types available for this event.',
    cancel: 'Cancel',
    submit: 'Send SMS',
    sending: 'Sending...',
    success: 'SMS sent!',
    successDesc: 'Link active for 48 hours.',
    copy: 'Copy link',
    copied: 'Copied',
    close: 'Close',
    bookingLink: 'Booking link',
    requiredName: 'Name required',
    requiredPhone: 'Valid E.164 phone required',
    requiredParty: 'Party size required (≥1)',
    requiredTickets: 'Tickets required (≥1)',
    requiredSeating: 'Seating type required',
  },
};

const E164_RE = /^\+[1-9]\d{7,14}$/;

export const AddViaLinkModal = ({
  open,
  onOpenChange,
  businessId,
  eventId,
  eventType,
  language,
  onCreated,
}: AddViaLinkModalProps) => {
  const tr = t[language];
  const { supports: supportsWalkIn } = useEventSupportsWalkIn(eventId);

  // Detect kind of event (auto — no user choice)
  const isOnlyTicket = eventType === 'ticket';
  const isOnlyReservation = eventType === 'reservation';
  const isHybrid = eventType === 'ticket_and_reservation' || eventType === 'ticket_reservation';
  const isReservationContext = isOnlyReservation || isHybrid || (!eventId && !isOnlyTicket);

  // Walk-in toggle (only available on reservation/hybrid events that support it)
  const canShowWalkInToggle = (isOnlyReservation || isHybrid) && supportsWalkIn;
  const [walkInMode, setWalkInMode] = useState(false);

  // Effective flow:
  //  - only-ticket → ticket
  //  - reservation/hybrid + walk-in toggle ON → walk_in
  //  - reservation/hybrid + walk-in toggle OFF → reservation
  const effectiveFlow: 'ticket' | 'reservation' | 'walk_in' = useMemo(() => {
    if (isOnlyTicket) return 'ticket';
    if (canShowWalkInToggle && walkInMode) return 'walk_in';
    return 'reservation';
  }, [isOnlyTicket, canShowWalkInToggle, walkInMode]);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [careOf, setCareOf] = useState('');
  const [notes, setNotes] = useState('');
  const [partySize, setPartySize] = useState<number>(2);
  const [ticketCount, setTicketCount] = useState<number>(1);
  const [seatingTypeId, setSeatingTypeId] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  // Load seating types for reservation/hybrid events
  const [seatingOptions, setSeatingOptions] = useState<SeatingOption[]>([]);
  const [loadingSeating, setLoadingSeating] = useState(false);

  useEffect(() => {
    if (!open || !eventId || !isReservationContext) {
      setSeatingOptions([]);
      return;
    }
    let cancelled = false;
    const loadSeating = async () => {
      setLoadingSeating(true);
      try {
        const { data, error } = await supabase
          .from('reservation_seating_types')
          .select('id, seating_type, paused')
          .eq('event_id', eventId);
        if (error) throw error;
        if (cancelled) return;
        const opts = (data || [])
          .filter((s: any) => !s.paused)
          .map((s: any) => ({ id: s.id, seating_type: s.seating_type }));
        setSeatingOptions(opts);
      } catch (e) {
        console.error('Error loading seating types:', e);
        if (!cancelled) setSeatingOptions([]);
      } finally {
        if (!cancelled) setLoadingSeating(false);
      }
    };
    loadSeating();
    return () => { cancelled = true; };
  }, [open, eventId, isReservationContext]);

  // Reset when opened
  useEffect(() => {
    if (!open) return;
    setWalkInMode(false);
    setName('');
    setPhone('');
    setCareOf('');
    setNotes('');
    setPartySize(2);
    setTicketCount(1);
    setSeatingTypeId('');
    setCreatedLink(null);
  }, [open]);

  // When toggling walk-in, we clear seating selection (not relevant)
  useEffect(() => {
    if (walkInMode) setSeatingTypeId('');
  }, [walkInMode]);

  // Show seating dropdown only in reservation flow (not ticket-only and not walk-in)
  const showSeatingField = effectiveFlow === 'reservation';
  // Show party size only in reservation flow
  const showPartyField = effectiveFlow === 'reservation';
  // Show ticket count in ticket OR walk_in flows
  const showTicketField = effectiveFlow === 'ticket' || effectiveFlow === 'walk_in';

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      toast.error(tr.requiredName);
      return;
    }
    if (!E164_RE.test(phone.trim())) {
      toast.error(tr.requiredPhone);
      return;
    }
    if (effectiveFlow === 'reservation') {
      if (!partySize || partySize < 1) {
        toast.error(tr.requiredParty);
        return;
      }
      if (!seatingTypeId) {
        toast.error(tr.requiredSeating);
        return;
      }
    }
    if ((effectiveFlow === 'ticket' || effectiveFlow === 'walk_in') && (!ticketCount || ticketCount < 1)) {
      toast.error(tr.requiredTickets);
      return;
    }

    setSubmitting(true);
    try {
      const partyForBackend = effectiveFlow === 'reservation' ? partySize : ticketCount;

      // Resolve seating_preference label from selected seating type (for reservation flow)
      let seatingPreferenceLabel: string | null = null;
      if (effectiveFlow === 'reservation' && seatingTypeId) {
        const opt = seatingOptions.find((s) => s.id === seatingTypeId);
        seatingPreferenceLabel = opt?.seating_type ?? null;
      }

      const { data, error } = await supabase.functions.invoke('create-pending-booking', {
        body: {
          business_id: businessId,
          event_id: eventId ?? null,
          booking_type: effectiveFlow,
          customer_phone: phone.trim(),
          customer_name: name.trim(),
          party_size: partyForBackend,
          seating_preference: seatingPreferenceLabel,
          seating_type_id: effectiveFlow === 'reservation' ? seatingTypeId || null : null,
          notes: notes.trim() || null,
        },
      });

      if (error) {
        console.error('create-pending-booking error', error);
        toast.error(error.message ?? 'Error');
        return;
      }

      const result = data as { success?: boolean; booking_url?: string; error?: string; reason?: string };
      if (!result?.success) {
        toast.error(result?.error ?? result?.reason ?? 'Error');
        return;
      }

      // Persist care_of separately (column exists on pending_bookings)
      if (careOf.trim()) {
        const { data: pb } = await supabase
          .from('pending_bookings')
          .select('id')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (pb && pb[0]) {
          await supabase
            .from('pending_bookings')
            .update({ care_of: careOf.trim() } as any)
            .eq('id', pb[0].id);
        }
      }

      toast.success(tr.success, { description: tr.successDesc });
      setCreatedLink(result.booking_url ?? null);
      onCreated?.();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!createdLink) return;
    navigator.clipboard.writeText(createdLink);
    toast.success(tr.copied);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            {tr.title}
          </DialogTitle>
          <DialogDescription>{tr.desc}</DialogDescription>
        </DialogHeader>

        {createdLink ? (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border/50 bg-muted/40 p-3 space-y-2">
              <Label className="text-xs text-muted-foreground">{tr.bookingLink}</Label>
              <p className="font-mono text-xs break-all">{createdLink}</p>
            </div>
            <Button onClick={handleCopy} variant="outline" className="w-full gap-2">
              <Copy className="h-4 w-4" /> {tr.copy}
            </Button>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>{tr.close}</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
            {/* Walk-in toggle (only when event supports it) */}
            {canShowWalkInToggle && (
              <div className="flex items-start justify-between gap-3 rounded-md border border-border/50 px-3 py-2.5 bg-muted/30">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="walkin-toggle" className="flex items-center gap-1.5 cursor-pointer">
                    <Ticket className="h-4 w-4 text-primary" />
                    {tr.walkInToggle}
                  </Label>
                  <p className="text-xs text-muted-foreground leading-snug">{tr.walkInHint}</p>
                </div>
                <Switch
                  id="walkin-toggle"
                  checked={walkInMode}
                  onCheckedChange={setWalkInMode}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="cust-name">{tr.name}</Label>
              <Input id="cust-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={tr.namePh} maxLength={200} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cust-phone">{tr.phone}</Label>
              <Input id="cust-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={tr.phonePh} />
            </div>

            {showPartyField && (
              <div className="space-y-2">
                <Label htmlFor="party">{tr.party}</Label>
                <Input
                  id="party"
                  type="number"
                  min={1}
                  max={50}
                  value={partySize}
                  onChange={(e) => setPartySize(Math.max(1, parseInt(e.target.value || '1', 10)))}
                />
              </div>
            )}

            {showSeatingField && (
              <div className="space-y-2">
                <Label htmlFor="seating">{tr.seating}</Label>
                {loadingSeating ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> ...
                  </div>
                ) : seatingOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground rounded-md border border-border/50 bg-muted/30 px-3 py-2">
                    {tr.noSeating}
                  </p>
                ) : (
                  <Select value={seatingTypeId} onValueChange={setSeatingTypeId}>
                    <SelectTrigger id="seating">
                      <SelectValue placeholder={tr.seatingPh} />
                    </SelectTrigger>
                    <SelectContent>
                      {seatingOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {translateSeatingType(opt.seating_type, language)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {showTicketField && (
              <div className="space-y-2">
                <Label htmlFor="tickets">{tr.tickets}</Label>
                <Input
                  id="tickets"
                  type="number"
                  min={1}
                  max={50}
                  value={ticketCount}
                  onChange={(e) => setTicketCount(Math.max(1, parseInt(e.target.value || '1', 10)))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="careof">{tr.careOf}</Label>
              <Input id="careof" value={careOf} onChange={(e) => setCareOf(e.target.value)} placeholder={tr.careOfPh} maxLength={100} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{tr.notes}</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={tr.notesPh} maxLength={500} rows={2} />
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                {tr.cancel}
              </Button>
              <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? tr.sending : tr.submit}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
