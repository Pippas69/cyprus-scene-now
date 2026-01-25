import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { translateCity, allCyprusLabel, cyprusCities } from "@/lib/cityTranslations";

interface LocationSwitcherProps {
  language: "el" | "en";
  selectedCity: string | null;
  onCityChange: (city: string | null) => void;
  compact?: boolean;
  mapMode?: boolean;
}

const LocationSwitcher = ({ language, selectedCity, onCityChange, compact = false, mapMode = false }: LocationSwitcherProps) => {
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  useEffect(() => {
    fetchAvailableCities();
  }, []);

  const fetchAvailableCities = async () => {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("city")
        .eq("verified", true);

      if (error) throw error;

      const uniqueCities = [...new Set(data?.map((b) => b.city) || [])];
      setAvailableCities(uniqueCities);
    } catch (error) {
      console.error("Error fetching cities:", error);
      // Fallback to default cities
      setAvailableCities(cyprusCities.el);
    }
  };

  const cities = [
    { value: null, label: allCyprusLabel[language] },
    ...availableCities.map((city) => ({
      value: city,
      label: translateCity(city, language),
    })),
  ];

  // Map mode: smaller styling for the map page (inline with categories)
  const getSelectClassName = () => {
    if (mapMode) {
      return "w-auto min-w-[100px] md:min-w-[110px] lg:min-w-[120px] h-[30px] md:h-[34px] lg:h-9 text-[11px] md:text-[13px] lg:text-sm px-2.5 md:px-3 lg:px-3 shrink-0";
    }
    if (compact) {
      return "w-auto min-w-[120px] h-8 text-xs px-2.5";
    }
    return "w-[180px]";
  };

  const getIconClassName = () => {
    if (mapMode) {
      return "mr-1 md:mr-1.5 lg:mr-2 h-3 w-3 md:h-3.5 md:w-3.5 lg:h-4 lg:w-4";
    }
    if (compact) {
      return "mr-1.5 h-3.5 w-3.5";
    }
    return "mr-2 h-4 w-4";
  };

  return (
    <Select 
      value={selectedCity || "all"} 
      onValueChange={(val) => onCityChange(val === "all" ? null : val)}
    >
      <SelectTrigger className={getSelectClassName()}>
        <MapPin className={getIconClassName()} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {cities.map((city) => (
          <SelectItem key={city.value || "all"} value={city.value || "all"}>
            {city.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LocationSwitcher;
