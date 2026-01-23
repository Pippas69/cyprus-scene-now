import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import MapWrapper from "@/components/map/MapWrapper";
import { useLanguage } from "@/hooks/useLanguage";
import HierarchicalCategoryFilter from "@/components/HierarchicalCategoryFilter";
import LocationSwitcher from "@/components/feed/LocationSwitcher";
import { FilterChips } from "@/components/feed/FilterChips";
import { supabase } from "@/integrations/supabase/client";

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
  const [searchParams] = useSearchParams();
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [focusBusinessId, setFocusBusinessId] = useState<string | null>(null);

  const targetParams = useMemo(() => {
    const business = searchParams.get("business");
    const event = searchParams.get("event");
    const offer = searchParams.get("offer") || searchParams.get("discount");
    return { business, event, offer };
  }, [searchParams]);

  // If the map is opened with a ?business=, ?event=, or ?offer= param, resolve it to a business id
  // and forward it to the map so it can center exactly on that pin.
  useEffect(() => {
    let cancelled = false;

    const resolveFocus = async () => {
      if (targetParams.business) {
        setFocusBusinessId(targetParams.business);
        return;
      }

      // Map is business-only; event/offer params are resolved to their business.
      try {
        if (targetParams.event) {
          const { data, error } = await supabase
            .from("events")
            .select("business_id")
            .eq("id", targetParams.event)
            .maybeSingle();
          if (error) throw error;
          if (!cancelled) setFocusBusinessId(data?.business_id ?? null);
          return;
        }

        if (targetParams.offer) {
          const { data, error } = await supabase
            .from("discounts")
            .select("business_id")
            .eq("id", targetParams.offer)
            .maybeSingle();
          if (error) throw error;
          if (!cancelled) setFocusBusinessId(data?.business_id ?? null);
          return;
        }

        setFocusBusinessId(null);
      } catch {
        if (!cancelled) setFocusBusinessId(null);
      }
    };

    resolveFocus();
    return () => {
      cancelled = true;
    };
  }, [targetParams.business, targetParams.event, targetParams.offer]);

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
      {/* Filters Section - Single row on all devices */}
      <div className="bg-background border-b border-border px-3 py-2 lg:px-4 lg:py-3">
        <div className="space-y-2">
          {/* All in one row with horizontal scroll if needed */}
          <div className="flex items-center gap-2 md:gap-2.5 lg:gap-3 overflow-x-auto scrollbar-hide">
            <LocationSwitcher 
              language={language} 
              selectedCity={selectedCity} 
              onCityChange={setSelectedCity}
              mapMode={true}
            />
            
            <HierarchicalCategoryFilter
              selectedCategories={selectedCategories}
              onCategoryChange={setSelectedCategories}
              language={language}
              mapMode={true}
            />

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="gap-1 md:gap-1.5 lg:gap-2 whitespace-nowrap shrink-0 h-7 md:h-8 lg:h-9 px-2 md:px-2.5 lg:px-3 text-[10px] md:text-xs lg:text-sm"
              >
                <X className="h-3 w-3 md:h-3.5 md:w-3.5 lg:h-4 lg:w-4" />
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
          focusBusinessId={focusBusinessId}
        />
      </div>
    </div>
  );
};

export default Xartis;