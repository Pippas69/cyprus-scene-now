import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Minus, Loader2, Users, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LATIN_RESERVATION_NAME_REGEX } from '@/lib/reservationValidation';

interface AddGuestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: {
    id: string;
    event_id: string | null;
    party_size: number;
    seating_type_id: string | null;
    reservation_name: string;
  };
  language: 'el' | 'en';
  onSuccess?: () => void;
}

interface TierInfo {
  min_people: number;
  max_people: number;
  prepaid_min_charge_cents: number | null;
  pricing_mode: string | null;
}

const t = {
  el: {
    title: 'Προσθήκη ατόμων',
    description: 'Πρόσθεσε επιπλέον άτομα στην υπάρχουσα κράτηση.',
    currentParty: 'Τρέχοντα άτομα',
    addMore: 'Προσθήκη',
    extraGuests: 'Έξτρα άτομα',
    newTotal: 'Νέο σύνολο',
    extraCharge: 'Έξτρα χρέωση',
    free: 'Δωρεάν',
    guestNames: 'Ονόματα νέων ατόμων (λατινικοί χαρακτήρες)',
    guestNamePlaceholder: 'π.χ. Maria Papadopoulou',
    namesError: 'Όλα τα ονόματα πρέπει να είναι σε λατινικούς χαρακτήρες.',
    cancel: 'Ακύρωση',
    confirm: 'Συνέχεια',
    confirmAndPay: 'Συνέχεια στην πληρωμή',
    maxReached: 'Έχεις φτάσει το μέγιστο όριο ατόμων για αυτή την κράτηση.',
    loading: 'Φόρτωση...',
    processing: 'Επεξεργασία...',
    successFree: 'Τα άτομα προστέθηκαν.',
    error: 'Κάτι πήγε στραβά.',
    max: 'Μέγιστο',
    people: 'άτομα',
  },
  en: {
    title: 'Add guests',
    description: 'Add extra guests to your existing reservation.',
    currentParty: 'Current guests',
    addMore: 'Add',
    extraGuests: 'Extra guests',
    newTotal: 'New total',
    extraCharge: 'Extra charge',
    free: 'Free',
    guestNames: 'New guest names (Latin characters)',
    guestNamePlaceholder: 'e.g. Maria Papadopoulou',
    namesError: 'All names must be in Latin characters.',
    cancel: 'Cancel',
    confirm: 'Continue',
    confirmAndPay: 'Continue to payment',
    maxReached: 'You have reached the maximum number of guests.',
    loading: 'Loading...',
    processing: 'Processing...',
    successFree: 'Guests added.',
    error: 'Something went wrong.',
    max: 'Max',
    people: 'guests',
  },
};

export const AddGuestsDialog = ({
  open,
  onOpenChange,
  reservation,
  language,
  onSuccess,
}: AddGuestsDialogProps) => {
  const tr = t[language];
  const [extraCount, setExtraCount] = useState(1);
  const [guestNames, setGuestNames] = useState<string[]>(['']);
  const [tiers, setTiers] = useState<TierInfo[]>([]);
  const [currentTier, setCurrentTier] = useState<TierInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const maxPeople = tiers.length > 0 ? Math.max(...tiers.map(t => t.max_people)) : reservation.party_size + 10;
  const newTotal = reservation.party_size + extraCount;
  const canAdd = newTotal <= maxPeople;

  const newTier = tiers.find(t => newTotal >= t.min_people && newTotal <= t.max_people);
  const currentCharge = currentTier?.prepaid_min_charge_cents ?? 0;
  const newCharge = newTier?.prepaid_min_charge_cents ?? currentCharge;
  const extraChargeCents = Math.max(0, newCharge - currentCharge);

  useEffect(() => {
    if (!open || !reservation.seating_type_id) return;
    setLoading(true);
    supabase
      .from('seating_type_tiers')
      .select('min_people, max_people, prepaid_min_charge_cents, pricing_mode')
      .eq('seating_type_id', reservation.seating_type_id)
      .order('min_people', { ascending: true })
      .then(({ data }) => {
        const list = data || [];
        setTiers(list);
        const cur = list.find(
          t => reservation.party_size >= t.min_people && reservation.party_size <= t.max_people
        ) || list[0] || null;
        setCurrentTier(cur);
        setLoading(false);
      });
  }, [open, reservation.seating_type_id, reservation.party_size]);

  useEffect(() => {
    setGuestNames(prev => {
      const next = [...prev];
      while (next.length < extraCount) next.push('');
      return next.slice(0, extraCount);
    });
  }, [extraCount]);

  useEffect(() => {
    if (open) {
      setExtraCount(1);
      setGuestNames(['']);
    }
  }, [open]);

  const handleSubmit = async () => {
    // validate names
    const cleaned = guestNames.map(n => n.trim()).filter(Boolean);
    if (cleaned.length !== extraCount) {
      toast.error(language === 'el' ? 'Συμπλήρωσε όλα τα ονόματα.' : 'Fill in all names.');
      return;
    }
    for (const name of cleaned) {
      if (!LATIN_RESERVATION_NAME_REGEX.test(name)) {
        toast.error(tr.namesError);
        return;
      }
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('add-guests-to-reservation', {
        body: {
          reservation_id: reservation.id,
          extra_guests: extraCount,
          guest_names: cleaned,
        },
      });
      if (error) throw error;
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      // free path
      toast.success(tr.successFree);
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      console.error('add-guests error', e);
      toast.error(e?.message || tr.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
            {/* Counter */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{tr.currentParty}</span>
                <span className="font-medium">{reservation.party_size}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{tr.extraGuests}</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setExtraCount(c => Math.max(1, c - 1))}
                    disabled={extraCount <= 1}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-8 text-center font-semibold">{extraCount}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setExtraCount(c => c + 1)}
                    disabled={!canAdd ? false : reservation.party_size + extraCount + 1 > maxPeople}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground">{tr.newTotal}</span>
                <span className="font-semibold">
                  {newTotal} <span className="text-xs text-muted-foreground">/ {tr.max} {maxPeople}</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{tr.extraCharge}</span>
                <span className="font-semibold text-primary">
                  {extraChargeCents > 0 ? `€${(extraChargeCents / 100).toFixed(2)}` : tr.free}
                </span>
              </div>
            </div>

            {!canAdd && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-2.5">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{tr.maxReached}</p>
              </div>
            )}

            {/* Guest names */}
            <div className="space-y-2">
              <Label className="text-xs">{tr.guestNames}</Label>
              {Array.from({ length: extraCount }).map((_, i) => (
                <Input
                  key={i}
                  value={guestNames[i] || ''}
                  onChange={e => {
                    const next = [...guestNames];
                    next[i] = e.target.value;
                    setGuestNames(next);
                  }}
                  placeholder={tr.guestNamePlaceholder}
                  className="h-9 text-sm"
                />
              ))}
            </div>

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
