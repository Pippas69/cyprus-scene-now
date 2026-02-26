// Unified category system for consistent filtering and personalization
// These categories are used across: User signup, Business signup, Feed filters, Map filters, Offers filters

export interface SubOption {
  id: string;
  label: { el: string; en: string };
  // Singular forms for business contexts
  singularLabel?: { el: string; en: string };
}

export interface UnifiedCategory {
  id: string;
  label: { el: string; en: string };
  // Singular forms for business contexts
  singularLabel?: { el: string; en: string };
  icon: string;
  hasDropdown: boolean;
  subOptions?: SubOption[];
}

// Main unified categories with bilingual labels (3 core categories)
// Order: Nightlife → Dining → Παραστάσεις
// User context: Plural forms (Bars, Clubs, Θέατρα, etc.)
// Business context: Singular forms (Bar, Club, Θέατρο, etc.)
export const unifiedCategories: UnifiedCategory[] = [
  {
    id: "nightlife",
    label: { el: "Nightlife", en: "Nightlife" },
    singularLabel: { el: "Nightlife", en: "Nightlife" },
    icon: "🍸",
    hasDropdown: true,
    subOptions: [
      { 
        id: "clubs", 
        label: { el: "Clubs", en: "Clubs" },
        singularLabel: { el: "Club", en: "Club" }
      },
      { 
        id: "bars", 
        label: { el: "Bars", en: "Bars" },
        singularLabel: { el: "Bar", en: "Bar" }
      },
      { 
        id: "events", 
        label: { el: "Events", en: "Events" },
        singularLabel: { el: "Event", en: "Event" }
      },
      { 
        id: "pubs", 
        label: { el: "Pubs", en: "Pubs" },
        singularLabel: { el: "Pub", en: "Pub" }
      },
    ],
  },
  {
    id: "dining",
    label: { el: "Εστίαση", en: "Dining" },
    singularLabel: { el: "Εστίαση", en: "Dining" },
    icon: "🍴",
    hasDropdown: true,
    subOptions: [
      { 
        id: "fine-dining", 
        label: { el: "Επίσημη Εστίαση", en: "Fine Dining" },
        singularLabel: { el: "Επίσημη Εστίαση", en: "Fine Dining" }
      },
      { 
        id: "casual-dining", 
        label: { el: "Χαλαρή Εστίαση", en: "Casual Dining" },
        singularLabel: { el: "Χαλαρή Εστίαση", en: "Casual Dining" }
      },
    ],
  },
  {
    id: "performances",
    label: { el: "Παραστάσεις", en: "Performances" },
    singularLabel: { el: "Παράσταση", en: "Performance" },
    icon: "🎭",
    hasDropdown: true,
    subOptions: [
      { 
        id: "theatre", 
        label: { el: "Θέατρα", en: "Theatre" },
        singularLabel: { el: "Θέατρο", en: "Theatre" }
      },
      { 
        id: "music", 
        label: { el: "Μουσική", en: "Music" },
        singularLabel: { el: "Μουσική", en: "Music" }
      },
      { 
        id: "dance", 
        label: { el: "Χορός", en: "Dance" },
        singularLabel: { el: "Χορός", en: "Dance" }
      },
      { 
        id: "kids", 
        label: { el: "Παιδικά", en: "Kids" },
        singularLabel: { el: "Παιδικό", en: "Kids" }
      },
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

// Helper to get label by ID and language (plural form - for users/feed)
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

// Helper to get singular label by ID and language (for businesses)
export const getCategorySingularLabelById = (id: string, language: 'el' | 'en'): string => {
  // Check main categories
  const mainCat = unifiedCategories.find(c => c.id === id);
  if (mainCat) return mainCat.singularLabel?.[language] || mainCat.label[language];
  
  // Check sub-options
  for (const cat of unifiedCategories) {
    const subOpt = cat.subOptions?.find(s => s.id === id);
    if (subOpt) return subOpt.singularLabel?.[language] || subOpt.label[language];
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

// Get main categories only for user context (plural - for simpler selection like signup)
export const getMainCategories = (language: 'el' | 'en') => {
  return unifiedCategories.map(cat => ({
    id: cat.id,
    label: cat.label[language],
    icon: cat.icon,
  }));
};

// Get main categories for business context (singular forms)
export const getMainCategoriesForBusiness = (language: 'el' | 'en') => {
  return unifiedCategories.map(cat => ({
    id: cat.id,
    label: cat.singularLabel?.[language] || cat.label[language],
    icon: cat.icon,
  }));
};

// Get all categories with sub-options for user context (plural forms, unlimited selection)
export const getCategoriesForUser = (language: 'el' | 'en') => {
  return unifiedCategories.map(cat => ({
    id: cat.id,
    label: cat.label[language],
    icon: cat.icon,
    hasDropdown: cat.hasDropdown,
    subOptions: cat.subOptions?.map(sub => ({
      id: sub.id,
      label: sub.label[language],
    })),
  }));
};

// Get all categories with sub-options for business context (singular forms, max 2 selection)
export const getCategoriesForBusiness = (language: 'el' | 'en') => {
  return unifiedCategories.map(cat => ({
    id: cat.id,
    label: cat.singularLabel?.[language] || cat.label[language],
    icon: cat.icon,
    hasDropdown: cat.hasDropdown,
    subOptions: cat.subOptions?.map(sub => ({
      id: sub.id,
      label: sub.singularLabel?.[language] || sub.label[language],
    })),
  }));
};
