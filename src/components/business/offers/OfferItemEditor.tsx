import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Trash2, 
  Plus, 
  GripVertical, 
  ChevronUp, 
  ChevronDown,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OfferItem, OfferItemOption, offerItemTranslations } from "./types";

interface OfferItemEditorProps {
  item: OfferItem;
  index: number;
  totalItems: number;
  showPrices: boolean; // false for bundle pricing
  language: "el" | "en";
  onUpdate: (item: OfferItem) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function OfferItemEditor({
  item,
  index,
  totalItems,
  showPrices,
  language,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: OfferItemEditorProps) {
  const t = offerItemTranslations[language];
  const [isExpanded, setIsExpanded] = useState(true);

  const updateField = <K extends keyof OfferItem>(field: K, value: OfferItem[K]) => {
    onUpdate({ ...item, [field]: value });
  };

  const addOption = () => {
    const newOption: OfferItemOption = {
      id: `option-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: "",
      sort_order: item.options.length,
    };
    updateField("options", [...item.options, newOption]);
  };

  const updateOption = (optionIndex: number, updates: Partial<OfferItemOption>) => {
    const newOptions = item.options.map((opt, i) =>
      i === optionIndex ? { ...opt, ...updates } : opt
    );
    updateField("options", newOptions);
  };

  const removeOption = (optionIndex: number) => {
    const newOptions = item.options.filter((_, i) => i !== optionIndex);
    updateField("options", newOptions);
  };

  return (
    <Card className="relative border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
          <span className="text-sm font-medium text-muted-foreground">
            #{index + 1}
          </span>
          <div className="flex-1">
            <Input
              value={item.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder={t.itemNamePlaceholder}
              className="font-semibold border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onMoveUp}
              disabled={index === 0}
              title={t.moveUp}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onMoveDown}
              disabled={index === totalItems - 1}
              title={t.moveDown}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onRemove}
              title={t.removeItem}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        {/* Description */}
        <div>
          <Label className="text-xs text-muted-foreground">{t.itemDescription}</Label>
          <Textarea
            value={item.description || ""}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder={t.itemDescPlaceholder}
            rows={2}
            className="mt-1 resize-none"
          />
        </div>

        {/* Price (only for itemized pricing) */}
        {showPrices && !item.is_choice_group && (
          <div>
            <Label className="text-xs text-muted-foreground">{t.itemPrice}</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={item.price_cents ? (item.price_cents / 100).toFixed(2) : ""}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                updateField("price_cents", isNaN(val) ? undefined : Math.round(val * 100));
              }}
              placeholder="0.00"
              className="mt-1 w-32"
            />
          </div>
        )}

        {/* Has Options Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">{t.hasOptions}</Label>
            <p className="text-xs text-muted-foreground">{t.hasOptionsDesc}</p>
          </div>
          <Switch
            checked={item.is_choice_group}
            onCheckedChange={(checked) => {
              updateField("is_choice_group", checked);
              if (checked && item.options.length === 0) {
                addOption();
              }
            }}
          />
        </div>

        {/* Options */}
        {item.is_choice_group && (
          <div className="space-y-3 pl-4 border-l-2 border-primary/20">
            <Label className="text-sm font-medium">{t.options}</Label>
            
            {item.options.map((option, optIdx) => (
              <div
                key={option.id}
                className="flex items-start gap-2 p-2 rounded-md bg-muted/30"
              >
                <div className="flex-1 space-y-2">
                  <Input
                    value={option.name}
                    onChange={(e) => updateOption(optIdx, { name: e.target.value })}
                    placeholder={t.optionNamePlaceholder}
                    className="bg-background"
                  />
                  <Textarea
                    value={option.description || ""}
                    onChange={(e) => updateOption(optIdx, { description: e.target.value })}
                    placeholder={t.itemDescPlaceholder}
                    rows={1}
                    className="bg-background resize-none text-sm"
                  />
                </div>
                {showPrices && (
                  <div className="w-24">
                    <Label className="text-xs text-muted-foreground">{t.optionPrice}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={option.price_cents ? (option.price_cents / 100).toFixed(2) : ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        updateOption(optIdx, { 
                          price_cents: isNaN(val) ? undefined : Math.round(val * 100) 
                        });
                      }}
                      placeholder="0.00"
                      className="mt-1 bg-background"
                    />
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                  onClick={() => removeOption(optIdx)}
                  disabled={item.options.length <= 1}
                  title={t.removeOption}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={addOption}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t.addOption}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
