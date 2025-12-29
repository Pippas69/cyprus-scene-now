// Centralized category translation utility

type Language = 'el' | 'en';

const categoryMap: Record<string, { el: string; en: string }> = {
  // Main categories
  'cafe': { el: 'Καφέ', en: 'Café' },
  'restaurant': { el: 'Εστιατόρια', en: 'Restaurant' },
  'nightlife': { el: 'Νυχτερινή Ζωή', en: 'Nightlife' },
  'beach-summer': { el: 'Παραλία/Καλοκαίρι', en: 'Beach/Summer' },
  'fitness-wellness': { el: 'Γυμναστική/Ευεξία', en: 'Fitness/Wellness' },
  'art-culture': { el: 'Τέχνη & Πολιτισμός', en: 'Art & Culture' },
  
  // Restaurant sub-options
  'brunch': { el: 'Brunch', en: 'Brunch' },
  'breakfast': { el: 'Πρωινό', en: 'Breakfast' },
  'lunch': { el: 'Μεσημεριανό', en: 'Lunch' },
  'dinner': { el: 'Δείπνο', en: 'Dinner' },
  
  // Nightlife sub-options
  'bars': { el: 'Μπαρ', en: 'Bars' },
  'clubs': { el: 'Κλαμπ', en: 'Clubs' },
  'wine-cocktail-bars': { el: 'Κρασί/Κοκτέιλ Μπαρ', en: 'Wine/Cocktail Bars' },
  'shisha-lounges': { el: 'Shisha Lounges', en: 'Shisha Lounges' },
  'rooftop-bars': { el: 'Rooftop Bars', en: 'Rooftop Bars' },
  
  // Beach/Summer sub-options
  'beach-bars': { el: 'Beach Bars', en: 'Beach Bars' },
  'summer-events': { el: 'Καλοκαιρινές Εκδηλώσεις', en: 'Summer Events' },
  'seaside-restaurants': { el: 'Παραθαλάσσια Εστιατόρια', en: 'Seaside Restaurants' },
  
  // Fitness/Wellness sub-options
  'yoga-pilates': { el: 'Yoga/Pilates', en: 'Yoga/Pilates' },
  'outdoor-activities': { el: 'Υπαίθριες Δραστηριότητες', en: 'Outdoor Activities' },
  'wellness-retreats': { el: 'Wellness Retreats', en: 'Wellness Retreats' },
  'sports': { el: 'Αθλητισμός', en: 'Sports' },
  
  // Art & Culture sub-options
  'museums': { el: 'Μουσεία', en: 'Museums' },
  'theaters': { el: 'Θέατρα', en: 'Theaters' },
  'cinema': { el: 'Κινηματογράφος', en: 'Cinema' },
  'concerts-live-music': { el: 'Συναυλίες/Live Μουσική', en: 'Concerts/Live Music' },
  
  // Legacy categories for backward compatibility
  'art': { el: 'Τέχνη', en: 'Art' },
  'fitness': { el: 'Fitness', en: 'Fitness' },
  'family': { el: 'Οικογένεια', en: 'Family' },
  'business': { el: 'Επιχειρήσεις', en: 'Business' },
  'food': { el: 'Φαγητό & Ποτό', en: 'Food & Drinks' },
  'music': { el: 'Μουσική', en: 'Music' },
  'culture': { el: 'Πολιτισμός', en: 'Culture' },
  'entertainment': { el: 'Ψυχαγωγία', en: 'Entertainment' },
  'education': { el: 'Εκπαίδευση', en: 'Education' },
  'technology': { el: 'Τεχνολογία', en: 'Technology' },
  'health': { el: 'Υγεία', en: 'Health' },
  'wellness': { el: 'Ευεξία', en: 'Wellness' },
  'shopping': { el: 'Αγορές', en: 'Shopping' },
  'festival': { el: 'Φεστιβάλ', en: 'Festival' },
  'party': { el: 'Πάρτι', en: 'Party' },
  'concert': { el: 'Συναυλία', en: 'Concert' },
  'theater': { el: 'Θέατρο', en: 'Theater' },
  'workshop': { el: 'Εργαστήριο', en: 'Workshop' },
  'seminar': { el: 'Σεμινάριο', en: 'Seminar' },
  'conference': { el: 'Συνέδριο', en: 'Conference' },
  'exhibition': { el: 'Έκθεση', en: 'Exhibition' },
  'market': { el: 'Αγορά', en: 'Market' },
  'outdoors': { el: 'Υπαίθριες Δραστηριότητες', en: 'Outdoors' },
  'networking': { el: 'Δικτύωση', en: 'Networking' },
  
  // Greek values (for backward compatibility)
  'νυχτερινή ζωή': { el: 'Νυχτερινή Ζωή', en: 'Nightlife' },
  'φαγητό & ποτό': { el: 'Φαγητό & Ποτό', en: 'Food & Drinks' },
  'καφέ': { el: 'Καφέ', en: 'Cafe' },
  'τέχνη': { el: 'Τέχνη', en: 'Art' },
  'οικογένεια': { el: 'Οικογένεια', en: 'Family' },
  'επιχειρήσεις': { el: 'Επιχειρήσεις', en: 'Business' },
  'μουσική': { el: 'Μουσική', en: 'Music' },
  'αθλητισμός': { el: 'Αθλητισμός', en: 'Sports' },
  'πολιτισμός': { el: 'Πολιτισμός', en: 'Culture' },
  'ψυχαγωγία': { el: 'Ψυχαγωγία', en: 'Entertainment' },
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
