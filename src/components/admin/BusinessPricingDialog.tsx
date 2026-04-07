import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Percent, DollarSign, Ticket, CalendarCheck, Layers } from 'lucide-react';
import { useBusinessPricingProfile, type FeeBearerType, type RevenueModelType } from '@/hooks/useBusinessPricingProfile';

interface BusinessPricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  businessName: string;
}

export const BusinessPricingDialog = ({
  open,
  onOpenChange,
  businessId,
  businessName,
}: BusinessPricingDialogProps) => {
  const { profile, isLoading, upsertProfile } = useBusinessPricingProfile(businessId);

  const [stripeFeeBearer, setStripeFeeBearer] = useState<FeeBearerType>('buyer');
  const [revenueEnabled, setRevenueEnabled] = useState(false);
  const [revenueModel, setRevenueModel] = useState<RevenueModelType>('commission');
  const [commissionPercent, setCommissionPercent] = useState('0');
  const [fixedFeeBearer, setFixedFeeBearer] = useState<FeeBearerType>('business');
  const [fixedFeeTicket, setFixedFeeTicket] = useState('0');
  const [fixedFeeReservation, setFixedFeeReservation] = useState('0');
  const [fixedFeeHybridTicket, setFixedFeeHybridTicket] = useState('0');
  const [fixedFeeHybridReservation, setFixedFeeHybridReservation] = useState('0');

  // Sync state from profile
  useEffect(() => {
    if (profile) {
      setStripeFeeBearer(profile.stripe_fee_bearer);
      setRevenueEnabled(profile.platform_revenue_enabled);
      setRevenueModel(profile.revenue_model);
      setCommissionPercent(String(profile.commission_percent));
      setFixedFeeBearer(profile.fixed_fee_bearer);
      setFixedFeeTicket(String(profile.fixed_fee_ticket_cents / 100));
      setFixedFeeReservation(String(profile.fixed_fee_reservation_cents / 100));
      setFixedFeeHybridTicket(String(profile.fixed_fee_hybrid_ticket_cents / 100));
      setFixedFeeHybridReservation(String(profile.fixed_fee_hybrid_reservation_cents / 100));
    } else {
      // Defaults for new profile
      setStripeFeeBearer('buyer');
      setRevenueEnabled(false);
      setRevenueModel('commission');
      setCommissionPercent('0');
      setFixedFeeBearer('business');
      setFixedFeeTicket('0');
      setFixedFeeReservation('0');
      setFixedFeeHybridTicket('0');
      setFixedFeeHybridReservation('0');
    }
  }, [profile, open]);

  const handleSave = () => {
    upsertProfile.mutate({
      business_id: businessId,
      stripe_fee_bearer: stripeFeeBearer,
      platform_revenue_enabled: revenueEnabled,
      revenue_model: revenueModel,
      commission_percent: parseFloat(commissionPercent) || 0,
      fixed_fee_bearer: fixedFeeBearer,
      fixed_fee_ticket_cents: Math.round((parseFloat(fixedFeeTicket) || 0) * 100),
      fixed_fee_reservation_cents: Math.round((parseFloat(fixedFeeReservation) || 0) * 100),
      fixed_fee_hybrid_ticket_cents: Math.round((parseFloat(fixedFeeHybridTicket) || 0) * 100),
      fixed_fee_hybrid_reservation_cents: Math.round((parseFloat(fixedFeeHybridReservation) || 0) * 100),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Ρυθμίσεις Τιμολόγησης
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{businessName}</p>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Φόρτωση...</div>
        ) : (
          <div className="space-y-6">
            {/* Axis 1: Stripe Fees */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Stripe Fees</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Ποιος πληρώνει τα Stripe processing fees (2.9% + €0.25);
              </p>
              <RadioGroup
                value={stripeFeeBearer}
                onValueChange={(v) => setStripeFeeBearer(v as FeeBearerType)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2 p-2 rounded-md border hover:bg-muted/50">
                  <RadioGroupItem value="buyer" id="stripe-buyer" />
                  <Label htmlFor="stripe-buyer" className="cursor-pointer flex-1">
                    <span className="font-medium">Πελάτης</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      Προστίθενται στην τελική τιμή
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded-md border hover:bg-muted/50">
                  <RadioGroupItem value="business" id="stripe-business" />
                  <Label htmlFor="stripe-business" className="cursor-pointer flex-1">
                    <span className="font-medium">Επιχείρηση</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      Αφαιρούνται από την είσπραξη
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Axis 2: Platform Revenue */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Έσοδα ΦΟΜΟ</h3>
                </div>
                <Switch
                  checked={revenueEnabled}
                  onCheckedChange={setRevenueEnabled}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {revenueEnabled
                  ? 'Ενεργοποιημένο — η πλατφόρμα εισπράττει από αυτή την επιχείρηση'
                  : 'Απενεργοποιημένο — δεν εισπράττεις τίποτα'}
              </p>

              {revenueEnabled && (
                <div className="space-y-4 pl-2 border-l-2 border-primary/20">
                  {/* Revenue Model Selection */}
                  <RadioGroup
                    value={revenueModel}
                    onValueChange={(v) => setRevenueModel(v as RevenueModelType)}
                    className="space-y-2"
                  >
                    <div className={`p-3 rounded-md border transition-colors ${revenueModel === 'commission' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="commission" id="rev-commission" />
                        <Label htmlFor="rev-commission" className="cursor-pointer flex-1">
                          <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4" />
                            <span className="font-medium">Commission %</span>
                          </div>
                        </Label>
                      </div>
                      {revenueModel === 'commission' && (
                        <div className="mt-3 ml-6">
                          <Label className="text-xs text-muted-foreground">Ποσοστό (%)</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={commissionPercent}
                              onChange={(e) => setCommissionPercent(e.target.value)}
                              className="w-24 h-8"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Αφαιρείται αυτόματα από την επιχείρηση σε κάθε transaction
                          </p>
                        </div>
                      )}
                    </div>

                    <div className={`p-3 rounded-md border transition-colors ${revenueModel === 'fixed_fee' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="fixed_fee" id="rev-fixed" />
                        <Label htmlFor="rev-fixed" className="cursor-pointer flex-1">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-medium">Fixed Fee</span>
                          </div>
                        </Label>
                      </div>

                      {revenueModel === 'fixed_fee' && (
                        <div className="mt-3 ml-6 space-y-4">
                          {/* Who pays the fixed fee */}
                          <div>
                            <Label className="text-xs text-muted-foreground">Ποιος πληρώνει;</Label>
                            <RadioGroup
                              value={fixedFeeBearer}
                              onValueChange={(v) => setFixedFeeBearer(v as FeeBearerType)}
                              className="flex gap-4 mt-1"
                            >
                              <div className="flex items-center space-x-1.5">
                                <RadioGroupItem value="business" id="ff-business" />
                                <Label htmlFor="ff-business" className="text-sm cursor-pointer">Επιχείρηση</Label>
                              </div>
                              <div className="flex items-center space-x-1.5">
                                <RadioGroupItem value="buyer" id="ff-buyer" />
                                <Label htmlFor="ff-buyer" className="text-sm cursor-pointer">Πελάτης</Label>
                              </div>
                            </RadioGroup>
                          </div>

                          {/* Per event type fees */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
                              <Label className="text-sm">Ticket-only events</Label>
                            </div>
                            <div className="flex items-center gap-2 ml-5">
                              <span className="text-xs text-muted-foreground">€</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={fixedFeeTicket}
                                onChange={(e) => setFixedFeeTicket(e.target.value)}
                                className="w-24 h-8"
                                placeholder="0.00"
                              />
                              <span className="text-xs text-muted-foreground">/ εισιτήριο</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground" />
                              <Label className="text-sm">Reservation-only events</Label>
                            </div>
                            <div className="flex items-center gap-2 ml-5">
                              <span className="text-xs text-muted-foreground">€</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={fixedFeeReservation}
                                onChange={(e) => setFixedFeeReservation(e.target.value)}
                                className="w-24 h-8"
                                placeholder="0.00"
                              />
                              <span className="text-xs text-muted-foreground">/ κράτηση</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                              <Label className="text-sm">Hybrid events</Label>
                            </div>
                            <div className="flex items-center gap-2 ml-5">
                              <span className="text-xs text-muted-foreground">€</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={fixedFeeHybridTicket}
                                onChange={(e) => setFixedFeeHybridTicket(e.target.value)}
                                className="w-24 h-8"
                                placeholder="0.00"
                              />
                              <span className="text-xs text-muted-foreground">/ εισιτήριο</span>
                            </div>
                            <div className="flex items-center gap-2 ml-5">
                              <span className="text-xs text-muted-foreground">€</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={fixedFeeHybridReservation}
                                onChange={(e) => setFixedFeeHybridReservation(e.target.value)}
                                className="w-24 h-8"
                                placeholder="0.00"
                              />
                              <span className="text-xs text-muted-foreground">/ κράτηση</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </RadioGroup>
                </div>
              )}
            </div>

            <Separator />

            <Button
              onClick={handleSave}
              disabled={upsertProfile.isPending}
              className="w-full"
            >
              {upsertProfile.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
