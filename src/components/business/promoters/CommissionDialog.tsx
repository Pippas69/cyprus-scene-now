import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { PromoterCommissionType } from '@/hooks/usePromoter';

interface CommissionDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: {
    commission_type: PromoterCommissionType | null;
    commission_fixed_ticket_cents: number | null;
    commission_fixed_reservation_cents: number | null;
    commission_percent: number | null;
  };
  onSave: (payload: {
    commissionType: PromoterCommissionType;
    commissionFixedTicketCents: number;
    commissionFixedReservationCents: number;
    commissionPercent: number;
  }) => void | Promise<void>;
  saving?: boolean;
  promoterName?: string;
}

export function CommissionDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  saving,
  promoterName,
}: CommissionDialogProps) {
  const [type, setType] = useState<PromoterCommissionType>('fixed');
  const [ticketEuros, setTicketEuros] = useState('5');
  const [reservationEuros, setReservationEuros] = useState('3');
  const [percent, setPercent] = useState('10');

  useEffect(() => {
    if (!open) return;
    setType(initial?.commission_type || 'fixed');
    setTicketEuros(((initial?.commission_fixed_ticket_cents ?? 500) / 100).toFixed(2));
    setReservationEuros(((initial?.commission_fixed_reservation_cents ?? 300) / 100).toFixed(2));
    setPercent(String(initial?.commission_percent ?? 10));
  }, [open, initial]);

  const handleSave = () => {
    onSave({
      commissionType: type,
      commissionFixedTicketCents: Math.round(parseFloat(ticketEuros || '0') * 100),
      commissionFixedReservationCents: Math.round(parseFloat(reservationEuros || '0') * 100),
      commissionPercent: parseFloat(percent || '0'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Ρύθμιση Αμοιβής</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {promoterName
              ? `Όρισε την αμοιβή για τον/την ${promoterName}.`
              : 'Όρισε πώς θα αμείβεται ο Promoter.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <RadioGroup value={type} onValueChange={(v) => setType(v as PromoterCommissionType)}>
            <div className="flex items-center space-x-2 rounded-md border border-border p-3">
              <RadioGroupItem value="fixed" id="fixed" />
              <Label htmlFor="fixed" className="flex-1 cursor-pointer text-sm">
                Σταθερό ποσό ανά πώληση
              </Label>
            </div>
            <div className="flex items-center space-x-2 rounded-md border border-border p-3">
              <RadioGroupItem value="percent" id="percent" />
              <Label htmlFor="percent" className="flex-1 cursor-pointer text-sm">
                Ποσοστό (%) επί της πώλησης
              </Label>
            </div>
          </RadioGroup>

          {type === 'fixed' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ticket" className="text-xs">€ ανά εισιτήριο</Label>
                <Input
                  id="ticket"
                  type="number"
                  step="0.5"
                  min="0"
                  value={ticketEuros}
                  onChange={(e) => setTicketEuros(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reservation" className="text-xs">€ ανά κράτηση</Label>
                <Input
                  id="reservation"
                  type="number"
                  step="0.5"
                  min="0"
                  value={reservationEuros}
                  onChange={(e) => setReservationEuros(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="percent-input" className="text-xs">Ποσοστό (%)</Label>
              <Input
                id="percent-input"
                type="number"
                step="1"
                min="0"
                max="100"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
              />
            </div>
          )}

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            💡 Η αμοιβή καταβάλλεται εκτός ΦΟΜΟ (cash). Εμείς απλά καταγράφουμε πόσα οφείλονται.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Ακύρωση
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Αποθήκευση…' : 'Αποθήκευση'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
