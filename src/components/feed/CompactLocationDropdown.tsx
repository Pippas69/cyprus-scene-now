import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { translateCity, allCyprusLabel, cyprusCities } from "@/lib/cityTranslations";

interface CompactLocationDropdownProps {
  language: "el" | "en";
  selectedCity: string | null;
  onCityChange: (city: string | null) => void;
}

const CompactLocationDropdown = ({ language, selectedCity, onCityChange }: CompactLocationDropdownProps) => {
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

      // Get unique cities
      const uniqueCities = [...new Set(data?.map((b) => b.city).filter(Boolean) || [])];
      
      // Sort cities alphabetically
      uniqueCities.sort((a, b) => {
        const labelA = translateCity(a, language);
        const labelB = translateCity(b, language);
        return labelA.localeCompare(labelB, language === "el" ? "el" : "en");
      });
      
      setAvailableCities(uniqueCities);
    } catch (error) {
      console.error("Error fetching cities:", error);
      // Fallback to default cities
      setAvailableCities(cyprusCities.el);
    }
  };

  const cities = [
    { value: "all", label: allCyprusLabel[language] },
    ...availableCities.map((city) => ({
      value: city,
      label: translateCity(city, language),
    })),
  ];

  const selectedLabel = selectedCity 
    ? translateCity(selectedCity, language)
    : allCyprusLabel[language];

  return (
    <Select 
      value={selectedCity || "all"} 
      onValueChange={(val) => onCityChange(val === "all" ? null : val)}
    >
      <SelectTrigger 
        className="h-8 w-auto min-w-0 gap-1.5 border-none bg-transparent hover:bg-accent/50 focus:ring-0 focus:ring-offset-0 px-2 [&>svg:last-child]:hidden"
      >
        <MapPin className="h-3.5 w-3.5 text-ocean flex-shrink-0" />
        <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
          {selectedLabel}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      </SelectTrigger>
      <SelectContent align="start" className="min-w-[160px] bg-popover z-50">
        {cities.map((city) => (
          <SelectItem key={city.value} value={city.value}>
            {city.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CompactLocationDropdown;
