import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Package, Layers, ShoppingBasket } from "lucide-react";
import { cn } from "@/lib/utils";
import { PricingType, offerItemTranslations } from "./types";

interface PricingTypeSelectorProps {
  value: PricingType;
  onChange: (value: PricingType) => void;
  language: "el" | "en";
}

export function PricingTypeSelector({ value, onChange, language }: PricingTypeSelectorProps) {
  const t = offerItemTranslations[language];

  const options: { value: PricingType; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      value: "single",
      label: t.singleItem,
      desc: t.singleItemDesc,
      icon: <Package className="h-5 w-5" />,
    },
    {
      value: "bundle",
      label: t.bundleDeal,
      desc: t.bundleDesc,
      icon: <ShoppingBasket className="h-5 w-5" />,
    },
    {
      value: "itemized",
      label: t.itemizedCombo,
      desc: t.itemizedDesc,
      icon: <Layers className="h-5 w-5" />,
    },
  ];

  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">{t.pricingType}</Label>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as PricingType)}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        {options.map((option) => (
          <Label
            key={option.value}
            htmlFor={`pricing-${option.value}`}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all",
              value === option.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <RadioGroupItem
              value={option.value}
              id={`pricing-${option.value}`}
              className="sr-only"
            />
            <div
              className={cn(
                "rounded-full p-2",
                value === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {option.icon}
            </div>
            <span className="font-medium text-sm text-center">{option.label}</span>
            <span className="text-xs text-muted-foreground text-center">{option.desc}</span>
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}
