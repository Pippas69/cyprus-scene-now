import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Ticket, Euro, Users, Shirt } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

export interface TicketTier {
  id?: string;
  name: string;
  description?: string;
  price_cents: number;
  currency: string;
  quantity_total: number;
  max_per_order: number;
  sort_order: number;
  dress_code?: string;
}

interface TicketTierEditorProps {
  tiers: TicketTier[];
  onTiersChange: (tiers: TicketTier[]) => void;
  commissionPercent: number;
  validationErrors?: string[];
  autoEnabled?: boolean; // When true, skip toggle and auto-add tier if empty
}

const t = {
  el: {
    addTier: "Προσθήκη Κατηγορίας Εισιτηρίου",
    tierName: "Όνομα Κατηγορίας",
    tierNamePlaceholder: "π.χ. Γενική Είσοδος, VIP",
    description: "Περιγραφή",
    descriptionPlaceholder: "Προαιρετική περιγραφή...",
    price: "Τιμή (€)",
    quantity: "Διαθέσιμα",
    maxPerOrder: "Μέγιστο ανά παραγγελία",
    maxPerOrderFull: "Μέγιστο ανά παραγγελία",
    freeTickets: "Δωρεάν Εισιτήρια",
    commission: "Προμήθεια πλατφόρμας",
    youReceive: "Θα λάβετε",
    remove: "Αφαίρεση",
    noTiers: "Δεν έχετε προσθέσει κατηγορίες εισιτηρίων ακόμα",
    noTickets: "Χωρίς εισιτήρια (μόνο RSVP/Κράτηση)",
    enableTickets: "Ενεργοποίηση Πώλησης Εισιτηρίων",
    tierNameRequired: "Το όνομα κατηγορίας είναι υποχρεωτικό",
    dressCode: "Dress Code",
    selectDressCode: "Επιλέξτε dress code",
    casual: "Casual",
    smartCasual: "Smart Casual",
    semiFormal: "Semi-Formal",
    formal: "Formal",
    themed: "Θεματικό / Costume",
  },
  en: {
    addTier: "Add Ticket Tier",
    tierName: "Tier Name",
    tierNamePlaceholder: "e.g. General Admission, VIP",
    description: "Description",
    descriptionPlaceholder: "Optional description...",
    price: "Price (€)",
    quantity: "Quantity",
    maxPerOrder: "Max/Order",
    maxPerOrderFull: "Max per Order",
    freeTickets: "Free Tickets",
    commission: "Platform commission",
    youReceive: "You receive",
    remove: "Remove",
    noTiers: "No ticket tiers added yet",
    noTickets: "No tickets (RSVP/Reservation only)",
    enableTickets: "Enable Ticket Sales",
    tierNameRequired: "Tier name is required",
    dressCode: "Dress Code",
    selectDressCode: "Select dress code",
    casual: "Casual",
    smartCasual: "Smart Casual",
    semiFormal: "Semi-Formal",
    formal: "Formal",
    themed: "Themed / Costume",
  },
};

// Validation helper
export const validateTicketTiers = (tiers: TicketTier[], language: 'el' | 'en'): string[] => {
  const errors: string[] = [];
  tiers.forEach((tier, index) => {
    if (!tier.name.trim()) {
      errors.push(
        language === 'el' 
          ? `Κατηγορία ${index + 1}: Το όνομα είναι υποχρεωτικό` 
          : `Tier ${index + 1}: Name is required`
      );
    }
  });
  return errors;
};

export const TicketTierEditor = ({
  tiers,
  onTiersChange,
  commissionPercent,
  validationErrors = [],
  autoEnabled = false,
}: TicketTierEditorProps) => {
  const { language } = useLanguage();
  const text = t[language];
  // When autoEnabled, tickets are always enabled; otherwise use tiers.length
  const [ticketsEnabled, setTicketsEnabled] = useState(autoEnabled || tiers.length > 0);
  const [touchedTiers, setTouchedTiers] = useState<Set<number>>(new Set());

  // Auto-add a tier if autoEnabled and no tiers exist
  useEffect(() => {
    if (autoEnabled && tiers.length === 0) {
      const defaultName = language === 'el' ? 'Γενική Είσοδος' : 'General Admission';
      const newTier: TicketTier = {
        name: defaultName,
        description: "",
        price_cents: 0,
        currency: "eur",
        quantity_total: 100,
        max_per_order: 10,
        sort_order: 0,
      };
      queueMicrotask(() => onTiersChange([newTier]));
    }
  }, [autoEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const addTier = useCallback(() => {
    const defaultName = language === 'el' ? 'Γενική Είσοδος' : 'General Admission';
    const newTier: TicketTier = {
      name: tiers.length === 0 ? defaultName : "",
      description: "",
      price_cents: 0,
      currency: "eur",
      quantity_total: 100,
      max_per_order: 10,
      sort_order: tiers.length,
    };
    // Defer update to avoid commit-phase conflicts
    queueMicrotask(() => onTiersChange([...tiers, newTier]));
    setTicketsEnabled(true);
  }, [tiers, language, onTiersChange]);

  const markTierTouched = (index: number) => {
    setTouchedTiers(prev => new Set(prev).add(index));
  };

  const isTierInvalid = (index: number) => {
    return !tiers[index]?.name.trim();
  };

  const updateTier = useCallback((index: number, updates: Partial<TicketTier>) => {
    const currentTier = tiers[index];
    // Check if anything actually changed
    const hasChanges = Object.entries(updates).some(
      ([key, value]) => currentTier[key as keyof TicketTier] !== value
    );
    if (!hasChanges) return;
    
    const updated = [...tiers];
    updated[index] = { ...updated[index], ...updates };
    // Defer update to avoid commit-phase conflicts
    queueMicrotask(() => onTiersChange(updated));
  }, [tiers, onTiersChange]);

  const removeTier = useCallback((index: number) => {
    // Defer update to avoid commit-phase conflicts
    queueMicrotask(() => onTiersChange(tiers.filter((_, i) => i !== index)));
    if (tiers.length === 1) {
      setTicketsEnabled(false);
    }
  }, [tiers, onTiersChange]);

  const calculateNetRevenue = (priceCents: number) => {
    if (priceCents === 0) return 0;
    const commission = Math.round(priceCents * commissionPercent / 100);
    return priceCents - commission;
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  const handleToggleTickets = useCallback((enabled: boolean) => {
    setTicketsEnabled(enabled);
    if (!enabled) {
      queueMicrotask(() => onTiersChange([]));
    } else if (tiers.length === 0) {
      addTier();
    }
  }, [tiers.length, onTiersChange, addTier]);

  return (
    <div className="space-y-4">
      {/* Validation errors display */}
      {validationErrors.length > 0 && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <p className="text-sm font-medium text-destructive mb-1">
            {language === 'el' ? 'Παρακαλώ διορθώστε τα παρακάτω:' : 'Please fix the following:'}
          </p>
          <ul className="text-sm text-destructive list-disc list-inside">
            {validationErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Toggle for enabling tickets - only show if NOT autoEnabled */}
      {!autoEnabled && (
        <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-3">
            <Ticket className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <div>
              <p className="font-medium text-sm sm:text-base">{text.enableTickets}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {ticketsEnabled 
                  ? (language === 'el' ? "Οι χρήστες θα μπορούν να αγοράσουν εισιτήρια" : "Users will be able to purchase tickets")
                  : text.noTickets
                }
              </p>
            </div>
          </div>
          <Switch
            checked={ticketsEnabled}
            onCheckedChange={handleToggleTickets}
          />
        </div>
      )}

      {(ticketsEnabled || autoEnabled) && (
        <>

          {/* Ticket tiers */}
          <div className="space-y-3">
            {tiers.map((tier, index) => (
              <Card key={index} className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeTier(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className={
                        (touchedTiers.has(index) && isTierInvalid(index) ? "text-destructive " : "") +
                        "text-xs sm:text-sm"
                      }>
                        {text.tierName} *
                      </Label>
                      <Input
                        value={tier.name}
                        onChange={(e) => updateTier(index, { name: e.target.value })}
                        onBlur={() => markTierTouched(index)}
                        placeholder={text.tierNamePlaceholder}
                        className={
                          "h-8 sm:h-10 text-xs sm:text-sm " +
                          (touchedTiers.has(index) && isTierInvalid(index)
                            ? "border-destructive focus-visible:ring-destructive"
                            : "")
                        }
                      />
                      {touchedTiers.has(index) && isTierInvalid(index) && (
                        <p className="text-xs text-destructive">{text.tierNameRequired}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">{text.description}</Label>
                      <Input
                        value={tier.description || ""}
                        onChange={(e) => updateTier(index, { description: e.target.value })}
                        placeholder={text.descriptionPlaceholder}
                        className="h-8 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  {/* Price & Quantity row, max per order on own row for tablet */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-xs sm:text-sm">
                        <Euro className="h-3 w-3" />
                        {text.price}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tier.price_cents / 100}
                        onChange={(e) => updateTier(index, { 
                          price_cents: Math.round(parseFloat(e.target.value || "0") * 100) 
                        })}
                        className="h-8 sm:h-10 text-xs sm:text-sm"
                      />
                      {tier.price_cents > 0 && commissionPercent > 0 && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {text.youReceive}: €{formatPrice(calculateNetRevenue(tier.price_cents))}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-xs sm:text-sm">
                        <Users className="h-3 w-3" />
                        {text.quantity}
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={tier.quantity_total}
                        onChange={(e) => updateTier(index, { 
                          quantity_total: parseInt(e.target.value || "1") 
                        })}
                        className="h-8 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>

                  </div>
                  
                  {/* Max per order - on its own row on tablet for better fit */}
                  <div className="space-y-2 sm:col-span-1 md:max-w-[200px]">
                    <Label className="text-xs sm:text-sm whitespace-nowrap">
                      {text.maxPerOrderFull}
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max={tier.quantity_total}
                      value={tier.max_per_order}
                      onChange={(e) => updateTier(index, { 
                        max_per_order: parseInt(e.target.value || "1") 
                      })}
                      className="h-8 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>

                  {/* Dress Code Selector */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-xs sm:text-sm">
                      <Shirt className="h-3 w-3" />
                      {text.dressCode}
                    </Label>
                    <Select
                      value={tier.dress_code || "none"}
                      onValueChange={(value) => {
                        const newDressCode = value === "none" ? undefined : value;
                        // Only update if actually changed
                        if (tier.dress_code !== newDressCode) {
                          updateTier(index, { dress_code: newDressCode });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm">
                        <SelectValue placeholder={text.selectDressCode} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{language === 'el' ? 'Χωρίς' : 'None'}</SelectItem>
                        <SelectItem value="casual">{text.casual}</SelectItem>
                        <SelectItem value="smart_casual">{text.smartCasual}</SelectItem>
                        <SelectItem value="semi_formal">{text.semiFormal}</SelectItem>
                        <SelectItem value="formal">{text.formal}</SelectItem>
                        <SelectItem value="themed">{text.themed}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-9 sm:h-10 text-xs sm:text-sm"
            onClick={addTier}
          >
            <Plus className="h-4 w-4 mr-2" />
            {text.addTier}
          </Button>
        </>
      )}
    </div>
  );
};

export default TicketTierEditor;
