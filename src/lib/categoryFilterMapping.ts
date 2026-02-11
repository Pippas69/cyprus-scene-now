// Centralized mapping from unified filter IDs to ALL possible database category values
// This handles both new format (kebab-case IDs) and legacy formats (Greek labels, capitalized, etc.)
// Used across: Feed, Map, Ekdiloseis, Offers, BusinessDirectorySection

const FILTER_ID_TO_DB_VALUES: Record<string, string[]> = {
  // Main categories
  "nightlife": ["nightlife", "Nightlife", "Νυχτερινή Ζωή", "Νυχτερινή Διασκέδαση"],
  "events": ["events", "Events", "event"],
  "dining": ["dining", "Dining", "Εστίαση"],
  "summer": ["summer", "Summer", "beach-summer", "Beach & Summer", "Παραλία & Καλοκαίρι", "Παραλία / Καλοκαίρι", "Καλοκαίρι", "beach_summer"],

  // Nightlife sub-options
  "clubs": ["clubs", "Clubs", "Κλαμπ"],
  "bars": ["bars", "Bars", "Μπαρ"],
  "wine-bars": ["wine-bars", "Wine Bars", "Wine bars"],
  "pubs": ["pubs", "Pubs"],

  // Dining sub-options
  "fine-dining": ["fine-dining", "Fine Dining", "Fine dining", "Επίσημη Εστίαση"],
  "casual-dining": ["casual-dining", "Casual Dining", "Casual dining", "Χαλαρή Εστίαση"],

  // Summer sub-options
  "beach-bars": ["beach-bars", "Beach Bars", "Beach bars", "Μπαρ Παραλίας"],
  "summer-events": ["summer-events", "Summer Events", "Summer events"],
  "seaside-restaurants": ["seaside-restaurants", "Seaside Restaurants", "Seaside restaurants", "Παραθαλάσσια Εστιατόρια"],
};

// Parent category mapping: when a main category is selected, also include its sub-options
const PARENT_TO_CHILDREN: Record<string, string[]> = {
  "nightlife": ["clubs", "bars", "wine-bars", "pubs"],
  "dining": ["fine-dining", "casual-dining"],
  "summer": ["beach-bars", "summer-events", "seaside-restaurants"],
};

/**
 * Converts filter IDs (from HierarchicalCategoryFilter) to all possible database category values.
 * Handles parent categories by expanding to include children's DB values.
 * Used for Supabase `.overlaps('category', ...)` queries.
 */
export const mapFilterIdsToDbCategories = (filterIds: string[]): string[] => {
  const dbCategories = new Set<string>();

  filterIds.forEach(id => {
    // Add direct DB values for this filter ID
    const values = FILTER_ID_TO_DB_VALUES[id];
    if (values) {
      values.forEach(v => dbCategories.add(v));
    } else {
      // Fallback: use the ID directly
      dbCategories.add(id);
    }

    // If it's a parent category, also add all children's DB values
    const children = PARENT_TO_CHILDREN[id];
    if (children) {
      children.forEach(childId => {
        const childValues = FILTER_ID_TO_DB_VALUES[childId];
        if (childValues) {
          childValues.forEach(v => dbCategories.add(v));
        }
      });
    }
  });

  return Array.from(dbCategories);
};

/**
 * Check if a category array from the database matches any of the selected filter IDs.
 * Used for client-side filtering (e.g., in useMapBusinesses, useMapEvents).
 */
export const doesCategoryMatchFilters = (dbCategories: string[], filterIds: string[]): boolean => {
  const allDbValues = mapFilterIdsToDbCategories(filterIds);
  return dbCategories.some(cat =>
    allDbValues.some(dbVal => cat.toLowerCase() === dbVal.toLowerCase())
  );
};
