import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MapPin, Check, X, Users, Search, UserCheck, Clock, Phone, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/hooks/useLanguage';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';

interface Reservation {
  id: string;
  reservation_name: string;
  party_size: number;
  phone_number: string | null;
  status: string;
  preferred_time: string | null;
  seating_preference: string | null;
  special_requests: string | null;
  event_id: string | null;
  created_at: string;
}

interface AssignedReservation extends Reservation {
  assigned_table_label?: string;
}

interface FloorPlanTableAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  tableId: string;
  tableLabel: string;
  tableSeats: number;
  currentAssignment: { reservation_id: string; reservation_name: string; party_size: number } | null;
  assignedReservationIds: Set<string>;
  onAssigned: () => void;
  eventId: string;
}

const translations = {
  el: {
    title: 'Τοποθέτηση στη θέση',
    search: 'Αναζήτηση κράτησης...',
    noReservations: 'Δεν υπάρχουν κρατήσεις',
    assign: 'Τοποθέτηση',
    remove: 'Αφαίρεση',
    people: 'άτομα',
    assigned: 'Η κράτηση τοποθετήθηκε',
    removed: 'Η κράτηση αφαιρέθηκε',
    currentlyAssigned: 'Τρέχουσα κράτηση',
    alreadyPlaced: 'Ήδη τοποθετημένη',
    seats: 'θέσεις',
  },
  en: {
    title: 'Assign to table',
    search: 'Search reservation...',
    noReservations: 'No reservations found',
    assign: 'Assign',
    remove: 'Remove',
    people: 'people',
    assigned: 'Reservation assigned',
    removed: 'Reservation removed',
    currentlyAssigned: 'Currently assigned',
    alreadyPlaced: 'Already placed',
    seats: 'seats',
  },
};

export function FloorPlanTableAssignmentDialog({
  open, onOpenChange, businessId, tableId, tableLabel, tableSeats,
  currentAssignment, assignedReservationIds, onAssigned, eventId,
}: FloorPlanTableAssignmentDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const locale = language === 'el' ? el : enUS;

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) loadReservations();
  }, [open, businessId]);

  const loadReservations = async () => {
    setLoading(true);
    setSearch('');

    const { data, error } = await supabase
      .from('reservations')
      .select('id, reservation_name, party_size, phone_number, status, preferred_time, seating_preference, special_requests, event_id, created_at')
      .eq('business_id', businessId)
      .eq('event_id', eventId)
      .in('status', ['pending', 'accepted', 'confirmed'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReservations(data as Reservation[]);
    }
    setLoading(false);
  };

  const handleAssign = async (reservationId: string) => {
    setSaving(true);
    try {
      // Remove any existing assignment for this table in this event
      await supabase.from('reservation_table_assignments').delete().eq('table_id', tableId).eq('event_id', eventId);
      // Remove any existing assignment for this reservation in this event
      await supabase.from('reservation_table_assignments').delete().eq('reservation_id', reservationId).eq('event_id', eventId);

      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('reservation_table_assignments').insert({
        table_id: tableId,
        reservation_id: reservationId,
        assigned_by: user?.id || null,
        event_id: eventId,
      } as any);
      if (error) throw error;
      toast.success(t.assigned);
      onAssigned();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      await supabase.from('reservation_table_assignments').delete().eq('table_id', tableId);
      toast.success(t.removed);
      onAssigned();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = reservations.filter(r =>
    r.reservation_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.phone_number && r.phone_number.includes(search))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border/30 space-y-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              {t.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-3 py-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center font-bold text-primary text-sm">
              {tableLabel}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{tableSeats} {t.seats}</p>
            </div>
          </div>

          {/* Currently assigned */}
          {currentAssignment && (
            <div className="flex items-center gap-3 bg-accent/10 border border-accent/20 rounded-lg px-3 py-2.5">
              <UserCheck className="h-4 w-4 text-accent flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{t.currentlyAssigned}</p>
                <p className="text-sm font-semibold text-foreground">{currentAssignment.reservation_name}</p>
                <p className="text-[10px] text-muted-foreground">{currentAssignment.party_size} {t.people}</p>
              </div>
              <Button
                variant="ghost" size="sm"
                className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleRemove} disabled={saving}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                {t.remove}
              </Button>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Reservation list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Users className="h-8 w-8 text-muted-foreground/20" />
              <p className="text-xs text-muted-foreground">{t.noReservations}</p>
            </div>
          ) : (
            filtered.map((res) => {
              const isAlreadyPlaced = assignedReservationIds.has(res.id) && currentAssignment?.reservation_id !== res.id;
              const isCurrent = currentAssignment?.reservation_id === res.id;

              return (
                <button
                  key={res.id}
                  disabled={saving || isAlreadyPlaced}
                  onClick={() => !isCurrent && handleAssign(res.id)}
                  className={`
                    w-full text-left rounded-lg px-3 py-2.5 transition-all border
                    ${isCurrent
                      ? 'bg-accent/10 border-accent/30'
                      : isAlreadyPlaced
                        ? 'bg-muted/20 border-transparent opacity-50 cursor-not-allowed'
                        : 'bg-transparent border-transparent hover:bg-muted/50 hover:border-border/30 cursor-pointer'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    {/* Initials avatar */}
                    <div className={`
                      h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                      ${isCurrent ? 'bg-accent/20 text-accent' : 'bg-primary/10 text-primary'}
                    `}>
                      {getInitials(res.reservation_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{res.reservation_name}</span>
                        {isAlreadyPlaced && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-muted-foreground/30">
                            {t.alreadyPlaced}
                          </Badge>
                        )}
                        {isCurrent && (
                          <Check className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> {res.party_size}
                        </span>
                        {res.phone_number && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {res.phone_number}
                          </span>
                        )}
                        {res.preferred_time && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {res.preferred_time}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (name.slice(0, 2)).toUpperCase();
}
