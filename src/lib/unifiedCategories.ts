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

// Main unified categories with bilingual labels
export const unifiedCategories: UnifiedCategory[] = [
  { 
    id: "cafe", 
    label: { el: "Καφέ", en: "Café" }, 
    icon: "☕", 
    hasDropdown: false 
  },
  {
    id: "restaurant",
    label: { el: "Εστιατόρια", en: "Restaurant" },
    icon: "🍽️",
    hasDropdown: true,
    subOptions: [
      { id: "brunch", label: { el: "Brunch", en: "Brunch" } },
      { id: "breakfast", label: { el: "Πρωινό", en: "Breakfast" } },
      { id: "lunch", label: { el: "Μεσημεριανό", en: "Lunch" } },
      { id: "dinner", label: { el: "Δείπνο", en: "Dinner" } },
    ],
  },
  {
    id: "nightlife",
    label: { el: "Νυχτερινή Ζωή", en: "Nightlife" },
    icon: "🍸",
    hasDropdown: true,
    subOptions: [
      { id: "bars", label: { el: "Μπαρ", en: "Bars" } },
      { id: "clubs", label: { el: "Κλαμπ", en: "Clubs" } },
      { id: "wine-cocktail-bars", label: { el: "Κρασί/Κοκτέιλ Μπαρ", en: "Wine/Cocktail Bars" } },
      { id: "shisha-lounges", label: { el: "Shisha Lounges", en: "Shisha Lounges" } },
      { id: "rooftop-bars", label: { el: "Rooftop Bars", en: "Rooftop Bars" } },
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
  {
    id: "fitness-wellness",
    label: { el: "Γυμναστική/Ευεξία", en: "Fitness/Wellness" },
    icon: "💪",
    hasDropdown: true,
    subOptions: [
      { id: "yoga-pilates", label: { el: "Yoga/Pilates", en: "Yoga/Pilates" } },
      { id: "outdoor-activities", label: { el: "Υπαίθριες Δραστηριότητες", en: "Outdoor Activities" } },
      { id: "wellness-retreats", label: { el: "Wellness Retreats", en: "Wellness Retreats" } },
      { id: "sports", label: { el: "Αθλητισμός", en: "Sports" } },
    ],
  },
  {
    id: "art-culture",
    label: { el: "Τέχνη & Πολιτισμός", en: "Art & Culture" },
    icon: "🎭",
    hasDropdown: true,
    subOptions: [
      { id: "museums", label: { el: "Μουσεία", en: "Museums" } },
      { id: "theaters", label: { el: "Θέατρα", en: "Theaters" } },
      { id: "cinema", label: { el: "Κινηματογράφος", en: "Cinema" } },
      { id: "concerts-live-music", label: { el: "Συναυλίες/Live Μουσική", en: "Concerts/Live Music" } },
    ],
  },
  {
    id: "family-community",
    label: { el: "Οικογένεια & Κοινότητα", en: "Family & Community" },
    icon: "👨‍👩‍👧‍👦",
    hasDropdown: false,
  },
  {
    id: "business-networking",
    label: { el: "Επιχειρηματικότητα & Networking", en: "Business & Networking" },
    icon: "💼",
    hasDropdown: false,
  },
  {
    id: "shopping-lifestyle",
    label: { el: "Αγορές & Lifestyle", en: "Shopping & Lifestyle" },
    icon: "🛍️",
    hasDropdown: false,
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
