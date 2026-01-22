import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { translateCity, allCyprusLabel, cyprusCities } from "@/lib/cityTranslations";

interface LocationSwitcherProps {
  language: "el" | "en";
  selectedCity: string | null;
  onCityChange: (city: string | null) => void;
}

const LocationSwitcher = ({ language, selectedCity, onCityChange }: LocationSwitcherProps) => {
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

  return (
    <Select 
      value={selectedCity || "all"} 
      onValueChange={(val) => onCityChange(val === "all" ? null : val)}
    >
      <SelectTrigger className="w-[180px]">
        <MapPin className="mr-2 h-4 w-4" />
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
