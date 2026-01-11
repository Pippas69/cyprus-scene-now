import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Users, Euro, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SeatingTier {
  min_people: number;
  max_people: number;
  prepaid_min_charge_cents: number;
}

interface SeatingTierEditorProps {
  value: SeatingTier[];
  onChange: (tiers: SeatingTier[]) => void;
  language: 'el' | 'en';
  minPartySize?: number;
  maxPartySize?: number;
}

const translations = {
  el: {
    addTier: "Προσθήκη Κλίμακας",
    minPeople: "Από",
    maxPeople: "Έως",
    people: "άτομα",
    prepaidAmount: "Ελάχιστη Προπληρωμή",
    remove: "Αφαίρεση",
    validation: {
      overlap: "Οι κλίμακες αλληλεπικαλύπτονται",
      gap: "Υπάρχει κενό μεταξύ κλιμάκων",
    },
    hint: "Το ποσό αυτό λειτουργεί ως πίστωση στο μαγαζί",
  },
  en: {
    addTier: "Add Tier",
    minPeople: "From",
    maxPeople: "To",
    people: "people",
    prepaidAmount: "Prepaid Minimum Charge",
    remove: "Remove",
    validation: {
      overlap: "Tiers are overlapping",
      gap: "There's a gap between tiers",
    },
    hint: "This amount counts as credit at the venue",
  },
};

export const SeatingTierEditor: React.FC<SeatingTierEditorProps> = ({
  value,
  onChange,
  language,
  minPartySize = 1,
  maxPartySize = 10,
}) => {
  const t = translations[language];

  const addTier = () => {
    const lastTier = value[value.length - 1];
    const newMinPeople = lastTier ? lastTier.max_people + 1 : minPartySize;
    const newMaxPeople = Math.min(newMinPeople + 2, maxPartySize);
    
    if (newMinPeople > maxPartySize) return;

    const newTier: SeatingTier = {
      min_people: newMinPeople,
      max_people: newMaxPeople,
      prepaid_min_charge_cents: lastTier ? lastTier.prepaid_min_charge_cents + 2500 : 5000,
    };

    onChange([...value, newTier]);
  };

  const updateTier = React.useCallback((index: number, updates: Partial<SeatingTier>) => {
    const existingTier = value[index];
    if (!existingTier) return;
    
    // Check if any update value is actually different
    let hasActualChange = false;
    for (const key of Object.keys(updates) as Array<keyof SeatingTier>) {
      if (updates[key] !== existingTier[key]) {
        hasActualChange = true;
        break;
      }
    }
    
    if (!hasActualChange) return; // Bail out - nothing changed
    
    const newTiers = value.map((tier, i) =>
      i === index ? { ...tier, ...updates } : tier
    );
    onChange(newTiers);
  }, [value, onChange]);

  const removeTier = (index: number) => {
    if (value.length <= 1) return;
    onChange(value.filter((_, i) => i !== index));
  };

  // Validation
  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    const sortedTiers = [...value].sort((a, b) => a.min_people - b.min_people);
    
    for (let i = 0; i < sortedTiers.length - 1; i++) {
      const current = sortedTiers[i];
      const next = sortedTiers[i + 1];
      
      if (current.max_people >= next.min_people) {
        errors.push(t.validation.overlap);
        break;
      }
      if (current.max_people + 1 < next.min_people) {
        errors.push(t.validation.gap);
        break;
      }
    }
    
    return errors;
  };

  const validationErrors = getValidationErrors();

  const formatPrice = (cents: number): string => {
    return (cents / 100).toFixed(2);
  };

  const parsePrice = (value: string): number => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  };

  return (
    <div className="space-y-3">
      {/* Tiers */}
      {value.map((tier, index) => (
        <div
          key={index}
          className="flex flex-wrap items-end gap-3 p-3 bg-muted/50 rounded-lg"
        >
          <div className="flex-1 min-w-[100px]">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              {t.minPeople}
            </Label>
            <Input
              type="number"
              min={minPartySize}
              max={tier.max_people}
              value={tier.min_people}
              onChange={(e) => updateTier(index, { min_people: parseInt(e.target.value) || minPartySize })}
              className="h-9"
            />
          </div>

          <div className="flex items-center text-muted-foreground">—</div>

          <div className="flex-1 min-w-[100px]">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              {t.maxPeople}
            </Label>
            <Input
              type="number"
              min={tier.min_people}
              max={maxPartySize}
              value={tier.max_people}
              onChange={(e) => updateTier(index, { max_people: parseInt(e.target.value) || tier.min_people })}
              className="h-9"
            />
          </div>

          <div className="flex items-center text-sm text-muted-foreground">
            {t.people}
          </div>

          <div className="flex items-center text-muted-foreground">→</div>

          <div className="flex-1 min-w-[140px]">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Euro className="h-3 w-3" />
              {t.prepaidAmount}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={formatPrice(tier.prepaid_min_charge_cents)}
                onChange={(e) => updateTier(index, { prepaid_min_charge_cents: parsePrice(e.target.value) })}
                className="h-9 pl-7"
              />
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:text-destructive"
            onClick={() => removeTier(index)}
            disabled={value.length <= 1}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {validationErrors[0]}
        </div>
      )}

      {/* Hint */}
      <p className="text-xs text-muted-foreground italic">
        💡 {t.hint}
      </p>

      {/* Add Tier Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addTier}
        className="w-full"
        disabled={value.length > 0 && value[value.length - 1]?.max_people >= maxPartySize}
      >
        <Plus className="h-4 w-4 mr-2" />
        {t.addTier}
      </Button>
    </div>
  );
};

export default SeatingTierEditor;