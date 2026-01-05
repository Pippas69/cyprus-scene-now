import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Package } from "lucide-react";
import { PricingTypeSelector } from "./PricingTypeSelector";
import { OfferItemEditor } from "./OfferItemEditor";
import { 
  PricingType, 
  OfferItem, 
  MultiItemOfferData, 
  offerItemTranslations 
} from "./types";

interface MultiItemOfferEditorProps {
  data: MultiItemOfferData;
  onChange: (data: MultiItemOfferData) => void;
  language: "el" | "en";
}

export function MultiItemOfferEditor({ data, onChange, language }: MultiItemOfferEditorProps) {
  const t = offerItemTranslations[language];

  const updatePricingType = (pricing_type: PricingType) => {
    onChange({ ...data, pricing_type });
  };

  const updateBundlePrice = (value: string) => {
    const val = parseFloat(value);
    onChange({
      ...data,
      bundle_price_cents: isNaN(val) ? undefined : Math.round(val * 100),
    });
  };

  const addItem = () => {
    const newItem: OfferItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: "",
      is_choice_group: false,
      sort_order: data.items.length,
      options: [],
    };
    onChange({ ...data, items: [...data.items, newItem] });
  };

  const updateItem = (index: number, item: OfferItem) => {
    const newItems = data.items.map((it, i) => (i === index ? item : it));
    onChange({ ...data, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = data.items.filter((_, i) => i !== index);
    onChange({ ...data, items: newItems });
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newItems = [...data.items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    // Update sort_order
    newItems.forEach((item, i) => {
      item.sort_order = i;
    });
    onChange({ ...data, items: newItems });
  };

  // Calculate total for itemized pricing
  const calculateItemizedTotal = () => {
    return data.items.reduce((total, item) => {
      if (item.is_choice_group && item.options.length > 0) {
        // For choice groups, use the first option's price as base
        const basePrice = item.options[0]?.price_cents || 0;
        return total + basePrice;
      }
      return total + (item.price_cents || 0);
    }, 0);
  };

  const showPrices = data.pricing_type === "itemized";
  const itemizedTotal = calculateItemizedTotal();

  return (
    <div className="space-y-6">
      {/* Pricing Type Selector */}
      <PricingTypeSelector
        value={data.pricing_type}
        onChange={updatePricingType}
        language={language}
      />

      {/* Bundle Price Input (only for bundle type) */}
      {data.pricing_type === "bundle" && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <Label className="text-base font-medium">{t.bundlePrice}</Label>
          </div>
          <p className="text-sm text-muted-foreground">{t.bundlePriceDesc}</p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium">€</span>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={data.bundle_price_cents ? (data.bundle_price_cents / 100).toFixed(2) : ""}
              onChange={(e) => updateBundlePrice(e.target.value)}
              placeholder="25.00"
              className="w-40"
            />
          </div>
          {data.items.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {data.items.length} {t.itemsIncluded}
            </p>
          )}
        </div>
      )}

      {/* Items Section (for bundle and itemized) */}
      {data.pricing_type !== "single" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">{t.items}</Label>
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              {t.addItem}
            </Button>
          </div>

          {data.items.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed p-8 text-center">
              <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-3">
                {language === "el" 
                  ? "Δεν έχετε προσθέσει προϊόντα ακόμα" 
                  : "No items added yet"}
              </p>
              <Button variant="secondary" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                {t.addItem}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {data.items.map((item, index) => (
                <OfferItemEditor
                  key={item.id}
                  item={item}
                  index={index}
                  totalItems={data.items.length}
                  showPrices={showPrices}
                  language={language}
                  onUpdate={(updatedItem) => updateItem(index, updatedItem)}
                  onRemove={() => removeItem(index)}
                  onMoveUp={() => moveItem(index, "up")}
                  onMoveDown={() => moveItem(index, "down")}
                />
              ))}
            </div>
          )}

          {/* Itemized Total Preview */}
          {data.pricing_type === "itemized" && data.items.length > 0 && itemizedTotal > 0 && (
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {language === "el" ? "Σύνολο προϊόντων" : "Items total"}
                </span>
                <span className="text-lg font-semibold">
                  €{(itemizedTotal / 100).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
