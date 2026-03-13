import { useState, useEffect, useRef } from 'react';
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
  shape: string;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  capacity: number;
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
  vip: { color: '#F59E0B', icon: '⭐' },
  table: { color: '#3B82F6', icon: '🪑' },
  bar: { color: '#8B5CF6', icon: '🍸' },
  stage: { color: '#EF4444', icon: '🎤' },
  dj: { color: '#EC4899', icon: '🎧' },
  lounge: { color: '#14B8A6', icon: '🛋️' },
  other: { color: '#6B7280', icon: '📍' },
} as const;

const translations = {
  el: {
    title: 'Τοποθέτηση κράτησης',
    selectZone: 'Επιλέξτε ζώνη στο σχεδιάγραμμα',
    confirm: 'Τοποθέτηση',
    confirmTitle: 'Επιβεβαίωση τοποθέτησης',
    confirmMessage: 'Τοποθέτηση κράτησης στη ζώνη:',
    guest: 'Πελάτης',
    people: 'άτομα',
    zone: 'Ζώνη',
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
    selectZone: 'Select a zone on the floor plan',
    confirm: 'Place',
    confirmTitle: 'Confirm placement',
    confirmMessage: 'Place reservation in zone:',
    guest: 'Guest',
    people: 'people',
    zone: 'Zone',
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
  open,
  onOpenChange,
  businessId,
  reservationId,
  reservationName,
  partySize,
  eventId,
  onAssigned,
}: FloorPlanAssignmentDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [zones, setZones] = useState<FloorPlanZone[]>([]);
  const [assignments, setAssignments] = useState<ZoneAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) loadData();
  }, [open, businessId]);

  const loadData = async () => {
    setLoading(true);
    setSelectedZoneId(null);
    setConfirming(false);

    const [bizResult, zonesResult] = await Promise.all([
      supabase.from('businesses').select('floor_plan_image_url').eq('id', businessId).single(),
      supabase.from('floor_plan_zones').select('*').eq('business_id', businessId).order('sort_order'),
    ]);

    setImageUrl(bizResult.data?.floor_plan_image_url || null);
    const loadedZones = (zonesResult.data || []) as FloorPlanZone[];
    setZones(loadedZones);

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

  const handleZoneClick = (zoneId: string) => {
    const isOccupied = assignments.some(a => a.zone_id === zoneId && a.reservation_id !== reservationId);
    if (isOccupied) return;
    setSelectedZoneId(zoneId);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              {t.title}
            </DialogTitle>
          </DialogHeader>

          {/* Guest info pill */}
          <div className="flex items-center gap-3 mt-3 bg-muted/50 rounded-lg px-3 py-2">
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{reservationName}</p>
              <p className="text-[10px] text-muted-foreground">{partySize} {t.people}</p>
            </div>
            {confirming && selectedZone && (
              <Badge variant="outline" className="border-primary/30 text-primary text-[10px] gap-1">
                <span>{(ZONE_TYPES[selectedZone.zone_type as keyof typeof ZONE_TYPES] || ZONE_TYPES.other).icon}</span>
                {selectedZone.label}
              </Badge>
            )}
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : !imageUrl ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{t.noFloorPlan}</p>
            </div>
          ) : confirming ? (
            /* Confirmation */
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-xl p-5 text-center space-y-3">
                <p className="text-sm text-muted-foreground">{t.confirmMessage}</p>
                <div className="flex items-center justify-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: (ZONE_TYPES[selectedZone?.zone_type as keyof typeof ZONE_TYPES] || ZONE_TYPES.other).color }}
                  />
                  <span className="text-lg font-semibold text-foreground">{selectedZone?.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {reservationName} · {partySize} {t.people}
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setConfirming(false)} disabled={saving}>
                  <X className="h-3.5 w-3.5 mr-1" />
                  {t.cancel}
                </Button>
                <Button size="sm" className="h-9 text-xs" onClick={handleConfirm} disabled={saving}>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {saving ? '...' : t.yes}
                </Button>
              </div>
            </div>
          ) : (
            /* Floor plan view */
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground text-center">{t.selectZone}</p>
              
              <div className="relative rounded-xl overflow-hidden bg-[#0f0f0f] shadow-xl border border-border/20">
                <img src={imageUrl} alt="Floor plan" className="w-full h-auto block opacity-85" draggable={false} />
                
                {/* Grid overlay */}
                <div className="absolute inset-0 pointer-events-none" style={{
                  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
                  backgroundSize: '20px 20px',
                }} />

                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    {zones.map((zone) => {
                      const assignment = assignments.find(a => a.zone_id === zone.id);
                      const isOccupied = !!assignment && assignment.reservation_id !== reservationId;
                      const isSelf = assignment?.reservation_id === reservationId;
                      const zt = ZONE_TYPES[zone.zone_type as keyof typeof ZONE_TYPES] || ZONE_TYPES.other;
                      const color = isOccupied ? '#EF4444' : isSelf ? '#22C55E' : zt.color;
                      return (
                        <linearGradient key={`grad-${zone.id}`} id={`assign-grad-${zone.id}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={isOccupied ? 0.3 : 0.25} />
                          <stop offset="100%" stopColor={color} stopOpacity={isOccupied ? 0.1 : 0.08} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  {zones.map((zone) => {
                    const zt = ZONE_TYPES[zone.zone_type as keyof typeof ZONE_TYPES] || ZONE_TYPES.other;
                    const assignment = assignments.find(a => a.zone_id === zone.id);
                    const isOccupied = !!assignment && assignment.reservation_id !== reservationId;
                    const isSelf = assignment?.reservation_id === reservationId;
                    const color = isOccupied ? '#EF4444' : isSelf ? '#22C55E' : zt.color;

                    return (
                      <g key={zone.id}>
                        <rect
                          x={zone.x_percent}
                          y={zone.y_percent}
                          width={zone.width_percent}
                          height={zone.height_percent}
                          rx={0.6}
                          fill={`url(#assign-grad-${zone.id})`}
                          stroke={color}
                          strokeWidth={0.3}
                          strokeDasharray={isOccupied ? undefined : "0.8 0.4"}
                          className="transition-all duration-200"
                          style={{ filter: `drop-shadow(0 0 3px ${color}40)` }}
                        />
                        {/* Label bg pill */}
                        <rect
                          x={zone.x_percent + zone.width_percent / 2 - (zone.label.length * 0.38)}
                          y={zone.y_percent + zone.height_percent / 2 - 1.2}
                          width={zone.label.length * 0.76}
                          height={2.4}
                          rx={0.4}
                          fill="rgba(0,0,0,0.65)"
                          className="pointer-events-none"
                        />
                        <text
                          x={zone.x_percent + zone.width_percent / 2}
                          y={zone.y_percent + zone.height_percent / 2 + 0.35}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize="1.4"
                          fontWeight="600"
                          className="pointer-events-none"
                          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                        >
                          {zone.label}
                        </text>
                        {isOccupied && (
                          <text
                            x={zone.x_percent + zone.width_percent / 2}
                            y={zone.y_percent + zone.height_percent / 2 + 2.2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#EF4444"
                            fontSize="0.9"
                            className="pointer-events-none"
                          >
                            {assignment.reservation_name}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Clickable hit areas */}
                {zones.map((zone) => {
                  const assignment = assignments.find(a => a.zone_id === zone.id);
                  const isOccupied = !!assignment && assignment.reservation_id !== reservationId;
                  return (
                    <div
                      key={`hit-${zone.id}`}
                      className={`absolute rounded-md transition-all duration-200 ${
                        isOccupied 
                          ? 'cursor-not-allowed' 
                          : 'cursor-pointer hover:ring-1 hover:ring-white/30 hover:bg-white/5'
                      }`}
                      style={{
                        left: `${zone.x_percent}%`,
                        top: `${zone.y_percent}%`,
                        width: `${zone.width_percent}%`,
                        height: `${zone.height_percent}%`,
                      }}
                      onClick={() => handleZoneClick(zone.id)}
                    />
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-5 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm border border-blue-500/60" style={{
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(59,130,246,0.08))'
                  }} />
                  {t.available}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm border border-red-500/60" style={{
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(239,68,68,0.1))'
                  }} />
                  {t.occupied}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm border border-green-500/60" style={{
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.3), rgba(34,197,94,0.1))'
                  }} />
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
