import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { OfferItem, offerItemTranslations } from "./types";

interface OfferItemEditorProps {
  item: OfferItem;
  index: number;
  totalItems: number;
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
  language,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: OfferItemEditorProps) {
  const t = offerItemTranslations[language];

  const updateField = <K extends keyof OfferItem>(field: K, value: OfferItem[K]) => {
    onUpdate({ ...item, [field]: value });
  };

  return (
    <Card className="p-4">
      <div className="flex gap-3">
        {/* Drag Handle */}
        <div className="flex flex-col items-center gap-1 pt-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onMoveUp}
              disabled={index === 0}
              title={t.moveUp}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onMoveDown}
              disabled={index === totalItems - 1}
              title={t.moveDown}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Item Fields */}
        <div className="flex-1 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">{t.itemName}</Label>
              <Input
                value={item.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder={t.itemNamePlaceholder}
                className="mt-1"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-5"
              onClick={onRemove}
              title={t.removeItem}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">{t.itemDescription}</Label>
            <Textarea
              value={item.description || ""}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder={t.itemDescPlaceholder}
              className="mt-1 min-h-[60px]"
              rows={2}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
