import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ViewModeToggleProps {
  viewMode: "card" | "compact";
  onViewModeChange: (mode: "card" | "compact") => void;
  language: "el" | "en";
}

const ViewModeToggle = ({ viewMode, onViewModeChange, language }: ViewModeToggleProps) => {
  const translations = {
    el: {
      grid: "Κάρτες",
      list: "Λίστα"
    },
    en: {
      grid: "Grid",
      list: "List"
    }
  };

  const t = translations[language];

  return (
    <div className="flex items-center gap-1 bg-muted rounded-md p-1">
      <Button
        size="sm"
        variant={viewMode === "card" ? "default" : "ghost"}
        onClick={() => onViewModeChange("card")}
        className={cn(
          "h-8 px-3 gap-2",
          viewMode === "card" && "shadow-sm"
        )}
        title={t.grid}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline text-xs">{t.grid}</span>
      </Button>
      <Button
        size="sm"
        variant={viewMode === "compact" ? "default" : "ghost"}
        onClick={() => onViewModeChange("compact")}
        className={cn(
          "h-8 px-3 gap-2",
          viewMode === "compact" && "shadow-sm"
        )}
        title={t.list}
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline text-xs">{t.list}</span>
      </Button>
    </div>
  );
};

export default ViewModeToggle;
