import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Phone, Clock, MessageSquare, MapPin, Trash2, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface ReservationDetail {
  id: string;
  reservation_name: string;
  party_size: number;
  phone_number: string | null;
  status: string;
  preferred_time: string | null;
  seating_preference: string | null;
  special_requests: string | null;
  staff_memo: string | null;
}

interface FloorPlanReservationDetailPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: ReservationDetail | null;
  tableLabel: string;
  onRemove: () => void;
  onReassign: () => void;
  saving?: boolean;
}

const translations = {
  el: {
    details: 'Λεπτομέρειες κράτησης',
    people: 'άτομα',
    time: 'Ώρα',
    seating: 'Θέση',
    requests: 'Σχόλια πελάτη',
    staffMemo: 'Σημείωση προσωπικού',
    remove: 'Αφαίρεση',
    reassign: 'Αλλαγή',
    status: {
      pending: 'Εκκρεμεί',
      accepted: 'Αποδεκτή',
      confirmed: 'Επιβεβαιωμένη',
      cancelled: 'Ακυρωμένη',
    },
    seatingTypes: {
      indoor: 'Εσωτερικά',
      outdoor: 'Εξωτερικά',
      bar: 'Bar',
      table: 'Τραπέζι',
      sofa: 'Καναπές',
      vip: 'VIP',
    },
  },
  en: {
    details: 'Reservation details',
    people: 'people',
    time: 'Time',
    seating: 'Seating',
    requests: 'Customer notes',
    staffMemo: 'Notes',
    remove: 'Remove',
    reassign: 'Reassign',
    status: {
      pending: 'Pending',
      accepted: 'Accepted',
      confirmed: 'Confirmed',
      cancelled: 'Cancelled',
    },
    seatingTypes: {
      indoor: 'Indoor',
      outdoor: 'Outdoor',
      bar: 'Bar',
      table: 'Table',
      sofa: 'Sofa',
      vip: 'VIP',
    },
  },
};

export function FloorPlanReservationDetailPopover({
  open, onOpenChange, reservation, tableLabel, onRemove, onReassign, saving,
}: FloorPlanReservationDetailPopoverProps) {
  const { language } = useLanguage();
  const t = translations[language];

  if (!reservation) return null;

  const statusLabel = t.status[reservation.status as keyof typeof t.status] || reservation.status;
  const statusColor = reservation.status === 'accepted' || reservation.status === 'confirmed'
    ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
    : reservation.status === 'pending'
      ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
      : 'bg-muted text-muted-foreground border-border';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0">
        <div className="px-5 pt-5 pb-4 space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              {t.details}
            </DialogTitle>
          </DialogHeader>

          {/* Name + badge */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-foreground">{reservation.reservation_name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> {reservation.party_size} {t.people}
                </span>
              </div>
            </div>
            <Badge variant="outline" className={`text-[10px] ${statusColor}`}>
              {statusLabel}
            </Badge>
          </div>

          {/* Table badge */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-medium text-foreground">{tableLabel}</span>
          </div>

          {/* Info rows */}
          <div className="space-y-2.5">
            {reservation.phone_number && (
              <div className="flex items-center gap-3">
                <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground">{reservation.phone_number}</span>
              </div>
            )}
            {reservation.preferred_time && (
              <div className="flex items-center gap-3">
                <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground">{reservation.preferred_time}</span>
              </div>
            )}
            {reservation.seating_preference && (
              <div className="flex items-center gap-3">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground">
                  {t.seatingTypes[reservation.seating_preference as keyof typeof t.seatingTypes] || reservation.seating_preference}
                </span>
              </div>
            )}
            {reservation.special_requests && (
              <div className="flex items-start gap-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2">
                <MessageSquare className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-foreground">{reservation.special_requests}</span>
              </div>
            )}
            {reservation.staff_memo && (
              <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
                <MessageSquare className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-foreground italic">{reservation.staff_memo}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline" size="sm"
              className="flex-1 h-9 text-xs text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10"
              onClick={onRemove} disabled={saving}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {t.remove}
            </Button>
            <Button
              variant="outline" size="sm"
              className="flex-1 h-9 text-xs"
              onClick={onReassign} disabled={saving}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              {t.reassign}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
