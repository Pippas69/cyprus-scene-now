import { useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Zap, Rocket } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

interface OfferBoostSectionProps {
  onBoostChange: (data: {
    enabled: boolean;
    targetingQuality: number;
  }) => void;
}

const OfferBoostSection = ({
  onBoostChange,
}: OfferBoostSectionProps) => {
  const { language } = useLanguage();
  const [boostEnabled, setBoostEnabled] = useState(false);
  const [targetingQuality, setTargetingQuality] = useState(10);

  const targetingTiers = [
    { value: 5, label: language === "el" ? "Βασική" : "Basic", icon: Zap, color: "text-gray-500" },
    { value: 10, label: language === "el" ? "Καλή" : "Good", icon: Target, color: "text-blue-500" },
    { value: 15, label: language === "el" ? "Δυνατή" : "Strong", icon: TrendingUp, color: "text-purple-500" },
    { value: 20, label: language === "el" ? "Εξαιρετική" : "Excellent", icon: TrendingUp, color: "text-amber-500" },
    { value: 25, label: language === "el" ? "Μέγιστη" : "Maximum", icon: Rocket, color: "text-rose-500" },
  ];

  const handleBoostToggle = (enabled: boolean) => {
    setBoostEnabled(enabled);
    onBoostChange({
      enabled,
      targetingQuality: enabled ? targetingQuality : 0,
    });
  };

  const handleQualityChange = (value: string) => {
    const quality = parseInt(value);
    setTargetingQuality(quality);
    onBoostChange({
      enabled: boostEnabled,
      targetingQuality: quality,
    });
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
        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-3">
            <Label>
              {language === "el"
                ? "Ποιότητα Στόχευσης"
                : "Targeting Quality"}
            </Label>
            <RadioGroup
              value={targetingQuality.toString()}
              onValueChange={handleQualityChange}
            >
              {targetingTiers.map(({ value, label, icon: Icon, color }) => (
                <div
                  key={value}
                  className={cn(
                    "flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all",
                    targetingQuality === value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => handleQualityChange(value.toString())}
                >
                  <RadioGroupItem value={value.toString()} id={`quality-${value}`} />
                  <Icon className={cn("h-4 w-4", color)} />
                  <div className="flex-1">
                    <Label
                      htmlFor={`quality-${value}`}
                      className="cursor-pointer font-semibold"
                    >
                      {label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {language === "el" ? "Επίπεδο" : "Level"}: {value}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {value}%
                  </Badge>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <p>
              {language === "el"
                ? "Η προώθηση αυξάνει την ορατότητα της προσφοράς σας στους χρήστες με βάση τις προτιμήσεις τους."
                : "Boosting increases your offer's visibility to users based on their preferences."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferBoostSection;
