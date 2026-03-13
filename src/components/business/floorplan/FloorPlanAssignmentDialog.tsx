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

const ZONE_COLORS: Record<string, { bg: string; border: string; text: string; occupied: string }> = {
  vip: { bg: 'rgba(234, 179, 8, 0.2)', border: '#eab308', text: '#eab308', occupied: 'rgba(239, 68, 68, 0.35)' },
  table: { bg: 'rgba(59, 130, 246, 0.2)', border: '#3b82f6', text: '#3b82f6', occupied: 'rgba(239, 68, 68, 0.35)' },
  bar: { bg: 'rgba(168, 85, 247, 0.2)', border: '#a855f7', text: '#a855f7', occupied: 'rgba(239, 68, 68, 0.35)' },
  stage: { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444', text: '#ef4444', occupied: 'rgba(239, 68, 68, 0.35)' },
  dj: { bg: 'rgba(236, 72, 153, 0.2)', border: '#ec4899', text: '#ec4899', occupied: 'rgba(239, 68, 68, 0.35)' },
  other: { bg: 'rgba(107, 114, 128, 0.2)', border: '#6b7280', text: '#6b7280', occupied: 'rgba(239, 68, 68, 0.35)' },
};

const translations = {
  el: {
    title: 'Τοποθέτηση κράτησης',
    selectZone: 'Επιλέξτε ζώνη στο σχεδιάγραμμα',
    confirm: 'Τοποθέτηση',
    confirmTitle: 'Επιβεβαίωση τοποθέτησης',
    confirmMessage: 'Είστε σίγουροι ότι θέλετε να τοποθετήσετε αυτήν την κράτηση;',
    guest: 'Πελάτης',
    people: 'άτομα',
    zone: 'Ζώνη',
    cancel: 'Ακύρωση',
    yes: 'Ναι, τοποθέτηση',
    assigned: 'Η κράτηση τοποθετήθηκε επιτυχώς',
    occupied: 'Κατειλημμένη',
    available: 'Διαθέσιμη',
    noFloorPlan: 'Δεν υπάρχει σχεδιάγραμμα',
    removeAssignment: 'Αφαίρεση',
    alreadyAssigned: 'Ήδη τοποθετημένη',
  },
  en: {
    title: 'Place reservation',
    selectZone: 'Select a zone on the floor plan',
    confirm: 'Place',
    confirmTitle: 'Confirm placement',
    confirmMessage: 'Are you sure you want to place this reservation?',
    guest: 'Guest',
    people: 'people',
    zone: 'Zone',
    cancel: 'Cancel',
    yes: 'Yes, place it',
    assigned: 'Reservation placed successfully',
    occupied: 'Occupied',
    available: 'Available',
    noFloorPlan: 'No floor plan available',
    removeAssignment: 'Remove',
    alreadyAssigned: 'Already placed',
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
  const imageRef = useRef<HTMLDivElement>(null);

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

    // Load current assignments for all zones
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
    if (isOccupied) return; // Can't select occupied zones
    setSelectedZoneId(zoneId);
    setConfirming(true);
  };

  const handleConfirm = async () => {
    if (!selectedZoneId) return;
    setSaving(true);

    try {
      // Remove existing assignment for this reservation
      await supabase.from('reservation_zone_assignments').delete().eq('reservation_id', reservationId);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create new assignment
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
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        {/* Reservation info card */}
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
          <Users className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{reservationName}</p>
            <p className="text-xs text-muted-foreground">{partySize} {t.people}</p>
          </div>
          {confirming && selectedZone && (
            <Badge variant="outline" className="border-primary/40 text-primary text-xs">
              → {selectedZone.label}
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : !imageUrl ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t.noFloorPlan}</p>
          </div>
        ) : confirming ? (
          /* Confirmation view */
          <div className="space-y-4">
            <div className="bg-accent/50 rounded-lg p-4 text-center space-y-3">
              <p className="text-sm font-medium text-foreground">{t.confirmMessage}</p>
              <div className="flex items-center justify-center gap-3 text-sm">
                <span className="font-semibold">{reservationName}</span>
                <span className="text-muted-foreground">→</span>
                <Badge
                  style={{
                    backgroundColor: ZONE_COLORS[selectedZone?.zone_type || 'other']?.bg,
                    borderColor: ZONE_COLORS[selectedZone?.zone_type || 'other']?.border,
                    color: ZONE_COLORS[selectedZone?.zone_type || 'other']?.text,
                  }}
                  className="border"
                >
                  {selectedZone?.label}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={saving}>
                <X className="h-3.5 w-3.5 mr-1" />
                {t.cancel}
              </Button>
              <Button size="sm" onClick={handleConfirm} disabled={saving}>
                <Check className="h-3.5 w-3.5 mr-1" />
                {saving ? '...' : t.yes}
              </Button>
            </div>
          </div>
        ) : (
          /* Floor plan view */
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center">{t.selectZone}</p>
            <div ref={imageRef} className="relative rounded-lg overflow-hidden">
              <img src={imageUrl} alt="Floor plan" className="w-full h-auto block" draggable={false} />
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {zones.map((zone) => {
                  const colors = ZONE_COLORS[zone.zone_type] || ZONE_COLORS.other;
                  const assignment = assignments.find(a => a.zone_id === zone.id);
                  const isOccupied = !!assignment && assignment.reservation_id !== reservationId;
                  const isSelf = assignment?.reservation_id === reservationId;
                  const fill = isOccupied ? colors.occupied : isSelf ? 'rgba(34, 197, 94, 0.3)' : colors.bg;
                  const stroke = isOccupied ? '#ef4444' : isSelf ? '#22c55e' : colors.border;

                  return (
                    <g key={zone.id}>
                      <rect
                        x={zone.x_percent}
                        y={zone.y_percent}
                        width={zone.width_percent}
                        height={zone.height_percent}
                        rx={0.4}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={0.4}
                        className="transition-all duration-200"
                      />
                      <text
                        x={zone.x_percent + zone.width_percent / 2}
                        y={zone.y_percent + zone.height_percent / 2 - 0.5}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={isOccupied ? '#ef4444' : isSelf ? '#22c55e' : colors.text}
                        fontSize="1.5"
                        fontWeight="600"
                        className="pointer-events-none"
                      >
                        {zone.label}
                      </text>
                      {isOccupied && (
                        <text
                          x={zone.x_percent + zone.width_percent / 2}
                          y={zone.y_percent + zone.height_percent / 2 + 1.5}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#ef4444"
                          fontSize="1"
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
                    className={`absolute rounded transition-all ${isOccupied ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:ring-2 hover:ring-primary/60'}`}
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
            <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-blue-500/20 border border-blue-500" />
                {t.available}
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-red-500/30 border border-red-500" />
                {t.occupied}
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-green-500/30 border border-green-500" />
                {t.alreadyAssigned}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
