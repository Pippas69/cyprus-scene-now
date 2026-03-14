import { Button } from '@/components/ui/button';
import { Plus, MousePointer, X, Eye, EyeOff, Upload, Move, Lock } from 'lucide-react';

interface FloorPlanToolbarProps {
  placingMode: 'table' | null;
  setPlacingMode: (mode: 'table' | null) => void;
  setupMode: boolean;
  setSetupMode: (v: boolean) => void;
  showLabels: boolean;
  setShowLabels: (show: boolean) => void;
  hasBlueprint: boolean;
  tableCount: number;
  totalCapacity: number;
  uploading: boolean;
  onUploadClick: () => void;
  t: Record<string, string>;
}

export function FloorPlanToolbar({
  placingMode,
  setPlacingMode,
  setupMode,
  setSetupMode,
  showLabels,
  setShowLabels,
  hasBlueprint,
  tableCount,
  totalCapacity,
  uploading,
  onUploadClick,
  t,
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
              <X className="h-3.5 w-3.5 mr-1" />
              {t.cancel}
            </Button>
          </>
        ) : (
          <>
            <Button variant="default" size="sm" className="h-8 text-xs shadow-sm" onClick={() => setPlacingMode('table')}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t.addTable}
            </Button>
            <Button
              variant={setupMode ? 'secondary' : 'outline'}
              size="sm"
              className={`h-8 text-xs ${setupMode ? 'ring-1 ring-primary/40' : ''}`}
              disabled={!hasBlueprint}
              onClick={() => setSetupMode(!setupMode)}
              title={setupMode ? t.exitSetupMode : t.setupModeHint}
            >
              {setupMode ? <Move className="h-3.5 w-3.5 mr-1" /> : <Lock className="h-3.5 w-3.5 mr-1" />}
              {setupMode ? t.setupModeOn : t.setupMode}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowLabels(!showLabels)}
              title={showLabels ? t.hideLabels : t.showLabels}
            >
              {showLabels ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </Button>
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
            <span className="text-muted-foreground">{totalCapacity}</span>
          </div>
        </div>

        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onUploadClick} disabled={uploading}>
          <Upload className="h-3.5 w-3.5 mr-1" />
          {uploading ? t.uploading : t.uploadBlueprint}
        </Button>
      </div>
    </div>
  );
}
