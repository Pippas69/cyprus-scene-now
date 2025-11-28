import { useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Zap } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

interface OfferBoostSectionProps {
  hasActiveSubscription: boolean;
  remainingCommissionFreeOffers: number;
  onBoostChange: (data: {
    enabled: boolean;
    commissionPercent: number;
    useCommissionFreeSlot: boolean;
  }) => void;
}

const OfferBoostSection = ({
  hasActiveSubscription,
  remainingCommissionFreeOffers,
  onBoostChange,
}: OfferBoostSectionProps) => {
  const { language } = useLanguage();
  const [boostEnabled, setBoostEnabled] = useState(false);
  const [commissionPercent, setCommissionPercent] = useState(10);
  const [useCommissionFreeSlot, setUseCommissionFreeSlot] = useState(
    hasActiveSubscription && remainingCommissionFreeOffers > 0
  );

  const commissionTiers = [
    { value: 5, quality: 5, icon: Zap, color: "text-gray-500" },
    { value: 10, quality: 10, icon: Target, color: "text-blue-500" },
    { value: 15, quality: 15, icon: TrendingUp, color: "text-purple-500" },
    { value: 20, quality: 20, icon: TrendingUp, color: "text-amber-500" },
    { value: 25, quality: 25, icon: TrendingUp, color: "text-rose-500" },
  ];

  const handleBoostToggle = (enabled: boolean) => {
    setBoostEnabled(enabled);
    onBoostChange({
      enabled,
      commissionPercent,
      useCommissionFreeSlot: enabled ? useCommissionFreeSlot : false,
    });
  };

  const handleCommissionChange = (value: string) => {
    const percent = parseInt(value);
    setCommissionPercent(percent);
    onBoostChange({
      enabled: boostEnabled,
      commissionPercent: percent,
      useCommissionFreeSlot,
    });
  };

  const handleFreeSlotToggle = (checked: boolean) => {
    setUseCommissionFreeSlot(checked);
    onBoostChange({
      enabled: boostEnabled,
      commissionPercent,
      useCommissionFreeSlot: checked,
    });
  };

  return (
    <div className="space-y-4 p-4 border-2 border-dashed rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">
            {language === "el" ? "Προώθηση Προσφοράς" : "Boost Offer"}
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
          {/* Commission-Free Option for Subscribers */}
          {hasActiveSubscription && remainingCommissionFreeOffers > 0 && (
            <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex-1">
                <Label className="font-semibold">
                  {language === "el" ? "Χρήση Χωρίς Προμήθεια" : "Use Commission-Free Slot"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {remainingCommissionFreeOffers}{" "}
                  {language === "el" ? "διαθέσιμες" : "remaining"}
                </p>
              </div>
              <Switch
                checked={useCommissionFreeSlot}
                onCheckedChange={handleFreeSlotToggle}
              />
            </div>
          )}

          {!useCommissionFreeSlot && (
            <>
              <div className="space-y-3">
                <Label>
                  {language === "el"
                    ? "Ποσοστό Προμήθειας (ανά εξαργύρωση)"
                    : "Commission Percentage (per redemption)"}
                </Label>
                <RadioGroup
                  value={commissionPercent.toString()}
                  onValueChange={handleCommissionChange}
                >
                  {commissionTiers.map(({ value, quality, icon: Icon, color }) => (
                    <div
                      key={value}
                      className={cn(
                        "flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all",
                        commissionPercent === value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => handleCommissionChange(value.toString())}
                    >
                      <RadioGroupItem value={value.toString()} id={`commission-${value}`} />
                      <Icon className={cn("h-4 w-4", color)} />
                      <div className="flex-1">
                        <Label
                          htmlFor={`commission-${value}`}
                          className="cursor-pointer font-semibold"
                        >
                          {value}% {language === "el" ? "Προμήθεια" : "Commission"}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {language === "el" ? "Ποιότητα" : "Quality"}: {quality}%
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {language === "el" ? "Στόχευση" : "Targeting"}: {quality}%
                      </Badge>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                <p>
                  {language === "el"
                    ? "Η προμήθεια υπολογίζεται από την αρχική τιμή (όχι την τιμή με έκπτωση) κάθε εξαργύρωσης QR code."
                    : "Commission is calculated from the original price (not discounted price) of each QR code redemption."}
                </p>
              </div>
            </>
          )}

          {useCommissionFreeSlot && (
            <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-sm">
              <p className="font-semibold text-success">
                {language === "el" ? "✓ Χωρίς Προμήθεια" : "✓ Commission-Free"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {language === "el"
                  ? "Αυτή η προσφορά θα προωθηθεί χωρίς προμήθεια χρησιμοποιώντας τη συνδρομή σας."
                  : "This offer will be boosted commission-free using your subscription."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OfferBoostSection;
