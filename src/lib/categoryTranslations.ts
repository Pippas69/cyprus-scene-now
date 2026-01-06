// Centralized category translation utility

type Language = 'el' | 'en';

const categoryMap: Record<string, { el: string; en: string }> = {
  // Main categories (4 core categories)
  'cafe': { el: 'Καφέ', en: 'Café' },
  'restaurant': { el: 'Εστιατόρια', en: 'Restaurant' },
  'nightlife': { el: 'Νυχτερινή Ζωή', en: 'Nightlife' },
  'beach-summer': { el: 'Παραλία/Καλοκαίρι', en: 'Beach/Summer' },
  
  // Restaurant sub-options
  'brunch': { el: 'Brunch', en: 'Brunch' },
  'breakfast': { el: 'Πρωινό', en: 'Breakfast' },
  'lunch': { el: 'Μεσημεριανό', en: 'Lunch' },
  'dinner': { el: 'Δείπνο', en: 'Dinner' },
  
  // Nightlife sub-options (now includes concerts/live music)
  'bars': { el: 'Μπαρ', en: 'Bars' },
  'clubs': { el: 'Κλαμπ', en: 'Clubs' },
  'wine-cocktail-bars': { el: 'Κρασί/Κοκτέιλ Μπαρ', en: 'Wine/Cocktail Bars' },
  'shisha-lounges': { el: 'Shisha Lounges', en: 'Shisha Lounges' },
  'rooftop-bars': { el: 'Rooftop Bars', en: 'Rooftop Bars' },
  'concerts-live-music': { el: 'Συναυλίες/Live Μουσική', en: 'Concerts/Live Music' },
  
  // Beach/Summer sub-options
  'beach-bars': { el: 'Beach Bars', en: 'Beach Bars' },
  'summer-events': { el: 'Καλοκαιρινές Εκδηλώσεις', en: 'Summer Events' },
  'seaside-restaurants': { el: 'Παραθαλάσσια Εστιατόρια', en: 'Seaside Restaurants' },
  
  // Legacy categories for backward compatibility (still translate existing data)
  'fitness-wellness': { el: 'Γυμναστική/Ευεξία', en: 'Fitness/Wellness' },
  'art-culture': { el: 'Τέχνη & Πολιτισμός', en: 'Art & Culture' },
  'art': { el: 'Τέχνη', en: 'Art' },
  'fitness': { el: 'Fitness', en: 'Fitness' },
  'family': { el: 'Οικογένεια', en: 'Family' },
  'business': { el: 'Επιχειρήσεις', en: 'Business' },
  'food': { el: 'Φαγητό & Ποτό', en: 'Food & Drinks' },
  'music': { el: 'Μουσική', en: 'Music' },
  'culture': { el: 'Πολιτισμός', en: 'Culture' },
  'entertainment': { el: 'Ψυχαγωγία', en: 'Entertainment' },
  'concert': { el: 'Συναυλία', en: 'Concert' },
  
  // Greek values (for backward compatibility)
  'νυχτερινή ζωή': { el: 'Νυχτερινή Ζωή', en: 'Nightlife' },
  'φαγητό & ποτό': { el: 'Φαγητό & Ποτό', en: 'Food & Drinks' },
  'καφέ': { el: 'Καφέ', en: 'Cafe' },
  'τέχνη': { el: 'Τέχνη', en: 'Art' },
  'μουσική': { el: 'Μουσική', en: 'Music' },
};

export function getCategoryLabel(category: string | null | undefined, language: Language): string {
  if (!category) return language === 'el' ? 'Εκδήλωση' : 'Event';
  
  // Normalize the category key (lowercase, trim)
  const normalizedKey = category.toLowerCase().trim();
  
  // Look up in the map
  const mapping = categoryMap[normalizedKey];
  
  if (mapping) {
    return mapping[language];
  }
  
  // Fallback: return original value capitalized
  return category.charAt(0).toUpperCase() + category.slice(1);
}
