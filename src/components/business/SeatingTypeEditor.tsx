import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GlassWater, TableIcon, Crown, Sofa, Users, Shirt, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeatingTierEditor, SeatingTier } from "./SeatingTierEditor";
import { cn } from "@/lib/utils";

export type SeatingType = 'bar' | 'table' | 'vip' | 'sofa';
export type DressCode = 'casual' | 'smart_casual' | 'elegant' | 'no_sportswear';
export type NoShowPolicy = 'refundable' | 'partial_refund' | 'non_refundable';

export interface SeatingTypeConfig {
  seating_type: SeatingType;
  available_slots: number;
  dress_code: DressCode | null;
  cancellation_policy: string | null;
  no_show_policy: NoShowPolicy;
  tiers: SeatingTier[];
}

interface SeatingTypeEditorProps {
  value: SeatingTypeConfig[];
  onChange: (configs: SeatingTypeConfig[]) => void;
  language: 'el' | 'en';
  minPartySize?: number;
  maxPartySize?: number;
}

const translations = {
  el: {
    title: "Τύποι Θέσεων",
    subtitle: "Ρυθμίστε τους διαθέσιμους τύπους θέσεων και τις τιμές τους",
    selectTypes: "Επιλέξτε τύπους θέσεων",
    seatingTypes: {
      bar: "Μπαρ",
      table: "Τραπέζι",
      vip: "VIP",
      sofa: "Καναπές",
    },
    availableSlots: "Διαθέσιμες θέσεις",
    slotsHint: "π.χ. 5 τραπέζια VIP",
    dressCode: "Ενδυματολογικός Κώδικας",
    dressCodeOptions: {
      none: "Κανένας",
      casual: "Καθημερινό",
      smart_casual: "Έξυπνο Καθημερινό",
      elegant: "Κομψό",
      no_sportswear: "Όχι Αθλητικά",
    },
    noShowPolicy: "Πολιτική Μη Εμφάνισης",
    noShowOptions: {
      refundable: "Επιστρέψιμο",
      partial_refund: "Μερική Επιστροφή",
      non_refundable: "Μη Επιστρέψιμο",
    },
    priceTiers: "Κλίμακες Τιμών",
    priceTiersHint: "Ορίστε διαφορετικές τιμές ανάλογα με το μέγεθος της παρέας",
    remove: "Αφαίρεση",
  },
  en: {
    title: "Seating Types",
    subtitle: "Configure available seating types and their pricing",
    selectTypes: "Select seating types",
    seatingTypes: {
      bar: "Bar",
      table: "Table",
      vip: "VIP",
      sofa: "Sofa",
    },
    availableSlots: "Available slots",
    slotsHint: "e.g. 5 VIP tables",
    dressCode: "Dress Code",
    dressCodeOptions: {
      none: "None",
      casual: "Casual",
      smart_casual: "Smart Casual",
      elegant: "Elegant",
      no_sportswear: "No Sportswear",
    },
    noShowPolicy: "No-Show Policy",
    noShowOptions: {
      refundable: "Refundable",
      partial_refund: "Partial Refund",
      non_refundable: "Non-Refundable",
    },
    priceTiers: "Price Tiers",
    priceTiersHint: "Set different prices based on party size",
    remove: "Remove",
  },
};

const seatingTypeIcons: Record<SeatingType, React.ReactNode> = {
  bar: <GlassWater className="h-5 w-5" />,
  table: <TableIcon className="h-5 w-5" />,
  vip: <Crown className="h-5 w-5" />,
  sofa: <Sofa className="h-5 w-5" />,
};

const seatingTypeColors: Record<SeatingType, { bg: string; text: string; border: string }> = {
  bar: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  table: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  vip: { bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  sofa: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
};

const SeatingTypeEditorInner: React.FC<SeatingTypeEditorProps> = ({
  value,
  onChange,
  language,
  minPartySize = 1,
  maxPartySize = 10,
}) => {
  const t = translations[language];
  const allSeatingTypes: SeatingType[] = ['bar', 'table', 'vip', 'sofa'];
  
  const selectedTypes = value.map(v => v.seating_type);

  const toggleSeatingType = React.useCallback((type: SeatingType) => {
    if (selectedTypes.includes(type)) {
      const filtered = value.filter(v => v.seating_type !== type);
      // Only call onChange if actually different
      if (filtered.length !== value.length) {
        // Defer to avoid commit-phase conflicts
        queueMicrotask(() => onChange(filtered));
      }
    } else {
      const newConfig: SeatingTypeConfig = {
        seating_type: type,
        available_slots: 1,
        dress_code: null,
        cancellation_policy: null,
        no_show_policy: 'non_refundable',
        tiers: [
          {
            min_people: minPartySize,
            max_people: Math.min(minPartySize + 1, maxPartySize),
            prepaid_min_charge_cents: 5000, // €50 default
          },
        ],
      };
      // Defer to avoid commit-phase conflicts
      queueMicrotask(() => onChange([...value, newConfig]));
    }
  }, [selectedTypes, value, onChange, minPartySize, maxPartySize]);

  const updateConfig = React.useCallback((type: SeatingType, updates: Partial<SeatingTypeConfig>) => {
    // Find the config to update and check if values actually changed
    const existingConfig = value.find(c => c.seating_type === type);
    if (!existingConfig) return;
    
    // Check if any update value is actually different (deep value check)
    let hasActualChange = false;
    for (const key of Object.keys(updates) as Array<keyof SeatingTypeConfig>) {
      const newVal = updates[key];
      const oldVal = existingConfig[key];
      
      // For tiers array, do JSON comparison
      if (key === 'tiers') {
        if (JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
          hasActualChange = true;
          break;
        }
      } else if (newVal !== oldVal) {
        hasActualChange = true;
        break;
      }
    }
    
    if (!hasActualChange) return; // Bail out - nothing changed
    
    const newValue = value.map(config =>
      config.seating_type === type ? { ...config, ...updates } : config
    );
    // Defer to avoid commit-phase conflicts
    queueMicrotask(() => onChange(newValue));
  }, [value, onChange]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">{t.title}</h3>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      {/* Seating Type Selection */}
      <div className="space-y-2">
        <Label>{t.selectTypes}</Label>
        <div className="flex flex-wrap gap-3">
          {allSeatingTypes.map(type => {
            const isSelected = selectedTypes.includes(type);
            const colors = seatingTypeColors[type];
            
            return (
              <div
                key={type}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all",
                  isSelected
                    ? `${colors.bg} ${colors.border} ${colors.text}`
                    : "border-dashed border-muted-foreground/30 hover:border-primary/50"
                )}
                onClick={() => toggleSeatingType(type)}
              >
                <Checkbox
                  checked={isSelected}
                  className="pointer-events-none"
                />
                <span className={cn(isSelected && colors.text)}>
                  {seatingTypeIcons[type]}
                </span>
                <span className={cn("font-medium", isSelected && colors.text)}>
                  {t.seatingTypes[type]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Configuration for each selected type */}
      {value.map(config => {
        const colors = seatingTypeColors[config.seating_type];
        
        return (
          <Card key={config.seating_type} className={cn("border-2", colors.border)}>
            <CardHeader className={cn("pb-3", colors.bg)}>
              <div className="flex items-center justify-between">
                <CardTitle className={cn("flex items-center gap-2 text-base", colors.text)}>
                  {seatingTypeIcons[config.seating_type]}
                  {t.seatingTypes[config.seating_type]}
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => toggleSeatingType(config.seating_type)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t.remove}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Available Slots */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {t.availableSlots}
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={config.available_slots}
                    onChange={(e) => updateConfig(config.seating_type, {
                      available_slots: parseInt(e.target.value) || 1
                    })}
                    placeholder={t.slotsHint}
                  />
                </div>

                {/* Dress Code */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Shirt className="h-4 w-4" />
                    {t.dressCode}
                  </Label>
                  <Select
                    value={config.dress_code || 'none'}
                    onValueChange={(val) => updateConfig(config.seating_type, {
                      dress_code: val === 'none' ? null : val as DressCode
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t.dressCodeOptions.none}</SelectItem>
                      <SelectItem value="casual">{t.dressCodeOptions.casual}</SelectItem>
                      <SelectItem value="smart_casual">{t.dressCodeOptions.smart_casual}</SelectItem>
                      <SelectItem value="elegant">{t.dressCodeOptions.elegant}</SelectItem>
                      <SelectItem value="no_sportswear">{t.dressCodeOptions.no_sportswear}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* No-Show Policy */}
                <div className="space-y-2">
                  <Label>{t.noShowPolicy}</Label>
                  <Select
                    value={config.no_show_policy}
                    onValueChange={(val) => updateConfig(config.seating_type, {
                      no_show_policy: val as NoShowPolicy
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="refundable">{t.noShowOptions.refundable}</SelectItem>
                      <SelectItem value="partial_refund">{t.noShowOptions.partial_refund}</SelectItem>
                      <SelectItem value="non_refundable">{t.noShowOptions.non_refundable}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Price Tiers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t.priceTiers}</Label>
                    <p className="text-xs text-muted-foreground">{t.priceTiersHint}</p>
                  </div>
                  <Badge variant="outline" className={colors.text}>
                    {language === 'el' ? 'Προμήθεια 12%' : '12% Commission'}
                  </Badge>
                </div>
                <SeatingTierEditor
                  value={config.tiers}
                  onChange={(tiers) => updateConfig(config.seating_type, { tiers })}
                  language={language}
                  minPartySize={minPartySize}
                  maxPartySize={maxPartySize}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}

      {value.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{language === 'el' ? 'Επιλέξτε τουλάχιστον έναν τύπο θέσης' : 'Select at least one seating type'}</p>
        </div>
      )}
    </div>
  );
};

// Memoize with deep equality comparison to prevent unnecessary re-renders
export const SeatingTypeEditor = React.memo(SeatingTypeEditorInner, (prev, next) => {
  return (
    JSON.stringify(prev.value) === JSON.stringify(next.value) &&
    prev.language === next.language &&
    prev.minPartySize === next.minPartySize &&
    prev.maxPartySize === next.maxPartySize &&
    prev.onChange === next.onChange
  );
});

export default SeatingTypeEditor;
