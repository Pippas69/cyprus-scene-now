import { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Send, Link as LinkIcon, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEventSupportsWalkIn } from '@/hooks/useEventSupportsWalkIn';

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

type FlowChoice = 'ticket' | 'reservation' | 'walk_in';

const t = {
  el: {
    title: 'Προσθήκη μέσω Link',
    desc: 'Συμπληρώστε τα στοιχεία και θα σταλεί SMS με σύνδεσμο πληρωμής (ισχύει 48 ώρες).',
    name: 'Όνομα πελάτη',
    namePh: 'π.χ. Γιώργος Παπαδόπουλος',
    phone: 'Τηλέφωνο (E.164)',
    phonePh: '+35799123456',
    careOf: 'Care of (υπάλληλος)',
    careOfPh: 'π.χ. Μαρία',
    notes: 'Σημείωση (προαιρετικό)',
    notesPh: 'Π.χ. γενέθλια, αλλεργία...',
    choose: 'Τύπος προσθήκης',
    ticketChoice: 'Εισιτήριο',
    reservationChoice: 'Κράτηση τραπεζιού',
    walkInChoice: 'Walk-in (στην είσοδο)',
    tickets: 'Αριθμός εισιτηρίων',
    party: 'Άτομα',
    seating: 'Τύπος καθίσματος (προαιρετικό)',
    seatingPh: 'Table / Sofa / VIP / Bar',
    preferred: 'Προτιμώμενη ώρα (προαιρετικό)',
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
  },
  en: {
    title: 'Add via Link',
    desc: 'Fill in the details and an SMS with a payment link will be sent (valid for 48 hours).',
    name: 'Customer name',
    namePh: 'e.g. George Papadopoulos',
    phone: 'Phone (E.164)',
    phonePh: '+35799123456',
    careOf: 'Care of (staff)',
    careOfPh: 'e.g. Maria',
    notes: 'Note (optional)',
    notesPh: 'e.g. birthday, allergy...',
    choose: 'Type',
    ticketChoice: 'Ticket',
    reservationChoice: 'Table reservation',
    walkInChoice: 'Walk-in (at door)',
    tickets: 'Number of tickets',
    party: 'Party size',
    seating: 'Seating preference (optional)',
    seatingPh: 'Table / Sofa / VIP / Bar',
    preferred: 'Preferred time (optional)',
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

  // Detect kind of event
  const isOnlyTicket = eventType === 'ticket';
  const isOnlyReservation = eventType === 'reservation';
  const isHybrid = eventType === 'ticket_and_reservation' || eventType === 'ticket_reservation';

  // Available choices per event type
  const choices = useMemo<FlowChoice[]>(() => {
    if (isOnlyTicket) return ['ticket'];
    if (isOnlyReservation) {
      return supportsWalkIn ? ['reservation', 'walk_in'] : ['reservation'];
    }
    if (isHybrid) {
      return supportsWalkIn ? ['ticket', 'reservation', 'walk_in'] : ['ticket', 'reservation'];
    }
    // direct (no event) → only reservation
    return ['reservation'];
  }, [isOnlyTicket, isOnlyReservation, isHybrid, supportsWalkIn]);

  const [flow, setFlow] = useState<FlowChoice>(choices[0]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [careOf, setCareOf] = useState('');
  const [notes, setNotes] = useState('');
  const [partySize, setPartySize] = useState<number>(2);
  const [ticketCount, setTicketCount] = useState<number>(1);
  const [seating, setSeating] = useState('');
  const [preferred, setPreferred] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  // Reset when opened / choices change
  useEffect(() => {
    if (!open) return;
    setFlow(choices[0]);
    setName('');
    setPhone('');
    setCareOf('');
    setNotes('');
    setPartySize(2);
    setTicketCount(1);
    setSeating('');
    setPreferred('');
    setCreatedLink(null);
  }, [open, choices]);

  const handleSubmit = async () => {
    // validation
    if (!name.trim()) {
      toast.error(tr.requiredName);
      return;
    }
    if (!E164_RE.test(phone.trim())) {
      toast.error(tr.requiredPhone);
      return;
    }
    if (flow === 'reservation' && (!partySize || partySize < 1)) {
      toast.error(tr.requiredParty);
      return;
    }
    if ((flow === 'ticket' || flow === 'walk_in') && (!ticketCount || ticketCount < 1)) {
      toast.error(tr.requiredTickets);
      return;
    }

    setSubmitting(true);
    try {
      const bookingType = flow; // matches enum values reservation|ticket|walk_in
      const partyForTicket = flow === 'reservation' ? partySize : ticketCount;

      const { data, error } = await supabase.functions.invoke('create-pending-booking', {
        body: {
          business_id: businessId,
          event_id: eventId ?? null,
          booking_type: bookingType,
          customer_phone: phone.trim(),
          customer_name: name.trim(),
          party_size: partyForTicket,
          seating_preference: seating.trim() || null,
          preferred_time: preferred.trim() || null,
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
            {choices.length > 1 && (
              <div className="space-y-2">
                <Label>{tr.choose}</Label>
                <RadioGroup value={flow} onValueChange={(v) => setFlow(v as FlowChoice)} className="grid gap-2">
                  {choices.map((c) => (
                    <label
                      key={c}
                      htmlFor={`flow-${c}`}
                      className="flex items-center gap-2 rounded-md border border-border/50 px-3 py-2 cursor-pointer hover:bg-muted/40"
                    >
                      <RadioGroupItem id={`flow-${c}`} value={c} />
                      <span className="text-sm">
                        {c === 'ticket' && tr.ticketChoice}
                        {c === 'reservation' && tr.reservationChoice}
                        {c === 'walk_in' && tr.walkInChoice}
                      </span>
                    </label>
                  ))}
                </RadioGroup>
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

            {flow === 'reservation' ? (
              <>
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
                <div className="space-y-2">
                  <Label htmlFor="seating">{tr.seating}</Label>
                  <Input id="seating" value={seating} onChange={(e) => setSeating(e.target.value)} placeholder={tr.seatingPh} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferred">{tr.preferred}</Label>
                  <Input id="preferred" value={preferred} onChange={(e) => setPreferred(e.target.value)} placeholder="20:30" />
                </div>
              </>
            ) : (
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
