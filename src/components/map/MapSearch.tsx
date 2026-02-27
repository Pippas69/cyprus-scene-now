import { useState, useEffect } from "react";
import { Search, MapPin, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getCategoryLabel } from "@/lib/categoryTranslations";
import { translateCity } from "@/lib/cityTranslations";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { trackSearchResultClick } from "@/lib/analyticsTracking";

interface SearchResult {
  id: string;
  name: string;
  city: string;
  category: string[];
  coordinates?: [number, number];
  logo_url?: string;
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
          .select("id, name, city, category, logo_url")
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
              logo_url: b.logo_url,
              coordinates: coordsMap.get(b.id),
              type: 'business' as const,
            }));

          setResults(searchResults);
          setIsOpen(true);
          // Views are tracked ONLY on click, not on appearance in map search
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

  // Format categories with translation
  const formatCategories = (categories: string[]) => {
    return categories
      .slice(0, 2)
      .map(cat => getCategoryLabel(cat, language))
      .join(' & ');
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 text-white h-3.5 w-3.5 md:h-4 md:w-4" />
        <Input
          type="text"
          placeholder={text[language].placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className={cn(
            "pl-7 md:pl-10 shadow-lg border-0",
            "h-9 md:h-10",
            "text-xs md:text-sm text-white placeholder:text-white/70",
            "w-[160px] md:w-[220px] lg:w-[260px]"
          )}
          style={{ backgroundColor: '#0D3B66' }}
        />
      </div>

      {/* Loading state */}
      {isLoading && query.length >= 2 && (
        <div className="absolute left-0 top-full mt-1.5 w-[260px] md:w-[320px] lg:w-[360px] bg-background border rounded-lg shadow-lg p-1.5 md:p-2 z-50">
          <div className="flex items-center gap-2 md:gap-3 p-2">
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3 md:h-4 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-2 md:h-3 w-1/2 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
      )}

      {/* Results dropdown */}
      {isOpen && !isLoading && (
        <div className="absolute left-0 top-full mt-1.5 w-[260px] md:w-[320px] lg:w-[360px] bg-background border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto p-1.5 md:p-2">
          {results.length > 0 ? (
            results.map((result) => (
              <button
                key={result.id}
                onClick={() => {
                  if (result.coordinates) {
                    // Map search click = view only (navigates to pin, not profile)
                    trackSearchResultClick(result.id, 'map');
                    onResultClick(result.coordinates, result.id);
                    setIsOpen(false);
                    setQuery("");
                  }
                }}
                className="w-full flex items-center gap-2 md:gap-3 p-1.5 md:p-2 hover:bg-accent/50 rounded-lg transition-colors text-left"
              >
                {/* Compact circular avatar */}
                <Avatar className="h-8 w-8 md:h-10 md:w-10 shrink-0 border border-border/50">
                  <AvatarImage src={result.logo_url || ''} alt={result.name} className="object-cover" />
                  <AvatarFallback className="bg-muted">
                    <Building2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                
                {/* Content - compact layout matching design */}
                <div className="flex-1 min-w-0">
                  {/* First line: Name + Location */}
                  <div className="flex items-center gap-1 text-[11px] md:text-xs lg:text-sm min-w-0 whitespace-nowrap">
                    <span className="font-medium truncate text-foreground min-w-0">{result.name}</span>
                    <span className="flex items-center gap-[2px] shrink-0">
                      <MapPin className="h-2.5 w-2.5 md:h-3 md:w-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{translateCity(result.city, language)}</span>
                    </span>
                  </div>
                  
                  {/* Second line: Categories */}
                  {result.category.length > 0 && (
                    <p className="text-[9px] md:text-[10px] lg:text-xs text-muted-foreground truncate mt-0.5 whitespace-nowrap">
                      {formatCategories(result.category)}
                    </p>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="p-3 md:p-4 text-center text-xs md:text-sm text-muted-foreground">
              {text[language].noResults}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
