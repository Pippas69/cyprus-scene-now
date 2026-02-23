import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Target, Rocket, Clock, AlertTriangle } from "lucide-react";
import { format, addDays, addHours } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

type BoostTier = "standard" | "premium";
type DurationMode = "hourly" | "daily";

import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";

interface OfferBoostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string;
  offerTitle: string;
  hasActiveSubscription: boolean;
  remainingBudgetCents: number;
}

const OfferBoostDialog = ({
  open,
  onOpenChange,
  offerId,
  offerTitle,
  hasActiveSubscription,
  remainingBudgetCents,
}: OfferBoostDialogProps) => {
  const { language } = useLanguage();
  const [tier, setTier] = useState<BoostTier>("standard");
  const [durationMode, setDurationMode] = useState<DurationMode>("daily");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 7));
  const [durationHours, setDurationHours] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  useEffect(() => {
    if (!open) {
      setCheckoutUrl(null);
      setRedirectAttempted(false);
      setIsSubmitting(false);
    }
  }, [open]);

  // 2-tier boost system with hourly and daily rates
  const tiers = {
    standard: { 
      dailyRate: 25, 
      hourlyRate: 3, 
      hourlyRateCents: 300, 
      dailyRateCents: 2500,
      icon: Target, 
      quality: 70, 
      color: "text-purple-500" 
    },
    premium: { 
      dailyRate: 40, 
      hourlyRate: 6, 
      hourlyRateCents: 600,
      dailyRateCents: 4000, 
      icon: Rocket, 
      quality: 100, 
      color: "text-rose-500" 
    },
  };

  const selectedTier = tiers[tier];
  const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

  const totalCost = durationMode === "hourly" 
    ? selectedTier.hourlyRate * durationHours 
    : selectedTier.dailyRate * days;
  const totalCostCents = totalCost * 100;

  // Full budget covers entire cost
  const canUseSubscriptionBudget =
    hasActiveSubscription && remainingBudgetCents >= totalCostCents;
  
  // Partial budget
  const hasPartialBudget = hasActiveSubscription && remainingBudgetCents > 0 && remainingBudgetCents < totalCostCents;
  const stripeChargeCents = hasPartialBudget ? totalCostCents - remainingBudgetCents : totalCostCents;
  const stripeCharge = stripeChargeCents / 100;

  const handleBoost = async () => {
    setIsSubmitting(true);
    try {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const calculatedEndDate = durationMode === "hourly" 
        ? addHours(startDate, durationHours) 
        : endDate;
      const formattedEndDate = format(calculatedEndDate, 'yyyy-MM-dd');

      if (canUseSubscriptionBudget || totalCostCents === 0) {
        const { data, error } = await supabase.functions.invoke("create-offer-boost", {
          body: {
            discountId: offerId,
            tier,
            durationMode,
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            durationHours: durationMode === "hourly" ? durationHours : undefined,
            useSubscriptionBudget: true,
          },
        });

        if (error) throw error;

        if (data.success) {
          toast.success(
            language === "el" ? "Προώθηση ενεργοποιήθηκε!" : "Boost activated!",
            {
              description:
                language === "el"
                  ? "Το υπόλοιπο budget σας ενημερώθηκε."
                  : "Your budget balance has been updated.",
            }
          );
          onOpenChange(false);
        }
      } else {
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
          "create-offer-boost-checkout",
          {
            body: {
              discountId: offerId,
              tier,
              durationMode,
              startDate: formattedStartDate,
              endDate: formattedEndDate,
              durationHours: durationMode === "hourly" ? durationHours : undefined,
              partialBudgetCents: hasPartialBudget ? remainingBudgetCents : 0,
            },
          }
        );

        if (checkoutError) throw checkoutError;

        if (!checkoutData?.url) {
          throw new Error(language === "el" ? "Δεν λήφθηκε σύνδεσμος πληρωμής" : "No checkout URL received");
        }

        const url = checkoutData.url as string;
        setCheckoutUrl(url);
        setRedirectAttempted(false);

        try {
          (document.activeElement as HTMLElement | null)?.blur?.();
          window.location.assign(url);
        } catch {
          // ignore
        }

        toast.success(language === "el" ? "Ανακατεύθυνση στην πληρωμή" : "Redirecting to payment", {
          description:
            language === "el"
              ? "Ολοκληρώστε την πληρωμή για να ενεργοποιήσετε την προώθηση"
              : "Complete payment to activate your boost",
        });

        window.setTimeout(() => {
          setRedirectAttempted(true);
          setIsSubmitting(false);
        }, 900);
      }
    } catch (error: any) {
      toast.error(language === "el" ? "Σφάλμα" : "Error", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader>
          <DialogTitle>
            {language === "el" ? "Προώθηση Προσφοράς" : "Boost Offer"}
          </DialogTitle>
          <DialogDescription>
            {offerTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {checkoutUrl ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className={cn("h-5 w-5", redirectAttempted ? "text-muted-foreground" : "animate-spin text-primary")} />
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {language === "el" ? "Άνοιγμα πληρωμής…" : "Opening payment…"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {redirectAttempted
                        ? language === "el"
                          ? "Αν δεν έγινε αυτόματη ανακατεύθυνση, πατήστε Συνέχεια." 
                          : "If you weren't redirected automatically, tap Continue."
                        : language === "el"
                          ? "Περιμένετε ένα δευτερόλεπτο…" 
                          : "One moment…"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="flex-1" size="lg">
                  <a href={checkoutUrl} target="_self" rel="noopener noreferrer">
                    {language === "el" ? "Συνέχεια στην Πληρωμή" : "Continue to Payment"}
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  {language === "el" ? "Κλείσιμο" : "Close"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Free Plan No-Refund Disclaimer */}
              {!hasActiveSubscription && (
                <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    {language === "el"
                      ? "Προσοχή: Στο Δωρεάν πλάνο, η απενεργοποίηση μιας προώθησης δεν επιστρέφει credits. Η εναπομείνασα αξία χάνεται οριστικά."
                      : "Attention: On the Free plan, deactivating a boost does not return any credits. The remaining value is permanently lost."}
                  </p>
                </div>
              )}

              {/* Duration Mode Toggle */}
              <div className="space-y-3">
                <Label>{language === "el" ? "Λειτουργία Διάρκειας" : "Duration Mode"}</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={durationMode === "hourly" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setDurationMode("hourly")}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {language === "el" ? "Ωριαία" : "Hourly"}
                  </Button>
                  <Button
                    type="button"
                    variant={durationMode === "daily" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setDurationMode("daily")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {language === "el" ? "Ημερήσια" : "Daily"}
                  </Button>
                </div>
              </div>

              {/* Boost Tiers */}
              <div className="space-y-3">
                <Label className="text-xs md:text-sm">{language === "el" ? "Επιλέξτε Tier" : "Select Tier"}</Label>
                <RadioGroup value={tier} onValueChange={(v: any) => setTier(v)}>
                  {Object.entries(tiers).map(([key, { dailyRate, hourlyRate, icon: Icon, quality, color }]) => (
                    <div
                      key={key}
                      className={cn(
                        "flex items-center space-x-2 md:space-x-3 p-3 md:p-4 border-2 rounded-lg cursor-pointer transition-all",
                        tier === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                      )}
                      onClick={() => setTier(key as any)}
                    >
                      <RadioGroupItem value={key} id={`offer-boost-${key}`} />
                      <Icon className={cn("h-4 w-4 md:h-5 md:w-5 flex-shrink-0", color)} />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor={`offer-boost-${key}`} className="cursor-pointer font-semibold capitalize text-xs md:text-sm">
                          {key}
                        </Label>
                        <p className="text-[10px] md:text-xs text-muted-foreground">
                          {language === "el" ? "Ποιότητα" : "Quality"}: {quality}%
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-xs md:text-sm">
                          €{durationMode === "hourly" ? hourlyRate : dailyRate}/{durationMode === "hourly" 
                            ? (language === "el" ? "ώρα" : "hour") 
                            : (language === "el" ? "ημ" : "day")}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Hourly Duration Presets */}
              {durationMode === "hourly" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>{language === "el" ? "Ημερομηνία Έναρξης" : "Start Date"}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left text-xs sm:text-sm lg:text-base">
                          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                          {format(startDate, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => date && setStartDate(date)}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{language === "el" ? "Διάρκεια" : "Duration"}</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => setDurationHours(Math.max(1, durationHours - 1))}
                        disabled={durationHours <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={1}
                          max={24}
                          value={durationHours}
                          onChange={(e) => {
                            const v = parseInt(e.target.value);
                            if (!isNaN(v)) setDurationHours(Math.min(24, Math.max(1, v)));
                          }}
                          className="w-16 text-center"
                        />
                        <span className="text-sm text-muted-foreground">{language === "el" ? "ώρες" : "hours"}</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => setDurationHours(Math.min(24, durationHours + 1))}
                        disabled={durationHours >= 24}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Daily Date Range */}
              {durationMode === "daily" && (
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] md:text-xs lg:text-sm whitespace-nowrap">
                      {language === "el" ? "Ημ/νία Έναρξης" : "Start Date"}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left text-[10px] md:text-xs lg:text-sm px-2 md:px-3">
                          <CalendarIcon className="mr-1.5 h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
                          <span className="truncate">{format(startDate, "dd/MM/yy")}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => date && setStartDate(date)}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] md:text-xs lg:text-sm whitespace-nowrap">
                      {language === "el" ? "Ημ/νία Λήξης" : "End Date"}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left text-[10px] md:text-xs lg:text-sm px-2 md:px-3">
                          <CalendarIcon className="mr-1.5 h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
                          <span className="truncate">{format(endDate, "dd/MM/yy")}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(date) => date && setEndDate(date)}
                          disabled={(date) => date <= startDate}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              {/* Cost Summary */}
              <div className="p-3 md:p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-xs md:text-sm">
                  <span>{language === "el" ? "Διάρκεια" : "Duration"}:</span>
                  <span className="font-semibold">
                    {durationMode === "hourly" 
                      ? `${durationHours} ${language === "el" ? "ώρες" : "hours"}`
                      : `${days} ${language === "el" ? "ημ." : "days"}`
                    }
                  </span>
                </div>
                <div className="flex justify-between text-xs md:text-sm">
                  <span>{durationMode === "hourly" 
                    ? (language === "el" ? "Τιμή/ώρα" : "Per Hour") 
                    : (language === "el" ? "Τιμή/ημ." : "Per Day")}:</span>
                  <span className="font-semibold">
                    €{durationMode === "hourly" ? selectedTier.hourlyRate : selectedTier.dailyRate}
                  </span>
                </div>

                <div className="flex justify-between text-xs md:text-sm font-bold pt-2 border-t">
                  <span>{language === "el" ? "Σύνολο" : "Total"}:</span>
                  <span>€{totalCost.toFixed(2)}</span>
                </div>

                {hasActiveSubscription && (
                  <div className="text-[10px] md:text-xs text-muted-foreground pt-2 space-y-1">
                    {canUseSubscriptionBudget ? (
                      <p>✓ {language === "el" ? "Θα χρησιμοποιηθεί το budget συνδρομής" : "Will use subscription budget"}</p>
                    ) : hasPartialBudget ? (
                      <>
                        <p>⚠ {language === "el" ? "Μερικό budget" : "Partial budget"}: €{(remainingBudgetCents / 100).toFixed(2)}</p>
                        <p className="font-semibold">
                          {language === "el" ? "Χρέωση Stripe" : "Stripe charge"}: €{stripeCharge.toFixed(2)}
                        </p>
                      </>
                    ) : (
                      <p>⚠ {language === "el" ? "Ανεπαρκές budget - χρέωση Stripe" : "Insufficient budget - Stripe charge"}: €{totalCost.toFixed(2)}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  {language === "el" ? "Αργότερα" : "Later"}
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleBoost}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {language === "el" ? "Επεξεργασία..." : "Processing..."}
                    </>
                  ) : (
                    <>
                      <Rocket className="mr-2 h-4 w-4" />
                      {language === "el" ? "Προώθηση" : "Boost"}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OfferBoostDialog;
