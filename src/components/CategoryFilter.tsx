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
      { id: "cafe", label: "☕ Καφέ & Εστιατόρια", icon: "☕" },
      { id: "nightlife", label: "🌃 Νυχτερινή Ζωή", icon: "🌃" },
      { id: "art", label: "🎭 Τέχνη & Πολιτισμός", icon: "🎭" },
      { id: "fitness", label: "💪 Γυμναστική", icon: "💪" },
      { id: "family", label: "🧒 Οικογένεια", icon: "🧒" },
      { id: "business", label: "💼 Business", icon: "💼" },
      { id: "travel", label: "🏖️ Ταξίδια", icon: "🏖️" },
      { id: "lifestyle", label: "🛍️ Lifestyle", icon: "🛍️" },
    ],
    en: [
      { id: "cafe", label: "☕ Cafés & Restaurants", icon: "☕" },
      { id: "nightlife", label: "🌃 Nightlife", icon: "🌃" },
      { id: "art", label: "🎭 Art & Culture", icon: "🎭" },
      { id: "fitness", label: "💪 Fitness", icon: "💪" },
      { id: "family", label: "🧒 Family", icon: "🧒" },
      { id: "business", label: "💼 Business", icon: "💼" },
      { id: "travel", label: "🏖️ Travel", icon: "🏖️" },
      { id: "lifestyle", label: "🛍️ Lifestyle", icon: "🛍️" },
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
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-4">
        {categories[language].map((category) => (
          <Badge
            key={category.id}
            variant={selectedCategories.includes(category.id) ? "default" : "outline"}
            className={`cursor-pointer transition-all hover:scale-105 px-3 py-2 text-sm min-h-[44px] flex items-center ${
              selectedCategories.includes(category.id)
                ? "bg-ocean text-primary-foreground"
                : "hover:bg-ocean/10"
            }`}
            onClick={() => toggleCategory(category.id)}
          >
            {category.label}
          </Badge>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};

export default CategoryFilter;
