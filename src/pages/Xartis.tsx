import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import MapWrapper from "@/components/map/MapWrapper";
import { useLanguage } from "@/hooks/useLanguage";
import HierarchicalCategoryFilter from "@/components/HierarchicalCategoryFilter";
import LocationSwitcher from "@/components/feed/LocationSwitcher";
import { FilterChips } from "@/components/feed/FilterChips";

/**
 * ΚΑΝΟΝΑΣ ΧΑΡΤΗ – FOMO (ΑΠΑΡΑΒΑΤΟΣ)
 * 
 * Ο χάρτης χρησιμοποιείται ΑΠΟΚΛΕΙΣΤΙΚΑ για την προβολή ΠΡΟΦΙΛ ΕΠΙΧΕΙΡΗΣΕΩΝ.
 * ΔΕΝ εμφανίζονται: Events, Offers, Boosted events, Boosted offers
 * 
 * Λογική εμφάνισης ανά Plan:
 * - FREE: Εμφανίζεται ΜΟΝΟ σε κοντινό zoom (13+), μικρό pin
 * - BASIC: Εμφανίζεται από zoom 11+, ελαφρώς μεγαλύτερο pin
 * - PRO: Εμφανίζεται από zoom 9+, σαφώς ορατό pin
 * - ELITE: Εμφανίζεται ΠΑΝΤΑ (zoom 7+), μέγιστη ορατότητα
 */
const Xartis = () => {
  const { language } = useLanguage();
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const text = {
    el: {
      clearFilters: "Καθαρισμός",
    },
    en: {
      clearFilters: "Clear",
    },
  };

  const t = text[language];

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedCity(null);
  };

  const hasActiveFilters = selectedCategories.length > 0 || selectedCity;

  const handleRemoveCategory = (category: string) => {
    setSelectedCategories(prev => prev.filter(c => c !== category));
  };

  const handleRemoveCity = () => {
    setSelectedCity(null);
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Filters Section */}
      <div className="bg-background border-b border-border p-4">
        <div className="space-y-4">
          {/* Location and Category Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <LocationSwitcher 
              language={language} 
              selectedCity={selectedCity} 
              onCityChange={setSelectedCity} 
            />
            
            <div className="flex-1 overflow-x-auto">
              <HierarchicalCategoryFilter
                selectedCategories={selectedCategories}
                onCategoryChange={setSelectedCategories}
                language={language}
              />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="gap-2 whitespace-nowrap shrink-0"
              >
                <X size={16} />
                {t.clearFilters}
              </Button>
            )}
          </div>

          {/* Filter Chips */}
          <FilterChips
            categories={selectedCategories}
            quickFilters={[]}
            selectedCity={selectedCity}
            onRemoveCategory={handleRemoveCategory}
            onRemoveQuickFilter={() => {}}
            onRemoveCity={handleRemoveCity}
            onClearAll={clearAllFilters}
            language={language}
          />
        </div>
      </div>

      {/* Interactive Map - ONLY shows business profiles, NOT events/offers */}
      <div className="flex-1 w-full">
        <MapWrapper 
          city={selectedCity || ""} 
          neighborhood="" 
          selectedCategories={selectedCategories}
        />
      </div>
    </div>
  );
};

export default Xartis;