import { useState, useEffect } from "react";
import { Search, MapPin, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatEventTime } from "@/lib/mapUtils";

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
    el: { placeholder: "Αναζήτηση εκδηλώσεων..." },
    en: { placeholder: "Search for events..." },
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
        console.error("Search error:", err);
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          type="text"
          placeholder={text[language].placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className="pl-10 bg-background"
        />
      </div>

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-background border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
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
              className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0 transition-colors"
            >
              <h4 className="font-medium text-sm mb-1">{result.title}</h4>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>{formatEventTime(result.start_at, result.end_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin size={12} />
                  <span>{result.location}</span>
                </div>
              </div>
              {result.business_name && (
                <p className="text-xs text-muted-foreground mt-1">{result.business_name}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="absolute top-full mt-2 w-full bg-background border rounded-lg shadow-lg p-4 text-center text-sm text-muted-foreground">
          Αναζήτηση...
        </div>
      )}
    </div>
  );
};
