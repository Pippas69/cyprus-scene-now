import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users, Phone, Calendar, Building2,
  Tag, Clock, Loader2, QrCode, Ticket, Edit2, Check, X, CreditCard } from
'lucide-react';
import { format, isAfter, addMinutes } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DirectReservation {
  id: string;
  business_id: string;
  user_id: string;
  reservation_name: string;
  party_size: number;
  status: string;
  created_at: string;
  phone_number: string | null;
  preferred_time: string | null;
  seating_preference: string | null;
  special_requests: string | null;
  business_notes: string | null;
  confirmation_code: string | null;
  qr_code_token: string | null;
  checked_in_at: string | null;
  profiles?: {name: string;email: string;};
  offer_purchase?: {id: string;discount: {title: string;};} | null;
  auto_created_from_tickets?: boolean;
  ticket_credit_cents?: number;
  seating_type_id?: string | null;
  prepaid_min_charge_cents?: number | null;
  event_id?: string | null;
}

interface DirectReservationsListProps {
  businessId: string;
  language: 'el' | 'en';
  refreshNonce?: number;
  onReservationCountChange?: (count: number) => void;
}

// Cache for seating tiers
interface SeatingTier {
  min_people: number;
  max_people: number;
  prepaid_min_charge_cents: number;
}

export const DirectReservationsList = ({ businessId, language, refreshNonce, onReservationCountChange }: DirectReservationsListProps) => {
  const isMobile = useIsMobile();
  const [reservations, setReservations] = useState<DirectReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTicketLinked, setIsTicketLinked] = useState(false);
  // Kaliva: age data per reservation
  const [agesByReservation, setAgesByReservation] = useState<Record<string, number[]>>({});
  // Kaliva: seating tiers for min charge calculation
  const [seatingTiers, setSeatingTiers] = useState<Record<string, SeatingTier[]>>({});
  // Editing state
  const [editingField, setEditingField] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const text = {
    el: {
      title: 'Κρατήσεις Προφίλ & Προσφορών',
      confirmed: 'Επιβεβαιωμένη',
      cancelled: 'Ακυρωμένη',
      checkedIn: 'Check-in',
      noShow: 'No-Show',
      name: 'Όνομα',
      contact: 'Επικοινωνία',
      details: 'Λεπτομέρειες',
      dateTime: 'Ημ/νία & Ώρα',
      type: 'Τύπος',
      status: 'Κατάσταση',
      actions: 'Ενέργειες',
      people: 'άτομα',
      noReservations: 'Δεν υπάρχουν κρατήσεις ακόμα',
      fromProfile: 'Από Προφίλ',
      fromOffer: 'Από Προσφορά',
      fromTickets: 'Μέσω Εισιτηρίων',
      confirmationCode: 'Κωδικός',
      addNotes: 'Σημειώσεις',
      indoor: 'Εσωτερικά',
      outdoor: 'Εξωτερικά',
      stats: 'Στατιστικά',
      total: 'Σύνολο',
      today: 'Σήμερα',
      checkedInCount: 'Check-ins',
      ages: 'Ηλικίες',
      minCharge: 'Min. Charge',
      saved: 'Αποθηκεύτηκε!',
      errorSaving: 'Σφάλμα αποθήκευσης',
    },
    en: {
      title: 'Profile & Offer Reservations',
      confirmed: 'Confirmed',
      cancelled: 'Cancelled',
      checkedIn: 'Checked In',
      noShow: 'No-Show',
      name: 'Name',
      contact: 'Contact',
      details: 'Details',
      dateTime: 'Date & Time',
      type: 'Type',
      status: 'Status',
      actions: 'Actions',
      people: 'people',
      noReservations: 'No reservations yet',
      fromProfile: 'From Profile',
      fromOffer: 'From Offer',
      fromTickets: 'Via Tickets',
      confirmationCode: 'Code',
      addNotes: 'Notes',
      indoor: 'Indoor',
      outdoor: 'Outdoor',
      stats: 'Statistics',
      total: 'Total',
      today: 'Today',
      checkedInCount: 'Check-ins',
      ages: 'Ages',
      minCharge: 'Min. Charge',
      saved: 'Saved!',
      errorSaving: 'Error saving',
    }
  };

  const t = text[language];

  useEffect(() => {
    checkBusinessFlags().then(() => fetchReservations());
    const channel = supabase.
    channel('direct_reservations_changes').
    on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reservations' },
      () => fetchReservations()
    ).
    subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  useEffect(() => {
    if (refreshNonce === undefined) return;
    fetchReservations();
  }, [refreshNonce]);

  const checkBusinessFlags = async () => {
    const { data } = await supabase
      .from('businesses')
      .select('ticket_reservation_linked')
      .eq('id', businessId)
      .single();
    const linked = !!data?.ticket_reservation_linked;
    setIsTicketLinked(linked);
    return linked;
  };

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const { data: bizData } = await supabase
        .from('businesses')
        .select('ticket_reservation_linked')
        .eq('id', businessId)
        .single();
      const linked = !!bizData?.ticket_reservation_linked;

      let query = supabase
        .from('reservations')
        .select(`
          id, business_id, user_id, reservation_name, party_size, status,
          created_at, phone_number, preferred_time, seating_preference, special_requests,
          business_notes, confirmation_code, qr_code_token, checked_in_at,
          auto_created_from_tickets, ticket_credit_cents, seating_type_id,
          prepaid_min_charge_cents, event_id,
          profiles(name, email)
        `)
        .eq('business_id', businessId);

      if (linked) {
        query = query.not('event_id', 'is', null);
      } else {
        query = query.is('event_id', null);
      }

      if (linked) {
        query = query.order('reservation_name', { ascending: true });
      } else {
        query = query.order('preferred_time', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      const reservationIds = data?.map((r) => r.id) || [];

      let offerLinkedIds = new Set<string>();
      if (!linked && reservationIds.length > 0) {
        const { data: offerPurchases } = await supabase.
        from('offer_purchases').
        select('reservation_id, discounts(title)').
        in('reservation_id', reservationIds).
        not('reservation_id', 'is', null);

        if (offerPurchases) {
          offerPurchases.forEach((p) => {
            if (p.reservation_id) offerLinkedIds.add(p.reservation_id);
          });
        }
      }

      const enrichedData = (data || []).map((r) => ({
        ...r,
        offer_purchase: offerLinkedIds.has(r.id) ? { id: r.id, discount: { title: 'Offer' } } : null
      })) as DirectReservation[];

      if (linked) {
        setReservations(enrichedData);
        // Fetch ages for Kaliva
        fetchAgesForReservations(reservationIds);
        // Fetch seating tiers
        const seatingTypeIds = [...new Set(enrichedData.map(r => r.seating_type_id).filter(Boolean))] as string[];
        if (seatingTypeIds.length > 0) {
          fetchSeatingTiers(seatingTypeIds);
        }
      } else {
        const isCompleted = (r: DirectReservation) => {
          if (r.checked_in_at) return true;
          if (r.status === 'cancelled') return true;
          if (r.status === 'accepted' && r.preferred_time) {
            const slotTime = new Date(r.preferred_time);
            const graceEnd = addMinutes(slotTime, 15);
            if (isAfter(new Date(), graceEnd)) return true;
          }
          return false;
        };

        const pendingReservations = enrichedData.filter((r) => !isCompleted(r));
        const completedReservations = enrichedData.filter((r) => isCompleted(r));

        const sortByTime = (a: DirectReservation, b: DirectReservation) => {
          const timeA = a.preferred_time ? new Date(a.preferred_time).getTime() : 0;
          const timeB = b.preferred_time ? new Date(b.preferred_time).getTime() : 0;
          return timeB - timeA;
        };

        pendingReservations.sort(sortByTime);
        completedReservations.sort(sortByTime);

        setReservations([...pendingReservations, ...completedReservations]);
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgesForReservations = async (reservationIds: string[]) => {
    if (reservationIds.length === 0) return;
    // Get ticket orders linked to these reservations
    const { data: orders } = await supabase
      .from('ticket_orders')
      .select('id, linked_reservation_id')
      .in('linked_reservation_id', reservationIds);

    if (!orders || orders.length === 0) return;

    const orderIds = orders.map(o => o.id);
    const orderToReservation: Record<string, string> = {};
    orders.forEach(o => {
      if (o.linked_reservation_id) orderToReservation[o.id] = o.linked_reservation_id;
    });

    // Get tickets with ages
    const { data: tickets } = await supabase
      .from('tickets')
      .select('order_id, guest_age')
      .in('order_id', orderIds)
      .not('guest_age', 'is', null);

    if (!tickets) return;

    const agesMap: Record<string, number[]> = {};
    tickets.forEach(ticket => {
      const resId = orderToReservation[ticket.order_id];
      if (resId && ticket.guest_age) {
        if (!agesMap[resId]) agesMap[resId] = [];
        agesMap[resId].push(ticket.guest_age);
      }
    });

    setAgesByReservation(agesMap);
  };

  const fetchSeatingTiers = async (seatingTypeIds: string[]) => {
    const tiersMap: Record<string, SeatingTier[]> = {};
    for (const stId of seatingTypeIds) {
      const { data } = await supabase
        .from('seating_type_tiers')
        .select('min_people, max_people, prepaid_min_charge_cents')
        .eq('seating_type_id', stId)
        .order('min_people', { ascending: true });
      if (data) tiersMap[stId] = data;
    }
    setSeatingTiers(tiersMap);
  };

  const getMinChargeForPartySize = (seatingTypeId: string | null | undefined, partySize: number): number | null => {
    if (!seatingTypeId || !seatingTiers[seatingTypeId]) return null;
    const tiers = seatingTiers[seatingTypeId];
    const tier = tiers.find(t => partySize >= t.min_people && partySize <= t.max_people);
    return tier ? tier.prepaid_min_charge_cents : null;
  };

  const getMinAge = (reservationId: string): string => {
    const ages = agesByReservation[reservationId];
    if (!ages || ages.length === 0) return '-';
    const min = Math.min(...ages);
    return `${min}+`;
  };

  // Inline editing handlers
  const startEdit = (id: string, field: string, currentValue: string) => {
    setEditingField({ id, field });
    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editingField) return;
    const { id, field } = editingField;

    try {
      let updateData: Record<string, any> = {};

      if (field === 'reservation_name') {
        updateData.reservation_name = editValue.trim();
      } else if (field === 'party_size') {
        const newSize = parseInt(editValue);
        if (isNaN(newSize) || newSize < 1) return;
        updateData.party_size = newSize;

        // Auto-recalculate min charge
        const reservation = reservations.find(r => r.id === id);
        if (reservation?.seating_type_id) {
          const newMinCharge = getMinChargeForPartySize(reservation.seating_type_id, newSize);
          if (newMinCharge !== null) {
            updateData.ticket_credit_cents = newMinCharge;
          }
        }
      } else if (field === 'ticket_credit_cents') {
        const cents = Math.round(parseFloat(editValue) * 100);
        if (isNaN(cents) || cents < 0) return;
        updateData.ticket_credit_cents = cents;
      }

      const { error } = await supabase
        .from('reservations')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setReservations(prev => prev.map(r => r.id === id ? { ...r, ...updateData } : r));
      toast.success(t.saved);
    } catch (err) {
      console.error('Error saving:', err);
      toast.error(t.errorSaving);
    } finally {
      cancelEdit();
    }
  };

  const filteredReservations = reservations;

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const isSameDay = (iso: string | null) => {
    if (!iso) return false;
    return format(new Date(iso), 'yyyy-MM-dd') === todayStr;
  };

  const stats = {
    total: reservations.length,
    today: reservations.filter((r) => isSameDay(r.created_at) && r.status !== 'cancelled').length,
    checkedIn: reservations.filter((r) => Boolean(r.checked_in_at)).length
  };

  // Report count to parent for Kaliva header
  useEffect(() => {
    if (onReservationCountChange) {
      onReservationCountChange(stats.total);
    }
  }, [stats.total, onReservationCountChange]);

  const getStatusBadge = (reservation: DirectReservation) => {
    if (reservation.checked_in_at) {
      return <Badge className="bg-green-500 text-white">{t.checkedIn}</Badge>;
    }
    if (reservation.status === 'cancelled') {
      return <Badge variant="outline" className="text-muted-foreground">{t.cancelled}</Badge>;
    }
    if (reservation.status === 'accepted' && reservation.preferred_time) {
      const slotTime = new Date(reservation.preferred_time);
      const graceEnd = addMinutes(slotTime, 15);
      if (isAfter(now, graceEnd)) {
        return <Badge variant="destructive">{t.noShow}</Badge>;
      }
    }
    if (reservation.status === 'accepted') {
      return <Badge variant="default">{t.confirmed}</Badge>;
    }
    return <Badge variant="outline">{reservation.status}</Badge>;
  };

  const getTypeBadge = (reservation: DirectReservation) => {
    if (reservation.auto_created_from_tickets) {
      return (
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
            <Ticket className="h-3 w-3 mr-1" />
            {t.fromTickets}
          </Badge>
          {reservation.ticket_credit_cents && reservation.ticket_credit_cents > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {language === 'el' ? 'Πίστωση' : 'Credit'}: €{(reservation.ticket_credit_cents / 100).toFixed(2)}
            </span>
          )}
        </div>
      );
    }
    if (reservation.offer_purchase) {
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
          <Tag className="h-3 w-3 mr-1" />
          {t.fromOffer}
        </Badge>);
    }
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
        <Building2 className="h-3 w-3 mr-1" />
        {t.fromProfile}
      </Badge>);
  };

  // Editable cell component
  const EditableCell = ({ reservationId, field, displayValue, rawValue }: { reservationId: string; field: string; displayValue: string; rawValue: string }) => {
    const isEditing = editingField?.id === reservationId && editingField?.field === field;

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-7 text-sm w-20"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
          />
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={saveEdit}>
            <Check className="h-3 w-3 text-green-600" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={cancelEdit}>
            <X className="h-3 w-3 text-red-500" />
          </Button>
        </div>
      );
    }

    return (
      <span
        className="cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors inline-flex items-center gap-1"
        onClick={() => startEdit(reservationId, field, rawValue)}
      >
        {displayValue}
        <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>);
  }

  // ===================== KALIVA MODE =====================
  if (isTicketLinked) {
    return (
      <div className="space-y-4 w-full max-w-full">
        {filteredReservations.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t.noReservations}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t.name}</TableHead>
                  <TableHead className="text-xs">{t.details}</TableHead>
                  <TableHead className="text-xs">{t.ages}</TableHead>
                  <TableHead className="text-xs">Minimum Charge</TableHead>
                  <TableHead className="text-xs">{t.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.map((reservation) => {
                  const minAge = getMinAge(reservation.id);
                  const minChargeCents = reservation.ticket_credit_cents || 0;
                  const minChargeDisplay = minChargeCents > 0 ? `€${(minChargeCents / 100).toFixed(2)}` : '-';

                  return (
                    <TableRow key={reservation.id} className="group">
                      <TableCell className="font-medium">
                        <EditableCell
                          reservationId={reservation.id}
                          field="reservation_name"
                          displayValue={reservation.reservation_name}
                          rawValue={reservation.reservation_name}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm">
                            <EditableCell
                              reservationId={reservation.id}
                              field="party_size"
                              displayValue={`${reservation.party_size} ${t.people}`}
                              rawValue={String(reservation.party_size)}
                            />
                          </span>
                          {reservation.phone_number && (
                            <span className="text-sm text-muted-foreground">
                              {reservation.phone_number}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold">{minAge}</span>
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          reservationId={reservation.id}
                          field="ticket_credit_cents"
                          displayValue={minChargeDisplay}
                          rawValue={minChargeCents > 0 ? (minChargeCents / 100).toFixed(2) : '0'}
                        />
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(reservation)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    );
  }

  // ===================== NORMAL MODE =====================
  return (
    <div className="space-y-4 w-full max-w-full">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-full">
        <Card className="min-w-0">
          <CardContent className="py-2 sm:py-3 px-2 sm:px-4">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="text-lg sm:text-2xl font-bold">{stats.total}</div>
              <div className="text-[9px] sm:text-xs text-muted-foreground whitespace-nowrap">{t.total}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardContent className="py-2 sm:py-3 px-2 sm:px-4">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="text-lg sm:text-2xl font-bold text-blue-600">{stats.today}</div>
              <div className="text-[9px] sm:text-xs text-muted-foreground whitespace-nowrap">{t.today}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardContent className="py-2 sm:py-3 px-2 sm:px-4">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.checkedIn}</div>
              <div className="text-[9px] sm:text-xs text-muted-foreground whitespace-nowrap">{t.checkedInCount}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0"></div>

      {filteredReservations.length === 0 ?
      <Card>
          <CardContent className="py-10 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">{t.noReservations}</p>
          </CardContent>
        </Card> :
      isMobile ?
      <div className="space-y-3">
          {filteredReservations.map((reservation) =>
        <Card key={reservation.id} className="min-w-0">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-3 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base truncate">{reservation.reservation_name}</CardTitle>
                      {getTypeBadge(reservation)}
                    </div>
                    {reservation.profiles?.email &&
                <p className="text-sm text-muted-foreground mt-1 truncate">{reservation.profiles.email}</p>
                }
                  </div>
                  {getStatusBadge(reservation)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{reservation.party_size} {t.people}</span>
                  </div>
                  {reservation.preferred_time &&
              <div className="flex items-center gap-2 min-w-0">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {format(new Date(reservation.preferred_time), 'MMM dd, HH:mm', { locale: language === 'el' ? el : enUS })}
                      </span>
                    </div>
              }
                  {reservation.phone_number &&
              <div className="flex items-center gap-2 min-w-0">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{reservation.phone_number}</span>
                    </div>
              }
                  {reservation.confirmation_code &&
              <div className="flex items-center gap-2 min-w-0">
                      <QrCode className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-mono truncate">{reservation.confirmation_code}</span>
                    </div>
              }
                </div>
              </CardContent>
            </Card>
        )}
        </div> : (

      /* Tablet uses mobile card layout */
      <div className="space-y-3 lg:hidden">
          {filteredReservations.map((reservation) =>
        <Card key={reservation.id} className="min-w-0">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-3 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base truncate">{reservation.reservation_name}</CardTitle>
                      {getTypeBadge(reservation)}
                    </div>
                    {reservation.profiles?.email &&
                <p className="text-sm text-muted-foreground mt-1 truncate">{reservation.profiles.email}</p>
                }
                  </div>
                  {getStatusBadge(reservation)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{reservation.party_size} {t.people}</span>
                  </div>
                  {reservation.preferred_time &&
              <div className="flex items-center gap-2 min-w-0">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {format(new Date(reservation.preferred_time), 'MMM dd, HH:mm', { locale: language === 'el' ? el : enUS })}
                      </span>
                    </div>
              }
                  {reservation.phone_number &&
              <div className="flex items-center gap-2 min-w-0">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{reservation.phone_number}</span>
                    </div>
              }
                  {reservation.confirmation_code &&
              <div className="flex items-center gap-2 min-w-0">
                      <QrCode className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-mono truncate">{reservation.confirmation_code}</span>
                    </div>
              }
                </div>
              </CardContent>
            </Card>
        )}
        </div>)
      }
      
      {/* Desktop table - only on lg+ */}
      {filteredReservations.length > 0 &&
      <div className="rounded-md border w-full max-w-full overflow-x-auto hidden lg:block">
          <Table className="w-full min-w-[980px] table-fixed text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/6">{t.name}</TableHead>
                <TableHead className="w-1/6">{t.dateTime}</TableHead>
                <TableHead className="w-1/6">{t.details}</TableHead>
                <TableHead className="w-1/6">{t.type}</TableHead>
                <TableHead className="w-1/6">{t.confirmationCode}</TableHead>
                <TableHead className="w-1/6">{t.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReservations.map((reservation) =>
            <TableRow key={reservation.id}>
                  <TableCell className="min-w-0 align-top">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{reservation.reservation_name}</div>
                      <div className="text-sm text-muted-foreground truncate">{reservation.profiles?.email}</div>
                    </div>
                  </TableCell>

                  <TableCell className="align-top">
                    {reservation.preferred_time &&
                <div className="flex items-center gap-2 min-w-0">
                        <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="whitespace-nowrap">
                          {format(new Date(reservation.preferred_time), 'dd MMM, HH:mm', { locale: language === 'el' ? el : enUS })}
                        </span>
                      </div>
                }
                  </TableCell>

                  <TableCell className="align-top">
                    <div className="flex items-center gap-2 min-w-0">
                      <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="whitespace-nowrap">{reservation.party_size} {t.people}</span>
                    </div>
                    {reservation.phone_number &&
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1 min-w-0">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span className="whitespace-nowrap">{reservation.phone_number}</span>
                      </div>
                }
                  </TableCell>

                  <TableCell className="min-w-0 align-top">{getTypeBadge(reservation)}</TableCell>

                  <TableCell className="align-top">
                    {reservation.confirmation_code &&
                <span className="font-mono text-sm bg-primary/10 px-2 py-1 rounded whitespace-nowrap inline-block">
                        {reservation.confirmation_code}
                      </span>
                }
                  </TableCell>

                  <TableCell className="align-top">{getStatusBadge(reservation)}</TableCell>
                </TableRow>
            )}
            </TableBody>
          </Table>
          </div>
      }
    </div>);
};
