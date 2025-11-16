import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

interface SortDropdownProps {
  language: "el" | "en";
  sortBy: string;
  onSortChange: (value: string) => void;
}

const SortDropdown = ({ language, sortBy, onSortChange }: SortDropdownProps) => {
  const translations = {
    el: {
      sort: "Ταξινόμηση",
      popular: "Πιο Δημοφιλή",
      newest: "Νεότερα Πρώτα",
      startingSoon: "Αρχίζουν Σύντομα",
      priceLowHigh: "Τιμή: Χαμηλή σε Υψηλή",
      priceHighLow: "Τιμή: Υψηλή σε Χαμηλή",
    },
    en: {
      sort: "Sort",
      popular: "Most Popular",
      newest: "Newest First",
      startingSoon: "Starting Soon",
      priceLowHigh: "Price: Low to High",
      priceHighLow: "Price: High to Low",
    },
  };

  const t = translations[language];

  return (
    <Select value={sortBy} onValueChange={onSortChange}>
      <SelectTrigger className="w-[180px]">
        <ArrowUpDown className="mr-2 h-4 w-4" />
        <SelectValue placeholder={t.sort} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="popular">{t.popular}</SelectItem>
        <SelectItem value="newest">{t.newest}</SelectItem>
        <SelectItem value="startingSoon">{t.startingSoon}</SelectItem>
        <SelectItem value="priceLowHigh">{t.priceLowHigh}</SelectItem>
        <SelectItem value="priceHighLow">{t.priceHighLow}</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default SortDropdown;
