import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { unifiedCategories } from "@/lib/unifiedCategories";
import { cn } from "@/lib/utils";

interface BusinessCategorySelectorProps {
  selectedCategories: string[];
  onCategoryChange: (categoryId: string, checked: boolean) => void;
  language: 'el' | 'en';
}

export const BusinessCategorySelector = ({
  selectedCategories,
  onCategoryChange,
  language,
}: BusinessCategorySelectorProps) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const isMainCategorySelected = (categoryId: string) => {
    return selectedCategories.includes(categoryId);
  };

  const hasAnySubOptionSelected = (categoryId: string) => {
    const category = unifiedCategories.find(c => c.id === categoryId);
    if (!category?.subOptions) return false;
    return category.subOptions.some(sub => selectedCategories.includes(sub.id));
  };

  const getSelectedSubOptionsCount = (categoryId: string) => {
    const category = unifiedCategories.find(c => c.id === categoryId);
    if (!category?.subOptions) return 0;
    return category.subOptions.filter(sub => selectedCategories.includes(sub.id)).length;
  };

  return (
    <div className="space-y-2">
      {unifiedCategories.map(category => {
        const isExpanded = expandedCategories.includes(category.id);
        const hasSubOptions = category.hasDropdown && category.subOptions;
        const subCount = getSelectedSubOptionsCount(category.id);
        const isSelected = isMainCategorySelected(category.id);
        const hasSubSelected = hasAnySubOptionSelected(category.id);

        return (
          <div key={category.id} className="border border-border rounded-lg overflow-hidden">
            {/* Main Category Row */}
            <div
              className={cn(
                "flex items-center justify-between p-3 transition-colors",
                (isSelected || hasSubSelected) ? "bg-primary/10" : "bg-background hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-3 flex-1">
                <Checkbox
                  id={category.id}
                  checked={isSelected}
                  onCheckedChange={(checked) => onCategoryChange(category.id, checked as boolean)}
                />
                <label
                  htmlFor={category.id}
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <span className="text-lg">{category.icon}</span>
                  <span className="text-sm font-medium">{category.label[language]}</span>
                  {subCount > 0 && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                      +{subCount}
                    </span>
                  )}
                </label>
              </div>
              
              {hasSubOptions && (
                <button
                  type="button"
                  onClick={() => toggleExpand(category.id)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>

            {/* Sub-options */}
            {hasSubOptions && isExpanded && category.subOptions && (
              <div className="border-t border-border bg-muted/30 p-3 pl-10 space-y-2">
                {category.subOptions.map(subOption => (
                  <div key={subOption.id} className="flex items-center gap-2">
                    <Checkbox
                      id={subOption.id}
                      checked={selectedCategories.includes(subOption.id)}
                      onCheckedChange={(checked) => onCategoryChange(subOption.id, checked as boolean)}
                    />
                    <label
                      htmlFor={subOption.id}
                      className="text-sm cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {subOption.label[language]}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
