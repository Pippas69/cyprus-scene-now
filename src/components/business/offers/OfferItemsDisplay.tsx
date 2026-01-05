import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Check, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface ItemOption {
  id: string;
  name: string;
  description?: string | null;
  price_cents?: number | null;
}

interface OfferDisplayItem {
  id: string;
  name: string;
  description?: string | null;
  price_cents?: number | null;
  is_choice_group: boolean;
  options?: ItemOption[];
}

interface OfferItemsDisplayProps {
  items: OfferDisplayItem[];
  showPrices: boolean;
  selectable?: boolean;
  selectedOptions?: Record<string, string>; // item_id -> option_id
  onSelectionChange?: (itemId: string, optionId: string) => void;
  language: "el" | "en";
}

export function OfferItemsDisplay({
  items,
  showPrices,
  selectable = false,
  selectedOptions = {},
  onSelectionChange,
  language,
}: OfferItemsDisplayProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Package className="h-4 w-4" />
        <span>
          {language === "el" ? "Περιλαμβάνει" : "Includes"} {items.length}{" "}
          {language === "el" ? "προϊόντα" : "items"}
        </span>
      </div>

      {items.map((item) => {
        const isExpanded = expandedItems.has(item.id);
        const hasOptions = item.is_choice_group && item.options && item.options.length > 0;
        const selectedOption = selectedOptions[item.id];

        return (
          <div
            key={item.id}
            className={cn(
              "rounded-lg border p-3 transition-colors",
              hasOptions && selectable && !selectedOption && "border-amber-300 bg-amber-50/50 dark:bg-amber-900/10",
              hasOptions && selectedOption && "border-green-300 bg-green-50/50 dark:bg-green-900/10"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-between",
                hasOptions && "cursor-pointer"
              )}
              onClick={() => hasOptions && toggleExpand(item.id)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {hasOptions && selectedOption && (
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                )}
                <span className="font-medium text-sm truncate">{item.name}</span>
                {hasOptions && (
                  <Badge variant="secondary" className="text-xs">
                    {language === "el" ? "Επιλογή" : "Choice"}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {showPrices && !hasOptions && item.price_cents && (
                  <span className="text-sm font-medium">
                    €{(item.price_cents / 100).toFixed(2)}
                  </span>
                )}
                {hasOptions && (
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            {item.description && (
              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
            )}

            {/* Options */}
            {hasOptions && isExpanded && (
              <div className="mt-3 pl-2 border-l-2 border-primary/20 space-y-2">
                {selectable && onSelectionChange ? (
                  <RadioGroup
                    value={selectedOption || ""}
                    onValueChange={(value) => onSelectionChange(item.id, value)}
                  >
                    {item.options!.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50"
                      >
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label
                          htmlFor={option.id}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{option.name}</span>
                            {showPrices && option.price_cents !== null && option.price_cents !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                {option.price_cents >= 0 ? "+" : ""}€
                                {(option.price_cents / 100).toFixed(2)}
                              </span>
                            )}
                          </div>
                          {option.description && (
                            <p className="text-xs text-muted-foreground">
                              {option.description}
                            </p>
                          )}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="space-y-1">
                    {item.options!.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center justify-between p-2 text-sm"
                      >
                        <span>{option.name}</span>
                        {showPrices && option.price_cents !== null && option.price_cents !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {option.price_cents >= 0 ? "+" : ""}€
                            {(option.price_cents / 100).toFixed(2)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
