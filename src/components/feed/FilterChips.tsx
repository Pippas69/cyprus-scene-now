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

const categoryLabels: Record<string, { el: string; en: string }> = {
  cafe: { el: 'Καφέ', en: 'Cafe' },
  nightlife: { el: 'Νυχτερινή Ζωή', en: 'Nightlife' },
  art: { el: 'Τέχνη', en: 'Art' },
  fitness: { el: 'Γυμναστική', en: 'Fitness' },
  family: { el: 'Οικογένεια', en: 'Family' },
  business: { el: 'Επιχείρηση', en: 'Business' },
  lifestyle: { el: 'Τρόπος Ζωής', en: 'Lifestyle' },
  travel: { el: 'Ταξίδι', en: 'Travel' },
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
