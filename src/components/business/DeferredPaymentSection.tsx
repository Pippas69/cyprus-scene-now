import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Clock, CreditCard, Shield } from 'lucide-react';

const ASMATIO_BUSINESS_ID = 'bca2cb97-1723-4358-87b1-130d279e60a6';

interface DeferredPaymentSectionProps {
  businessId: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  confirmationHours: number;
  onConfirmationHoursChange: (hours: number) => void;
  cancellationFeePercent: number;
  onCancellationFeePercentChange: (percent: number) => void;
  language: 'el' | 'en';
  eventType: string | null;
}

const translations = {
  el: {
    title: 'Αναβαλλόμενη Πληρωμή',
    description: 'Ο πελάτης δεσμεύει κάρτα αλλά δεν χρεώνεται αμέσως. Πρέπει να επιβεβαιώσει παρουσία πριν το deadline.',
    toggle: 'Ενεργοποίηση "Hold Now, Charge Later"',
    confirmationHours: 'Deadline επιβεβαίωσης (ώρες πριν το event)',
    cancellationFee: 'Τέλος ακύρωσης (%)',
    cancellationFeeHint: 'Χρεώνεται αν ο πελάτης δεν επιβεβαιώσει εγκαίρως',
  },
  en: {
    title: 'Deferred Payment',
    description: 'Customer authorizes card but is not charged immediately. Must confirm attendance before the deadline.',
    toggle: 'Enable "Hold Now, Charge Later"',
    confirmationHours: 'Confirmation deadline (hours before event)',
    cancellationFee: 'Cancellation fee (%)',
    cancellationFeeHint: 'Charged if customer does not confirm in time',
  },
};

export const DeferredPaymentSection: React.FC<DeferredPaymentSectionProps> = ({
  businessId,
  enabled,
  onEnabledChange,
  confirmationHours,
  onConfirmationHoursChange,
  cancellationFeePercent,
  onCancellationFeePercentChange,
  language,
  eventType,
}) => {
  // Only show for Asmationexperience and reservation-type events
  if (businessId !== ASMATIO_BUSINESS_ID) return null;
  if (eventType !== 'reservation' && eventType !== 'ticket_and_reservation') return null;

  const t = translations[language];

  return (
    <div className="space-y-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-amber-600" />
        <h4 className="font-semibold text-xs sm:text-sm">{t.title}</h4>
      </div>
      <p className="text-[10px] sm:text-xs text-muted-foreground">{t.description}</p>

      <div className="flex items-center justify-between">
        <Label htmlFor="deferred-toggle" className="text-[10px] sm:text-xs cursor-pointer">
          {t.toggle}
        </Label>
        <Switch
          id="deferred-toggle"
          checked={enabled}
          onCheckedChange={onEnabledChange}
        />
      </div>

      {enabled && (
        <div className="space-y-3 pt-2 border-t border-amber-200 dark:border-amber-800">
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              {t.confirmationHours}
            </Label>
            <Input
              type="number"
              min={1}
              max={72}
              value={confirmationHours}
              onChange={(e) => onConfirmationHoursChange(Math.max(1, Math.min(72, parseInt(e.target.value) || 4)))}
              className="h-8 text-xs w-24"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs flex items-center gap-1.5">
              <CreditCard className="h-3 w-3" />
              {t.cancellationFee}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={10}
                max={100}
                value={cancellationFeePercent}
                onChange={(e) => onCancellationFeePercentChange(Math.max(10, Math.min(100, parseInt(e.target.value) || 50)))}
                className="h-8 text-xs w-24"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
            <p className="text-[9px] text-muted-foreground">{t.cancellationFeeHint}</p>
          </div>
        </div>
      )}
    </div>
  );
};
