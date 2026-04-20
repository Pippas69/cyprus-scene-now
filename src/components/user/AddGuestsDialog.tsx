import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Plus, Minus, Loader2, Users, AlertCircle, Mail, Info,
  GlassWater, TableIcon, Crown, Sofa, User, Phone,
  CreditCard, ArrowRight, ArrowLeft, Ticket,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LATIN_RESERVATION_NAME_REGEX } from '@/lib/reservationValidation';
import { isBottleTier as isBottleTierFn, formatBottleLabel } from '@/lib/bottlePricing';
import { getMinAge } from '@/lib/ageRestrictions';
import { useEventPricingProfile } from '@/hooks/useEventPricingProfile';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface AddGuestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: {
    id: string;
    event_id: string | null;
    party_size: number;
    seating_type_id: string | null;
    reservation_name: string;
    email?: string | null;
    phone_number?: string | null;
    event_minimum_age?: number | null;
    event_type?: string | null;
    pay_at_door?: boolean | null;
    prepaid_min_charge_cents?: number | null;
    event_title?: string | null;
    business_id?: string | null;
    business_name?: string | null;
    seating_type?: string | null;
  };
  language: 'el' | 'en';
  onSuccess?: () => void;
  onShowSuccess?: (reservationId: string) => void;
}

interface TierInfo {
  min_people: number;
  max_people: number;
  prepaid_min_charge_cents: number | null;
  pricing_mode: 'amount' | 'bottles' | string | null;
  bottle_type: 'bottle' | 'premium_bottle' | string | null;
  bottle_count: number | null;
}

const seatingTypeIcons: Record<string, React.ReactNode> = {
  bar: <GlassWater className="h-4 w-4" />,
  table: <TableIcon className="h-4 w-4" />,
  vip: <Crown className="h-4 w-4" />,
  sofa: <Sofa className="h-4 w-4" />,
};

const t = {
  el: {
    title: 'Προσθήκη ατόμων',
    subtitle: (n: number) => `Πρόσθεσε ${n > 0 ? `+${n}` : ''} άτομα στην κράτησή σου`,
    extraPeople: 'Επιπλέον άτομα',
    extraPeopleCount: 'Αριθμός ατόμων',
    ticketPrice: 'Τιμή εισιτηρίων',
    people: 'άτομα',
    person: 'άτομο',
    max: 'Μέγιστο',
    minSpend: 'Ελάχιστη κατανάλωση τραπεζιού',
    guestDetails: 'Στοιχεία Καλεσμένων',
    guestName: 'Όνομα',
    guestAge: 'Ηλικία',
    email: 'Email',
    phone: 'Τηλέφωνο',
    namesError: 'Όλα τα ονόματα πρέπει να είναι σε λατινικούς χαρακτήρες.',
    fillAllNames: 'Συμπλήρωσε όλα τα ονόματα.',
    minAgeError: (n: number) => `Ελάχιστο όριο: ${n} ετών`,
    back: 'Πίσω',
    next: 'Επόμενο',
    cancel: 'Ακύρωση',
    confirm: 'Επιβεβαίωση Προσθήκης',
    pay: 'Πληρωμή',
    processing: 'Επεξεργασία...',
    successFree: 'Τα άτομα προστέθηκαν.',
    error: 'Κάτι πήγε στραβά.',
    summary: 'Σύνοψη',
    seatingType: 'Τύπος θέσης',
    extraGuests: 'Επιπλέον άτομα',
    newTotal: 'Νέο σύνολο ατόμων',
    nameLabel: 'Όνομα',
    qrNote: 'Κάθε νέο άτομο θα λάβει ξεχωριστό QR code εισιτηρίου',
    paymentInfo: 'Πώς λειτουργεί η πληρωμή',
    minSpendNew: 'Ελάχιστη κατανάλωση τραπεζιού (νέο σύνολο)',
    alreadyPaid: 'Ήδη προπληρωμένο',
    extraOnline: 'Επιπλέον προπληρωμή (online)',
    ticketsExtra: 'Εισιτήρια νέων ατόμων',
    amountToPayNow: 'Πληρωμή τώρα',
    remainingVenue: 'Υπόλοιπο στο venue',
    bottlesAtVenue: 'Μπουκάλι στο κατάστημα',
    payAtVenueAll: 'Όλα στο κατάστημα',
    free: 'Δωρεάν',
    processingFee: 'Έξοδα επεξεργασίας',
    serviceFee: 'Χρέωση υπηρεσίας',
    total: 'Σύνολο πληρωμής',
    termsLabel: 'Αποδέχομαι τους',
    termsLink: 'Όρους Χρήσης',
    andThe: 'και την',
    privacyLink: 'Πολιτική Απορρήτου',
    termsRequired: 'Πρέπει να αποδεχτείτε τους όρους χρήσης',
    emailNote: 'Το email επιβεβαίωσης θα σταλεί στο email της αρχικής κράτησης.',
    maxReached: 'Έχεις φτάσει το μέγιστο όριο ατόμων για αυτή την κράτηση.',
    deductedNote: 'Η προπληρωμή αφαιρείται αυτόματα από τον τελικό λογαριασμό σας.',
  },
  en: {
    title: 'Add guests',
    subtitle: (n: number) => `Add ${n > 0 ? `+${n}` : ''} guests to your reservation`,
    extraPeople: 'Extra guests',
    extraPeopleCount: 'Guest count',
    ticketPrice: 'Ticket price',
    people: 'guests',
    person: 'guest',
    max: 'Max',
    minSpend: 'Table minimum spend',
    guestDetails: 'Guest Details',
    guestName: 'Name',
    guestAge: 'Age',
    email: 'Email',
    phone: 'Phone',
    namesError: 'All names must be in Latin characters.',
    fillAllNames: 'Fill in all names.',
    minAgeError: (n: number) => `Minimum age: ${n}`,
    back: 'Back',
    next: 'Next',
    cancel: 'Cancel',
    confirm: 'Confirm Add Guests',
    pay: 'Pay',
    processing: 'Processing...',
    successFree: 'Guests added.',
    error: 'Something went wrong.',
    summary: 'Summary',
    seatingType: 'Seating type',
    extraGuests: 'Extra guests',
    newTotal: 'New total',
    nameLabel: 'Name',
    qrNote: 'Each new guest will receive an individual QR code',
    paymentInfo: 'How payment works',
    minSpendNew: 'Table minimum (new total)',
    alreadyPaid: 'Already prepaid',
    extraOnline: 'Extra prepayment (online)',
    ticketsExtra: 'New guests tickets',
    amountToPayNow: 'Pay now',
    remainingVenue: 'Remaining at venue',
    bottlesAtVenue: 'Bottle paid at venue',
    payAtVenueAll: 'All at venue',
    free: 'Free',
    processingFee: 'Processing fee',
    serviceFee: 'Service fee',
    total: 'Total',
    termsLabel: 'I accept the',
    termsLink: 'Terms of Service',
    andThe: 'and the',
    privacyLink: 'Privacy Policy',
    termsRequired: 'You must accept the terms of service',
    emailNote: 'A new confirmation email will be sent to the original reservation email.',
    maxReached: 'You have reached the maximum number of guests.',
    deductedNote: 'The prepayment is automatically deducted from your final bill.',
  },
};

const seatingTypeLabels: Record<string, { el: string; en: string }> = {
  bar: { el: 'Μπαρ', en: 'Bar' },
  table: { el: 'Τραπέζι', en: 'Table' },
  vip: { el: 'VIP', en: 'VIP' },
  sofa: { el: 'Καναπές', en: 'Sofa' },
};

export const AddGuestsDialog = ({
  open,
  onOpenChange,
  reservation,
  language,
  onSuccess,
  onShowSuccess,
}: AddGuestsDialogProps) => {
  const tr = t[language];
  const isMobile = useIsMobile();
  const isEvent = !!reservation.event_id;
  const isHybrid = reservation.event_type === 'ticket_and_reservation';
  const { data: pricingDisplay } = useEventPricingProfile(reservation.business_id || undefined);

  // Wizard state — 2 STEPS: 1=Details (name+counter+guests+email+phone) 2=Summary/Payment
  const [step, setStep] = useState(1);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const [extraCount, setExtraCount] = useState(1);
  const [guests, setGuests] = useState<{ name: string; age: string }[]>([{ name: '', age: '' }]);
  const [tiers, setTiers] = useState<TierInfo[]>([]);
  const [currentTier, setCurrentTier] = useState<TierInfo | null>(null);
  const [hybridTicketPriceCents, setHybridTicketPriceCents] = useState(0);
  const [resolvedEmail, setResolvedEmail] = useState(reservation.email || '');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Email is the immutable reservation email
  const lockedEmail = resolvedEmail;

  const maxPeople = useMemo(
    () => (tiers.length > 0 ? Math.max(...tiers.map((tt) => tt.max_people)) : reservation.party_size + 10),
    [tiers, reservation.party_size]
  );
  const newTotal = reservation.party_size + extraCount;
  const canAdd = newTotal <= maxPeople;

  const newTier = tiers.find((tt) => newTotal >= tt.min_people && newTotal <= tt.max_people) || null;
  const newTierIsBottles = isBottleTierFn(newTier as any);
  const currentCharge = reservation.prepaid_min_charge_cents ?? currentTier?.prepaid_min_charge_cents ?? 0;
  const newCharge = newTier?.prepaid_min_charge_cents ?? currentCharge;
  const isPayAtVenue = !!reservation.pay_at_door;

  // ─────────── ONLINE CHARGE COMPUTATION ───────────
  // Mirror the original reservation flow exactly:
  //  - Pay-at-venue everywhere → €0 online (always)
  //  - Hybrid (ticket+reservation):
  //      * tickets ALWAYS charged online for new guests (ticketPrice × extra)
  //      * + reservation diff (only if amount-tier; bottles → 0)
  //  - Reservation-only:
  //      * amount-tier → reservation diff
  //      * bottles → €0 online
  const reservationDeltaCents = (isHybrid || newTierIsBottles)
    ? 0
    : Math.max(0, newCharge - currentCharge);

  const ticketsExtraCents = (isHybrid && !isPayAtVenue)
    ? hybridTicketPriceCents * extraCount
    : 0;

  const subtotal = isPayAtVenue
    ? 0
    : ticketsExtraCents + reservationDeltaCents;

  const buyerPaysStripe = pricingDisplay?.showProcessingFee !== false;
  const stripeFeesCents = subtotal > 0 && buyerPaysStripe ? Math.ceil(subtotal * 0.029 + 25) : 0;
  const buyerPaysPlatformFee = pricingDisplay?.showPlatformFee === true;
  const platformFeeCents = subtotal > 0 && buyerPaysPlatformFee ? (pricingDisplay?.fixedFeeReservationCents || 0) : 0;
  const total = subtotal + stripeFeesCents + platformFeeCents;
  const isFreeFlow = subtotal === 0;
  const step1RightAmountCents = isHybrid ? ticketsExtraCents : total;

  const minAge = isEvent ? getMinAge(reservation.event_id || '', reservation.event_minimum_age) : 0;

  // Load tiers + (for hybrid) ticket price from existing ticket_orders
  useEffect(() => {
    if (!open) return;

    const loadAll = async () => {
      setLoading(true);

      let fallbackEmail = reservation.email || '';

      if (!fallbackEmail && reservation.id) {
        const { data: linkedOrder } = await supabase
          .from('ticket_orders')
          .select('customer_email')
          .eq('linked_reservation_id', reservation.id)
          .not('customer_email', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        fallbackEmail = linkedOrder?.customer_email || fallbackEmail;
      }

      if (!fallbackEmail && reservation.event_id) {
        const { data: profileData } = await supabase.auth.getUser();
        fallbackEmail = profileData.user?.email || '';
      }

      setResolvedEmail(fallbackEmail);

      // Tiers
      if (reservation.seating_type_id) {
        const { data: tierData } = await supabase
          .from('seating_type_tiers')
          .select('min_people, max_people, prepaid_min_charge_cents, pricing_mode, bottle_type, bottle_count')
          .eq('seating_type_id', reservation.seating_type_id)
          .order('min_people', { ascending: true });
        const list = (tierData || []) as TierInfo[];
        setTiers(list);
        const cur =
          list.find((tt) => reservation.party_size >= tt.min_people && reservation.party_size <= tt.max_people) ||
          list[0] ||
          null;
        setCurrentTier(cur);
      } else {
        setTiers([]);
        setCurrentTier(null);
      }

      // For HYBRID events: fetch the ticket tier price used in the original order
      if (isHybrid && reservation.event_id) {
        const { data: order } = await supabase
          .from('ticket_orders')
          .select('id')
          .eq('linked_reservation_id', reservation.id)
          .maybeSingle();
        if (order?.id) {
          const { data: ticketRow } = await supabase
            .from('tickets')
            .select('tier_id')
            .eq('order_id', order.id)
            .limit(1)
            .maybeSingle();
          if (ticketRow?.tier_id) {
            const { data: tier } = await supabase
              .from('ticket_tiers')
              .select('price_cents')
              .eq('id', ticketRow.tier_id)
              .maybeSingle();
            setHybridTicketPriceCents(tier?.price_cents || 0);
          }
        }
        // Fallback: use the cheapest active tier's price
        if (hybridTicketPriceCents === 0) {
          const { data: tiersList } = await supabase
            .from('ticket_tiers')
            .select('price_cents')
            .eq('event_id', reservation.event_id)
            .eq('active', true)
            .order('price_cents', { ascending: true })
            .limit(1);
          if (tiersList && tiersList[0]) setHybridTicketPriceCents(tiersList[0].price_cents || 0);
        }
      } else {
        setHybridTicketPriceCents(0);
      }

      setLoading(false);
    };

    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reservation.seating_type_id, reservation.party_size, reservation.event_id, isHybrid, reservation.id]);

  // Resize guests array
  useEffect(() => {
    setGuests((prev) => {
      const next = [...prev];
      while (next.length < extraCount) next.push({ name: '', age: '' });
      return next.slice(0, extraCount);
    });
  }, [extraCount]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1);
      setExtraCount(1);
      setGuests([{ name: '', age: '' }]);
      setTermsAccepted(false);
      setResolvedEmail(reservation.email || '');
    }
  }, [open]);

  // Scroll to top on step change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const updateGuest = (idx: number, field: 'name' | 'age', val: string) => {
    setGuests((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  // Validation
  const allGuestsFilled = guests.every((g) => {
    if (!g.name.trim()) return false;
    if (!LATIN_RESERVATION_NAME_REGEX.test(g.name.trim())) return false;
    if (isEvent) {
      const n = Number(g.age);
      if (!g.age.trim() || isNaN(n) || n < minAge) return false;
    }
    return true;
  });
  const canProceedToStep2 = canAdd && allGuestsFilled;

  const handleSubmit = async () => {
    if (!termsAccepted) {
      toast.error(tr.termsRequired);
      return;
    }
    setSubmitting(true);
    try {
      const cleaned = guests.map((g) => ({ name: g.name.trim(), age: g.age.trim() }));
      const { data, error } = await supabase.functions.invoke('add-guests-to-reservation', {
        body: {
          reservation_id: reservation.id,
          extra_guests: extraCount,
          guest_names: cleaned.map((g) => g.name),
          guest_ages: cleaned.map((g) => (g.age ? parseInt(g.age, 10) : null)),
          email: lockedEmail,
        },
      });
      if (error) throw error;
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      onOpenChange(false);
      if (onShowSuccess) {
        onShowSuccess(reservation.id);
      } else {
        toast.success(tr.successFree);
        onSuccess?.();
      }
    } catch (e: any) {
      console.error('add-guests error', e);
      toast.error(e?.message || tr.error);
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────── Step indicator (2 dots) ───────────
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 pb-4">
      {[1, 2].map((s) => (
        <div
          key={s}
          className={cn(
            'h-2 rounded-full transition-all',
            s === step ? 'bg-primary w-4' : s < step ? 'bg-primary/50 w-2' : 'bg-muted w-2'
          )}
        />
      ))}
    </div>
  );

  // ─────────── Min spend display ───────────
  const minSpendDisplay = (() => {
    if (!newTier) return null;
    if (newTierIsBottles) {
      const bl = formatBottleLabel(
        newTier.bottle_type as 'bottle' | 'premium_bottle',
        newTier.bottle_count as number,
        language
      );
      return `${bl} (${language === 'el' ? 'στο κατάστημα' : 'at venue'})`;
    }
    const cents = newTier.prepaid_min_charge_cents ?? 0;
    if (cents === 0) return tr.free;
    return isPayAtVenue
      ? `${formatPrice(cents)} ${language === 'el' ? 'στο κατάστημα' : 'at venue'}`
      : formatPrice(cents);
  })();

  // ─────────── Step content ───────────
  const renderStepContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━ STEP 1 ━━━━━━━━━━━━━━━━━━━━
    if (step === 1) {
      return (
        <div className="space-y-3">
          {/* Reservation name (read-only) */}
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs">
              <User className="h-3 w-3" />
              {tr.nameLabel}
            </Label>
            <Input value={reservation.reservation_name} readOnly className="h-9 text-sm bg-muted cursor-not-allowed" />
          </div>

          {/* Extra people counter */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <Label className="flex items-center gap-1.5 text-xs">
                <Users className="h-3 w-3" />
                {subtotal > 0 ? tr.extraPeopleCount : tr.extraPeople}
              </Label>
              {isHybrid && ticketsExtraCents > 0 && (
                <span className="font-medium text-foreground">{tr.ticketPrice}</span>
              )}
            </div>
            <div className="rounded-lg border border-border bg-card px-2.5 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setExtraCount((c) => Math.max(1, c - 1))}
                  disabled={extraCount <= 1}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="text-sm font-semibold min-w-[2ch] text-center">+{extraCount}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setExtraCount((c) => c + 1)}
                  disabled={newTotal >= maxPeople}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {extraCount === 1 ? tr.person : tr.people} ({tr.max} {maxPeople})
                </span>
                </div>
                {!isFreeFlow && step1RightAmountCents > 0 && (
                  <div className="flex flex-col items-end shrink-0 leading-none">
                    {!isHybrid && <span className="text-[10px] text-muted-foreground">{tr.amountToPayNow}</span>}
                    <span className="text-base font-bold text-foreground">{formatPrice(step1RightAmountCents)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!canAdd && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-2.5">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{tr.maxReached}</p>
            </div>
          )}

          {/* Min spend */}
          {minSpendDisplay && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5">
              <Info className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">
                {tr.minSpend}: <span className="font-semibold text-foreground">{minSpendDisplay}</span>
              </span>
            </div>
          )}

          {/* Guest details */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              {tr.guestDetails} ({extraCount} {extraCount === 1 ? tr.person : tr.people})
            </Label>
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {guests.map((g, idx) => {
                const ageVal = g.age;
                const ageNum = Number(ageVal);
                const showAgeError = isEvent && ageVal.length > 0 && !isNaN(ageNum) && ageNum < minAge;
                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-muted-foreground shrink-0 w-4 text-right">{idx + 1}.</span>
                      <Input
                        placeholder={tr.guestName}
                        value={g.name}
                        onChange={(e) => updateGuest(idx, 'name', e.target.value)}
                        className="h-9 text-sm flex-1"
                      />
                      {isEvent && (
                        <Input
                          placeholder={tr.guestAge}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={g.age}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                            updateGuest(idx, 'age', val);
                          }}
                          className={cn('h-9 text-sm w-20', showAgeError && 'border-destructive')}
                        />
                      )}
                    </div>
                    {showAgeError && (
                      <p className="text-[10px] text-destructive text-right pr-1">{tr.minAgeError(minAge)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Email (read-only, locked from original reservation) */}
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs">
              <Mail className="h-3 w-3" />
              {tr.email}
            </Label>
            <Input value={lockedEmail} readOnly className="h-9 text-sm bg-muted cursor-not-allowed" />
            <p className="text-[10px] text-muted-foreground flex items-start gap-1 pt-0.5">
              <Info className="h-2.5 w-2.5 mt-0.5 shrink-0" />
              {tr.emailNote}
            </p>
          </div>

          {/* Phone (read-only) */}
          {reservation.phone_number && (
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-xs">
                <Phone className="h-3 w-3" />
                {tr.phone}
              </Label>
              <Input value={reservation.phone_number} readOnly className="h-9 text-sm bg-muted cursor-not-allowed" />
            </div>
          )}
        </div>
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━ STEP 2 — Summary / Payment ━━━━━━━━━━━━━━━━━━━━
    const seatingKey = (reservation.seating_type || '').toLowerCase();
    const seatingLabel = seatingTypeLabels[seatingKey]?.[language] || reservation.seating_type || '';
    const seatingIcon = seatingTypeIcons[seatingKey];

    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">{tr.summary}</h3>

        {/* Summary lines */}
        <div className="space-y-1.5 text-xs">
          {seatingLabel && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{tr.seatingType}</span>
              <span className="flex items-center gap-1.5 text-foreground">
                {seatingIcon}
                {seatingLabel}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">{tr.extraGuests}</span>
            <span className="text-foreground">+{extraCount} {extraCount === 1 ? tr.person : tr.people}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{tr.newTotal}</span>
            <span className="font-semibold text-foreground">{newTotal} {tr.people}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{tr.nameLabel}</span>
            <span className="text-foreground">{reservation.reservation_name}</span>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground">{tr.qrNote}</p>

        <Separator />

        {/* Payment-info box */}
        <div className="rounded-lg border border-border bg-muted p-2.5 space-y-1.5">
          <p className="font-medium text-foreground flex items-center gap-1.5 text-xs">
            💡 {tr.paymentInfo}
          </p>

          {/* Hybrid: tickets always shown */}
          {isHybrid && !isPayAtVenue && ticketsExtraCents > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Ticket className="h-3 w-3" />
                {tr.ticketsExtra} (×{extraCount})
              </span>
              <span className="font-semibold text-foreground">{formatPrice(ticketsExtraCents)}</span>
            </div>
          )}

          {newTierIsBottles ? (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{tr.minSpendNew}</span>
                <span className="font-semibold text-foreground">
                  {formatBottleLabel(
                    newTier!.bottle_type as 'bottle' | 'premium_bottle',
                    newTier!.bottle_count as number,
                    language
                  )}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground pt-0.5">
                {tr.bottlesAtVenue}.{isHybrid ? ` ${tr.deductedNote}` : ''}
              </p>
            </>
          ) : isPayAtVenue ? (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{tr.minSpendNew}</span>
                <span className="font-semibold text-foreground">{formatPrice(newCharge)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground pt-0.5">{tr.payAtVenueAll}</p>
            </>
          ) : (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{tr.minSpendNew} ({newTotal} {tr.people}):</span>
                <span className="font-semibold text-foreground">{formatPrice(newCharge)}</span>
              </div>
              {currentCharge > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{tr.alreadyPaid}:</span>
                  <span className="font-semibold text-foreground">−{formatPrice(currentCharge)}</span>
                </div>
              )}
              {reservationDeltaCents > 0 ? (
                <div className="flex justify-between text-xs border-t border-border pt-1.5">
                  <span className="font-medium text-foreground">{tr.extraOnline}:</span>
                  <span className="font-bold text-primary">{formatPrice(reservationDeltaCents)}</span>
                </div>
              ) : (
                !isHybrid && (
                  <div className="flex justify-between text-xs border-t border-border pt-1.5">
                    <span className="font-medium text-foreground">{tr.extraOnline}:</span>
                    <span className="font-bold text-foreground">{tr.free}</span>
                  </div>
                )
              )}
              {isHybrid && (
                <p className="text-[11px] text-muted-foreground pt-0.5">{tr.deductedNote}</p>
              )}
            </>
          )}
        </div>

        {/* Fees + total — only if there is an online charge */}
        {subtotal > 0 && (
          <div className="space-y-1">
            {platformFeeCents > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{tr.serviceFee}</span>
                <span className="text-foreground">{formatPrice(platformFeeCents)}</span>
              </div>
            )}
            {stripeFeesCents > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{tr.processingFee}</span>
                <span className="text-foreground">{formatPrice(stripeFeesCents)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
              <span>{tr.total}</span>
              <span className="text-foreground">{formatPrice(total)}</span>
            </div>
          </div>
        )}

        {/* Terms */}
        <div className="flex items-start gap-2.5 pt-1">
          <Checkbox
            id="add-guests-terms"
            checked={termsAccepted}
            onCheckedChange={(checked) => setTermsAccepted(checked === true)}
            className="mt-0.5 rounded-[6px]"
          />
          <label htmlFor="add-guests-terms" className="text-[10px] sm:text-xs text-foreground/90 leading-relaxed cursor-pointer">
            {tr.termsLabel}{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-foreground font-semibold underline underline-offset-2">{tr.termsLink}</a>
            {' '}{tr.andThe}{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-foreground font-semibold underline underline-offset-2">{tr.privacyLink}</a>
          </label>
        </div>
      </div>
    );
  };

  // ─────────── Navigation ───────────
  const renderNavigation = () => (
    <div className="flex justify-between pt-3 gap-2">
      {step > 1 ? (
        <Button variant="outline" size="sm" className="text-xs px-3 h-9" onClick={() => setStep(step - 1)}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          {tr.back}
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="text-xs px-3 h-9" onClick={() => onOpenChange(false)}>
          {tr.cancel}
        </Button>
      )}

      {step < 2 ? (
        <Button
          size="sm"
          className="text-xs px-3 h-9"
          onClick={() => setStep(step + 1)}
          disabled={!canProceedToStep2}
        >
          {tr.next}
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      ) : (
        <Button
          size="sm"
          className="text-xs px-3 h-9 gap-1.5"
          onClick={handleSubmit}
          disabled={submitting || !termsAccepted}
        >
          {submitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {tr.processing}
            </>
          ) : isFreeFlow ? (
            <>
              <Users className="h-3.5 w-3.5" />
              {tr.confirm}
            </>
          ) : (
            <>
              <CreditCard className="h-3.5 w-3.5" />
              {tr.pay} {formatPrice(total)}
            </>
          )}
        </Button>
      )}
    </div>
  );

  const content = (
    <div className="space-y-3">
      {renderStepIndicator()}
      {renderStepContent()}
      {!loading && renderNavigation()}
    </div>
  );

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[92vw] max-h-[85vh] flex flex-col p-0 gap-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="flex-shrink-0 border-b border-border/50 pb-3 px-4 pt-4">
            <DialogTitle className="text-sm font-bold">{tr.title}</DialogTitle>
            <DialogDescription className="text-xs">
              {reservation.event_title || reservation.business_name || ''}
            </DialogDescription>
          </DialogHeader>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 scrollbar-hide [&_input]:!text-[16px] [&_textarea]:!text-[16px] md:[&_input]:!text-xs md:[&_textarea]:!text-xs">
            {content}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={scrollRef} className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tr.title}</DialogTitle>
          <DialogDescription>
            {reservation.event_title || reservation.business_name || tr.subtitle(extraCount)}
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
