// Unified category system for consistent filtering and personalization
// These categories are used across: User signup, Business signup, Feed filters, Map filters, Offers filters

export interface SubOption {
  id: string;
  label: { el: string; en: string };
}

export interface UnifiedCategory {
  id: string;
  label: { el: string; en: string };
  icon: string;
  hasDropdown: boolean;
  subOptions?: SubOption[];
}

// Main unified categories with bilingual labels (4 core categories)
// Order: Nightlife → Clubs → Dining → Beach & Summer
export const unifiedCategories: UnifiedCategory[] = [
  {
    id: "nightlife",
    label: { el: "Νυχτερινή Ζωή", en: "Nightlife" },
    icon: "🍸",
    hasDropdown: true,
    subOptions: [
      { id: "bars", label: { el: "Bars", en: "Bars" } },
      { id: "wine-cocktail-bars", label: { el: "Κρασί & Cocktail Bars", en: "Wine & Cocktail Bars" } },
      { id: "live-music", label: { el: "Ζωντανή Μουσική", en: "Live Music" } },
    ],
  },
  { 
    id: "clubs", 
    label: { el: "Clubs", en: "Clubs" }, 
    icon: "🎉", 
    hasDropdown: false 
  },
  {
    id: "dining",
    label: { el: "Εστίαση", en: "Dining" },
    icon: "🍽️",
    hasDropdown: true,
    subOptions: [
      { id: "fine-dining", label: { el: "Επίσημη Εστίαση", en: "Fine Dining" } },
      { id: "casual-dining", label: { el: "Χαλαρή Εστίαση", en: "Casual Dining" } },
    ],
  },
  {
    id: "beach-summer",
    label: { el: "Παραλία/Καλοκαίρι", en: "Beach/Summer" },
    icon: "🏖️",
    hasDropdown: true,
    subOptions: [
      { id: "beach-bars", label: { el: "Beach Bars", en: "Beach Bars" } },
      { id: "summer-events", label: { el: "Καλοκαιρινές Εκδηλώσεις", en: "Summer Events" } },
      { id: "seaside-restaurants", label: { el: "Παραθαλάσσια Εστιατόρια", en: "Seaside Restaurants" } },
    ],
  },
];

// Helper to get all category and sub-option IDs (flat list for matching)
export const getAllCategoryIds = (): string[] => {
  const ids: string[] = [];
  unifiedCategories.forEach(cat => {
    ids.push(cat.id);
    cat.subOptions?.forEach(sub => ids.push(sub.id));
  });
  return ids;
};

// Helper to get label by ID and language
export const getCategoryLabelById = (id: string, language: 'el' | 'en'): string => {
  // Check main categories
  const mainCat = unifiedCategories.find(c => c.id === id);
  if (mainCat) return mainCat.label[language];
  
  // Check sub-options
  for (const cat of unifiedCategories) {
    const subOpt = cat.subOptions?.find(s => s.id === id);
    if (subOpt) return subOpt.label[language];
  }
  
  return id; // Fallback to ID if not found
};

// Helper to get icon by category ID
export const getCategoryIcon = (id: string): string => {
  const cat = unifiedCategories.find(c => c.id === id);
  if (cat) return cat.icon;
  
  // For sub-options, return parent category icon
  for (const c of unifiedCategories) {
    if (c.subOptions?.some(s => s.id === id)) {
      return c.icon;
    }
  }
  
  return "📍"; // Default icon
};

// Get main categories only (for simpler selection like signup)
export const getMainCategories = (language: 'el' | 'en') => {
  return unifiedCategories.map(cat => ({
    id: cat.id,
    label: cat.label[language],
    icon: cat.icon,
  }));
};
