import { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhoneInput } from '@/components/ui/phone-input';
import { Loader2, Send, Copy, X } from 'lucide-react';
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
    title: 'Αποστολή Link',
    desc: 'Συμπληρώστε τα στοιχεία και θα σταλεί SMS με σύνδεσμο πληρωμής (ισχύει 48 ώρες).',
    name: 'Όνομα πελάτη',
    phone: 'Τηλέφωνο',
    careOf: 'Care of',
    notes: 'Σημείωση (προαιρετικό)',
    walkInLabel: 'Walk-in',
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
    requiredPhone: 'Έγκυρο τηλέφωνο υποχρεωτικό (+357...)',
    requiredParty: 'Άτομα υποχρεωτικά (≥1)',
    requiredTickets: 'Εισιτήρια υποχρεωτικά (≥1)',
    requiredSeating: 'Τύπος καθίσματος υποχρεωτικός',
  },
  en: {
    title: 'Send Link',
    desc: 'Fill in the details and an SMS with a payment link will be sent (valid for 48 hours).',
    name: 'Customer name',
    phone: 'Phone',
    careOf: 'Care of',
    notes: 'Note (optional)',
    walkInLabel: 'Walk-in',
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
    requiredPhone: 'Valid phone required (+357...)',
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

  const isOnlyTicket = eventType === 'ticket';
  const isOnlyReservation = eventType === 'reservation';
  const isHybrid = eventType === 'ticket_and_reservation' || eventType === 'ticket_reservation';
  const isReservationContext = isOnlyReservation || isHybrid || (!eventId && !isOnlyTicket);

  const canShowWalkInToggle = (isOnlyReservation || isHybrid) && supportsWalkIn;
  const [walkInMode, setWalkInMode] = useState(false);

  const effectiveFlow: 'ticket' | 'reservation' | 'walk_in' = useMemo(() => {
    if (isOnlyTicket) return 'ticket';
    if (canShowWalkInToggle && walkInMode) return 'walk_in';
    return 'reservation';
  }, [isOnlyTicket, canShowWalkInToggle, walkInMode]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [careOf, setCareOf] = useState('');
  const [notes, setNotes] = useState('');
  // Use string state so the user can clear the field while typing
  const [partySize, setPartySize] = useState<string>('2');
  const [ticketCount, setTicketCount] = useState<string>('1');
  const [seatingTypeId, setSeatingTypeId] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);

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

  useEffect(() => {
    if (walkInMode) setSeatingTypeId('');
  }, [walkInMode]);

  const showSeatingField = effectiveFlow === 'reservation';
  const showPartyField = effectiveFlow === 'reservation';
  const showTicketField = effectiveFlow === 'ticket' || effectiveFlow === 'walk_in';

  const handleSubmit = async () => {
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
      <DialogContent
        className="max-w-md p-0 gap-0 [&>button]:hidden"
      >
        {/* Custom header — title left, walk-in toggle middle, close right */}
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border/40 space-y-0">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold leading-none">{tr.title}</h2>

            <div className="flex items-center gap-3">
              {canShowWalkInToggle && (
                <label htmlFor="walkin-toggle" className="flex items-center gap-1.5 cursor-pointer select-none">
                  <span className="text-xs font-medium text-muted-foreground">{tr.walkInLabel}</span>
                  <Switch
                    id="walkin-toggle"
                    checked={walkInMode}
                    onCheckedChange={setWalkInMode}
                    className="scale-75 origin-center"
                  />
                </label>
              )}
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-sm opacity-70 hover:opacity-100 transition-opacity focus:outline-none"
                aria-label={tr.close}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-snug pt-2">{tr.desc}</p>
        </DialogHeader>

        {createdLink ? (
          <div className="space-y-3 px-4 py-4">
            <div className="rounded-lg border border-border/50 bg-muted/40 p-3 space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">{tr.bookingLink}</Label>
              <p className="font-mono text-xs break-all">{createdLink}</p>
            </div>
            <Button onClick={handleCopy} variant="outline" size="sm" className="w-full gap-2 text-xs">
              <Copy className="h-3.5 w-3.5" /> {tr.copy}
            </Button>
            <DialogFooter>
              <Button size="sm" onClick={() => onOpenChange(false)} className="text-xs">{tr.close}</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3 px-4 py-4 max-h-[65vh] overflow-y-auto text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="cust-name" className="text-xs font-medium">{tr.name}</Label>
              <Input
                id="cust-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cust-phone" className="text-xs font-medium">{tr.phone}</Label>
              <PhoneInput
                id="cust-phone"
                value={phone}
                onChange={setPhone}
                language={language}
                inputClassName="h-9 text-xs"
                selectClassName="h-9 text-xs"
              />
            </div>

            {showPartyField && (
              <div className="space-y-1.5">
                <Label htmlFor="party" className="text-xs font-medium">{tr.party}</Label>
                <Input
                  id="party"
                  type="number"
                  min={1}
                  max={50}
                  value={partySize}
                  onChange={(e) => setPartySize(Math.max(1, parseInt(e.target.value || '1', 10)))}
                  className="h-9 text-xs"
                />
              </div>
            )}

            {showSeatingField && (
              <div className="space-y-1.5">
                <Label htmlFor="seating" className="text-xs font-medium">{tr.seating}</Label>
                {loadingSeating ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> ...
                  </div>
                ) : seatingOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground rounded-md border border-border/50 bg-muted/30 px-3 py-2">
                    {tr.noSeating}
                  </p>
                ) : (
                  <Select value={seatingTypeId} onValueChange={setSeatingTypeId}>
                    <SelectTrigger id="seating" className="h-9 text-xs">
                      <SelectValue placeholder={tr.seatingPh} />
                    </SelectTrigger>
                    <SelectContent>
                      {seatingOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id} className="text-xs">
                          {translateSeatingType(opt.seating_type, language)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {showTicketField && (
              <div className="space-y-1.5">
                <Label htmlFor="tickets" className="text-xs font-medium">{tr.tickets}</Label>
                <Input
                  id="tickets"
                  type="number"
                  min={1}
                  max={50}
                  value={ticketCount}
                  onChange={(e) => setTicketCount(Math.max(1, parseInt(e.target.value || '1', 10)))}
                  className="h-9 text-xs"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="careof" className="text-xs font-medium">{tr.careOf}</Label>
              <Input
                id="careof"
                value={careOf}
                onChange={(e) => setCareOf(e.target.value)}
                maxLength={100}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-medium">{tr.notes}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                rows={2}
                className="text-xs min-h-[60px]"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting} className="text-xs">
                {tr.cancel}
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={submitting} className="gap-2 text-xs">
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {submitting ? tr.sending : tr.submit}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
