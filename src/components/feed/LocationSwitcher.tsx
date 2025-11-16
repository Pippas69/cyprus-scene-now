import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";

interface LocationSwitcherProps {
  language: "el" | "en";
  selectedCity: string | null;
  onCityChange: (city: string | null) => void;
}

const LocationSwitcher = ({ language, selectedCity, onCityChange }: LocationSwitcherProps) => {
  const translations = {
    el: {
      allCyprus: "Όλη η Κύπρος",
      nicosia: "Λευκωσία",
      limassol: "Λεμεσός",
      larnaca: "Λάρνακα",
      paphos: "Πάφος",
      famagusta: "Αμμόχωστος",
    },
    en: {
      allCyprus: "All Cyprus",
      nicosia: "Nicosia",
      limassol: "Limassol",
      larnaca: "Larnaca",
      paphos: "Paphos",
      famagusta: "Famagusta",
    },
  };

  const t = translations[language];

  const cities = [
    { value: null, label: t.allCyprus },
    { value: "Λευκωσία", label: t.nicosia },
    { value: "Λεμεσός", label: t.limassol },
    { value: "Λάρνακα", label: t.larnaca },
    { value: "Πάφος", label: t.paphos },
    { value: "Αμμόχωστος", label: t.famagusta },
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
