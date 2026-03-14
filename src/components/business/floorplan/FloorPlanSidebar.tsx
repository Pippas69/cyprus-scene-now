import { Button } from '@/components/ui/button';
import { Edit3, GripVertical } from 'lucide-react';
import { FloorPlanItem, TableReservationStatus } from './floorPlanTypes';

interface FloorPlanSidebarProps {
  tableItems: FloorPlanItem[];
  selectedItem: string | null;
  reservationStatuses: Map<string, TableReservationStatus>;
  setupMode: boolean;
  onItemSelect: (id: string | null) => void;
  onItemEdit: (item: FloorPlanItem) => void;
  t: Record<string, string>;
}

export function FloorPlanSidebar({
  tableItems,
  selectedItem,
  reservationStatuses,
  setupMode,
  onItemSelect,
  onItemEdit,
  t,
}: FloorPlanSidebarProps) {
  const sortedTables = [...tableItems].sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, tableId: string) => {
    if (!setupMode) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/floor-table-id', tableId);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="bg-card/80 backdrop-blur-md border border-border/40 rounded-xl overflow-hidden h-full">
      <div className="px-3 py-2.5 border-b border-border/30">
        <h3 className="text-xs font-semibold text-foreground">{t.tableList} ({sortedTables.length})</h3>
        <p className="text-[10px] text-muted-foreground mt-1">
          {setupMode ? t.dragHint : t.enableSetupHint}
        </p>
      </div>

      {sortedTables.length === 0 ? (
        <div className="py-8 px-4 text-center">
          <p className="text-xs text-muted-foreground">{t.noItems}</p>
        </div>
      ) : (
        <div className="divide-y divide-border/20 max-h-[calc(100vh-360px)] overflow-y-auto">
          {sortedTables.map((item) => {
            const status = reservationStatuses.get(item.id);
            return (
              <div
                key={item.id}
                draggable={setupMode}
                onDragStart={(e) => handleDragStart(e, item.id)}
                className={`flex items-center gap-2.5 px-3 py-2 transition-all duration-150 ${
                  setupMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                } ${selectedItem === item.id ? 'bg-accent/50' : 'hover:bg-accent/25'}`}
                onClick={() => onItemSelect(item.id === selectedItem ? null : item.id)}
              >
                <GripVertical className={`h-3.5 w-3.5 flex-shrink-0 ${setupMode ? 'text-muted-foreground' : 'text-muted-foreground/40'}`} />

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
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

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0 opacity-60 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onItemEdit(item);
                  }}
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
