import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MapPin, Check, X, Users, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface FloorPlanZone {
  id: string;
  label: string;
  zone_type: string;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  capacity: number;
  metadata?: {
    image_width?: number;
    image_height?: number;
    [key: string]: unknown;
  } | null;
}

interface FloorPlanTable {
  id: string;
  zone_id: string;
  label: string;
  x_percent: number;
  y_percent: number;
  seats: number;
  shape: string;
}

interface ZoneAssignment {
  zone_id: string;
  reservation_id: string;
  reservation_name: string;
  party_size: number;
}

interface FloorPlanAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  reservationId: string;
  reservationName: string;
  partySize: number;
  eventId?: string | null;
  onAssigned?: () => void;
}

const ZONE_TYPES = {
  vip: { icon: 'VIP', strokeOpacity: 0.95, fillOpacity: 0.24, dash: 'none' },
  table: { icon: 'TB', strokeOpacity: 0.84, fillOpacity: 0.18, dash: 'none' },
  bar: { icon: 'BR', strokeOpacity: 0.76, fillOpacity: 0.16, dash: '2 0.8' },
  stage: { icon: 'ST', strokeOpacity: 0.88, fillOpacity: 0.22, dash: '1.4 0.8' },
  dj: { icon: 'DJ', strokeOpacity: 0.78, fillOpacity: 0.17, dash: '1.2 0.7' },
  lounge: { icon: 'LG', strokeOpacity: 0.72, fillOpacity: 0.14, dash: '2.2 1' },
  other: { icon: 'ZN', strokeOpacity: 0.68, fillOpacity: 0.12, dash: '2.4 1.1' },
} as const;

const SVG_THEME = {
  zoneStroke: 'hsl(var(--primary))',
  zoneLabel: 'hsl(var(--primary))',
  zoneText: 'hsl(var(--primary-foreground))',
  tableStroke: 'hsl(var(--primary))',
  tableFill: 'hsl(var(--primary) / 0.16)',
  tableText: 'hsl(var(--primary-foreground))',
  tableMeta: 'hsl(var(--accent))',
  seat: 'hsl(var(--accent) / 0.72)',
  occupied: 'hsl(var(--destructive))',
  self: 'hsl(var(--accent))',
};

const TABLE_RADIUS = 2.6;
const TABLE_HIT_RADIUS = 3.5;
const DEFAULT_CANVAS_ASPECT = 4 / 3;

const translations = {
  el: {
    title: 'Τοποθέτηση κράτησης',
    selectZone: 'Επιλέξτε τραπέζι ή ζώνη στο σχεδιάγραμμα',
    confirmTitle: 'Επιβεβαίωση τοποθέτησης',
    confirmMessage: 'Τοποθέτηση κράτησης στη θέση:',
    people: 'άτομα',
    cancel: 'Ακύρωση',
    yes: 'Τοποθέτηση',
    assigned: 'Η κράτηση τοποθετήθηκε',
    occupied: 'Κατειλημμένη',
    available: 'Διαθέσιμη',
    noFloorPlan: 'Δεν υπάρχει σχεδιάγραμμα',
    alreadyAssigned: 'Τοποθετημένη',
  },
  en: {
    title: 'Place reservation',
    selectZone: 'Select table or zone on the floor plan',
    confirmTitle: 'Confirm placement',
    confirmMessage: 'Place reservation at:',
    people: 'people',
    cancel: 'Cancel',
    yes: 'Place it',
    assigned: 'Reservation placed',
    occupied: 'Occupied',
    available: 'Available',
    noFloorPlan: 'No floor plan available',
    alreadyAssigned: 'Placed',
  },
};

export function FloorPlanAssignmentDialog({
  open, onOpenChange, businessId, reservationId, reservationName, partySize, onAssigned,
}: FloorPlanAssignmentDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];

  const [zones, setZones] = useState<FloorPlanZone[]>([]);
  const [tables, setTables] = useState<FloorPlanTable[]>([]);
  const [assignments, setAssignments] = useState<ZoneAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canvasAspect, setCanvasAspect] = useState<number>(DEFAULT_CANVAS_ASPECT);

  useEffect(() => { if (open) loadData(); }, [open, businessId]);

  const loadData = async () => {
    setLoading(true);
    setSelectedZoneId(null);
    setSelectedTableId(null);
    setConfirming(false);

    const [zonesResult, tablesResult] = await Promise.all([
      supabase.from('floor_plan_zones').select('*').eq('business_id', businessId).order('sort_order'),
      supabase.from('floor_plan_tables').select('*').eq('business_id', businessId).order('sort_order'),
    ]);

    const loadedZones = (zonesResult.data || []) as FloorPlanZone[];
    setZones(loadedZones);
    setTables((tablesResult.data || []) as FloorPlanTable[]);

    const metadataWithDimensions = loadedZones.find((zone) => zone.metadata?.image_width && zone.metadata?.image_height)?.metadata;
    if (metadataWithDimensions?.image_width && metadataWithDimensions?.image_height) {
      const ratio = metadataWithDimensions.image_width / metadataWithDimensions.image_height;
      setCanvasAspect(Number.isFinite(ratio) && ratio > 0 ? ratio : DEFAULT_CANVAS_ASPECT);
    } else {
      setCanvasAspect(DEFAULT_CANVAS_ASPECT);
    }

    if (loadedZones.length > 0) {
      const zoneIds = loadedZones.map(z => z.id);
      const { data: assignmentData } = await supabase
        .from('reservation_zone_assignments')
        .select('zone_id, reservation_id, reservations(reservation_name, party_size)')
        .in('zone_id', zoneIds);

      const mapped = (assignmentData || []).map((a: any) => ({
        zone_id: a.zone_id,
        reservation_id: a.reservation_id,
        reservation_name: a.reservations?.reservation_name || '',
        party_size: a.reservations?.party_size || 0,
      }));
      setAssignments(mapped);
    }
    setLoading(false);
  };

  const handleZoneClick = (zoneId: string, tableId?: string) => {
    const isOccupied = assignments.some(a => a.zone_id === zoneId && a.reservation_id !== reservationId);
    if (isOccupied) return;
    setSelectedZoneId(zoneId);
    setSelectedTableId(tableId || null);
    setConfirming(true);
  };

  const handleConfirm = async () => {
    if (!selectedZoneId) return;
    setSaving(true);
    try {
      await supabase.from('reservation_zone_assignments').delete().eq('reservation_id', reservationId);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('reservation_zone_assignments').insert({
        reservation_id: reservationId,
        zone_id: selectedZoneId,
        assigned_by: user?.id || null,
      });
      if (error) throw error;
      toast.success(t.assigned);
      onAssigned?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedZone = zones.find(z => z.id === selectedZoneId);
  const selectedTable = tables.find(tb => tb.id === selectedTableId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <div className="px-5 pt-5 pb-3 border-b border-border/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              {t.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3 mt-3 bg-muted/50 rounded-lg px-3 py-2">
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{reservationName}</p>
              <p className="text-[10px] text-muted-foreground">{partySize} {t.people}</p>
            </div>
            {confirming && selectedZone && (
              <Badge variant="outline" className="border-primary/30 text-primary text-[10px] gap-1">
                <span>{(ZONE_TYPES[selectedZone.zone_type as keyof typeof ZONE_TYPES] || ZONE_TYPES.other).icon}</span>
                {selectedTable ? `${selectedTable.label} · ${selectedZone.label}` : selectedZone.label}
              </Badge>
            )}
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : zones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{t.noFloorPlan}</p>
            </div>
          ) : confirming ? (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-xl p-5 text-center space-y-3">
                <p className="text-sm text-muted-foreground">{t.confirmMessage}</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: SVG_THEME.zoneStroke }} />
                  <span className="text-lg font-semibold text-foreground">{selectedTable ? selectedTable.label : selectedZone?.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedTable ? `${selectedZone?.label} · ${selectedTable.seats} ${t.people}` : selectedZone?.label}
                </p>
                <p className="text-xs text-muted-foreground">{reservationName} · {partySize} {t.people}</p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setConfirming(false)} disabled={saving}>
                  <X className="h-3.5 w-3.5 mr-1" />{t.cancel}
                </Button>
                <Button size="sm" className="h-9 text-xs" onClick={handleConfirm} disabled={saving}>
                  <Check className="h-3.5 w-3.5 mr-1" />{saving ? '...' : t.yes}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground text-center">{t.selectZone}</p>
              <div
                className="relative rounded-xl overflow-hidden bg-background shadow-xl border border-border/20"
                style={{ aspectRatio: `${canvasAspect}`, minHeight: 'clamp(360px, 64vh, 760px)' }}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle at 12% 14%, hsl(var(--primary) / 0.2) 0%, transparent 52%), linear-gradient(145deg, hsl(var(--background)) 0%, hsl(var(--muted) / 0.45) 100%)',
                  }}
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.12) 1px, transparent 0)',
                    backgroundSize: '26px 26px',
                  }}
                />

                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    {zones.map((zone) => {
                      const assignment = assignments.find(a => a.zone_id === zone.id);
                      const isOccupied = !!assignment && assignment.reservation_id !== reservationId;
                      const isSelf = assignment?.reservation_id === reservationId;
                      const zt = ZONE_TYPES[zone.zone_type as keyof typeof ZONE_TYPES] || ZONE_TYPES.other;
                      const color = isOccupied ? SVG_THEME.occupied : isSelf ? SVG_THEME.self : SVG_THEME.zoneStroke;
                      return (
                        <linearGradient key={`grad-${zone.id}`} id={`assign-grad-${zone.id}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={isOccupied ? 0.3 : isSelf ? 0.24 : zt.fillOpacity} />
                          <stop offset="100%" stopColor={color} stopOpacity={isOccupied ? 0.12 : isSelf ? 0.1 : Math.max(zt.fillOpacity - 0.08, 0.05)} />
                        </linearGradient>
                      );
                    })}
                  </defs>

                  {zones.map((zone) => {
                    const zt = ZONE_TYPES[zone.zone_type as keyof typeof ZONE_TYPES] || ZONE_TYPES.other;
                    const assignment = assignments.find(a => a.zone_id === zone.id);
                    const isOccupied = !!assignment && assignment.reservation_id !== reservationId;
                    const isSelf = assignment?.reservation_id === reservationId;
                    const color = isOccupied ? SVG_THEME.occupied : isSelf ? SVG_THEME.self : SVG_THEME.zoneStroke;
                    return (
                      <g key={zone.id}>
                        <rect
                          x={zone.x_percent}
                          y={zone.y_percent}
                          width={zone.width_percent}
                          height={zone.height_percent}
                          rx={0.8}
                          fill={`url(#assign-grad-${zone.id})`}
                          stroke={color}
                          strokeOpacity={isOccupied ? 0.95 : zt.strokeOpacity}
                          strokeWidth={0.26}
                          strokeDasharray={isOccupied || isSelf || zt.dash === 'none' ? undefined : zt.dash}
                          className="transition-all duration-200"
                        />
                        <rect
                          x={zone.x_percent + 0.5}
                          y={zone.y_percent + 0.5}
                          width={Math.max(zone.label.length * 0.74 + 1.8, 5.2)}
                          height={2.3}
                          rx={0.4}
                          fill={color}
                          fillOpacity={0.85}
                          className="pointer-events-none"
                        />
                        <text
                          x={zone.x_percent + 1.2}
                          y={zone.y_percent + 1.82}
                          fill={SVG_THEME.zoneText}
                          fontSize="1.12"
                          fontWeight="700"
                          className="pointer-events-none"
                          style={{ fontFamily: 'system-ui' }}
                        >
                          {zone.label}
                        </text>
                        {isOccupied && (
                          <text
                            x={zone.x_percent + zone.width_percent / 2}
                            y={zone.y_percent + zone.height_percent / 2 + 1}
                            textAnchor="middle"
                            fill={SVG_THEME.occupied}
                            fontSize="0.95"
                            className="pointer-events-none"
                          >
                            {assignment.reservation_name}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {tables.map((table) => {
                    const zone = zones.find(z => z.id === table.zone_id);
                    const assignment = zone ? assignments.find(a => a.zone_id === zone.id) : null;
                    const isOccupied = !!assignment && assignment.reservation_id !== reservationId;
                    const isSelf = assignment?.reservation_id === reservationId;
                    const isSelected = selectedTableId === table.id;
                    const color = isOccupied ? SVG_THEME.occupied : isSelf ? SVG_THEME.self : SVG_THEME.tableStroke;

                    return (
                      <g key={table.id}>
                        {table.shape === 'round' ? (
                          <circle
                            cx={table.x_percent}
                            cy={table.y_percent}
                            r={TABLE_RADIUS}
                            fill={isSelected ? 'hsl(var(--primary) / 0.3)' : 'hsl(var(--primary) / 0.18)'}
                            stroke={color}
                            strokeWidth={isSelected ? 0.3 : 0.22}
                          />
                        ) : (
                          <rect
                            x={table.x_percent - TABLE_RADIUS}
                            y={table.y_percent - TABLE_RADIUS}
                            width={TABLE_RADIUS * 2}
                            height={table.shape === 'rectangle' ? TABLE_RADIUS * 1.4 : TABLE_RADIUS * 2}
                            rx={0.3}
                            fill={isSelected ? 'hsl(var(--primary) / 0.3)' : 'hsl(var(--primary) / 0.18)'}
                            stroke={color}
                            strokeWidth={isSelected ? 0.3 : 0.22}
                          />
                        )}
                        <text
                          x={table.x_percent}
                          y={table.y_percent - 0.18}
                          textAnchor="middle"
                          fill={SVG_THEME.tableText}
                          fontSize="0.98"
                          fontWeight="700"
                          className="pointer-events-none"
                          style={{ fontFamily: 'system-ui' }}
                        >
                          {table.label}
                        </text>
                        <text
                          x={table.x_percent}
                          y={table.y_percent + 1.15}
                          textAnchor="middle"
                          fill={SVG_THEME.tableMeta}
                          fontSize="0.82"
                          fontWeight="600"
                          className="pointer-events-none"
                        >
                          {table.seats}
                        </text>
                        {Array.from({ length: Math.min(table.seats, 8) }).map((_, si) => {
                          const angle = (si / Math.min(table.seats, 8)) * Math.PI * 2 - Math.PI / 2;
                          const seatR = TABLE_RADIUS + 0.82;
                          return (
                            <circle
                              key={si}
                              cx={table.x_percent + Math.cos(angle) * seatR}
                              cy={table.y_percent + Math.sin(angle) * seatR}
                              r={0.34}
                              fill={SVG_THEME.seat}
                              className="pointer-events-none"
                            />
                          );
                        })}
                      </g>
                    );
                  })}
                </svg>

                {/* Clickable table hit areas (primary) */}
                {tables.map((table) => {
                  const assignment = assignments.find(a => a.zone_id === table.zone_id);
                  const isOccupied = !!assignment && assignment.reservation_id !== reservationId;
                  const isSelected = selectedTableId === table.id;
                  return (
                    <div
                      key={`hit-table-${table.id}`}
                      className={`absolute rounded-full transition-all duration-200 z-20 ${
                        isOccupied
                          ? 'cursor-not-allowed'
                          : isSelected
                            ? 'cursor-pointer ring-1 ring-accent/80 bg-accent/10'
                            : 'cursor-pointer hover:ring-1 hover:ring-accent/40 hover:bg-accent/5'
                      }`}
                      style={{
                        left: `${table.x_percent - TABLE_HIT_RADIUS}%`,
                        top: `${table.y_percent - TABLE_HIT_RADIUS}%`,
                        width: `${TABLE_HIT_RADIUS * 2}%`,
                        height: `${TABLE_HIT_RADIUS * 2}%`,
                      }}
                      onClick={() => handleZoneClick(table.zone_id, table.id)}
                    />
                  );
                })}

                {/* Clickable zone hit areas (fallback for zones without tables) */}
                {zones.map((zone) => {
                  const assignment = assignments.find(a => a.zone_id === zone.id);
                  const isOccupied = !!assignment && assignment.reservation_id !== reservationId;
                  const hasTables = tables.some(tb => tb.zone_id === zone.id);
                  return (
                    <div
                      key={`hit-zone-${zone.id}`}
                      className={`absolute rounded-md transition-all duration-200 z-10 ${
                        isOccupied
                          ? 'cursor-not-allowed'
                          : hasTables
                            ? 'cursor-default'
                            : 'cursor-pointer hover:ring-1 hover:ring-primary/30 hover:bg-primary/5'
                      }`}
                      style={{ left: `${zone.x_percent}%`, top: `${zone.y_percent}%`, width: `${zone.width_percent}%`, height: `${zone.height_percent}%` }}
                      onClick={() => {
                        if (!hasTables) handleZoneClick(zone.id);
                      }}
                    />
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-5 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm border border-primary/60 bg-primary/10" />
                  {t.available}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm border border-destructive/60 bg-destructive/10" />
                  {t.occupied}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm border border-accent/70 bg-accent/20" />
                  {t.alreadyAssigned}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
