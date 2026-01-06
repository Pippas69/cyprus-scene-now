import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Percent, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export type OfferType = 'regular' | 'credit';

interface OfferTypeSelectorProps {
  value: OfferType;
  onChange: (type: OfferType) => void;
  language: 'el' | 'en';
}

const translations = {
  en: {
    title: "Offer Type",
    regular: "Regular Offer",
    regularDesc: "One-time discount offer",
    credit: "Store Credit",
    creditDesc: "Prepaid credit with bonus",
  },
  el: {
    title: "Τύπος Προσφοράς",
    regular: "Κανονική Προσφορά",
    regularDesc: "Έκπτωση μιας χρήσης",
    credit: "Πιστωτικό Κατάστημα",
    creditDesc: "Προπληρωμένη πίστωση με μπόνους",
  },
};

export function OfferTypeSelector({ value, onChange, language }: OfferTypeSelectorProps) {
  const t = translations[language];

  const options: { type: OfferType; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      type: 'regular',
      label: t.regular,
      desc: t.regularDesc,
      icon: <Percent className="h-5 w-5" />,
    },
    {
      type: 'credit',
      label: t.credit,
      desc: t.creditDesc,
      icon: <Wallet className="h-5 w-5" />,
    },
  ];

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{t.title}</Label>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => (
          <Card
            key={option.type}
            className={cn(
              "cursor-pointer transition-all hover:border-primary/50",
              value === option.type && "border-primary ring-2 ring-primary/20"
            )}
            onClick={() => onChange(option.type)}
          >
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className={cn(
                "p-2 rounded-full",
                value === option.type ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                {option.icon}
              </div>
              <div>
                <p className="font-medium text-sm">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
