import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LocationSwitcherProps {
  language: "el" | "en";
  selectedCity: string | null;
  onCityChange: (city: string | null) => void;
}

const LocationSwitcher = ({ language, selectedCity, onCityChange }: LocationSwitcherProps) => {
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  const translations = {
    el: {
      allCyprus: "Όλη η Κύπρος",
      nicosia: "Λευκωσία",
      limassol: "Λεμεσός",
      larnaca: "Λάρνακα",
      paphos: "Πάφος",
      famagusta: "Αμμόχωστος",
      paralimni: "Παραλίμνι",
    },
    en: {
      allCyprus: "All Cyprus",
      nicosia: "Nicosia",
      limassol: "Limassol",
      larnaca: "Larnaca",
      paphos: "Paphos",
      famagusta: "Famagusta",
      paralimni: "Paralimni",
    },
  };

  const t = translations[language];

  // Map of city names to translations
  const cityTranslations: Record<string, { el: string; en: string }> = {
    "Λευκωσία": { el: "Λευκωσία", en: "Nicosia" },
    "Λεμεσός": { el: "Λεμεσός", en: "Limassol" },
    "Λάρνακα": { el: "Λάρνακα", en: "Larnaca" },
    "Πάφος": { el: "Πάφος", en: "Paphos" },
    "Αμμόχωστος": { el: "Αμμόχωστος", en: "Famagusta" },
    "Παραλίμνι": { el: "Παραλίμνι", en: "Paralimni" },
  };

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
      setAvailableCities(["Λευκωσία", "Λάρνακα", "Παραλίμνι"]);
    }
  };

  const cities = [
    { value: null, label: t.allCyprus },
    ...availableCities.map((city) => ({
      value: city,
      label: cityTranslations[city]?.[language] || city,
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
