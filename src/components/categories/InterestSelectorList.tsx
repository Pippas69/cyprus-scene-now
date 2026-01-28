import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type InterestSelectorCategory = {
  id: string;
  label: string;
  icon: string;
  hasDropdown: boolean;
  subOptions?: { id: string; label: string }[];
};

interface InterestSelectorListProps {
  categories: InterestSelectorCategory[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  /** Optional: start with some categories expanded */
  defaultExpandedIds?: string[];
}

/**
 * Mobile-first “list rows” selector (as per provided mock):
 * - Categories with sub-options are expandable (no checkbox on main row)
 * - Categories without sub-options (e.g. Events) are directly selectable
 */
export function InterestSelectorList({
  categories,
  selectedIds,
  onToggle,
  defaultExpandedIds,
}: InterestSelectorListProps) {
  const initialExpanded = useMemo(() => defaultExpandedIds ?? [], [defaultExpandedIds]);
  const [expanded, setExpanded] = useState<string[]>(initialExpanded);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="space-y-2">
      {categories.map((category) => {
        const hasSubOptions = category.hasDropdown && !!category.subOptions?.length;
        const isExpanded = expanded.includes(category.id);
        const selectedSubCount = category.subOptions?.filter((s) => selectedIds.includes(s.id)).length ?? 0;
        const isActive = (!hasSubOptions && selectedIds.includes(category.id)) || selectedSubCount > 0;

        return (
          <div key={category.id} className="border border-border rounded-2xl overflow-hidden">
            <div
              className={cn(
                "flex items-center justify-between px-3 sm:px-4 py-3 sm:py-3.5",
                "bg-background",
                isActive && "bg-muted/40"
              )}
            >
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                {!hasSubOptions && (
                  <Checkbox
                    id={`interest-${category.id}`}
                    checked={selectedIds.includes(category.id)}
                    onCheckedChange={() => onToggle(category.id)}
                    className="rounded-full h-4 w-4 sm:h-5 sm:w-5"
                  />
                )}

                <button
                  type="button"
                  onClick={hasSubOptions ? () => toggleExpanded(category.id) : undefined}
                  className={cn(
                    "flex items-center gap-2 sm:gap-3 flex-1 min-w-0 text-left",
                    hasSubOptions ? "cursor-pointer" : "cursor-default"
                  )}
                >
                  <span className="text-sm sm:text-base leading-none">{category.icon}</span>
                  <span className="text-xs sm:text-sm font-medium truncate">{category.label}</span>
                </button>
              </div>

              {hasSubOptions && (
                <button
                  type="button"
                  onClick={() => toggleExpanded(category.id)}
                  className="shrink-0 p-1 sm:p-1.5 rounded-lg hover:bg-muted transition-colors"
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>

            {hasSubOptions && isExpanded && (
              <div className="border-t border-border bg-background px-3 sm:px-4 py-2.5 sm:py-3">
                <div className="space-y-1.5 sm:space-y-2">
                  {category.subOptions!.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2 sm:gap-3">
                      <Checkbox
                        id={`interest-${sub.id}`}
                        checked={selectedIds.includes(sub.id)}
                        onCheckedChange={() => onToggle(sub.id)}
                        className="rounded-full h-4 w-4 sm:h-5 sm:w-5"
                      />
                      <label
                        htmlFor={`interest-${sub.id}`}
                        className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        {sub.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
