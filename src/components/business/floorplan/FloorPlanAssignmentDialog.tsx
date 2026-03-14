import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MapPin, Check, X, Users, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface FloorPlanItem {
  id: string;
  zone_id: string | null;
  label: string;
  x_percent: number;
  y_percent: number;
  seats: number;
  shape: string;
  fixture_type: string | null;
}

interface FloorPlanZone {
  id: string;
  metadata?: {
    image_width?: number;
    image_height?: number;
    fixture_bboxes?: Record<string, { w: number; h: number }>;
    [key: string]: unknown;
  } | null;
}

interface TableAssignment {
  table_id: string;
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

const FIXTURE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  bar: { bg: 'hsl(var(--primary) / 0.12)', border: 'hsl(var(--primary) / 0.5)', text: 'hsl(var(--primary))' },
  dj: { bg: 'hsl(var(--accent) / 0.12)', border: 'hsl(var(--accent) / 0.5)', text: 'hsl(var(--accent))' },
  stage: { bg: 'hsl(var(--accent) / 0.10)', border: 'hsl(var(--accent) / 0.4)', text: 'hsl(var(--accent))' },
  other: { bg: 'hsl(var(--muted) / 0.15)', border: 'hsl(var(--muted-foreground) / 0.25)', text: 'hsl(var(--muted-foreground))' },
};

const SVG_THEME = {
  tableStroke: 'hsl(var(--primary))',
  tableFill: 'hsl(var(--primary) / 0.14)',
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
    selectTable: 'Επιλέξτε τραπέζι στο σχεδιάγραμμα',
    confirmMessage: 'Τοποθέτηση κράτησης στη θέση:',
    people: 'άτομα',
    cancel: 'Ακύρωση',
    yes: 'Τοποθέτηση',
    assigned: 'Η κράτηση τοποθετήθηκε',
    occupied: 'Κατειλημμένο',
    available: 'Διαθέσιμο',
    noFloorPlan: 'Δεν υπάρχει σχεδιάγραμμα',
    alreadyAssigned: 'Τοποθετημένη',
  },
  en: {
    title: 'Place reservation',
    selectTable: 'Select a table on the floor plan',
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

  const [items, setItems] = useState<FloorPlanItem[]>([]);
  const [zones, setZones] = useState<FloorPlanZone[]>([]);
  const [assignments, setAssignments] = useState<TableAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canvasAspect, setCanvasAspect] = useState(DEFAULT_CANVAS_ASPECT);

  useEffect(() => { if (open) loadData(); }, [open, businessId]);

  const loadData = async () => {
    setLoading(true);
    setSelectedTableId(null);
    setConfirming(false);

    const [itemsResult, zonesResult] = await Promise.all([
      supabase.from('floor_plan_tables').select('*').eq('business_id', businessId).order('sort_order'),
      supabase.from('floor_plan_zones').select('*').eq('business_id', businessId).order('sort_order').limit(1),
    ]);

    const loadedItems = (itemsResult.data || []) as FloorPlanItem[];
    const loadedZones = (zonesResult.data || []) as FloorPlanZone[];
    setItems(loadedItems);
    setZones(loadedZones);

    const meta = loadedZones[0]?.metadata;
    if (meta?.image_width && meta?.image_height) {
      const ratio = (meta.image_width as number) / (meta.image_height as number);
      setCanvasAspect(Number.isFinite(ratio) && ratio > 0 ? ratio : DEFAULT_CANVAS_ASPECT);
    }

    // Load assignments by zone_id (backward compatible)
    if (loadedZones.length > 0) {
      const zoneIds = loadedZones.map(z => z.id);
      const { data: assignmentData } = await supabase
        .from('reservation_zone_assignments')
        .select('zone_id, reservation_id, reservations(reservation_name, party_size)')
        .in('zone_id', zoneIds);

      setAssignments((assignmentData || []).map((a: any) => ({
        table_id: '', // legacy zone-based
        zone_id: a.zone_id,
        reservation_id: a.reservation_id,
        reservation_name: a.reservations?.reservation_name || '',
        party_size: a.reservations?.party_size || 0,
      })));
    }
    setLoading(false);
  };

  const handleTableClick = (tableId: string) => {
    // Check if this table's zone is already occupied by someone else
    const item = items.find(i => i.id === tableId);
    if (!item || item.fixture_type) return; // Can't assign to fixtures

    const isOccupied = item.zone_id ? assignments.some(a => a.zone_id === item.zone_id && a.reservation_id !== reservationId) : false;
    if (isOccupied) return;

    setSelectedTableId(tableId);
    setConfirming(true);
  };

  const handleConfirm = async () => {
    const selectedItem = items.find(i => i.id === selectedTableId);
    if (!selectedItem) return;
    const zoneId = selectedItem.zone_id || zones[0]?.id;
    if (!zoneId) return;

    setSaving(true);
    try {
      await supabase.from('reservation_zone_assignments').delete().eq('reservation_id', reservationId);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('reservation_zone_assignments').insert({
        reservation_id: reservationId,
        zone_id: zoneId,
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

  const selectedItem = items.find(i => i.id === selectedTableId);
  const tableItems = items.filter(i => !i.fixture_type);
  const fixtureItems = items.filter(i => !!i.fixture_type);
  const fixtureBboxes: Record<string, { w: number; h: number }> = (zones[0]?.metadata as any)?.fixture_bboxes || {};

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
            {confirming && selectedItem && (
              <Badge variant="outline" className="border-primary/30 text-primary text-[10px] gap-1">
                {selectedItem.label} · {selectedItem.seats} {t.people}
              </Badge>
            )}
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{t.noFloorPlan}</p>
            </div>
          ) : confirming ? (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-xl p-5 text-center space-y-3">
                <p className="text-sm text-muted-foreground">{t.confirmMessage}</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: SVG_THEME.tableStroke }} />
                  <span className="text-lg font-semibold text-foreground">{selectedItem?.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{selectedItem?.seats} {t.people}</p>
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
              <p className="text-xs text-muted-foreground text-center">{t.selectTable}</p>
              <div
                className="relative rounded-xl overflow-hidden bg-background shadow-xl border border-border/20"
                style={{ aspectRatio: `${canvasAspect}`, minHeight: 'clamp(360px, 64vh, 760px)' }}
              >
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: 'radial-gradient(circle at 12% 14%, hsl(var(--primary) / 0.15) 0%, transparent 52%), linear-gradient(145deg, hsl(var(--background)) 0%, hsl(var(--muted) / 0.35) 100%)',
                }} />
                <div className="absolute inset-0 pointer-events-none" style={{
                  backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.08) 1px, transparent 0)',
                  backgroundSize: '26px 26px',
                }} />

                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Fixtures */}
                  {fixtureItems.map((item) => {
                    const bbox = fixtureBboxes[item.label] || { w: 8, h: 5 };
                    const colors = FIXTURE_COLORS[item.fixture_type || 'other'] || FIXTURE_COLORS.other;
                    return (
                      <g key={item.id}>
                        <rect
                          x={item.x_percent} y={item.y_percent}
                          width={bbox.w} height={bbox.h}
                          rx={0.6} fill={colors.bg} stroke={colors.border}
                          strokeWidth={0.22} strokeDasharray="2 1"
                        />
                        <text
                          x={item.x_percent + bbox.w / 2} y={item.y_percent + bbox.h / 2 + 0.5}
                          textAnchor="middle" fill={colors.text}
                          fontSize="1.5" fontWeight="700" className="pointer-events-none"
                          style={{ fontFamily: 'system-ui' }}
                        >
                          {item.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Tables */}
                  {tableItems.map((item) => {
                    const isOccupied = item.zone_id ? assignments.some(a => a.zone_id === item.zone_id && a.reservation_id !== reservationId) : false;
                    const isSelf = item.zone_id ? assignments.some(a => a.zone_id === item.zone_id && a.reservation_id === reservationId) : false;
                    const isSelected = selectedTableId === item.id;
                    const color = isOccupied ? SVG_THEME.occupied : isSelf ? SVG_THEME.self : SVG_THEME.tableStroke;
                    const r = TABLE_RADIUS;

                    return (
                      <g key={item.id}>
                        {item.shape === 'round' ? (
                          <circle
                            cx={item.x_percent} cy={item.y_percent} r={r}
                            fill={isSelected ? 'hsl(var(--primary) / 0.3)' : isOccupied ? 'hsl(var(--destructive) / 0.12)' : SVG_THEME.tableFill}
                            stroke={color} strokeWidth={isSelected ? 0.3 : 0.22}
                          />
                        ) : (
                          <rect
                            x={item.x_percent - r} y={item.y_percent - r}
                            width={r * 2} height={item.shape === 'rectangle' ? r * 1.4 : r * 2}
                            rx={0.3}
                            fill={isSelected ? 'hsl(var(--primary) / 0.3)' : isOccupied ? 'hsl(var(--destructive) / 0.12)' : SVG_THEME.tableFill}
                            stroke={color} strokeWidth={isSelected ? 0.3 : 0.22}
                          />
                        )}
                        <text
                          x={item.x_percent} y={item.y_percent - 0.18}
                          textAnchor="middle" fill={SVG_THEME.tableText}
                          fontSize="1.1" fontWeight="700" className="pointer-events-none"
                          style={{ fontFamily: 'system-ui' }}
                        >
                          {item.label}
                        </text>
                        <text
                          x={item.x_percent} y={item.y_percent + 1.15}
                          textAnchor="middle" fill={SVG_THEME.tableMeta}
                          fontSize="0.82" fontWeight="600" className="pointer-events-none"
                        >
                          {item.seats}
                        </text>
                        {Array.from({ length: Math.min(item.seats, 8) }).map((_, si) => {
                          const angle = (si / Math.min(item.seats, 8)) * Math.PI * 2 - Math.PI / 2;
                          const seatR = r + 0.82;
                          return (
                            <circle key={si}
                              cx={item.x_percent + Math.cos(angle) * seatR}
                              cy={item.y_percent + Math.sin(angle) * seatR}
                              r={0.34} fill={SVG_THEME.seat} className="pointer-events-none"
                            />
                          );
                        })}
                      </g>
                    );
                  })}
                </svg>

                {/* Clickable table hit areas */}
                {tableItems.map((item) => {
                  const isOccupied = item.zone_id ? assignments.some(a => a.zone_id === item.zone_id && a.reservation_id !== reservationId) : false;
                  const isSelected = selectedTableId === item.id;
                  return (
                    <div
                      key={`hit-${item.id}`}
                      className={`absolute rounded-full transition-all duration-200 z-20 ${
                        isOccupied ? 'cursor-not-allowed' :
                        isSelected ? 'cursor-pointer ring-1 ring-accent/80 bg-accent/10' :
                        'cursor-pointer hover:ring-1 hover:ring-accent/40 hover:bg-accent/5'
                      }`}
                      style={{
                        left: `${item.x_percent - TABLE_HIT_RADIUS}%`,
                        top: `${item.y_percent - TABLE_HIT_RADIUS}%`,
                        width: `${TABLE_HIT_RADIUS * 2}%`,
                        height: `${TABLE_HIT_RADIUS * 2}%`,
                      }}
                      onClick={() => handleTableClick(item.id)}
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
