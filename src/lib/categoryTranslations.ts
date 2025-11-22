// Centralized category translation utility

type Language = 'el' | 'en';

const categoryMap: Record<string, { el: string; en: string }> = {
  // English keys (lowercase)
  'cafe': { el: 'Καφέ', en: 'Cafe' },
  'nightlife': { el: 'Νυχτερινή Ζωή', en: 'Nightlife' },
  'art': { el: 'Τέχνη', en: 'Art' },
  'fitness': { el: 'Fitness', en: 'Fitness' },
  'family': { el: 'Οικογένεια', en: 'Family' },
  'business': { el: 'Επιχειρήσεις', en: 'Business' },
  'food': { el: 'Φαγητό & Ποτό', en: 'Food & Drinks' },
  'music': { el: 'Μουσική', en: 'Music' },
  'sports': { el: 'Αθλητισμός', en: 'Sports' },
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
  'cinema': { el: 'Κινηματογράφος', en: 'Cinema' },
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
