import { Button } from '@/components/ui/button';
import { Plus, MousePointer, X, Eye, EyeOff, Wand2, Users, Image, ImageOff } from 'lucide-react';

interface FloorPlanToolbarProps {
  placingMode: 'table' | null;
  setPlacingMode: (mode: 'table' | null) => void;
  showLabels: boolean;
  setShowLabels: (show: boolean) => void;
  showBlueprint: boolean;
  setShowBlueprint: (show: boolean) => void;
  hasBlueprint: boolean;
  tableCount: number;
  fixtureCount: number;
  totalCapacity: number;
  aiAnalyzing: boolean;
  onUploadClick: () => void;
  t: Record<string, string>;
}

export function FloorPlanToolbar({
  placingMode, setPlacingMode, showLabels, setShowLabels,
  showBlueprint, setShowBlueprint, hasBlueprint,
  tableCount, fixtureCount, totalCapacity,
  aiAnalyzing, onUploadClick, t,
}: FloorPlanToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-3 bg-card/80 backdrop-blur-md border border-border/40 rounded-xl px-3 py-2 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        {placingMode ? (
          <>
            <div className="flex items-center gap-1.5 bg-primary/10 rounded-lg px-2.5 py-1.5">
              <MousePointer className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span className="text-xs font-medium text-primary">{t.clickToPlace}</span>
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setPlacingMode(null)}>
              <X className="h-3.5 w-3.5 mr-1" />{t.cancel}
            </Button>
          </>
        ) : (
          <>
            <Button variant="default" size="sm" className="h-8 text-xs shadow-sm" onClick={() => setPlacingMode('table')}>
              <Plus className="h-3.5 w-3.5 mr-1" />{t.addTable}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowLabels(!showLabels)} title={showLabels ? 'Hide labels' : 'Show labels'}>
              {showLabels ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </Button>
            {hasBlueprint && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowBlueprint(!showBlueprint)} title={showBlueprint ? 'Hide blueprint' : 'Show blueprint'}>
                {showBlueprint ? <Image className="h-3.5 w-3.5" /> : <ImageOff className="h-3.5 w-3.5" />}
              </Button>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-3 bg-muted/50 rounded-lg px-3 py-1.5">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">🪑 {tableCount}</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1.5 text-xs">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{totalCapacity}</span>
          </div>
          {fixtureCount > 0 && (
            <>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">📍 {fixtureCount}</span>
              </div>
            </>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onUploadClick} disabled={aiAnalyzing}>
          <Wand2 className="h-3.5 w-3.5 mr-1" />{t.reAnalyze}
        </Button>
      </div>
    </div>
  );
}
