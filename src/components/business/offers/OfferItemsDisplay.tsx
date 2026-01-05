import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";

interface OfferDisplayItem {
  id: string;
  name: string;
  description?: string | null;
}

interface OfferItemsDisplayProps {
  items: OfferDisplayItem[];
  language: "el" | "en";
}

export function OfferItemsDisplay({ items, language }: OfferItemsDisplayProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Package className="h-4 w-4" />
        <span>{language === "el" ? "Περιλαμβάνει" : "Includes"}</span>
        <Badge variant="secondary" className="text-xs">
          {items.length} {language === "el" ? "προϊόντα" : "items"}
        </Badge>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-sm">
            <span className="text-primary mt-1">•</span>
            <div>
              <span className="font-medium">{item.name}</span>
              {item.description && (
                <p className="text-xs text-muted-foreground">{item.description}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
