import { useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Target, Rocket, Clock, AlertTriangle, Minus, Plus } from "lucide-react";
import { format, addDays, addHours } from "date-fns";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

export type BoostTier = "standard" | "premium";
export type DurationMode = "hourly" | "daily";

interface OfferBoostSectionProps {
  onBoostChange: (data: {
    enabled: boolean;
    tier: BoostTier;
    durationMode: DurationMode;
    startDate: Date;
    endDate: Date;
    durationHours?: number;
    totalCostCents: number;
    dailyRateCents: number;
    hourlyRateCents?: number;
    targetingQuality: number;
  }) => void;
  hasActiveSubscription?: boolean;
  remainingBudgetCents?: number;
}

import { Input } from "@/components/ui/input";

const OfferBoostSection = ({
  onBoostChange,
  hasActiveSubscription = false,
  remainingBudgetCents = 0,
}: OfferBoostSectionProps) => {
  const { language } = useLanguage();
  const [boostEnabled, setBoostEnabled] = useState(false);
  const [tier, setTier] = useState<BoostTier>("standard");
  const [durationMode, setDurationMode] = useState<DurationMode>("daily");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 7));
  const [durationHours, setDurationHours] = useState<number>(3);
  const [durationHoursInput, setDurationHoursInput] = useState<string>("3");

  // 2-tier boost system with hourly and daily rates
  const tiers = {
    standard: { 
      dailyRate: 25, 
      dailyRateCents: 2500, 
      hourlyRate: 3, 
      hourlyRateCents: 300, 
      icon: Target, 
      quality: 70, 
      color: "text-purple-500" 
    },
    premium: { 
      dailyRate: 40, 
      dailyRateCents: 4000, 
      hourlyRate: 6, 
      hourlyRateCents: 600, 
      icon: Rocket, 
      quality: 100, 
      color: "text-rose-500" 
    },
  };

  const selectedTier = tiers[tier];
  
  // Calculate cost based on duration mode
  const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const totalCost = durationMode === "hourly" 
    ? selectedTier.hourlyRate * durationHours 
    : selectedTier.dailyRate * days;
  const totalCostCents = durationMode === "hourly" 
    ? selectedTier.hourlyRateCents * durationHours 
    : selectedTier.dailyRateCents * days;

  // Full budget covers entire cost
  const canUseSubscriptionBudget = hasActiveSubscription && remainingBudgetCents >= totalCostCents;

  // Partial budget: some credits exist but not enough
  const hasPartialBudget = hasActiveSubscription && remainingBudgetCents > 0 && remainingBudgetCents < totalCostCents;
  const stripeChargeCents = hasPartialBudget ? totalCostCents - remainingBudgetCents : totalCostCents;

  const notifyChange = (
    enabled: boolean,
    newTier: BoostTier,
    newDurationMode: DurationMode,
    newStartDate: Date,
    newEndDate: Date,
    newDurationHours: number
  ) => {
    const tierData = tiers[newTier];
    const newDays = Math.max(1, Math.ceil((newEndDate.getTime() - newStartDate.getTime()) / (1000 * 60 * 60 * 24)));
    const cost = newDurationMode === "hourly" 
      ? tierData.hourlyRateCents * newDurationHours 
      : tierData.dailyRateCents * newDays;
    
    onBoostChange({
      enabled,
      tier: newTier,
      durationMode: newDurationMode,
      startDate: newStartDate,
      endDate: newDurationMode === "hourly" ? addHours(newStartDate, newDurationHours) : newEndDate,
      durationHours: newDurationMode === "hourly" ? newDurationHours : undefined,
      totalCostCents: cost,
      dailyRateCents: tierData.dailyRateCents,
      hourlyRateCents: newDurationMode === "hourly" ? tierData.hourlyRateCents : undefined,
      targetingQuality: tierData.quality,
    });
  };

  const handleBoostToggle = (enabled: boolean) => {
    setBoostEnabled(enabled);
    notifyChange(enabled, tier, durationMode, startDate, endDate, durationHours);
  };

  const handleTierChange = (value: string) => {
    const newTier = value as BoostTier;
    setTier(newTier);
    notifyChange(boostEnabled, newTier, durationMode, startDate, endDate, durationHours);
  };

  const handleDurationModeChange = (mode: DurationMode) => {
    setDurationMode(mode);
    notifyChange(boostEnabled, tier, mode, startDate, endDate, durationHours);
  };

  const handleDurationHoursChange = (hours: number) => {
    setDurationHours(hours);
    notifyChange(boostEnabled, tier, durationMode, startDate, endDate, hours);
  };

  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      setStartDate(date);
      if (durationMode === "daily" && date >= endDate) {
        const newEndDate = addDays(date, 7);
        setEndDate(newEndDate);
        notifyChange(boostEnabled, tier, durationMode, date, newEndDate, durationHours);
      } else {
        notifyChange(boostEnabled, tier, durationMode, date, endDate, durationHours);
      }
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    if (date) {
      setEndDate(date);
      notifyChange(boostEnabled, tier, durationMode, startDate, date, durationHours);
    }
  };

  return (
    <div className="space-y-2 sm:space-y-4 p-2 sm:p-4 border-2 border-dashed rounded-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Label className="text-xs sm:text-base font-semibold flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
            <Rocket className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
            {language === "el" ? "Προώθηση Προσφοράς" : "Boost Offer Visibility"}
          </Label>
          <p className="text-[10px] sm:text-sm text-muted-foreground">
            {language === "el"
              ? "Αυξήστε την εμβέλεια με αλγοριθμική στόχευση"
              : "Increase reach with algorithmic targeting"}
          </p>
        </div>
        <Switch checked={boostEnabled} onCheckedChange={handleBoostToggle} className="shrink-0" />
      </div>

      {boostEnabled && (
        <div className="space-y-6 pt-4 border-t">
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
                onClick={() => handleDurationModeChange("hourly")}
              >
                <Clock className="mr-2 h-4 w-4" />
                {language === "el" ? "Ωριαία" : "Hourly"}
              </Button>
              <Button
                type="button"
                variant={durationMode === "daily" ? "default" : "outline"}
                className="flex-1"
                onClick={() => handleDurationModeChange("daily")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {language === "el" ? "Ημερήσια" : "Daily"}
              </Button>
            </div>
          </div>

          {/* Boost Tiers */}
          <div className="space-y-3">
            <Label>{language === "el" ? "Επιλέξτε Tier" : "Select Tier"}</Label>
            <RadioGroup value={tier} onValueChange={handleTierChange}>
              {Object.entries(tiers).map(([key, { dailyRate, hourlyRate, icon: Icon, quality, color }]) => (
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
                    <p className="font-bold">
                      €{durationMode === "hourly" ? hourlyRate : dailyRate}/{durationMode === "hourly" 
                        ? (language === "el" ? "ώρα" : "hour") 
                        : (language === "el" ? "ημέρα" : "day")}
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
                    <Button variant="outline" className="w-full justify-start text-left text-xs sm:text-sm">
                      <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate sm:hidden">{format(startDate, "dd/MM/yy")}</span>
                      <span className="truncate hidden sm:inline">{format(startDate, "PPP")}</span>
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
                <Label>{language === "el" ? "Διάρκεια" : "Duration"}</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => handleDurationHoursChange(Math.max(1, durationHours - 1))}
                    disabled={durationHours <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={durationHoursInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '' || /^\d+$/.test(raw)) {
                          setDurationHoursInput(raw);
                          const v = parseInt(raw);
                          if (!isNaN(v) && v >= 1 && v <= 24) handleDurationHoursChange(v);
                        }
                      }}
                      onBlur={() => {
                        const v = parseInt(durationHoursInput);
                        if (isNaN(v) || v < 1) { handleDurationHoursChange(1); setDurationHoursInput("1"); }
                        else if (v > 24) { handleDurationHoursChange(24); setDurationHoursInput("24"); }
                        else { setDurationHoursInput(String(v)); }
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
                    onClick={() => handleDurationHoursChange(Math.min(24, durationHours + 1))}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "el" ? "Ημερομηνία Έναρξης" : "Start Date"}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left text-xs sm:text-sm">
                      <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate sm:hidden">{format(startDate, "dd/MM/yy")}</span>
                      <span className="truncate hidden sm:inline">{format(startDate, "PPP")}</span>
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
                    <Button variant="outline" className="w-full justify-start text-left text-xs sm:text-sm">
                      <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate sm:hidden">{format(endDate, "dd/MM/yy")}</span>
                      <span className="truncate hidden sm:inline">{format(endDate, "PPP")}</span>
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
          )}

          {/* Cost Summary */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>{language === "el" ? "Διάρκεια" : "Duration"}:</span>
              <span className="font-semibold">
                {durationMode === "hourly"
                  ? `${durationHours} ${language === "el" ? "ώρες" : "hours"}`
                  : `${days} ${language === "el" ? "ημέρες" : "days"}`}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>
                {durationMode === "hourly"
                  ? language === "el"
                    ? "Ωριαία Τιμή"
                    : "Hourly Rate"
                  : language === "el"
                    ? "Ημερήσια Τιμή"
                    : "Daily Rate"}
                :
              </span>
              <span className="font-semibold">€{durationMode === "hourly" ? selectedTier.hourlyRate : selectedTier.dailyRate}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>{language === "el" ? "Συνολικό Κόστος" : "Total Cost"}:</span>
              <span>€{totalCost}</span>
            </div>

            {hasActiveSubscription && (
              <div className="pt-2 space-y-1">
                {canUseSubscriptionBudget ? (
                  <p className="text-xs text-muted-foreground">
                    {language === "el"
                      ? "✓ Θα χρησιμοποιηθεί το υπόλοιπο budget της συνδρομής σας"
                      : "✓ Will be deducted from your subscription budget"}
                  </p>
                ) : hasPartialBudget ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {language === "el"
                        ? `Δ Μερικό budget: €${(remainingBudgetCents / 100).toFixed(2)}`
                        : `Δ Partial budget: €${(remainingBudgetCents / 100).toFixed(2)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === "el"
                        ? `Χρέωση Stripe: €${(stripeChargeCents / 100).toFixed(2)}`
                        : `Stripe charge: €${(stripeChargeCents / 100).toFixed(2)}`}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {language === "el"
                      ? "⚠ Δεν υπάρχουν διαθέσιμα Boost Credits - θα χρεωθείτε μέσω Stripe"
                      : "⚠ No Boost Credits available - will be charged via Stripe"}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferBoostSection;
