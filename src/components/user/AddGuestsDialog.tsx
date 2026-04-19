import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Minus, Loader2, Users, AlertCircle, Mail, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LATIN_RESERVATION_NAME_REGEX } from '@/lib/reservationValidation';
import { isBottleTier, formatBottleLabel } from '@/lib/bottlePricing';
import { getMinAge } from '@/lib/ageRestrictions';
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
    event_minimum_age?: number | null;
    event_type?: string | null;
    pay_at_door?: boolean | null;
    prepaid_min_charge_cents?: number | null;
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

const t = {
  el: {
    title: 'Προσθήκη ατόμων',
    description: 'Πρόσθεσε επιπλέον άτομα στην υπάρχουσα κράτηση.',
    partySize: 'Μέγεθος παρέας',
    people: 'άτομα',
    extraPeople: 'Επιπλέον',
    newTotal: 'Νέο σύνολο',
    max: 'Μέγιστο',
    minSpend: 'Ελάχιστη κατανάλωση',
    extraCharge: 'Επιπλέον χρέωση',
    free: 'Δωρεάν',
    atVenue: 'στο κατάστημα',
    payAtVenue: 'Στο κατάστημα',
    extraBottles: 'Επιπλέον στο κατάστημα',
    noChange: 'Καμία αλλαγή',
    guestDetails: 'Στοιχεία Καλεσμένων',
    guestName: 'Όνομα',
    guestAge: 'Ηλικία',
    email: 'Email',
    emailPlaceholder: 'example@email.com',
    namesError: 'Όλα τα ονόματα πρέπει να είναι σε λατινικούς χαρακτήρες.',
    fillAllNames: 'Συμπλήρωσε όλα τα ονόματα.',
    fillAllAges: 'Συμπλήρωσε όλες τις ηλικίες.',
    fillEmail: 'Συμπλήρωσε ένα έγκυρο email.',
    minAgeError: (n: number) => `Ελάχιστο όριο: ${n} ετών`,
    cancel: 'Ακύρωση',
    confirm: 'Συνέχεια',
    confirmAndPay: 'Συνέχεια στην πληρωμή',
    maxReached: 'Έχεις φτάσει το μέγιστο όριο ατόμων για αυτή την κράτηση.',
    error: 'Κάτι πήγε στραβά.',
    successFree: 'Τα άτομα προστέθηκαν.',
    note: 'Θα σταλεί νέο email επιβεβαίωσης με όλα τα QR codes.',
  },
  en: {
    title: 'Add guests',
    description: 'Add extra guests to your existing reservation.',
    partySize: 'Party size',
    people: 'guests',
    extraPeople: 'Extra',
    newTotal: 'New total',
    max: 'Max',
    minSpend: 'Minimum spend',
    extraCharge: 'Extra charge',
    free: 'Free',
    atVenue: 'at venue',
    payAtVenue: 'At venue',
    extraBottles: 'Extra at venue',
    noChange: 'No change',
    guestDetails: 'Guest Details',
    guestName: 'Name',
    guestAge: 'Age',
    email: 'Email',
    emailPlaceholder: 'example@email.com',
    namesError: 'All names must be in Latin characters.',
    fillAllNames: 'Fill in all names.',
    fillAllAges: 'Fill in all ages.',
    fillEmail: 'Enter a valid email.',
    minAgeError: (n: number) => `Minimum age: ${n}`,
    cancel: 'Cancel',
    confirm: 'Continue',
    confirmAndPay: 'Continue to payment',
    maxReached: 'You have reached the maximum number of guests.',
    error: 'Something went wrong.',
    successFree: 'Guests added.',
    note: 'A new confirmation email will be sent with all QR codes.',
  },
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
  const isEvent = !!reservation.event_id;

  const [extraCount, setExtraCount] = useState(1);
  const [guests, setGuests] = useState<{ name: string; age: string }[]>([{ name: '', age: '' }]);
  const [email, setEmail] = useState('');
  const [tiers, setTiers] = useState<TierInfo[]>([]);
  const [currentTier, setCurrentTier] = useState<TierInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const maxPeople = useMemo(
    () => (tiers.length > 0 ? Math.max(...tiers.map((tt) => tt.max_people)) : reservation.party_size + 10),
    [tiers, reservation.party_size]
  );
  const newTotal = reservation.party_size + extraCount;
  const canAdd = newTotal <= maxPeople;

  const newTier = tiers.find((tt) => newTotal >= tt.min_people && newTotal <= tt.max_people) || null;
  const newTierIsBottles = isBottleTier(newTier as any);
  const currentTierIsBottles = isBottleTier(currentTier as any);
  const currentCharge = reservation.prepaid_min_charge_cents ?? currentTier?.prepaid_min_charge_cents ?? 0;
  const newCharge = newTier?.prepaid_min_charge_cents ?? currentCharge;
  const isPayAtVenue = !!reservation.pay_at_door;
  // Online charge mirrors the normal reservation flow:
  //  - bottles tier → €0 online (paid at venue)
  //  - pay-at-venue event → €0 online
  //  - otherwise → diff between new tier min charge and what was already prepaid
  const extraChargeCents = (newTierIsBottles || isPayAtVenue)
    ? 0
    : Math.max(0, newCharge - currentCharge);

  // Bottle delta (when both current & new are bottle tiers of same type)
  const bottleDelta = (() => {
    if (!newTierIsBottles || !newTier) return null;
    const newCount = newTier.bottle_count ?? 0;
    const curCount = currentTierIsBottles ? (currentTier?.bottle_count ?? 0) : 0;
    const sameType = currentTierIsBottles ? currentTier?.bottle_type === newTier.bottle_type : true;
    const delta = sameType ? Math.max(0, newCount - curCount) : newCount;
    return { delta, type: newTier.bottle_type as 'bottle' | 'premium_bottle', sameType };
  })();

  const minAge = isEvent ? getMinAge(reservation.event_id || '', reservation.event_minimum_age) : 0;

  // Load tiers + prefill email
  useEffect(() => {
    if (!open) return;
    setEmail(reservation.email || '');
    if (!reservation.email) {
      // Try to prefill from auth user
      supabase.auth.getUser().then(({ data }) => {
        if (data.user?.email && !reservation.email) setEmail(data.user.email);
      });
    }
    if (!reservation.seating_type_id) {
      setTiers([]);
      setCurrentTier(null);
      return;
    }
    setLoading(true);
    supabase
      .from('seating_type_tiers')
      .select('min_people, max_people, prepaid_min_charge_cents, pricing_mode, bottle_type, bottle_count')
      .eq('seating_type_id', reservation.seating_type_id)
      .order('min_people', { ascending: true })
      .then(({ data }) => {
        const list = (data || []) as TierInfo[];
        setTiers(list);
        const cur =
          list.find((tt) => reservation.party_size >= tt.min_people && reservation.party_size <= tt.max_people) ||
          list[0] ||
          null;
        setCurrentTier(cur);
        setLoading(false);
      });
  }, [open, reservation.seating_type_id, reservation.party_size, reservation.email]);

  // Resize guests array when extraCount changes
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
      setExtraCount(1);
      setGuests([{ name: '', age: '' }]);
    }
  }, [open]);

  const updateGuest = (idx: number, field: 'name' | 'age', val: string) => {
    setGuests((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleSubmit = async () => {
    // Validate names
    const cleaned = guests.map((g) => ({ name: g.name.trim(), age: g.age.trim() }));
    if (cleaned.some((g) => !g.name)) {
      toast.error(tr.fillAllNames);
      return;
    }
    for (const g of cleaned) {
      if (!LATIN_RESERVATION_NAME_REGEX.test(g.name)) {
        toast.error(tr.namesError);
        return;
      }
    }
    // Validate ages (only for events)
    if (isEvent) {
      for (const g of cleaned) {
        const n = Number(g.age);
        if (!g.age || isNaN(n) || n < minAge) {
          toast.error(tr.minAgeError(minAge));
          return;
        }
      }
    }
    // Validate email
    const emailTrimmed = email.trim();
    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      toast.error(tr.fillEmail);
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('add-guests-to-reservation', {
        body: {
          reservation_id: reservation.id,
          extra_guests: extraCount,
          guest_names: cleaned.map((g) => g.name),
          guest_ages: cleaned.map((g) => (g.age ? parseInt(g.age, 10) : null)),
          email: emailTrimmed,
        },
      });
      if (error) throw error;
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      // FREE PATH → open success dialog with all QR codes
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

  // Min spend display label (matches reservation form styling)
  const minSpendDisplay = (() => {
    if (!newTier) return null;
    if (newTierIsBottles) {
      const bl = formatBottleLabel(
        newTier.bottle_type as 'bottle' | 'premium_bottle',
        newTier.bottle_count as number,
        language
      );
      return `${bl} (${tr.atVenue})`;
    }
    const cents = newTier.prepaid_min_charge_cents ?? 0;
    return cents > 0 ? `€${(cents / 100).toFixed(2)}` : tr.free;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {tr.title}
          </DialogTitle>
          <DialogDescription>{tr.description}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Party size counter */}
            <div className="space-y-1">
              <Label className="flex items-center gap-2 text-sm">
                <Users className="h-3.5 w-3.5" />
                {tr.partySize}
              </Label>
              <div className="rounded-lg border border-border bg-card px-2.5 py-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => setExtraCount((c) => Math.max(1, c - 1))}
                    disabled={extraCount <= 1}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-base font-semibold min-w-[2ch] text-center">{newTotal}</span>
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
                    {tr.people} ({tr.extraPeople} +{extraCount} / {tr.max} {maxPeople})
                  </span>
                </div>
              </div>
            </div>

            {!canAdd && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-2.5">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{tr.maxReached}</p>
              </div>
            )}

            {/* Guest details */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {tr.guestDetails} ({extraCount} {tr.people})
              </Label>
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
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

            {/* Min spend / extra charge box */}
            {minSpendDisplay && (
              <div className="rounded-lg border border-border bg-card p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" />
                    {tr.minSpend}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{minSpendDisplay}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-1.5">
                  <span className="text-sm text-muted-foreground">{tr.extraCharge}</span>
                  <span className={cn(
                    "text-base font-semibold",
                    extraChargeCents > 0 ? "text-primary" : "text-foreground"
                  )}>
                    {extraChargeCents > 0
                      ? `€${(extraChargeCents / 100).toFixed(2)}`
                      : newTierIsBottles && bottleDelta && bottleDelta.delta > 0
                        ? `+${formatBottleLabel(bottleDelta.type, bottleDelta.delta, language)} (${tr.atVenue})`
                        : newTierIsBottles
                          ? tr.payAtVenue
                          : tr.free}
                  </span>
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="add-guests-email" className="flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5" />
                {tr.email}
              </Label>
              <Input
                id="add-guests-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={tr.emailPlaceholder}
                className="h-9 text-sm"
              />
              <p className="text-[11px] text-muted-foreground flex items-start gap-1 pt-0.5">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                {tr.note}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                {tr.cancel}
              </Button>
              <Button onClick={handleSubmit} disabled={!canAdd || submitting}>
                {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {extraChargeCents > 0 ? tr.confirmAndPay : tr.confirm}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
