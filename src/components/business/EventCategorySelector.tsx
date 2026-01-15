import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubOption {
  id: string;
  label: { el: string; en: string };
}

interface Category {
  id: string;
  label: { el: string; en: string };
  icon: string;
  hasDropdown: boolean;
  subOptions?: SubOption[];
}

// Order: Nightlife → Clubs → Dining → Beach & Summer (4 core categories)
const eventCategoryHierarchy: Category[] = [
  {
    id: "nightlife",
    label: { el: "Νυχτερινή Ζωή", en: "Nightlife" },
    icon: "🍸",
    hasDropdown: true,
    subOptions: [
      { id: "bars", label: { el: "Bars", en: "Bars" } },
      { id: "wine-cocktail-bars", label: { el: "Κρασί & Cocktail Bars", en: "Wine & Cocktail Bars" } },
      { id: "live-music", label: { el: "Ζωντανή Μουσική", en: "Live Music" } },
    ],
  },
  { id: "clubs", label: { el: "Clubs", en: "Clubs" }, icon: "🎉", hasDropdown: false },
  {
    id: "dining",
    label: { el: "Εστίαση", en: "Dining" },
    icon: "🍽️",
    hasDropdown: true,
    subOptions: [
      { id: "fine-dining", label: { el: "Επίσημη Εστίαση", en: "Fine Dining" } },
      { id: "casual-dining", label: { el: "Χαλαρή Εστίαση", en: "Casual Dining" } },
    ],
  },
  {
    id: "beach-summer",
    label: { el: "Παραλία/Καλοκαίρι", en: "Beach/Summer" },
    icon: "🏖️",
    hasDropdown: true,
    subOptions: [
      { id: "beach-bars", label: { el: "Beach Bars", en: "Beach Bars" } },
      { id: "summer-events", label: { el: "Καλοκαιρινές Εκδηλώσεις", en: "Summer Events" } },
      { id: "seaside-restaurants", label: { el: "Παραθαλάσσια Εστιατόρια", en: "Seaside Restaurants" } },
    ],
  },
];

interface EventCategorySelectorProps {
  language: 'el' | 'en';
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
}

export function EventCategorySelector({ language, selectedCategories, onChange }: EventCategorySelectorProps) {
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  const toggleCategory = (categoryId: string) => {
    const category = eventCategoryHierarchy.find(c => c.id === categoryId);
    
    if (!category?.hasDropdown) {
      // Simple toggle for categories without sub-options
      if (selectedCategories.includes(categoryId)) {
        onChange(selectedCategories.filter(c => c !== categoryId));
      } else {
        onChange([...selectedCategories, categoryId]);
      }
    }
  };

  const toggleSubOption = (subOptionId: string) => {
    if (selectedCategories.includes(subOptionId)) {
      onChange(selectedCategories.filter(c => c !== subOptionId));
    } else {
      onChange([...selectedCategories, subOptionId]);
    }
  };

  const toggleOpen = (categoryId: string) => {
    if (openCategories.includes(categoryId)) {
      setOpenCategories(openCategories.filter(c => c !== categoryId));
    } else {
      setOpenCategories([...openCategories, categoryId]);
    }
  };

  const getCategorySelectedCount = (category: Category): number => {
    if (!category.hasDropdown) {
      return selectedCategories.includes(category.id) ? 1 : 0;
    }
    return category.subOptions?.filter(sub => selectedCategories.includes(sub.id)).length || 0;
  };

  return (
    <div className="space-y-2">
      {eventCategoryHierarchy.map((category) => {
        const selectedCount = getCategorySelectedCount(category);
        const isOpen = openCategories.includes(category.id);

        if (!category.hasDropdown) {
          // Simple checkbox for categories without sub-options (like Clubs)
          return (
            <div
              key={category.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                selectedCategories.includes(category.id)
                  ? "bg-primary/10 border-primary"
                  : "bg-muted/30 border-border hover:bg-muted/50"
              )}
              onClick={() => toggleCategory(category.id)}
            >
              <Checkbox
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={() => toggleCategory(category.id)}
                className="data-[state=checked]:bg-primary"
              />
              <span className="text-lg">{category.icon}</span>
              <span className="font-medium">{category.label[language]}</span>
            </div>
          );
        }

        // Collapsible for categories with sub-options
        return (
          <Collapsible
            key={category.id}
            open={isOpen}
            onOpenChange={() => toggleOpen(category.id)}
          >
            <CollapsibleTrigger className="w-full">
              <div
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                  selectedCount > 0
                    ? "bg-primary/10 border-primary"
                    : "bg-muted/30 border-border hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{category.icon}</span>
                  <span className="font-medium">{category.label[language]}</span>
                  {selectedCount > 0 && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      {selectedCount}
                    </span>
                  )}
                </div>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1">
              <div className="ml-4 pl-4 border-l-2 border-border space-y-1">
                {category.subOptions?.map((subOption) => (
                  <div
                    key={subOption.id}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors",
                      selectedCategories.includes(subOption.id)
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => toggleSubOption(subOption.id)}
                  >
                    <Checkbox
                      checked={selectedCategories.includes(subOption.id)}
                      onCheckedChange={() => toggleSubOption(subOption.id)}
                      className="data-[state=checked]:bg-primary"
                    />
                    <span className="text-sm">{subOption.label[language]}</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

export { eventCategoryHierarchy };
