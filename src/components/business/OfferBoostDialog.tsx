import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Target, Rocket, Clock } from "lucide-react";
import { format, addDays, addHours } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

type BoostTier = "standard" | "premium";
type DurationMode = "hourly" | "daily";

const HOUR_PRESETS = [1, 2, 3, 6, 12];

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
      dailyRate: 35, 
      hourlyRate: 7, 
      hourlyRateCents: 700, 
      dailyRateCents: 3500,
      icon: Target, 
      quality: 70, 
      color: "text-purple-500" 
    },
    premium: { 
      dailyRate: 50, 
      hourlyRate: 10, 
      hourlyRateCents: 1000,
      dailyRateCents: 5000, 
      icon: Rocket, 
      quality: 100, 
      color: "text-rose-500" 
    },
  };

  const selectedTier = tiers[tier];
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const totalCost = durationMode === "hourly" 
    ? selectedTier.hourlyRate * durationHours 
    : selectedTier.dailyRate * days;
  const totalCostCents = totalCost * 100;

  const canUseSubscriptionBudget =
    hasActiveSubscription && remainingBudgetCents >= totalCostCents;

  const handleBoost = async () => {
    setIsSubmitting(true);
    try {
      const formattedStartDate = startDate.toISOString().split("T")[0];
      const calculatedEndDate = durationMode === "hourly" 
        ? addHours(startDate, durationHours) 
        : endDate;
      const formattedEndDate = calculatedEndDate.toISOString().split("T")[0];

      if (canUseSubscriptionBudget) {
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
        // For now, create the boost without payment (can integrate Stripe later)
        const { data, error } = await supabase.functions.invoke("create-offer-boost", {
          body: {
            discountId: offerId,
            tier,
            durationMode,
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            durationHours: durationMode === "hourly" ? durationHours : undefined,
            useSubscriptionBudget: false,
          },
        });

        if (error) throw error;

        if (data.needsPayment) {
          toast.info(
            language === "el" ? "Απαιτείται πληρωμή" : "Payment required",
            {
              description:
                language === "el"
                  ? `Κόστος: €${data.totalCostCents / 100}`
                  : `Cost: €${data.totalCostCents / 100}`,
            }
          );
        } else if (data.success) {
          toast.success(
            language === "el" ? "Προώθηση ενεργοποιήθηκε!" : "Boost activated!"
          );
          onOpenChange(false);
        }
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
                        <Button variant="outline" className="w-full justify-start text-left">
                          <CalendarIcon className="mr-2 h-4 w-4" />
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
                    <div className="flex flex-wrap gap-2">
                      {HOUR_PRESETS.map((hours) => (
                        <Button
                          key={hours}
                          type="button"
                          variant={durationHours === hours ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDurationHours(hours)}
                        >
                          {hours}{language === "el" ? "ω" : "h"}
                        </Button>
                      ))}
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
                  <span>€{totalCost}</span>
                </div>

                {hasActiveSubscription && (
                  <p className="text-[10px] md:text-xs text-muted-foreground pt-2">
                    {canUseSubscriptionBudget
                      ? language === "el"
                        ? "✓ Θα χρησιμοποιηθεί το budget συνδρομής"
                        : "✓ Will use subscription budget"
                      : language === "el"
                        ? "⚠ Ανεπαρκές budget - χρέωση Stripe"
                        : "⚠ Insufficient budget - Stripe charge"}
                  </p>
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
