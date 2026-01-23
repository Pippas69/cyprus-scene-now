import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { unifiedCategories, getCategoriesForBusiness } from "@/lib/unifiedCategories";
import { cn } from "@/lib/utils";

interface BusinessCategorySelectorProps {
  selectedCategories: string[];
  onCategoryChange: (categoryId: string, checked: boolean) => void;
  language: 'el' | 'en';
  maxSelections?: number;
}

export const BusinessCategorySelector = ({
  selectedCategories,
  onCategoryChange,
  language,
  maxSelections = 2,
}: BusinessCategorySelectorProps) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const categories = getCategoriesForBusiness(language);

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
    if (checked && !canSelectMore()) {
      return; // Already at max - don't allow
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

  const text = {
    el: { label: 'Κατηγορίες (επιλέξτε μέχρι 2 κατηγορίες)' },
    en: { label: 'Categories (select up to 2 categories)' },
  };

  const t = text[language];

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">{t.label}</label>
      
      <div className="space-y-2">
        {categories.map((category, index) => {
          const originalCategory = unifiedCategories[index];
          const isExpanded = expandedCategories.includes(category.id);
          const hasSubOptions = originalCategory.hasDropdown && originalCategory.subOptions;
          const subCount = getSelectedSubOptionsCount(category.id);
          const isSelected = isMainCategorySelected(category.id);
          const hasSubSelected = hasAnySubOptionSelected(category.id);
          // Only disable if at max AND this item is not already selected
          const isDisabledByMax = !canSelectMore() && !isSelected && !hasSubSelected;

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
                  {/* For categories without dropdowns (like Clubs), show checkbox */}
                  {!hasSubOptions && (
                    <Checkbox
                      id={category.id}
                      checked={isSelected}
                      disabled={isDisabledByMax}
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
                    <span className="text-lg">{category.icon}</span>
                    <span className="text-sm font-medium">{category.label}</span>
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
                <div className="border-t border-border bg-muted/30 p-3 pl-6 space-y-2">
                  {category.subOptions.map(subOption => {
                    const subIsSelected = selectedCategories.includes(subOption.id);
                    const subIsDisabled = !canSelectMore() && !subIsSelected;

                    return (
                      <div key={subOption.id} className="flex items-center gap-2">
                        <Checkbox
                          id={subOption.id}
                          checked={subIsSelected}
                          disabled={subIsDisabled}
                          onCheckedChange={(checked) => handleCategoryChange(subOption.id, checked as boolean)}
                        />
                        <label
                          htmlFor={subOption.id}
                          className={cn(
                            "text-sm cursor-pointer text-muted-foreground hover:text-foreground transition-colors",
                            subIsDisabled && "cursor-not-allowed opacity-50"
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