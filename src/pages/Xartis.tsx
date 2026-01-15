import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MapWrapper from "@/components/map/MapWrapper";
import { useLanguage } from "@/hooks/useLanguage";
import HierarchicalCategoryFilter from "@/components/HierarchicalCategoryFilter";
import LocationSwitcher from "@/components/feed/LocationSwitcher";
import { FilterChips } from "@/components/feed/FilterChips";

const Xartis = () => {
  const { language } = useLanguage();
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});

  const text = {
    el: {
      clearFilters: "Καθαρισμός",
    },
    en: {
      clearFilters: "Clear",
    },
  };

  const t = text[language];

  // Fetch event counts per category
  useEffect(() => {
    const fetchEventCounts = async () => {
      const { data } = await supabase
        .from('events')
        .select('category')
        .gte('end_at', new Date().toISOString());

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach(event => {
          event.category?.forEach((cat: string) => {
            counts[cat] = (counts[cat] || 0) + 1;
          });
        });
        setEventCounts(counts);
      }
    };

    fetchEventCounts();
  }, []);

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

      {/* Interactive Map */}
      <div className="flex-1 w-full">
        <MapWrapper 
          city={selectedCity || ""} 
          neighborhood="" 
          selectedCategories={selectedCategories}
          eventCounts={eventCounts}
          timeAccessFilters={[]}
        />
      </div>
    </div>
  );
};

export default Xartis;