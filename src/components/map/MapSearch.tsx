import { useState, useEffect } from "react";
import { Search, MapPin, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatEventTime } from "@/lib/mapUtils";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  title: string;
  location: string;
  start_at: string;
  end_at: string;
  business_name?: string;
  coordinates?: [number, number];
}

interface MapSearchProps {
  onResultClick: (coordinates: [number, number], eventId: string) => void;
  language: "el" | "en";
}

export const MapSearch = ({ onResultClick, language }: MapSearchProps) => {
  const text = {
    el: { placeholder: "Αναζήτηση..." },
    en: { placeholder: "Search..." },
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

    const searchEvents = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("events")
          .select(`
            id,
            title,
            location,
            start_at,
            end_at,
            business_id,
            businesses (
              name,
              id
            )
          `)
          .or(`title.ilike.%${query}%,location.ilike.%${query}%`)
          .gte('end_at', new Date().toISOString())
          .limit(5);

        if (!error && data) {
          // Get coordinates for results
          const businessIds = [...new Set(data.map(e => e.business_id))];
          const { data: coordsData } = await supabase
            .rpc('get_business_coordinates', { business_ids: businessIds });

          const coordsMap = new Map(
            coordsData?.map((item: any) => [
              item.business_id,
              [item.longitude, item.latitude] as [number, number]
            ]) || []
          );

          const searchResults: SearchResult[] = data
            .filter(e => coordsMap.has(e.business_id))
            .map(e => ({
              id: e.id,
              title: e.title,
              location: e.location,
              start_at: e.start_at,
              end_at: e.end_at,
              business_name: e.businesses?.name,
              coordinates: coordsMap.get(e.business_id),
            }));

          setResults(searchResults);
          setIsOpen(true);
        }
      } catch (err) {
        // Silent fail - search errors are not critical
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchEvents, 300);
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
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full min-w-[200px] bg-background border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {results.map((result) => (
            <div
              key={result.id}
              onClick={() => {
                if (result.coordinates) {
                  onResultClick(result.coordinates, result.id);
                  setIsOpen(false);
                  setQuery("");
                }
              }}
              className="p-2 md:p-3 hover:bg-muted cursor-pointer border-b last:border-b-0 transition-colors"
            >
              <h4 className="font-medium text-xs md:text-sm mb-1 line-clamp-1">{result.title}</h4>
              <div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar size={10} className="md:w-3 md:h-3" />
                  <span className="line-clamp-1">{formatEventTime(result.start_at, result.end_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin size={10} className="md:w-3 md:h-3" />
                  <span className="line-clamp-1">{result.location}</span>
                </div>
              </div>
              {result.business_name && (
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1 line-clamp-1">{result.business_name}</p>
              )}
            </div>
          ))}
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
