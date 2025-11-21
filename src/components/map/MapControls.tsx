import { Button } from "@/components/ui/button";
import { Home, List, Map, Crosshair } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

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
  const { language } = useLanguage();
  
  const translations = {
    el: {
      resetView: 'Επαναφορά προβολής',
      showMap: 'Προβολή χάρτη',
      showList: 'Προβολή λίστας',
      myLocation: 'Η τοποθεσία μου'
    },
    en: {
      resetView: 'Reset view',
      showMap: 'Show map',
      showList: 'Show list',
      myLocation: 'My location'
    }
  };
  
  const t = translations[language];
  
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
      <Button
        size="icon"
        variant="secondary"
        onClick={onResetView}
        className="shadow-lg bg-background hover:bg-muted"
        title={t.resetView}
      >
        <Home size={18} />
      </Button>

      <Button
        size="icon"
        variant="secondary"
        onClick={onToggleView}
        className="shadow-lg bg-background hover:bg-muted"
        title={isListView ? t.showMap : t.showList}
      >
        {isListView ? <Map size={18} /> : <List size={18} />}
      </Button>

      <Button
        size="icon"
        variant="secondary"
        onClick={onLocate}
        className="shadow-lg bg-background hover:bg-muted"
        title={t.myLocation}
      >
        <Crosshair size={18} />
      </Button>
    </div>
  );
};
