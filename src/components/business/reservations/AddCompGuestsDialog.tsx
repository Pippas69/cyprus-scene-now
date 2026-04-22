import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Minus, Loader2, Mail, Gift, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LATIN_RESERVATION_NAME_REGEX } from '@/lib/reservationValidation';

interface AddCompGuestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: {
    id: string;
    reservation_name: string;
    party_size: number;
    event_minimum_age?: number | null;
    event_title?: string | null;
  };
  language: 'el' | 'en';
  onSuccess?: () => void;
}

const T = {
  el: {
    title: 'Πρόσθεσε δωρεάν καλεσμένους',
    subtitle: (name: string) => `Στην κράτηση: ${name}`,
    countLabel: 'Πόσοι δωρεάν καλεσμένοι;',
    guestsHeader: 'Στοιχεία καλεσμένων',
    guest: 'Καλεσμένος',
    name: 'Όνομα',
    namePlaceholder: 'π.χ. Maria Papadopoulou',
    age: 'Ηλικία',
    emailLabel: 'Email αποστολής QR codes',
    emailPlaceholder: 'email@example.com',
    emailHint: 'Όλα τα QR codes θα σταλούν σε αυτό το email',
    cancel: 'Ακύρωση',
    submit: 'Αποστολή Προσκλήσεων',
    sending: 'Αποστολή...',
    nameLatinError: 'Τα ονόματα πρέπει να είναι σε λατινικούς χαρακτήρες',
    fillAllError: 'Συμπλήρωσε όνομα και ηλικία για κάθε καλεσμένο',
    emailRequired: 'Απαιτείται έγκυρο email',
    minAgeError: (n: number) => `Ελάχιστο όριο ηλικίας: ${n} ετών`,
    successOne: 'Η πρόσκληση στάλθηκε!',
    successMany: (n: number) => `${n} προσκλήσεις στάλθηκαν!`,
    error: 'Κάτι πήγε στραβά',
    note: 'Δεν χρεώνεται η επιχείρηση και ο πελάτης. Δωρεάν είσοδος για τους καλεσμένους.',
  },
  en: {
    title: 'Add free guests',
    subtitle: (name: string) => `To reservation: ${name}`,
    countLabel: 'How many free guests?',
    guestsHeader: 'Guest details',
    guest: 'Guest',
    name: 'Name',
    namePlaceholder: 'e.g. Maria Papadopoulou',
    age: 'Age',
    emailLabel: 'Email for QR codes',
    emailPlaceholder: 'email@example.com',
    emailHint: 'All QR codes will be sent to this email',
    cancel: 'Cancel',
    submit: 'Send Invitations',
    sending: 'Sending...',
    nameLatinError: 'Names must be in Latin characters only',
    fillAllError: 'Fill name and age for every guest',
    emailRequired: 'A valid email is required',
    minAgeError: (n: number) => `Minimum age: ${n}`,
    successOne: 'Invitation sent!',
    successMany: (n: number) => `${n} invitations sent!`,
    error: 'Something went wrong',
    note: 'No charges to the business or customer. Free entry for the guests.',
  },
};

export const AddCompGuestsDialog = ({
  open,
  onOpenChange,
  reservation,
  language,
  onSuccess,
}: AddCompGuestsDialogProps) => {
  const t = T[language];
  const [count, setCount] = useState(1);
  const [guests, setGuests] = useState<{ name: string; age: string }[]>([{ name: '', age: '' }]);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const minAge = reservation.event_minimum_age ?? 0;

  useEffect(() => {
    if (open) {
      setCount(1);
      setGuests([{ name: '', age: '' }]);
      setEmail('');
      setSubmitting(false);
    }
  }, [open]);

  // Resize guests array when count changes
  useEffect(() => {
    setGuests((prev) => {
      const next = [...prev];
      while (next.length < count) next.push({ name: '', age: '' });
      return next.slice(0, count);
    });
  }, [count]);

  const updateGuest = (idx: number, field: 'name' | 'age', val: string) => {
    setGuests((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const allFilled = useMemo(() => {
    return guests.every((g) => {
      if (!g.name.trim()) return false;
      const age = parseInt(g.age, 10);
      if (isNaN(age) || age <= 0) return false;
      if (minAge && age < minAge) return false;
      return true;
    });
  }, [guests, minAge]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = count > 0 && allFilled && emailValid && !submitting;

  const handleSubmit = async () => {
    // Validation
    for (const g of guests) {
      if (!LATIN_RESERVATION_NAME_REGEX.test(g.name.trim())) {
        toast.error(t.nameLatinError);
        return;
      }
      const age = parseInt(g.age, 10);
      if (minAge && age < minAge) {
        toast.error(t.minAgeError(minAge));
        return;
      }
    }
    if (!emailValid) {
      toast.error(t.emailRequired);
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('add-comp-guests', {
        body: {
          reservation_id: reservation.id,
          extra_guests: count,
          guest_names: guests.map((g) => g.name.trim()),
          guest_ages: guests.map((g) => parseInt(g.age, 10)),
          email: email.trim(),
        },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast.success(count === 1 ? t.successOne : t.successMany(count));
      onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error('add-comp-guests failed', e);
      toast.error(e?.message || t.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            {t.title}
          </DialogTitle>
          <DialogDescription>{t.subtitle(reservation.reservation_name)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Counter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t.countLabel}</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full shrink-0"
                onClick={() => setCount((c) => Math.max(1, c - 1))}
                disabled={count <= 1 || submitting}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <div className="text-2xl font-bold tabular-nums">{count}</div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full shrink-0"
                onClick={() => setCount((c) => c + 1)}
                disabled={submitting}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Guest fields */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t.guestsHeader}</Label>
            <div className="space-y-2.5">
              {guests.map((g, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {i + 1}
                  </div>
                  <Input
                    value={g.name}
                    onChange={(e) => updateGuest(i, 'name', e.target.value)}
                    placeholder={t.namePlaceholder}
                    className="flex-1 min-w-0"
                    disabled={submitting}
                    aria-label={`${t.name} ${i + 1}`}
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={g.age}
                    onChange={(e) => updateGuest(i, 'age', e.target.value)}
                    placeholder={t.age}
                    className="w-20 shrink-0"
                    min={minAge || 1}
                    max={120}
                    disabled={submitting}
                    aria-label={`${t.age} ${i + 1}`}
                  />
                </div>
              ))}
            </div>
            {minAge > 0 && (
              <p className="text-xs text-muted-foreground">{t.minAgeError(minAge)}</p>
            )}
          </div>

          {/* Single email */}
          <div className="space-y-2">
            <Label htmlFor="comp-email" className="text-sm font-medium flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {t.emailLabel}
            </Label>
            <Input
              id="comp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">{t.emailHint}</p>
          </div>

          {/* Note */}
          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
            <p className="text-xs text-muted-foreground leading-relaxed">{t.note}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t.cancel}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="min-w-[170px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t.sending}
                </>
              ) : (
                <>
                  <User className="h-4 w-4 mr-2" />
                  {t.submit}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
