import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Gift } from "lucide-react";

interface CreditOfferFieldsProps {
  creditAmountCents: number;
  bonusPercent: number;
  onCreditAmountChange: (cents: number) => void;
  onBonusPercentChange: (percent: number) => void;
  language: 'el' | 'en';
}

const translations = {
  en: {
    creditAmount: "Credit Amount (€)",
    creditAmountHelp: "What the customer pays",
    bonusPercent: "Bonus (%)",
    bonusPercentHelp: "Extra value they receive",
    preview: "Customer gets",
    spending: "spending power",
  },
  el: {
    creditAmount: "Ποσό Πίστωσης (€)",
    creditAmountHelp: "Τι πληρώνει ο πελάτης",
    bonusPercent: "Μπόνους (%)",
    bonusPercentHelp: "Επιπλέον αξία που λαμβάνουν",
    preview: "Ο πελάτης παίρνει",
    spending: "αγοραστική δύναμη",
  },
};

export function CreditOfferFields({
  creditAmountCents,
  bonusPercent,
  onCreditAmountChange,
  onBonusPercentChange,
  language,
}: CreditOfferFieldsProps) {
  const t = translations[language];
  
  const creditAmount = creditAmountCents / 100;
  const totalValue = creditAmount * (1 + bonusPercent / 100);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.creditAmount} *</Label>
          <Input
            type="number"
            min="1"
            step="1"
            placeholder="50"
            value={creditAmount || ''}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              onCreditAmountChange(Math.round(val * 100));
            }}
          />
          <p className="text-xs text-muted-foreground">{t.creditAmountHelp}</p>
        </div>

        <div className="space-y-2">
          <Label>{t.bonusPercent} *</Label>
          <Input
            type="number"
            min="0"
            max="100"
            placeholder="25"
            value={bonusPercent || ''}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              onBonusPercentChange(Math.min(100, Math.max(0, val)));
            }}
          />
          <p className="text-xs text-muted-foreground">{t.bonusPercentHelp}</p>
        </div>
      </div>

      {/* Preview */}
      {creditAmountCents > 0 && bonusPercent > 0 && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="h-5 w-5 text-primary" />
            <span className="font-semibold">{t.preview}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">€{totalValue.toFixed(2)}</span>
            <span className="text-muted-foreground">{t.spending}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">
              {language === 'el' ? 'Πληρώνει' : 'Pays'} €{creditAmount.toFixed(2)}
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
              +{bonusPercent}% {language === 'el' ? 'μπόνους' : 'bonus'}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
