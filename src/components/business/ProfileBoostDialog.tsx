import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarIcon, Zap, Crown, Clock, Building2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type BoostTier = "standard" | "premium";
type DurationMode = "hourly" | "daily";

interface ProfileBoostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  businessName: string;
}

const translations = {
  el: {
    title: "Προώθηση Προφίλ",
    description: "Εμφανιστείτε στην κορυφή της ροής ως επιλεγμένη επιχείρηση",
    durationMode: "Διάρκεια",
    hourly: "Ωριαία",
    daily: "Ημερήσια",
    selectTier: "Επιλέξτε Tier",
    standard: "Standard",
    standardDesc: "Καλή προβολή στους χρήστες",
    premium: "Premium",
    premiumDesc: "Μέγιστη προβολή με προτεραιότητα",
    startDate: "Ημερομηνία Έναρξης",
    endDate: "Ημερομηνία Λήξης",
    duration: "Διάρκεια",
    hours: "ώρες",
    totalCost: "Συνολικό Κόστος",
    boostProfile: "Προώθηση Προφίλ",
    processing: "Επεξεργασία...",
    perDay: "/ημέρα",
    perHour: "/ώρα",
    redirecting: "Ανακατεύθυνση στην πληρωμή...",
    continue: "Συνέχεια στην πληρωμή",
  },
  en: {
    title: "Boost Your Profile",
    description: "Appear at the top of the feed as a featured business",
    durationMode: "Duration Mode",
    hourly: "Hourly",
    daily: "Daily",
    selectTier: "Select Tier",
    standard: "Standard",
    standardDesc: "Good visibility to users",
    premium: "Premium",
    premiumDesc: "Maximum visibility with priority",
    startDate: "Start Date",
    endDate: "End Date",
    duration: "Duration",
    hours: "hours",
    totalCost: "Total Cost",
    boostProfile: "Boost Profile",
    processing: "Processing...",
    perDay: "/day",
    perHour: "/hour",
    redirecting: "Redirecting to payment...",
    continue: "Continue to payment",
  },
};

const tiers = {
  standard: {
    dailyRateCents: 3000,
    hourlyRateCents: 500,
    icon: Zap,
    quality: 3.5,
  },
  premium: {
    dailyRateCents: 8000,
    hourlyRateCents: 1200,
    icon: Crown,
    quality: 5,
  },
};

export const ProfileBoostDialog = ({
  open,
  onOpenChange,
  businessId,
  businessName,
}: ProfileBoostDialogProps) => {
  const { language } = useLanguage();
  const t = translations[language];

  const [tier, setTier] = useState<BoostTier>("standard");
  const [durationMode, setDurationMode] = useState<DurationMode>("daily");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 3));
  const [durationHours, setDurationHours] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  // Calculate total cost
  const tierData = tiers[tier];
  let totalCost: number;
  
  if (durationMode === "hourly") {
    totalCost = (tierData.hourlyRateCents * durationHours) / 100;
  } else {
    const diffMs = endDate.getTime() - startDate.getTime();
    const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
    totalCost = (tierData.dailyRateCents * days) / 100;
  }

  const handleBoost = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-profile-boost-checkout", {
        body: {
          businessId,
          tier,
          durationMode,
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
          durationHours: durationMode === "hourly" ? durationHours : undefined,
        },
      });

      if (error) throw error;

      if (data?.url) {
        setCheckoutUrl(data.url);
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error(language === "el" ? "Σφάλμα" : "Error", {
        description: error.message,
      });
      setIsSubmitting(false);
    }
  };

  const hourPresets = [1, 2, 3, 6, 12];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {t.title}
          </DialogTitle>
          <DialogDescription>
            {t.description}
          </DialogDescription>
        </DialogHeader>

        {checkoutUrl ? (
          <div className="space-y-4 text-center py-6">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">{t.redirecting}</p>
            <Button onClick={() => window.location.href = checkoutUrl}>
              {t.continue}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Business name */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{language === "el" ? "Επιχείρηση" : "Business"}</p>
              <p className="font-semibold">{businessName}</p>
            </div>

            {/* Duration Mode Toggle */}
            <div className="space-y-2">
              <Label>{t.durationMode}</Label>
              <div className="flex gap-2">
                <Button
                  variant={durationMode === "hourly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDurationMode("hourly")}
                  className="flex-1"
                >
                  <Clock className="h-4 w-4 mr-1" />
                  {t.hourly}
                </Button>
                <Button
                  variant={durationMode === "daily" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDurationMode("daily")}
                  className="flex-1"
                >
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  {t.daily}
                </Button>
              </div>
            </div>

            {/* Tier Selection */}
            <div className="space-y-2">
              <Label>{t.selectTier}</Label>
              <RadioGroup value={tier} onValueChange={(v) => setTier(v as BoostTier)} className="grid grid-cols-2 gap-3">
                {(["standard", "premium"] as BoostTier[]).map((tierOption) => {
                  const data = tiers[tierOption];
                  const Icon = data.icon;
                  const rate = durationMode === "hourly" ? data.hourlyRateCents : data.dailyRateCents;
                  const rateLabel = durationMode === "hourly" ? t.perHour : t.perDay;

                  return (
                    <Label
                      key={tierOption}
                      htmlFor={tierOption}
                      className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        tier === tierOption
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem value={tierOption} id={tierOption} className="sr-only" />
                      <Icon className={`h-6 w-6 mb-2 ${tierOption === "premium" ? "text-yellow-500" : "text-primary"}`} />
                      <span className="font-semibold capitalize">{t[tierOption]}</span>
                      <span className="text-lg font-bold">€{(rate / 100).toFixed(0)}{rateLabel}</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">
                        {t[`${tierOption}Desc` as keyof typeof t]}
                      </span>
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Duration Selection */}
            {durationMode === "hourly" ? (
              <div className="space-y-2">
                <Label>{t.duration}</Label>
                <div className="flex gap-2 flex-wrap">
                  {hourPresets.map((hours) => (
                    <Button
                      key={hours}
                      variant={durationHours === hours ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDurationHours(hours)}
                    >
                      {hours}h
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.startDate}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(startDate, "PP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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
                  <Label>{t.endDate}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(endDate, "PP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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

            {/* Total Cost */}
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
              <span className="font-medium">{t.totalCost}</span>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                €{totalCost.toFixed(2)}
              </Badge>
            </div>

            {/* Submit Button */}
            <Button onClick={handleBoost} disabled={isSubmitting} className="w-full" size="lg">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t.processing}
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  {t.boostProfile}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProfileBoostDialog;
