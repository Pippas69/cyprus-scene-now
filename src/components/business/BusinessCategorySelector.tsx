import { useState } from "react";
import { ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { unifiedCategories, getCategoriesForBusiness } from "@/lib/unifiedCategories";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  maxSelections = 2, // Default max 2 selections for businesses
}: BusinessCategorySelectorProps) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Get categories with singular labels for business context
  const categories = getCategoriesForBusiness(language);

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Count total selections (main categories + sub-options)
  const getTotalSelections = () => {
    return selectedCategories.length;
  };

  const canSelect = () => {
    return getTotalSelections() < maxSelections;
  };

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    if (checked && !canSelect()) {
      return; // Don't allow more selections
    }
    onCategoryChange(categoryId, checked);
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

  const text = {
    el: {
      maxSelectionsWarning: `Μπορείτε να επιλέξετε μέχρι ${maxSelections} κατηγορίες`,
      selected: 'επιλεγμένες',
    },
    en: {
      maxSelectionsWarning: `You can select up to ${maxSelections} categories`,
      selected: 'selected',
    },
  };

  const t = text[language];

  return (
    <div className="space-y-3">
      {/* Selection counter and warning */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {getTotalSelections()}/{maxSelections} {t.selected}
        </span>
        {!canSelect() && (
          <Alert variant="default" className="py-1 px-2 border-amber-500/50 bg-amber-500/10">
            <AlertCircle className="h-3 w-3 text-amber-500" />
            <AlertDescription className="text-xs text-amber-600 dark:text-amber-400 ml-1">
              {t.maxSelectionsWarning}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="space-y-2">
        {categories.map((category, index) => {
          const originalCategory = unifiedCategories[index];
          const isExpanded = expandedCategories.includes(category.id);
          const hasSubOptions = originalCategory.hasDropdown && originalCategory.subOptions;
          const subCount = getSelectedSubOptionsCount(category.id);
          const isSelected = isMainCategorySelected(category.id);
          const hasSubSelected = hasAnySubOptionSelected(category.id);
          const isDisabled = !canSelect() && !isSelected && !hasSubSelected;

          return (
            <div key={category.id} className="border border-border rounded-lg overflow-hidden">
              {/* Main Category Row */}
              <div
                className={cn(
                  "flex items-center justify-between p-3 transition-colors",
                  (isSelected || hasSubSelected) ? "bg-primary/10" : "bg-background hover:bg-muted/50",
                  isDisabled && "opacity-50"
                )}
              >
                <div className="flex items-center gap-3 flex-1">
                  {/* For categories without dropdowns (like Clubs), show checkbox */}
                  {!hasSubOptions && (
                    <Checkbox
                      id={category.id}
                      checked={isSelected}
                      disabled={isDisabled && !isSelected}
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

              {/* Sub-options (required selection for categories with dropdowns) */}
              {hasSubOptions && isExpanded && category.subOptions && (
                <div className="border-t border-border bg-muted/30 p-3 pl-6 space-y-2">
                  {category.subOptions.map(subOption => {
                    const subIsSelected = selectedCategories.includes(subOption.id);
                    const subIsDisabled = !canSelect() && !subIsSelected;

                    return (
                      <div key={subOption.id} className={cn(
                        "flex items-center gap-2",
                        subIsDisabled && "opacity-50"
                      )}>
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
                            subIsDisabled && "cursor-not-allowed"
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
