import { Badge } from "@/components/ui/badge";

interface CategoryFilterProps {
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
  language: "el" | "en";
}

const CategoryFilter = ({
  selectedCategories,
  onCategoryChange,
  language,
}: CategoryFilterProps) => {
  // 4 core categories for student-focused audience
  // Order: Nightlife → Café → Restaurant → Beach/Summer
  const categories = {
    el: [
      { id: "nightlife", label: "Νυχτερινή Ζωή", icon: "🍸" },
      { id: "cafe", label: "Καφέ", icon: "☕" },
      { id: "restaurant", label: "Εστιατόρια", icon: "🍽️" },
      { id: "beach-summer", label: "Παραλία/Καλοκαίρι", icon: "🏖️" },
    ],
    en: [
      { id: "nightlife", label: "Nightlife", icon: "🍸" },
      { id: "cafe", label: "Café", icon: "☕" },
      { id: "restaurant", label: "Restaurant", icon: "🍽️" },
      { id: "beach-summer", label: "Beach/Summer", icon: "🏖️" },
    ],
  };

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      onCategoryChange(selectedCategories.filter((id) => id !== categoryId));
    } else {
      onCategoryChange([...selectedCategories, categoryId]);
    }
  };

  return (
    <div className="w-full overflow-x-auto scrollbar-hide touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="flex gap-2 pb-2 pr-4 pl-1">
        {categories[language].map((category) => (
          <Badge
            key={category.id}
            variant={selectedCategories.includes(category.id) ? "default" : "outline"}
            className={`cursor-pointer transition-all duration-200 hover:scale-105 px-4 py-2.5 text-sm font-medium min-h-[44px] flex items-center gap-2 flex-shrink-0 rounded-full ${
              selectedCategories.includes(category.id)
                ? "bg-ocean text-white border-ocean shadow-md"
                : "bg-card text-foreground border-border hover:bg-ocean/10 hover:border-ocean/30 hover:shadow-sm"
            }`}
            onClick={() => toggleCategory(category.id)}
          >
            <span className="text-base">{category.icon}</span>
            <span>{category.label}</span>
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;
