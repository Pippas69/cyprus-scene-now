import { useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Zap, Target, Crown, Rocket } from "lucide-react";
import { format, addDays } from "date-fns";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

export type BoostTier = "basic" | "standard" | "premium" | "elite";

interface OfferBoostSectionProps {
  onBoostChange: (data: {
    enabled: boolean;
    tier: BoostTier;
    startDate: Date;
    endDate: Date;
    totalCostCents: number;
    dailyRateCents: number;
    targetingQuality: number;
  }) => void;
  hasActiveSubscription?: boolean;
  remainingBudgetCents?: number;
}

const OfferBoostSection = ({
  onBoostChange,
  hasActiveSubscription = false,
  remainingBudgetCents = 0,
}: OfferBoostSectionProps) => {
  const { language } = useLanguage();
  const [boostEnabled, setBoostEnabled] = useState(false);
  const [tier, setTier] = useState<BoostTier>("basic");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 7));

  // Same tiers as EventBoostDialog
  const tiers = {
    basic: { dailyRate: 15, dailyRateCents: 1500, icon: Zap, quality: 50, color: "text-blue-500" },
    standard: { dailyRate: 50, dailyRateCents: 5000, icon: Target, quality: 70, color: "text-purple-500" },
    premium: { dailyRate: 150, dailyRateCents: 15000, icon: Crown, quality: 85, color: "text-amber-500" },
    elite: { dailyRate: 400, dailyRateCents: 40000, icon: Rocket, quality: 100, color: "text-rose-500" },
  };

  const selectedTier = tiers[tier];
  const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const totalCost = selectedTier.dailyRate * days;
  const totalCostCents = selectedTier.dailyRateCents * days;

  const canUseSubscriptionBudget = hasActiveSubscription && remainingBudgetCents >= totalCostCents;

  const notifyChange = (
    enabled: boolean,
    newTier: BoostTier,
    newStartDate: Date,
    newEndDate: Date
  ) => {
    const tierData = tiers[newTier];
    const newDays = Math.max(1, Math.ceil((newEndDate.getTime() - newStartDate.getTime()) / (1000 * 60 * 60 * 24)));
    onBoostChange({
      enabled,
      tier: newTier,
      startDate: newStartDate,
      endDate: newEndDate,
      totalCostCents: tierData.dailyRateCents * newDays,
      dailyRateCents: tierData.dailyRateCents,
      targetingQuality: tierData.quality,
    });
  };

  const handleBoostToggle = (enabled: boolean) => {
    setBoostEnabled(enabled);
    notifyChange(enabled, tier, startDate, endDate);
  };

  const handleTierChange = (value: string) => {
    const newTier = value as BoostTier;
    setTier(newTier);
    notifyChange(boostEnabled, newTier, startDate, endDate);
  };

  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      setStartDate(date);
      // Ensure end date is after start date
      if (date >= endDate) {
        const newEndDate = addDays(date, 7);
        setEndDate(newEndDate);
        notifyChange(boostEnabled, tier, date, newEndDate);
      } else {
        notifyChange(boostEnabled, tier, date, endDate);
      }
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    if (date) {
      setEndDate(date);
      notifyChange(boostEnabled, tier, startDate, date);
    }
  };

  return (
    <div className="space-y-4 p-4 border-2 border-dashed rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            {language === "el" ? "Προώθηση Προσφοράς" : "Boost Offer Visibility"}
          </Label>
          <p className="text-sm text-muted-foreground">
            {language === "el"
              ? "Αυξήστε την εμβέλεια με αλγοριθμική στόχευση"
              : "Increase reach with algorithmic targeting"}
          </p>
        </div>
        <Switch checked={boostEnabled} onCheckedChange={handleBoostToggle} />
      </div>

      {boostEnabled && (
        <div className="space-y-6 pt-4 border-t">
          {/* Boost Tiers */}
          <div className="space-y-3">
            <Label>{language === "el" ? "Επιλέξτε Tier" : "Select Tier"}</Label>
            <RadioGroup value={tier} onValueChange={handleTierChange}>
              {Object.entries(tiers).map(([key, { dailyRate, icon: Icon, quality, color }]) => (
                <div
                  key={key}
                  className={cn(
                    "flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all",
                    tier === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  )}
                  onClick={() => handleTierChange(key)}
                >
                  <RadioGroupItem value={key} id={`offer-tier-${key}`} />
                  <Icon className={cn("h-5 w-5", color)} />
                  <div className="flex-1">
                    <Label htmlFor={`offer-tier-${key}`} className="cursor-pointer font-semibold capitalize">
                      {key}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {language === "el" ? "Ποιότητα στόχευσης" : "Targeting Quality"}: {quality}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">€{dailyRate}/{language === "el" ? "ημέρα" : "day"}</p>
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
                    onSelect={handleStartDateChange}
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
                    onSelect={handleEndDateChange}
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
              <span className="font-semibold">
                {days} {language === "el" ? "ημέρες" : "days"}
              </span>
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
        </div>
      )}
    </div>
  );
};

export default OfferBoostSection;
