import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SubOption {
  id: string;
  label: string;
}

interface Category {
  id: string;
  label: string;
  icon: string;
  hasDropdown: boolean;
  subOptions?: SubOption[];
}

interface HierarchicalCategoryFilterProps {
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
  language: "el" | "en";
}

const HierarchicalCategoryFilter = ({
  selectedCategories,
  onCategoryChange,
  language,
}: HierarchicalCategoryFilterProps) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const badgeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // 4 core categories
  // Order: Nightlife → Clubs → Dining → Beach & Summer
  const categories: { el: Category[]; en: Category[] } = {
    el: [
      {
        id: "nightlife",
        label: "Νυχτερινή Ζωή",
        icon: "🍸",
        hasDropdown: true,
        subOptions: [
          { id: "bars", label: "Bars" },
          { id: "wine-cocktail-bars", label: "Κρασί & Cocktail Bars" },
          { id: "live-music", label: "Ζωντανή Μουσική" },
        ],
      },
      { id: "clubs", label: "Clubs", icon: "🎉", hasDropdown: false },
      {
        id: "dining",
        label: "Εστίαση",
        icon: "🍽️",
        hasDropdown: true,
        subOptions: [
          { id: "fine-dining", label: "Επίσημη Εστίαση" },
          { id: "casual-dining", label: "Χαλαρή Εστίαση" },
        ],
      },
      {
        id: "beach-summer",
        label: "Παραλία/Καλοκαίρι",
        icon: "🏖️",
        hasDropdown: true,
        subOptions: [
          { id: "beach-bars", label: "Beach Bars" },
          { id: "summer-events", label: "Καλοκαιρινές Εκδηλώσεις" },
          { id: "seaside-restaurants", label: "Παραθαλάσσια Εστιατόρια" },
        ],
      },
    ],
    en: [
      {
        id: "nightlife",
        label: "Nightlife",
        icon: "🍸",
        hasDropdown: true,
        subOptions: [
          { id: "bars", label: "Bars" },
          { id: "wine-cocktail-bars", label: "Wine & Cocktail Bars" },
          { id: "live-music", label: "Live Music" },
        ],
      },
      { id: "clubs", label: "Clubs", icon: "🎉", hasDropdown: false },
      {
        id: "dining",
        label: "Dining",
        icon: "🍽️",
        hasDropdown: true,
        subOptions: [
          { id: "fine-dining", label: "Fine Dining" },
          { id: "casual-dining", label: "Casual Dining" },
        ],
      },
      {
        id: "beach-summer",
        label: "Beach/Summer",
        icon: "🏖️",
        hasDropdown: true,
        subOptions: [
          { id: "beach-bars", label: "Beach Bars" },
          { id: "summer-events", label: "Summer Events" },
          { id: "seaside-restaurants", label: "Seaside Restaurants" },
        ],
      },
    ],
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const badgeEl = badgeRefs.current[openDropdown];
        const dropdownEl = dropdownRef.current;
        const target = event.target as Node;
        
        if (badgeEl && !badgeEl.contains(target) && dropdownEl && !dropdownEl.contains(target)) {
          setOpenDropdown(null);
          setDropdownPosition(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  // Update dropdown position on scroll/resize
  useEffect(() => {
    if (!openDropdown) return;

    const updatePosition = () => {
      const badgeEl = badgeRefs.current[openDropdown];
      if (badgeEl) {
        const rect = badgeEl.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 8,
          left: rect.left,
        });
      }
    };

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [openDropdown]);

  const handleToggleDropdown = (categoryId: string) => {
    if (openDropdown === categoryId) {
      setOpenDropdown(null);
      setDropdownPosition(null);
    } else {
      const badgeEl = badgeRefs.current[categoryId];
      if (badgeEl) {
        const rect = badgeEl.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 8,
          left: rect.left,
        });
      }
      setOpenDropdown(categoryId);
    }
  };

  const toggleSimpleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      onCategoryChange(selectedCategories.filter((id) => id !== categoryId));
    } else {
      onCategoryChange([...selectedCategories, categoryId]);
    }
  };

  const toggleSubOption = (subOptionId: string) => {
    if (selectedCategories.includes(subOptionId)) {
      onCategoryChange(selectedCategories.filter((id) => id !== subOptionId));
    } else {
      onCategoryChange([...selectedCategories, subOptionId]);
    }
  };

  const getSelectedSubOptionsCount = (category: Category): number => {
    if (!category.subOptions) return 0;
    return category.subOptions.filter((sub) =>
      selectedCategories.includes(sub.id)
    ).length;
  };

  const hasAnySubOptionSelected = (category: Category): boolean => {
    return getSelectedSubOptionsCount(category) > 0;
  };

  return (
    <div
      className="w-full overflow-x-auto scrollbar-hide touch-pan-x"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div className="flex gap-2 pb-2 pr-4 pl-1">
        {categories[language].map((category) => (
          <div
            key={category.id}
            className="relative flex-shrink-0"
            ref={(el) => (badgeRefs.current[category.id] = el)}
          >
            {/* Category Badge */}
            <Badge
              variant={
                category.hasDropdown
                  ? hasAnySubOptionSelected(category)
                    ? "default"
                    : "outline"
                  : selectedCategories.includes(category.id)
                  ? "default"
                  : "outline"
              }
              className={`cursor-pointer transition-all duration-200 hover:scale-105 px-4 py-2.5 text-sm font-medium min-h-[44px] flex items-center gap-2 rounded-full select-none ${
                category.hasDropdown
                  ? hasAnySubOptionSelected(category)
                    ? "bg-ocean text-white border-ocean shadow-md"
                    : "bg-card text-foreground border-border hover:bg-ocean/10 hover:border-ocean/30 hover:shadow-sm"
                  : selectedCategories.includes(category.id)
                  ? "bg-ocean text-white border-ocean shadow-md"
                  : "bg-card text-foreground border-border hover:bg-ocean/10 hover:border-ocean/30 hover:shadow-sm"
              }`}
              onClick={() => {
                if (category.hasDropdown) {
                  handleToggleDropdown(category.id);
                } else {
                  toggleSimpleCategory(category.id);
                }
              }}
            >
              <span className="text-base">{category.icon}</span>
              <span>{category.label}</span>
              {category.hasDropdown && (
                <>
                  {getSelectedSubOptionsCount(category) > 0 && (
                    <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs font-semibold">
                      {getSelectedSubOptionsCount(category)}
                    </span>
                  )}
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${
                      openDropdown === category.id ? "rotate-180" : ""
                    }`}
                  />
                </>
              )}
              {!category.hasDropdown &&
                selectedCategories.includes(category.id) && (
                  <Check size={16} className="ml-1" />
                )}
            </Badge>
          </div>
        ))}

        {/* Portal Dropdown Menu */}
        {openDropdown && dropdownPosition && createPortal(
          <AnimatePresence>
            {categories[language].map((category) => (
              category.hasDropdown && openDropdown === category.id && (
                <motion.div
                  key={category.id}
                  ref={dropdownRef}
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  style={{
                    position: 'fixed',
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                    zIndex: 9999,
                  }}
                  className="min-w-[200px] bg-card border border-border rounded-xl shadow-lg overflow-hidden"
                >
                  <div className="p-2 space-y-1">
                    {category.subOptions?.map((subOption) => (
                      <label
                        key={subOption.id}
                        htmlFor={subOption.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                          selectedCategories.includes(subOption.id)
                            ? "bg-ocean/10 text-ocean"
                            : "hover:bg-muted"
                        }`}
                      >
                        <Checkbox
                          id={subOption.id}
                          checked={selectedCategories.includes(subOption.id)}
                          onCheckedChange={() => toggleSubOption(subOption.id)}
                          className="data-[state=checked]:bg-ocean data-[state=checked]:border-ocean"
                        />
                        <span className="text-sm font-medium">
                          {subOption.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </motion.div>
              )
            ))}
          </AnimatePresence>,
          document.body
        )}
      </div>
    </div>
  );
};

export default HierarchicalCategoryFilter;
