import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CompactLocationDropdownProps {
  language: "el" | "en";
  selectedCity: string | null;
  onCityChange: (city: string | null) => void;
}

const translations = {
  el: {
    allCyprus: "Όλη η Κύπρος",
    nicosia: "Λευκωσία",
    limassol: "Λεμεσός",
    larnaca: "Λάρνακα",
    paphos: "Πάφος",
    famagusta: "Αμμόχωστος",
    paralimni: "Παραλίμνι",
    ayiaNapa: "Αγία Νάπα",
  },
  en: {
    allCyprus: "All Cyprus",
    nicosia: "Nicosia",
    limassol: "Limassol",
    larnaca: "Larnaca",
    paphos: "Paphos",
    famagusta: "Famagusta",
    paralimni: "Paralimni",
    ayiaNapa: "Ayia Napa",
  },
};

// Map of city names (Greek) to translations
const cityTranslations: Record<string, { el: string; en: string }> = {
  "Λευκωσία": { el: "Λευκωσία", en: "Nicosia" },
  "Λεμεσός": { el: "Λεμεσός", en: "Limassol" },
  "Λάρνακα": { el: "Λάρνακα", en: "Larnaca" },
  "Πάφος": { el: "Πάφος", en: "Paphos" },
  "Αμμόχωστος": { el: "Αμμόχωστος", en: "Famagusta" },
  "Παραλίμνι": { el: "Παραλίμνι", en: "Paralimni" },
  "Αγία Νάπα": { el: "Αγία Νάπα", en: "Ayia Napa" },
};

const CompactLocationDropdown = ({ language, selectedCity, onCityChange }: CompactLocationDropdownProps) => {
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  const t = translations[language];

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
        const labelA = cityTranslations[a]?.[language] || a;
        const labelB = cityTranslations[b]?.[language] || b;
        return labelA.localeCompare(labelB, language === "el" ? "el" : "en");
      });
      
      setAvailableCities(uniqueCities);
    } catch (error) {
      console.error("Error fetching cities:", error);
      // Fallback to default cities
      setAvailableCities(["Λευκωσία", "Λεμεσός", "Λάρνακα", "Πάφος", "Παραλίμνι", "Αγία Νάπα"]);
    }
  };

  const cities = [
    { value: "all", label: t.allCyprus },
    ...availableCities.map((city) => ({
      value: city,
      label: cityTranslations[city]?.[language] || city,
    })),
  ];

  const selectedLabel = selectedCity 
    ? (cityTranslations[selectedCity]?.[language] || selectedCity)
    : t.allCyprus;

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
