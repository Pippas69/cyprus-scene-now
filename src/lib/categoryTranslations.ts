// Centralized category translation utility

type Language = 'el' | 'en';

const categoryMap: Record<string, { el: string; en: string }> = {
  // Main categories (4 core categories)
  'nightlife': { el: 'Νυχτερινή Ζωή', en: 'Nightlife' },
  'clubs': { el: 'Clubs', en: 'Clubs' },
  'club': { el: 'Club', en: 'Club' },
  'dining': { el: 'Εστίαση', en: 'Dining' },
  'summer': { el: 'Καλοκαίρι', en: 'Summer' },
  
  // Nightlife sub-options (plural for users)
  'bars': { el: 'Bars', en: 'Bars' },
  'bar': { el: 'Bar', en: 'Bar' },
  'cocktail-bars': { el: 'Cocktail Bars', en: 'Cocktail Bars' },
  'cocktail-bar': { el: 'Cocktail Bar', en: 'Cocktail Bar' },
  'wine-bars': { el: 'Wine Bars', en: 'Wine Bars' },
  'wine-bar': { el: 'Wine Bar', en: 'Wine Bar' },
  'pubs': { el: 'Pubs', en: 'Pubs' },
  'pub': { el: 'Pub', en: 'Pub' },
  
  // Dining sub-options
  'fine-dining': { el: 'Επίσημη Εστίαση', en: 'Fine Dining' },
  'casual-dining': { el: 'Χαλαρή Εστίαση', en: 'Casual Dining' },
  
  // Summer sub-options (plural for users)
  'beach-bars': { el: 'Beach Bars', en: 'Beach Bars' },
  'beach-bar': { el: 'Beach Bar', en: 'Beach Bar' },
  'summer-events': { el: 'Summer Events', en: 'Summer Events' },
  'summer-event': { el: 'Summer Event', en: 'Summer Event' },
  'seaside-restaurants': { el: 'Παραθαλάσσια Εστιατόρια', en: 'Seaside Restaurants' },
  'seaside-restaurant': { el: 'Παραθαλάσσιο Εστιατόριο', en: 'Seaside Restaurant' },
  
  // Legacy categories for backward compatibility (still translate existing data)
  'beach-summer': { el: 'Καλοκαίρι', en: 'Summer' },
  'wine-cocktail-bars': { el: 'Wine & Cocktail Bars', en: 'Wine & Cocktail Bars' },
  'live-music': { el: 'Ζωντανή Μουσική', en: 'Live Music' },
  'cafe': { el: 'Καφέ', en: 'Café' },
  'restaurant': { el: 'Εστιατόρια', en: 'Restaurant' },
  'brunch': { el: 'Brunch', en: 'Brunch' },
  'breakfast': { el: 'Πρωινό', en: 'Breakfast' },
  'lunch': { el: 'Μεσημεριανό', en: 'Lunch' },
  'dinner': { el: 'Δείπνο', en: 'Dinner' },
  'concerts-live-music': { el: 'Ζωντανή Μουσική', en: 'Live Music' },
  'shisha-lounges': { el: 'Shisha Lounges', en: 'Shisha Lounges' },
  'rooftop-bars': { el: 'Rooftop Bars', en: 'Rooftop Bars' },
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
  
  // Greek values (for backward compatibility with database values)
  'νυχτερινή ζωή': { el: 'Νυχτερινή Ζωή', en: 'Nightlife' },
  'νυχτερινή διασκέδαση': { el: 'Νυχτερινή Διασκέδαση', en: 'Nightlife' },
  'νυχτερινή διασκέδαση & live music': { el: 'Νυχτερινή Διασκέδαση & Live Music', en: 'Nightlife & Live Music' },
  'φαγητό & ποτό': { el: 'Φαγητό & Ποτό', en: 'Food & Drinks' },
  'καφέ': { el: 'Καφέ', en: 'Cafe' },
  'τέχνη': { el: 'Τέχνη', en: 'Art' },
  'μουσική': { el: 'Μουσική', en: 'Music' },
  'ζωντανή μουσική': { el: 'Ζωντανή Μουσική', en: 'Live Music' },
  'εστίαση': { el: 'Εστίαση', en: 'Dining' },
  'καφετέριες & εστιατόρια': { el: 'Καφετέριες & Εστιατόρια', en: 'Cafes & Restaurants' },
  'τέχνη & πολιτισμός': { el: 'Τέχνη & Πολιτισμός', en: 'Art & Culture' },
  'fitness & wellness': { el: 'Fitness & Wellness', en: 'Fitness & Wellness' },
  'οικογένεια & κοινότητα': { el: 'Οικογένεια & Κοινότητα', en: 'Family & Community' },
  'επιχειρηματικότητα & networking': { el: 'Επιχειρηματικότητα & Networking', en: 'Business & Networking' },
  'εξωτερικές δραστηριότητες': { el: 'Εξωτερικές Δραστηριότητες', en: 'Outdoor Activities' },
  'αγορές & lifestyle': { el: 'Αγορές & Lifestyle', en: 'Shopping & Lifestyle' },
  'παραλία/καλοκαίρι': { el: 'Καλοκαίρι', en: 'Summer' },
  'παραλία / καλοκαίρι': { el: 'Καλοκαίρι', en: 'Summer' },
  'καλοκαίρι': { el: 'Καλοκαίρι', en: 'Summer' },
  'gay': { el: 'Gay', en: 'Gay' },
  // Mixed language categories from database
  'clubs & παραλία / καλοκαίρι': { el: 'Clubs & Καλοκαίρι', en: 'Clubs & Summer' },
  'clubs & παραλία/καλοκαίρι': { el: 'Clubs & Καλοκαίρι', en: 'Clubs & Summer' },
  'bars & νυχτερινή διασκέδαση': { el: 'Bars & Νυχτερινή Διασκέδαση', en: 'Bars & Nightlife' },
  'clubs & νυχτερινή διασκέδαση': { el: 'Clubs & Νυχτερινή Διασκέδαση', en: 'Clubs & Nightlife' },
  'εστίαση & καφέ': { el: 'Εστίαση & Καφέ', en: 'Dining & Cafe' },
  'nightlife & bars': { el: 'Νυχτερινή Διασκέδαση & Bars', en: 'Nightlife & Bars' },
  // Additional mixed formats from database
  'εστίαση & casual dining': { el: 'Εστίαση & Χαλαρή Εστίαση', en: 'Dining & Casual Dining' },
  'εστίαση & casual-dining': { el: 'Εστίαση & Χαλαρή Εστίαση', en: 'Dining & Casual Dining' },
  'dining & casual dining': { el: 'Εστίαση & Χαλαρή Εστίαση', en: 'Dining & Casual Dining' },
  'dining & casual-dining': { el: 'Εστίαση & Χαλαρή Εστίαση', en: 'Dining & Casual Dining' },
  // Categories stored with spaces instead of hyphens
  'casual dining': { el: 'Χαλαρή Εστίαση', en: 'Casual Dining' },
  'fine dining': { el: 'Επίσημη Εστίαση', en: 'Fine Dining' },
  'live music': { el: 'Ζωντανή Μουσική', en: 'Live Music' },
  'beach bars': { el: 'Beach Bars', en: 'Beach Bars' },
  'cocktail bars': { el: 'Cocktail Bars', en: 'Cocktail Bars' },
  'wine bars': { el: 'Wine Bars', en: 'Wine Bars' },
  'wine cocktail bars': { el: 'Wine & Cocktail Bars', en: 'Wine & Cocktail Bars' },
  'wine & cocktail bars': { el: 'Wine & Cocktail Bars', en: 'Wine & Cocktail Bars' },
  'summer events': { el: 'Summer Events', en: 'Summer Events' },
  'seaside restaurants': { el: 'Παραθαλάσσια Εστιατόρια', en: 'Seaside Restaurants' },
  'beach summer': { el: 'Καλοκαίρι', en: 'Summer' },
  'beach / summer': { el: 'Καλοκαίρι', en: 'Summer' },
  'shisha lounges': { el: 'Shisha Lounges', en: 'Shisha Lounges' },
  'rooftop bars': { el: 'Rooftop Bars', en: 'Rooftop Bars' },
  'fitness wellness': { el: 'Γυμναστική/Ευεξία', en: 'Fitness/Wellness' },
  'art culture': { el: 'Τέχνη & Πολιτισμός', en: 'Art & Culture' },
};

export function getCategoryLabel(category: string | null | undefined, language: Language): string {
  if (!category) return language === 'el' ? 'Εκδήλωση' : 'Event';
  
  // Normalize the category key (lowercase, trim)
  const normalizedKey = category.toLowerCase().trim();
  
  // Look up in the map - try exact match first
  let mapping = categoryMap[normalizedKey];
  
  // If not found, try replacing spaces with hyphens
  if (!mapping) {
    const hyphenatedKey = normalizedKey.replace(/\s+/g, '-');
    mapping = categoryMap[hyphenatedKey];
  }
  
  // If still not found, try replacing hyphens with spaces
  if (!mapping) {
    const spacedKey = normalizedKey.replace(/-/g, ' ');
    mapping = categoryMap[spacedKey];
  }
  
  if (mapping) {
    return mapping[language];
  }
  
  // Fallback: return original value capitalized
  return category.charAt(0).toUpperCase() + category.slice(1);
}
