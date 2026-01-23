import { useState, useEffect } from "react";
import { Search, MapPin, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getCategoryLabel } from "@/lib/categoryTranslations";
import { translateCity } from "@/lib/cityTranslations";

interface SearchResult {
  id: string;
  name: string;
  city: string;
  category: string[];
  coordinates?: [number, number];
  type: 'business';
}

interface MapSearchProps {
  onResultClick: (coordinates: [number, number], businessId: string) => void;
  language: "el" | "en";
}

export const MapSearch = ({ onResultClick, language }: MapSearchProps) => {
  const text = {
    el: { placeholder: "Αναζήτηση...", noResults: "Δεν βρέθηκαν αποτελέσματα" },
    en: { placeholder: "Search...", noResults: "No results found" },
  };
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const searchBusinesses = async () => {
      setIsLoading(true);
      try {
        // Search businesses by name
        const { data: businessData, error } = await supabase
          .from("businesses")
          .select("id, name, city, category")
          .ilike("name", `%${query}%`)
          .limit(8);

        if (error) throw error;

        if (businessData && businessData.length > 0) {
          // Get coordinates for results
          const businessIds = businessData.map(b => b.id);
          const { data: coordsData } = await supabase
            .rpc('get_business_coordinates', { business_ids: businessIds });

          const coordsMap = new Map(
            coordsData?.map((item: any) => [
              item.business_id,
              [item.longitude, item.latitude] as [number, number]
            ]) || []
          );

          const searchResults: SearchResult[] = businessData
            .filter(b => coordsMap.has(b.id))
            .map(b => ({
              id: b.id,
              name: b.name,
              city: b.city,
              category: b.category || [],
              coordinates: coordsMap.get(b.id),
              type: 'business' as const,
            }));

          setResults(searchResults);
          setIsOpen(true);
        } else {
          setResults([]);
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchBusinesses, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5 md:h-4 md:w-4" />
        <Input
          type="text"
          placeholder={text[language].placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className={cn(
            "pl-7 md:pl-10 bg-background/95 backdrop-blur-sm shadow-lg",
            "h-8 md:h-9 lg:h-10",
            "text-xs md:text-sm",
            "w-[120px] md:w-[180px] lg:w-[240px]"
          )}
        />
      </div>

      {/* Results dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-2 w-full min-w-[200px] bg-background border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {results.length > 0 ? (
            results.map((result) => (
              <button
                key={result.id}
                onClick={() => {
                  if (result.coordinates) {
                    onResultClick(result.coordinates, result.id);
                    setIsOpen(false);
                    setQuery("");
                  }
                }}
                className="w-full p-2 md:p-3 hover:bg-muted cursor-pointer border-b last:border-b-0 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <h4 className="font-medium text-xs md:text-sm line-clamp-1">{result.name}</h4>
                </div>
                <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin size={10} className="md:w-3 md:h-3" />
                    <span className="line-clamp-1">{translateCity(result.city, language)}</span>
                  </div>
                  {result.category[0] && (
                    <span className="text-muted-foreground">
                      · {getCategoryLabel(result.category[0], language)}
                    </span>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="p-3 text-center text-xs text-muted-foreground">
              {text[language].noResults}
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="absolute top-full mt-2 w-full bg-background border rounded-lg shadow-lg p-3 text-center text-xs text-muted-foreground">
          {language === 'el' ? 'Αναζήτηση...' : 'Searching...'}
        </div>
      )}
    </div>
  );
};