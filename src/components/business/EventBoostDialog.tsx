import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Zap, Target, Crown, Rocket } from "lucide-react";
import { format, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

interface EventBoostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  hasActiveSubscription: boolean;
  remainingBudgetCents: number;
}

const EventBoostDialog = ({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  hasActiveSubscription,
  remainingBudgetCents,
}: EventBoostDialogProps) => {
  const { language } = useLanguage();
  const [tier, setTier] = useState<"basic" | "standard" | "premium" | "elite">("basic");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 7));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tiers = {
    basic: { dailyRate: 15, icon: Zap, quality: 50, color: "text-blue-500" },
    standard: { dailyRate: 50, icon: Target, quality: 70, color: "text-purple-500" },
    premium: { dailyRate: 150, icon: Crown, quality: 85, color: "text-amber-500" },
    elite: { dailyRate: 400, icon: Rocket, quality: 100, color: "text-rose-500" },
  };

  const selectedTier = tiers[tier];
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const totalCost = selectedTier.dailyRate * days;
  const totalCostCents = totalCost * 100;

  const canUseSubscriptionBudget =
    hasActiveSubscription && remainingBudgetCents >= totalCostCents;

  const handleBoost = async () => {
    setIsSubmitting(true);
    try {
      const formattedStartDate = startDate.toISOString().split("T")[0];
      const formattedEndDate = endDate.toISOString().split("T")[0];

      if (canUseSubscriptionBudget) {
        // Use subscription budget - call create-event-boost
        const { data, error } = await supabase.functions.invoke("create-event-boost", {
          body: {
            eventId,
            tier,
            startDate: formattedStartDate,
            endDate: formattedEndDate,
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
        // No subscription budget - go directly to Stripe checkout
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
          "create-boost-checkout",
          {
            body: {
              eventId,
              tier,
              startDate: formattedStartDate,
              endDate: formattedEndDate,
            },
          }
        );

        if (checkoutError) throw checkoutError;

        if (checkoutData.url) {
          window.open(checkoutData.url, "_blank");
          toast.success(
            language === "el" ? "Ανακατεύθυνση στην πληρωμή" : "Redirecting to payment",
            {
              description:
                language === "el"
                  ? "Ολοκληρώστε την πληρωμή για να ενεργοποιήσετε την προώθηση"
                  : "Complete payment to activate your boost",
            }
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {language === "el" ? "Προώθηση Εκδήλωσης" : "Boost Event"}
          </DialogTitle>
          <DialogDescription>
            {eventTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Boost Tiers */}
          <div className="space-y-3">
            <Label>{language === "el" ? "Επιλέξτε Tier" : "Select Tier"}</Label>
            <RadioGroup value={tier} onValueChange={(v: any) => setTier(v)}>
              {Object.entries(tiers).map(([key, { dailyRate, icon: Icon, quality, color }]) => (
                <div
                  key={key}
                  className={cn(
                    "flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all",
                    tier === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setTier(key as any)}
                >
                  <RadioGroupItem value={key} id={key} />
                  <Icon className={cn("h-5 w-5", color)} />
                  <div className="flex-1">
                    <Label htmlFor={key} className="cursor-pointer font-semibold capitalize">
                      {key}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {language === "el" ? "Ποιότητα στόχευσης" : "Targeting Quality"}: {quality}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">€{dailyRate}/day</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
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
              <Label>{language === "el" ? "Ημερομηνία Λήξης" : "End Date"}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, "PPP")}
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

          {/* Cost Summary */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>{language === "el" ? "Διάρκεια" : "Duration"}:</span>
              <span className="font-semibold">{days} {language === "el" ? "ημέρες" : "days"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{language === "el" ? "Ημερήσια Τιμή" : "Daily Rate"}:</span>
              <span className="font-semibold">€{selectedTier.dailyRate}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>{language === "el" ? "Συνολικό Κόστος" : "Total Cost"}:</span>
              <span>€{totalCost}</span>
            </div>

            {hasActiveSubscription && (
              <p className="text-xs text-muted-foreground pt-2">
                {canUseSubscriptionBudget
                  ? language === "el"
                    ? "✓ Θα χρησιμοποιηθεί το υπόλοιπο budget της συνδρομής σας"
                    : "✓ Will be deducted from your subscription budget"
                  : language === "el"
                  ? "⚠ Ανεπαρκές budget συνδρομής - θα χρεωθείτε μέσω Stripe"
                  : "⚠ Insufficient subscription budget - will be charged via Stripe"}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {language === "el" ? "Ακύρωση" : "Cancel"}
            </Button>
            <Button
              className="flex-1"
              onClick={handleBoost}
              disabled={isSubmitting || days < 1}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {language === "el" ? "Προώθηση Εκδήλωσης" : "Boost Event"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventBoostDialog;
