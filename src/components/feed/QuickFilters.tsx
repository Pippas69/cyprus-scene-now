import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface QuickFiltersProps {
  language: "el" | "en";
  selectedFilters: string[];
  onFilterToggle: (filter: string) => void;
}

const QuickFilters = ({ language, selectedFilters, onFilterToggle }: QuickFiltersProps) => {
  const translations = {
    el: {
      tonight: "Απόψε",
      weekend: "Σαββατοκύριακο",
      free: "Δωρεάν",
      withReservations: "Με Κρατήσεις",
    },
    en: {
      tonight: "Tonight",
      weekend: "This Weekend",
      free: "Free Events",
      withReservations: "With Reservations",
    },
  };

  const t = translations[language];

  const filters = [
    { id: "tonight", label: t.tonight },
    { id: "weekend", label: t.weekend },
    { id: "free", label: t.free },
    { id: "withReservations", label: t.withReservations },
  ];

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2">
        {filters.map((filter) => (
          <Badge
            key={filter.id}
            variant={selectedFilters.includes(filter.id) ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-all hover:scale-105 font-semibold min-h-[40px] px-4",
              selectedFilters.includes(filter.id) 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-muted text-foreground border-border hover:bg-primary/10 hover:border-primary/30"
            )}
            onClick={() => onFilterToggle(filter.id)}
          >
            {filter.label}
          </Badge>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};

export default QuickFilters;
