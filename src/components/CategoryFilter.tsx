import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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
const categories = {
    el: [
      { id: "cafe", label: "Καφέ & Εστιατόρια", icon: "☕" },
      { id: "nightlife", label: "Νυχτερινή Ζωή", icon: "🍸" },
      { id: "art", label: "Τέχνη & Πολιτισμός", icon: "🎭" },
      { id: "music", label: "Μουσική", icon: "🎵" },
      { id: "fitness", label: "Γυμναστική", icon: "💪" },
      { id: "family", label: "Οικογένεια", icon: "👨‍👩‍👧" },
      { id: "business", label: "Business", icon: "💼" },
      { id: "travel", label: "Beach & Ταξίδια", icon: "🏖️" },
      { id: "food", label: "Φαγητό & Ποτό", icon: "🍴" },
      { id: "sports", label: "Αθλητισμός", icon: "⚽" },
    ],
    en: [
      { id: "cafe", label: "Cafés & Restaurants", icon: "☕" },
      { id: "nightlife", label: "Nightlife", icon: "🍸" },
      { id: "art", label: "Art & Culture", icon: "🎭" },
      { id: "music", label: "Music", icon: "🎵" },
      { id: "fitness", label: "Fitness", icon: "💪" },
      { id: "family", label: "Family", icon: "👨‍👩‍👧" },
      { id: "business", label: "Business", icon: "💼" },
      { id: "travel", label: "Beach & Travel", icon: "🏖️" },
      { id: "food", label: "Food & Drinks", icon: "🍴" },
      { id: "sports", label: "Sports", icon: "⚽" },
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
