import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getCategorySingularLabelById,
  getCategoriesForBusiness,
  unifiedCategories,
} from "@/lib/unifiedCategories";
import { cn } from "@/lib/utils";

interface BusinessCategorySelectorProps {
  selectedCategories: string[];
  onCategoryChange: (categoryId: string, checked: boolean) => void;
  language: 'el' | 'en';
  maxSelections?: number;
  /** Compact mode for mobile - smaller text */
  compact?: boolean;
}

export const BusinessCategorySelector = ({
  selectedCategories,
  onCategoryChange,
  language,
  maxSelections = 2,
  compact = false,
}: BusinessCategorySelectorProps) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const categories = getCategoriesForBusiness(language);

  const selectedLabels = useMemo(() => {
    return selectedCategories
      .slice(0, maxSelections)
      .map((id) => ({ id, label: getCategorySingularLabelById(id, language) }))
      .filter((x) => x.label);
  }, [selectedCategories, maxSelections, language]);

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getTotalSelections = () => selectedCategories.length;

  const canSelectMore = () => getTotalSelections() < maxSelections;

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    // If trying to add and already at max, don't allow
    if (checked && !canSelectMore()) {
      return;
    }
    onCategoryChange(categoryId, checked);
  };

  const isMainCategorySelected = (categoryId: string) => selectedCategories.includes(categoryId);

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
    <div className="space-y-3">
      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedLabels.map((x) => (
            <span
              key={x.id}
              className={cn(
                "inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-foreground",
                compact ? "text-[10px] sm:text-xs" : "text-xs"
              )}
            >
              {x.label}
            </span>
          ))}
        </div>
      )}
      
      <div className="space-y-2">
        {categories.map((category, index) => {
          const originalCategory = unifiedCategories[index];
          const isExpanded = expandedCategories.includes(category.id);
          const hasSubOptions = originalCategory.hasDropdown && originalCategory.subOptions;
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
                  {/* For categories without dropdowns (like Events), show checkbox */}
                  {!hasSubOptions && (
                    <Checkbox
                      id={category.id}
                      checked={isSelected}
                      onCheckedChange={(checked) => handleCategoryChange(category.id, checked as boolean)}
                    />
                  )}
                  <label
                    htmlFor={hasSubOptions ? undefined : category.id}
                    className={cn(
                      "flex items-center gap-2 flex-1",
                      !hasSubOptions && "cursor-pointer"
                    )}
                    onClick={hasSubOptions ? () => toggleExpand(category.id) : undefined}
                  >
                    <span className={cn("text-lg", compact && "text-base sm:text-lg")}>{category.icon}</span>
                    <span className={cn("font-medium", compact ? "text-xs sm:text-sm" : "text-sm")}>{category.label}</span>
                    {subCount > 0 && (
                      <span className={cn(
                        "bg-primary/20 text-primary px-2 py-0.5 rounded-full",
                        compact ? "text-[10px] sm:text-xs" : "text-xs"
                      )}>
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
                <div className="border-t border-border bg-muted/30 p-3 pl-6 space-y-2">
                  {category.subOptions.map(subOption => {
                    const subIsSelected = selectedCategories.includes(subOption.id);

                    return (
                      <div key={subOption.id} className="flex items-center gap-2">
                        <Checkbox
                          id={subOption.id}
                          checked={subIsSelected}
                          onCheckedChange={(checked) => handleCategoryChange(subOption.id, checked as boolean)}
                        />
                        <label
                          htmlFor={subOption.id}
                          className={cn(
                            "cursor-pointer transition-colors",
                            compact ? "text-xs sm:text-sm" : "text-sm",
                            subIsSelected ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {subOption.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
