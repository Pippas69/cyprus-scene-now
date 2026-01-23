import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, Check, GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { unifiedCategories } from "@/lib/unifiedCategories";

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
  showStudentDiscounts?: boolean;
  onToggleStudentDiscounts?: () => void;
}

const HierarchicalCategoryFilter = ({
  selectedCategories,
  onCategoryChange,
  language,
  showStudentDiscounts,
  onToggleStudentDiscounts,
}: HierarchicalCategoryFilterProps) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const badgeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Build categories from unified source (plural forms for users/feed)
  const categories: Category[] = unifiedCategories.map(cat => ({
    id: cat.id,
    label: cat.label[language],
    icon: cat.icon,
    hasDropdown: cat.hasDropdown,
    subOptions: cat.subOptions?.map(sub => ({
      id: sub.id,
      label: sub.label[language],
    })),
  }));

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

  // Separate first 3 categories (Nightlife, Clubs, Dining) and Summer for mobile/tablet layout
  const firstRow = categories.slice(0, 3);
  const secondRow = categories.slice(3); // Summer on row 2 (mobile/tablet)

  const renderStudentDiscountBadge = () => {
    if (!onToggleStudentDiscounts) return null;
    const isActive = !!showStudentDiscounts;
    return (
      <div className="relative mt-0 lg:-ml-32">
        <Badge
          variant={isActive ? "default" : "outline"}
          className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] px-2 md:px-2.5 lg:px-3 py-1 md:py-1 lg:py-1.5 text-[10px] md:text-[10px] lg:text-xs font-medium min-h-[28px] md:min-h-[28px] lg:min-h-[36px] flex items-center justify-center gap-1 md:gap-1 lg:gap-1.5 rounded-full select-none whitespace-nowrap ${
            isActive
              ? "bg-ocean text-white border-ocean shadow-md"
              : "bg-card text-foreground border-border hover:bg-ocean/10 hover:border-ocean/30 hover:shadow-sm"
          }`}
          onClick={onToggleStudentDiscounts}
        >
          <GraduationCap className="h-3 w-3 md:h-3.5 md:w-3.5 lg:h-3 lg:w-3" />
          <span className="text-[10px] md:text-[10px] lg:text-[11px]">
            {language === "el" ? "Φοιτητική Έκπτωση" : "Student Discount"}
          </span>
        </Badge>
      </div>
    );
  };

  const renderBadge = (category: Category) => (
    <div
      key={category.id}
      className="relative"
      ref={(el) => (badgeRefs.current[category.id] = el)}
    >
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
        className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] px-2.5 md:px-3 lg:px-4 py-1.5 md:py-2 lg:py-2.5 text-xs md:text-xs lg:text-sm font-medium min-h-[32px] md:min-h-[40px] lg:min-h-[44px] flex items-center justify-center gap-1.5 md:gap-1.5 lg:gap-2 rounded-full select-none whitespace-nowrap ${
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
        <span className="text-xs md:text-sm lg:text-base">{category.icon}</span>
        <span>{category.label}</span>
        {category.hasDropdown && (
          <>
            {getSelectedSubOptionsCount(category) > 0 && (
              <span className="bg-white/20 px-1 md:px-1.5 py-0.5 rounded-full text-[8px] md:text-[10px] lg:text-xs font-semibold flex-shrink-0">
                {getSelectedSubOptionsCount(category)}
              </span>
            )}
            <ChevronDown
              size={10}
              className={`transition-transform duration-200 flex-shrink-0 md:w-3 md:h-3 ${
                openDropdown === category.id ? "rotate-180" : ""
              }`}
            />
          </>
        )}
        {!category.hasDropdown &&
          selectedCategories.includes(category.id) && (
            <Check size={10} className="flex-shrink-0 md:w-3 md:h-3" />
          )}
      </Badge>
    </div>
  );

  return (
    <div className="w-full">
      {/* Desktop: 4 categories in one row, Student Discount on the next row centered */}
      <div className="hidden lg:flex flex-col gap-2 pb-2">
        <div className="flex gap-2">
          {categories.map(renderBadge)}
        </div>
        <div className="flex justify-center">
          {renderStudentDiscountBadge()}
        </div>
      </div>
      
      {/* Mobile/Tablet: Summer + Student Discount on the same row (as per mock) */}
      <div className="lg:hidden space-y-1.5 pb-1.5">
        <div className="flex gap-1.5 justify-start">
          {firstRow.map(renderBadge)}
        </div>
        <div className="flex gap-1.5 justify-start items-center">
          {secondRow.map(renderBadge)}
          {renderStudentDiscountBadge()}
        </div>
      </div>

      {/* Portal Dropdown Menu */}
      {openDropdown && dropdownPosition && createPortal(
        <AnimatePresence>
          {categories.map((category) => (
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
                  left: Math.min(dropdownPosition.left, window.innerWidth - 220),
                  zIndex: 9999,
                }}
                className="min-w-[180px] max-w-[calc(100vw-32px)] bg-card border border-border rounded-xl shadow-lg overflow-hidden"
              >
                <div className="p-2 space-y-1">
                  {category.subOptions?.map((subOption) => (
                    <label
                      key={subOption.id}
                      htmlFor={subOption.id}
                      className={`flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 md:py-2.5 rounded-lg cursor-pointer transition-colors ${
                        selectedCategories.includes(subOption.id)
                          ? "bg-ocean/10 text-ocean"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Checkbox
                        id={subOption.id}
                        checked={selectedCategories.includes(subOption.id)}
                        onCheckedChange={() => toggleSubOption(subOption.id)}
                        className="data-[state=checked]:bg-ocean data-[state=checked]:border-ocean flex-shrink-0"
                      />
                      <span className="text-xs md:text-sm font-medium">
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
  );
};

export default HierarchicalCategoryFilter;