import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface FilterChipsProps {
  categories: string[];
  quickFilters: string[];
  selectedCity: string | null;
  onRemoveCategory: (category: string) => void;
  onRemoveQuickFilter: (filter: string) => void;
  onRemoveCity: () => void;
  onClearAll: () => void;
  language: 'el' | 'en';
}

// 4 core categories + their sub-options
const categoryLabels: Record<string, { el: string; en: string }> = {
  // Main categories
  nightlife: { el: 'Νυχτερινή Ζωή', en: 'Nightlife' },
  clubs: { el: 'Clubs', en: 'Clubs' },
  dining: { el: 'Εστίαση', en: 'Dining' },
  'beach-summer': { el: 'Παραλία/Καλοκαίρι', en: 'Beach/Summer' },
  
  // Nightlife sub-options
  bars: { el: 'Bars', en: 'Bars' },
  'wine-cocktail-bars': { el: 'Κρασί & Cocktail Bars', en: 'Wine & Cocktail Bars' },
  'live-music': { el: 'Ζωντανή Μουσική', en: 'Live Music' },
  
  // Dining sub-options
  'fine-dining': { el: 'Επίσημη Εστίαση', en: 'Fine Dining' },
  'casual-dining': { el: 'Χαλαρή Εστίαση', en: 'Casual Dining' },
  
  // Beach/Summer sub-options
  'beach-bars': { el: 'Beach Bars', en: 'Beach Bars' },
  'summer-events': { el: 'Καλοκαιρινές Εκδηλώσεις', en: 'Summer Events' },
  'seaside-restaurants': { el: 'Παραθαλάσσια Εστιατόρια', en: 'Seaside Restaurants' },
  
  // Legacy categories for backward compatibility
  cafe: { el: 'Καφέ', en: 'Café' },
  restaurant: { el: 'Εστιατόρια', en: 'Restaurant' },
  brunch: { el: 'Brunch', en: 'Brunch' },
  breakfast: { el: 'Πρωινό', en: 'Breakfast' },
  lunch: { el: 'Μεσημεριανό', en: 'Lunch' },
  dinner: { el: 'Δείπνο', en: 'Dinner' },
  'concerts-live-music': { el: 'Ζωντανή Μουσική', en: 'Live Music' },
  'shisha-lounges': { el: 'Shisha Lounges', en: 'Shisha Lounges' },
  'rooftop-bars': { el: 'Rooftop Bars', en: 'Rooftop Bars' },
  'fitness-wellness': { el: 'Γυμναστική/Ευεξία', en: 'Fitness/Wellness' },
  'art-culture': { el: 'Τέχνη & Πολιτισμός', en: 'Art & Culture' },
  art: { el: 'Τέχνη', en: 'Art' },
  fitness: { el: 'Γυμναστική', en: 'Fitness' },
  family: { el: 'Οικογένεια', en: 'Family' },
  business: { el: 'Επιχείρηση', en: 'Business' },
};

const quickFilterLabels: Record<string, { el: string; en: string }> = {
  today: { el: 'Σήμερα', en: 'Today' },
  'this-week': { el: 'Αυτή την Εβδομάδα', en: 'This Week' },
  free: { el: 'Δωρεάν', en: 'Free' },
  'near-me': { el: 'Κοντά μου', en: 'Near Me' },
};

export const FilterChips = ({
  categories,
  quickFilters,
  selectedCity,
  onRemoveCategory,
  onRemoveQuickFilter,
  onRemoveCity,
  onClearAll,
  language
}: FilterChipsProps) => {
  const hasFilters = categories.length > 0 || quickFilters.length > 0 || selectedCity;

  if (!hasFilters) return null;

  const translations = {
    el: { clearAll: 'Καθαρισμός Όλων' },
    en: { clearAll: 'Clear All' }
  };

  const t = translations[language];

  return (
    <div className="flex flex-wrap items-center gap-2 animate-fade-in">
      {categories.map((category) => (
        <Badge 
          key={category} 
          variant="secondary"
          className="pl-3 pr-1 py-1 flex items-center gap-1"
        >
          <span>{categoryLabels[category]?.[language] || category}</span>
          <button
            onClick={() => onRemoveCategory(category)}
            className="ml-1 hover:bg-background/20 rounded-full p-0.5 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {quickFilters.map((filter) => (
        <Badge 
          key={filter} 
          variant="secondary"
          className="pl-3 pr-1 py-1 flex items-center gap-1"
        >
          <span>{quickFilterLabels[filter]?.[language] || filter}</span>
          <button
            onClick={() => onRemoveQuickFilter(filter)}
            className="ml-1 hover:bg-background/20 rounded-full p-0.5 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {selectedCity && (
        <Badge 
          variant="secondary"
          className="pl-3 pr-1 py-1 flex items-center gap-1"
        >
          <span>{selectedCity}</span>
          <button
            onClick={onRemoveCity}
            className="ml-1 hover:bg-background/20 rounded-full p-0.5 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="h-7 px-2 text-xs"
      >
        {t.clearAll}
      </Button>
    </div>
  );
};
