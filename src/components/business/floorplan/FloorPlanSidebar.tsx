import { Button } from '@/components/ui/button';
import { Edit3 } from 'lucide-react';
import { FloorPlanItem, TableReservationStatus } from './floorPlanTypes';
import { FIXTURE_COLORS, SVG_THEME } from './floorPlanTheme';

interface FloorPlanSidebarProps {
  tableItems: FloorPlanItem[];
  fixtureItems: FloorPlanItem[];
  selectedItem: string | null;
  reservationStatuses: Map<string, TableReservationStatus>;
  onItemSelect: (id: string | null) => void;
  onItemEdit: (item: FloorPlanItem) => void;
  t: Record<string, string>;
}

export function FloorPlanSidebar({
  tableItems, fixtureItems, selectedItem, reservationStatuses,
  onItemSelect, onItemEdit, t,
}: FloorPlanSidebarProps) {
  return (
    <div className="space-y-3 max-h-[calc(100vh-260px)] overflow-y-auto">
      {/* Tables list */}
      <div className="bg-card/80 backdrop-blur-md border border-border/40 rounded-xl overflow-hidden">
        <div className="px-3 py-2.5 border-b border-border/30">
          <h3 className="text-xs font-semibold text-foreground">{t.tables} ({tableItems.length})</h3>
        </div>
        {tableItems.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs text-muted-foreground">{t.noItems}</p>
          </div>
        ) : (
          <div className="divide-y divide-border/20 max-h-[40vh] overflow-y-auto">
            {tableItems.map((item) => {
              const status = reservationStatuses.get(item.id);
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-2.5 px-3 py-1.5 cursor-pointer transition-all duration-150 hover:bg-accent/40 ${selectedItem === item.id ? 'bg-accent/60' : ''}`}
                  onClick={() => onItemSelect(item.id === selectedItem ? null : item.id)}
                >
                  <div className={`w-1.5 h-5 rounded-full flex-shrink-0 transition-colors`} style={{
                    backgroundColor: status?.status === 'occupied' ? 'hsl(var(--destructive))' : status?.status === 'reserved' ? 'hsl(var(--accent))' : 'hsl(var(--primary))',
                  }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {status?.status === 'reserved' && status.reservationName
                        ? status.reservationName
                        : `${item.seats} ${t.seats}`}
                    </p>
                  </div>
                  {status && (
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                      status.status === 'occupied' ? 'bg-destructive/10 text-destructive' :
                      status.status === 'reserved' ? 'bg-accent/20 text-accent-foreground' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {status.status === 'occupied' ? '●' : status.status === 'reserved' ? '◉' : '○'}
                    </span>
                  )}
                  <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0 opacity-50 hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); onItemEdit(item); }}>
                    <Edit3 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixtures list */}
      {fixtureItems.length > 0 && (
        <div className="bg-card/80 backdrop-blur-md border border-border/40 rounded-xl overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border/30">
            <h3 className="text-xs font-semibold text-foreground">{t.fixtures} ({fixtureItems.length})</h3>
          </div>
          <div className="divide-y divide-border/20 max-h-[20vh] overflow-y-auto">
            {fixtureItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-2.5 px-3 py-1.5 cursor-pointer transition-all hover:bg-accent/40 ${selectedItem === item.id ? 'bg-accent/60' : ''}`}
                onClick={() => onItemSelect(item.id === selectedItem ? null : item.id)}
              >
                <div className="w-1.5 h-5 rounded-full flex-shrink-0" style={{
                  backgroundColor: (FIXTURE_COLORS[item.fixture_type || 'other'] || FIXTURE_COLORS.other).border
                }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{item.fixture_type}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0 opacity-50 hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); onItemEdit(item); }}>
                  <Edit3 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-card/80 backdrop-blur-md border border-border/40 rounded-xl px-3 py-2.5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-primary/60" />
            <span>{t.available || 'Available'}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span>{t.reserved || 'Reserved'}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-destructive/70" />
            <span>{t.occupied || 'Occupied'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
