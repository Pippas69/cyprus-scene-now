import { Button } from "@/components/ui/button";
import { Home, List, Map, Crosshair } from "lucide-react";

interface MapControlsProps {
  onResetView: () => void;
  onToggleView: () => void;
  onLocate: () => void;
  isListView: boolean;
}

export const MapControls = ({
  onResetView,
  onToggleView,
  onLocate,
  isListView,
}: MapControlsProps) => {
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
      <Button
        size="icon"
        variant="secondary"
        onClick={onResetView}
        className="shadow-lg bg-background hover:bg-muted"
        title="Επαναφορά προβολής"
      >
        <Home size={18} />
      </Button>

      <Button
        size="icon"
        variant="secondary"
        onClick={onToggleView}
        className="shadow-lg bg-background hover:bg-muted"
        title={isListView ? "Προβολή χάρτη" : "Προβολή λίστας"}
      >
        {isListView ? <Map size={18} /> : <List size={18} />}
      </Button>

      <Button
        size="icon"
        variant="secondary"
        onClick={onLocate}
        className="shadow-lg bg-background hover:bg-muted"
        title="Η τοποθεσία μου"
      >
        <Crosshair size={18} />
      </Button>
    </div>
  );
};
