import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeAccessFiltersProps {
  language: "el" | "en";
  selectedFilters: string[];
  onFilterChange: (filters: string[]) => void;
}

interface FilterCategory {
  id: string;
  label: { el: string; en: string };
  subOptions?: { id: string; label: { el: string; en: string } }[];
}

const filterCategories: FilterCategory[] = [
  {
    id: "today",
    label: { el: "Σήμερα", en: "Today" },
    subOptions: [
      { id: "liveNow", label: { el: "Τώρα Live", en: "Live Now" } },
      { id: "tonight", label: { el: "Απόψε", en: "Tonight" } },
    ],
  },
  {
    id: "thisWeek",
    label: { el: "Αυτή την Εβδομάδα", en: "This Weekend" },
    subOptions: [
      { id: "monFri", label: { el: "Δευ-Παρ", en: "Mon-Fri" } },
      { id: "theWeekend", label: { el: "Σαββατοκύριακο", en: "The Weekend" } },
    ],
  },
  {
    id: "thisMonth",
    label: { el: "Αυτόν τον Μήνα", en: "This Month" },
  },
  {
    id: "eventAccess",
    label: { el: "Πρόσβαση", en: "Event Access" },
    subOptions: [
      { id: "freeEntrance", label: { el: "Δωρεάν Είσοδος", en: "Free Entrance" } },
      { id: "withReservations", label: { el: "Με Κρατήσεις", en: "With Reservations" } },
      { id: "withTickets", label: { el: "Με Εισιτήρια", en: "With Tickets" } },
    ],
  },
];

const TimeAccessFilters = ({ language, selectedFilters, onFilterChange }: TimeAccessFiltersProps) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPositions, setDropdownPositions] = useState<{ [key: string]: { top: number; left: number; width: number } }>({});
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Update dropdown position when opening
  useEffect(() => {
    if (openDropdown) {
      const button = buttonRefs.current[openDropdown];
      if (button) {
        const rect = button.getBoundingClientRect();
        setDropdownPositions(prev => ({
          ...prev,
          [openDropdown]: {
            top: rect.bottom + window.scrollY + 4,
            left: rect.left + window.scrollX,
            width: Math.max(rect.width, 180),
          }
        }));
      }
    }
  }, [openDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!openDropdown) return;
      
      const button = buttonRefs.current[openDropdown];
      const dropdown = dropdownRefs.current[openDropdown];
      
      if (
        button && !button.contains(e.target as Node) &&
        dropdown && !dropdown.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  const toggleFilter = (filterId: string) => {
    if (selectedFilters.includes(filterId)) {
      onFilterChange(selectedFilters.filter(f => f !== filterId));
    } else {
      onFilterChange([...selectedFilters, filterId]);
    }
  };

  const toggleDropdown = (categoryId: string) => {
    setOpenDropdown(prev => prev === categoryId ? null : categoryId);
  };

  const getSelectedCountForCategory = (category: FilterCategory) => {
    if (!category.subOptions) return 0;
    return category.subOptions.filter(sub => selectedFilters.includes(sub.id)).length;
  };

  const renderDropdown = (category: FilterCategory) => {
    if (!category.subOptions || openDropdown !== category.id) return null;
    
    const position = dropdownPositions[category.id];
    if (!position) return null;

    return createPortal(
      <div
        ref={el => dropdownRefs.current[category.id] = el}
        className="fixed z-[9999] bg-popover border border-border rounded-xl shadow-xl py-2 animate-in fade-in-0 zoom-in-95"
        style={{
          top: position.top,
          left: position.left,
          minWidth: position.width,
        }}
      >
        {category.subOptions.map((subOption) => (
          <label
            key={subOption.id}
            htmlFor={`filter-${subOption.id}`}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
              selectedFilters.includes(subOption.id)
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted"
            )}
          >
            <Checkbox
              id={`filter-${subOption.id}`}
              checked={selectedFilters.includes(subOption.id)}
              onCheckedChange={() => toggleFilter(subOption.id)}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <span className="text-sm font-medium">{subOption.label[language]}</span>
          </label>
        ))}
      </div>,
      document.body
    );
  };

  return (
    <div className="w-full overflow-x-auto scrollbar-hide touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="flex gap-2 pb-2 pr-4 pl-1">
        {filterCategories.map((category) => {
          const hasSubOptions = !!category.subOptions;
          const selectedCount = getSelectedCountForCategory(category);
          const isOpen = openDropdown === category.id;
          const isSelected = hasSubOptions 
            ? selectedCount > 0 
            : selectedFilters.includes(category.id);

          if (hasSubOptions) {
            return (
              <div key={category.id} className="relative flex-shrink-0">
                <button
                  ref={el => buttonRefs.current[category.id] = el}
                  onClick={() => toggleDropdown(category.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 min-h-[40px] rounded-full border font-semibold text-sm transition-all hover:scale-105",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-foreground border-border hover:bg-primary/10 hover:border-primary/30"
                  )}
                >
                  <span>
                    {category.label[language]}
                    {selectedCount > 0 && ` (${selectedCount})`}
                  </span>
                  <ChevronDown 
                    size={16} 
                    className={cn(
                      "transition-transform",
                      isOpen && "rotate-180"
                    )} 
                  />
                </button>
                {renderDropdown(category)}
              </div>
            );
          }

          // Simple button without dropdown (This Month)
          return (
            <Badge
              key={category.id}
              variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all hover:scale-105 font-semibold text-sm min-h-[40px] px-4 flex-shrink-0",
                isSelected 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-muted text-foreground border-border hover:bg-primary/10 hover:border-primary/30"
              )}
              onClick={() => toggleFilter(category.id)}
            >
              {category.label[language]}
            </Badge>
          );
        })}
      </div>
    </div>
  );
};

export default TimeAccessFilters;
