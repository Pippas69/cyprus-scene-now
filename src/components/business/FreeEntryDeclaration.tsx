import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Shield, Zap, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface FreeEntryDeclarationProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  canBoost?: boolean;
  onBoostChange?: (boost: boolean) => void;
  boostEnabled?: boolean;
  language: 'el' | 'en';
}

const translations = {
  el: {
    title: "Δήλωση Ελεύθερης Εισόδου",
    declaration: "Δηλώνω ότι αυτή η εκδήλωση είναι πραγματικά ελεύθερης εισόδου και δεν θα ζητηθεί χρέωση στην είσοδο",
    warning: "Η παραβίαση αυτής της δήλωσης μπορεί να οδηγήσει σε αποκλεισμό από τη δημιουργία εκδηλώσεων ελεύθερης εισόδου",
    consequences: {
      title: "Συνέπειες Παραβίασης:",
      first: "1η παραβίαση: Προειδοποίηση",
      second: "2η παραβίαση: Αποκλεισμός από boost ελεύθερης εισόδου",
      third: "3η παραβίαση: Αποκλεισμός από δημιουργία εκδηλώσεων ελεύθερης εισόδου",
    },
    boost: {
      title: "Προώθηση στο NOW",
      description: "Η εκδήλωση θα εμφανίζεται στην κύρια σελίδα NOW",
      note: "Οι εκδηλώσεις ελεύθερης εισόδου μπορούν να προωθηθούν κατά τη δημιουργία",
    },
    required: "Απαιτείται για εκδηλώσεις ελεύθερης εισόδου",
  },
  en: {
    title: "Free Entry Declaration",
    declaration: "I declare that this event is truly free entry and no charge will be requested at the door",
    warning: "Violating this declaration may result in being banned from creating free entry events",
    consequences: {
      title: "Violation Consequences:",
      first: "1st violation: Warning",
      second: "2nd violation: Banned from free entry boost",
      third: "3rd violation: Banned from creating free entry events",
    },
    boost: {
      title: "Boost to NOW",
      description: "Event will appear on the main NOW page",
      note: "Free entry events can be boosted during creation",
    },
    required: "Required for free entry events",
  },
};

export const FreeEntryDeclaration: React.FC<FreeEntryDeclarationProps> = ({
  checked,
  onChange,
  canBoost = true,
  onBoostChange,
  boostEnabled = false,
  language,
}) => {
  const t = translations[language];

  return (
    <div className="space-y-4">
      {/* Declaration Card */}
      <Card className={cn(
        "border-2 transition-colors",
        checked
          ? "border-green-500 bg-green-50/50 dark:bg-green-950/20"
          : "border-amber-200 dark:border-amber-800"
      )}>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="free-entry-declaration"
              checked={checked}
              onCheckedChange={onChange}
              className="mt-1"
            />
            <div className="space-y-2">
              <Label
                htmlFor="free-entry-declaration"
                className="text-base font-medium cursor-pointer"
              >
                {t.title}
              </Label>
              <p className="text-sm text-foreground">
                {t.declaration}
              </p>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {t.warning}
              </p>
              <div className="text-xs space-y-1 text-amber-700 dark:text-amber-300">
                <p className="font-medium">{t.consequences.title}</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li>{t.consequences.first}</li>
                  <li>{t.consequences.second}</li>
                  <li>{t.consequences.third}</li>
                </ul>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Shield className="h-3 w-3" />
            {t.required}
          </p>
        </CardContent>
      </Card>

      {/* Boost Option */}
      {checked && canBoost && onBoostChange && (
        <Card className={cn(
          "border-2 transition-colors",
          boostEnabled
            ? "border-primary bg-primary/5"
            : "border-dashed"
        )}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="free-entry-boost"
                checked={boostEnabled}
                onCheckedChange={onBoostChange}
                className="mt-1"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="free-entry-boost"
                  className="text-base font-medium cursor-pointer flex items-center gap-2"
                >
                  <Zap className="h-4 w-4 text-primary" />
                  {t.boost.title}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t.boost.description}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {t.boost.note}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FreeEntryDeclaration;