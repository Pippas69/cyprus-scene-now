import { useState, useEffect, useRef } from 'react';
import { isClubOrEventBusiness } from '@/lib/isClubOrEventBusiness';
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
  selectedEventId?: string | null;
  selectedEventType?: string | null;
}

// Cache for seating tiers
interface SeatingTier {
  min_people: number;
  max_people: number;
  prepaid_min_charge_cents: number;
}

// Cache for seating type names (seating_type_id -> seating_type string)

interface TicketOnlyOrder {
  id: string;
  ticket_id: string;
  guest_name: string;
  guest_age: number | null;
  buyer_phone: string | null;
  subtotal_cents: number;
  status: string;
  checked_in: boolean;
  created_at: string;
  tier_name: string;
  ticket_code: string | null;
}
export const DirectReservationsList = ({ businessId, language, refreshNonce, onReservationCountChange, selectedEventId, selectedEventType }: DirectReservationsListProps) => {
  const isMobile = useIsMobile();
  const [reservations, setReservations] = useState<DirectReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTicketLinked, setIsTicketLinked] = useState(false);
  const fetchReservationsRequestRef = useRef(0);
  // Kaliva: age data per reservation
  const [agesByReservation, setAgesByReservation] = useState<Record<string, number[]>>({});
  // Kaliva: seating tiers for min charge calculation
  const [seatingTiers, setSeatingTiers] = useState<Record<string, SeatingTier[]>>({});
  // Seating type names by seating_type_id
  const [seatingTypeNames, setSeatingTypeNames] = useState<Record<string, string>>({});
  // Kaliva: check-in counts per reservation (used tickets count)
  const [checkInCounts, setCheckInCounts] = useState<Record<string, {used: number;total: number;}>>({});
  // Editing state
  const [editingField, setEditingField] = useState<{id: string;field: string;} | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  // Ticket-only mode: store ticket orders
  const [ticketOnlyOrders, setTicketOnlyOrders] = useState<TicketOnlyOrder[]>([]);

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
      errorSaving: 'Σφάλμα αποθήκευσης'
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
      errorSaving: 'Error saving'
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
      () => fetchReservations(true)
    ).
    subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, selectedEventId, selectedEventType]);

  useEffect(() => {
    if (refreshNonce === undefined) return;
    fetchReservations(true);
  }, [refreshNonce]);

  const checkBusinessFlags = async () => {
    const { data, error } = await supabase.
    from('businesses').
    select('ticket_reservation_linked, category').
    eq('id', businessId).
    maybeSingle();

    if (error) {
      console.error('Error checking business flags:', error);
      return false;
    }

    const linked = !!data?.ticket_reservation_linked || isClubOrEventBusiness(data?.category || []);
    setIsTicketLinked(linked);
    return linked;
  };

  const fetchReservations = async (silent = false) => {
    const requestId = ++fetchReservationsRequestRef.current;
    if (!silent) setLoading(true);

    try {
      const { data: bizData, error: bizError } = await supabase.
      from('businesses').
      select('ticket_reservation_linked, category').
      eq('id', businessId).
      maybeSingle();

      if (bizError) throw bizError;

      const linked = !!bizData?.ticket_reservation_linked || isClubOrEventBusiness(bizData?.category || []);

      let query = supabase.
      from('reservations').
      select(`
          id, business_id, user_id, reservation_name, party_size, status,
          created_at, phone_number, preferred_time, seating_preference, special_requests,
          business_notes, confirmation_code, qr_code_token, checked_in_at,
          auto_created_from_tickets, ticket_credit_cents, seating_type_id,
          prepaid_min_charge_cents, event_id,
          profiles(name, email)
        `);

      if (linked) {
        // For event-linked reservations, filter by event_id (business_id may be NULL on these rows)
        query = query.not('event_id', 'is', null);
        if (selectedEventId) {
          query = query.eq('event_id', selectedEventId);
        }
        query = query.or('auto_created_from_tickets.is.null,auto_created_from_tickets.eq.false,seating_type_id.not.is.null');
      } else {
        query = query.eq('business_id', businessId).is('event_id', null);
      }

      if (linked) {
        query = query.order('reservation_name', { ascending: true });
      } else {
        query = query.order('preferred_time', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      if (requestId !== fetchReservationsRequestRef.current) return;

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

      if (requestId !== fetchReservationsRequestRef.current) return;

      if (linked) {
        setReservations(enrichedData);

        // For ticket-only events, fetch ticket orders instead
        if (selectedEventType === 'ticket' && selectedEventId) {
          fetchTicketOnlyOrders(selectedEventId);
        } else {
          setTicketOnlyOrders([]);
        }

        // Fetch ages for Kaliva
        fetchAgesForReservations(reservationIds);
        // Fetch check-in counts (used tickets per reservation)
        fetchCheckInCounts(reservationIds);
        // Fetch seating tiers
        const seatingTypeIds = [...new Set(enrichedData.map((r) => r.seating_type_id).filter(Boolean))] as string[];
        if (seatingTypeIds.length > 0) {
          fetchSeatingTiers(seatingTypeIds);
          fetchSeatingTypeNames(seatingTypeIds);
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
      if (requestId === fetchReservationsRequestRef.current) {
        setLoading(false);
      }
    }
  };

  const fetchAgesForReservations = async (reservationIds: string[]) => {
    if (reservationIds.length === 0) return;
    // Get ticket orders linked to these reservations
    const { data: orders } = await supabase.
    from('ticket_orders').
    select('id, linked_reservation_id').
    in('linked_reservation_id', reservationIds);

    if (!orders || orders.length === 0) return;

    const orderIds = orders.map((o) => o.id);
    const orderToReservation: Record<string, string> = {};
    orders.forEach((o) => {
      if (o.linked_reservation_id) orderToReservation[o.id] = o.linked_reservation_id;
    });

    // Get tickets with ages
    const { data: tickets } = await supabase.
    from('tickets').
    select('order_id, guest_age').
    in('order_id', orderIds).
    not('guest_age', 'is', null);

    if (!tickets) return;

    const agesMap: Record<string, number[]> = {};
    tickets.forEach((ticket) => {
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
      const { data } = await supabase.
      from('seating_type_tiers').
      select('min_people, max_people, prepaid_min_charge_cents').
      eq('seating_type_id', stId).
      order('min_people', { ascending: true });
      if (data) tiersMap[stId] = data;
    }
    setSeatingTiers(tiersMap);
  };

  const fetchSeatingTypeNames = async (seatingTypeIds: string[]) => {
    const { data } = await supabase.
    from('reservation_seating_types').
    select('id, seating_type').
    in('id', seatingTypeIds);
    if (data) {
      const namesMap: Record<string, string> = {};
      data.forEach((st) => {namesMap[st.id] = st.seating_type;});
      setSeatingTypeNames(namesMap);
    }
  };

  const fetchCheckInCounts = async (reservationIds: string[]) => {
    if (reservationIds.length === 0) return;
    // Get ticket orders linked to these reservations
    const { data: orders } = await supabase.
    from('ticket_orders').
    select('id, linked_reservation_id').
    in('linked_reservation_id', reservationIds);

    if (!orders || orders.length === 0) return;

    const orderIds = orders.map((o) => o.id);
    const orderToReservation: Record<string, string> = {};
    orders.forEach((o) => {
      if (o.linked_reservation_id) orderToReservation[o.id] = o.linked_reservation_id;
    });

    // Get all tickets for these orders
    const { data: tickets } = await supabase.
    from('tickets').
    select('order_id, status').
    in('order_id', orderIds);

    if (!tickets) return;

    const countsMap: Record<string, {used: number;total: number;}> = {};
    tickets.forEach((ticket) => {
      const resId = orderToReservation[ticket.order_id];
      if (resId) {
        if (!countsMap[resId]) countsMap[resId] = { used: 0, total: 0 };
        countsMap[resId].total++;
        if (ticket.status === 'used') {
          countsMap[resId].used++;
        }
      }
    });

    setCheckInCounts(countsMap);
  };

  const fetchTicketOnlyOrders = async (eventId: string) => {
    try {
      // Fetch individual tickets directly — one row per guest
      const { data: tickets } = await supabase
        .from('tickets')
        .select('id, guest_name, guest_age, status, checked_in_at, tier_id, order_id, ticket_code, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (!tickets || tickets.length === 0) {
        setTicketOnlyOrders([]);
        return;
      }

      // Get order info for phone numbers and prices
      const orderIds = [...new Set(tickets.map(t => t.order_id))];
      const { data: orders } = await supabase
        .from('ticket_orders')
        .select('id, customer_phone, subtotal_cents, status')
        .in('id', orderIds)
        .eq('status', 'completed');

      const completedOrderIds = new Set((orders || []).map(o => o.id));
      const orderMap: Record<string, { phone: string | null; subtotal: number; ticketCount: number }> = {};
      (orders || []).forEach(o => {
        orderMap[o.id] = { phone: o.customer_phone, subtotal: o.subtotal_cents || 0, ticketCount: 0 };
      });

      // Count tickets per order for per-ticket price calculation
      const completedTickets = tickets.filter(t => completedOrderIds.has(t.order_id));
      completedTickets.forEach(t => {
        if (orderMap[t.order_id]) orderMap[t.order_id].ticketCount++;
      });

      // Get tier names
      const tierIds = [...new Set(completedTickets.map(t => t.tier_id).filter(Boolean))];
      const tierNames: Record<string, string> = {};
      if (tierIds.length > 0) {
        const { data: tiers } = await supabase
          .from('ticket_tiers')
          .select('id, name')
          .in('id', tierIds);
        (tiers || []).forEach(t => { tierNames[t.id] = t.name; });
      }

      const enrichedOrders: TicketOnlyOrder[] = completedTickets.map(t => {
        const order = orderMap[t.order_id];
        const perTicketPrice = order && order.ticketCount > 0
          ? Math.round(order.subtotal / order.ticketCount)
          : 0;
        return {
          id: t.order_id,
          ticket_id: t.id,
          guest_name: t.guest_name || '-',
          guest_age: t.guest_age,
          buyer_phone: order?.phone || null,
          subtotal_cents: perTicketPrice,
          status: 'completed',
          checked_in: t.status === 'used' || !!t.checked_in_at,
          created_at: t.created_at,
          tier_name: tierNames[t.tier_id] || '',
          ticket_code: t.ticket_code || null,
        };
      });

      setTicketOnlyOrders(enrichedOrders);
    } catch (error) {
      console.error('Error fetching ticket-only orders:', error);
      setTicketOnlyOrders([]);
    }
  };

  const getMinChargeForPartySize = (seatingTypeId: string | null | undefined, partySize: number): number | null => {
    if (!seatingTypeId || !seatingTiers[seatingTypeId] || seatingTiers[seatingTypeId].length === 0) return null;
    const tiers = seatingTiers[seatingTypeId];
    const exactTier = tiers.find((t) => partySize >= t.min_people && partySize <= t.max_people);
    if (exactTier) return exactTier.prepaid_min_charge_cents;

    // Fallback to closest lower tier, otherwise the first configured tier
    const fallbackTier = [...tiers].reverse().find((t) => partySize >= t.min_people) ?? tiers[0];
    return fallbackTier?.prepaid_min_charge_cents ?? null;
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
      } else if (field === 'ticket_credit_cents') {
        const cents = Math.round(parseFloat(editValue) * 100);
        if (isNaN(cents) || cents < 0) return;
        updateData.ticket_credit_cents = cents;
      } else if (field === 'preferred_time') {
        // editValue is "YYYY-MM-DDTHH:mm" from datetime-local input
        if (!editValue) return;
        updateData.preferred_time = new Date(editValue).toISOString();
      }

      const { error } = await supabase.
      from('reservations').
      update(updateData).
      eq('id', id);

      if (error) throw error;

      // Update local state
      setReservations((prev) => prev.map((r) => r.id === id ? { ...r, ...updateData } : r));
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

  const isTicketOnlyMode = selectedEventType === 'ticket';
  const effectiveTotal = isTicketOnlyMode ? ticketOnlyOrders.length : reservations.length;

  const stats = {
    total: effectiveTotal,
    today: isTicketOnlyMode
      ? ticketOnlyOrders.filter((o) => isSameDay(o.created_at)).length
      : reservations.filter((r) => isSameDay(r.created_at) && r.status !== 'cancelled').length,
    checkedIn: isTicketOnlyMode
      ? ticketOnlyOrders.filter((o) => o.tickets_used > 0).length
      : reservations.filter((r) => Boolean(r.checked_in_at)).length
  };

  // Report count to parent for Kaliva header
  useEffect(() => {
    if (onReservationCountChange) {
      onReservationCountChange(stats.total);
    }
  }, [stats.total, onReservationCountChange]);

  const getStatusBadge = (reservation: DirectReservation) => {
    if (reservation.checked_in_at) {
      // For clubs/events with ticket-linked flow, show check-in count
      if (isTicketLinked) {
        const counts = checkInCounts[reservation.id];
        if (counts && counts.total > 0) {
          if (counts.total === 1) {
            return (
              <Badge className="bg-green-600 text-white whitespace-nowrap">
                {counts.used > 0 ? 'check in' : (language === 'el' ? 'Επιβεβαιωμένη' : 'Confirmed')}
              </Badge>);
          }
          return (
            <Badge className="bg-green-600 text-white whitespace-nowrap">
              {counts.used}/{counts.total} check in{counts.used !== 1 ? 's' : ''}
            </Badge>);
        }
      }
      return <Badge className="bg-green-600 text-white whitespace-nowrap">{t.checkedIn}</Badge>;
    }
    // For clubs/events: show partial check-in count even before checked_in_at is set
    if (isTicketLinked) {
      const counts = checkInCounts[reservation.id];
      if (counts && counts.used > 0) {
        if (counts.total === 1) {
          return (
            <Badge className="bg-green-600 text-white whitespace-nowrap">check in</Badge>);
        }
        return (
          <Badge className="bg-green-600 text-white whitespace-nowrap">
            {counts.used}/{counts.total} check in{counts.used !== 1 ? 's' : ''}
          </Badge>);
      }
      // If no check-ins yet but has ticket counts, show confirmed
      if (counts && counts.total > 0) {
        return <Badge variant="default">{language === 'el' ? 'Επιβεβαιωμένη' : 'Confirmed'}</Badge>;
      }
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
          {reservation.ticket_credit_cents && reservation.ticket_credit_cents > 0 &&
          <span className="text-[10px] text-muted-foreground">
              {language === 'el' ? 'Πίστωση' : 'Credit'}: €{(reservation.ticket_credit_cents / 100).toFixed(2)}
            </span>
          }
        </div>);

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
  const EditableCell = ({ reservationId, field, displayValue, rawValue, inputType }: {reservationId: string;field: string;displayValue: string;rawValue: string;inputType?: string;}) => {
    const isEditing = editingField?.id === reservationId && editingField?.field === field;

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input
            type={inputType || 'text'}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className={`h-7 text-sm ${inputType === 'datetime-local' ? 'w-44' : 'w-20'}`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }} />
          
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={saveEdit}>
            <Check className="h-3 w-3 text-green-600" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={cancelEdit}>
            <X className="h-3 w-3 text-red-500" />
          </Button>
        </div>);

    }

    return (
      <span
        className="cursor-pointer rounded px-1 py-0.5 transition-colors inline-flex items-center gap-1 whitespace-nowrap -ml-2 group/edit"
        onClick={() => startEdit(reservationId, field, rawValue)}>
        
        {displayValue}
        <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover/edit:opacity-100 transition-opacity" />
      </span>);

  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>);
  }

  // ===================== KALIVA MODE =====================
  if (isTicketLinked) {
    const isTicketOnly = selectedEventType === 'ticket';
    const isReservationOnly = selectedEventType === 'reservation';
    const priceColumnLabel = isTicketOnly
      ? (language === 'el' ? 'Τιμή' : 'Price')
      : 'Minimum Charge';

    // TICKET-ONLY: show ticket orders with same layout as hybrid
    if (isTicketOnly && ticketOnlyOrders.length > 0) {
      return (
        <div className="space-y-4 w-full max-w-full">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t.name}</TableHead>
                  <TableHead className="text-xs">{t.details}</TableHead>
                  <TableHead className="text-xs">{priceColumnLabel}</TableHead>
                  <TableHead className="text-xs">{t.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ticketOnlyOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-transparent">
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-0.5">
                        <span>{order.buyer_name}</span>
                        {order.buyer_phone && (
                          <span className="text-sm text-muted-foreground">{order.buyer_phone}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm whitespace-nowrap">
                          {order.ticket_count} {order.ticket_count === 1 ? (language === 'el' ? 'εισιτήριο' : 'ticket') : (language === 'el' ? 'εισιτήρια' : 'tickets')}
                        </span>
                        <span className="text-sm font-thin text-muted-foreground">{order.min_age}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium">
                          {order.subtotal_cents > 0 ? `€${(order.subtotal_cents / 100).toFixed(2)}` : (language === 'el' ? 'Δωρεάν' : 'Free')}
                        </span>
                        {order.tier_name && (
                          <span className="font-sans text-center my-0 px-0 font-normal text-muted-foreground text-sm">
                            {order.tier_name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.tickets_total === 1 ? (
                        // Single ticket: just "check in" or "Επιβεβαιωμένη"
                        order.tickets_used > 0 ? (
                          <Badge className="bg-green-600 text-white whitespace-nowrap">check in</Badge>
                        ) : (
                          <Badge variant="default">{language === 'el' ? 'Επιβεβαιωμένη' : 'Confirmed'}</Badge>
                        )
                      ) : (
                        // Multiple tickets: show "X/Y check ins" or "Επιβεβαιωμένη"
                        order.tickets_used > 0 ? (
                          <Badge className="bg-green-600 text-white whitespace-nowrap">
                            {order.tickets_used}/{order.tickets_total} check in{order.tickets_used !== 1 ? 's' : ''}
                          </Badge>
                        ) : (
                          <Badge variant="default">{language === 'el' ? 'Επιβεβαιωμένη' : 'Confirmed'}</Badge>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      );
    }

    // TICKET-ONLY but no orders yet
    if (isTicketOnly && ticketOnlyOrders.length === 0) {
      return (
        <div className="space-y-4 w-full max-w-full">
          <Card>
            <CardContent className="py-10 text-center">
              <Ticket className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{language === 'el' ? 'Δεν υπάρχουν αγορές εισιτηρίων ακόμα' : 'No ticket purchases yet'}</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    // RESERVATION-ONLY or TICKET_AND_RESERVATION (hybrid) — existing flow
    return (
      <div className="space-y-4 w-full max-w-full">
        {filteredReservations.length === 0 ?
        <Card>
            <CardContent className="py-10 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t.noReservations}</p>
            </CardContent>
          </Card> :

        <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t.name}</TableHead>
                  <TableHead className="text-xs">{t.details}</TableHead>
                  <TableHead className="text-xs">{priceColumnLabel}</TableHead>
                  <TableHead className="text-xs">{t.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.map((reservation) => {
                const minAge = getMinAge(reservation.id);
                const tierMinCharge = getMinChargeForPartySize(reservation.seating_type_id, reservation.party_size);
                const minChargeCents = tierMinCharge ?? reservation.prepaid_min_charge_cents ?? reservation.ticket_credit_cents ?? 0;
                const ticketPaidCents = reservation.ticket_credit_cents ?? 0;
                const minChargeDisplay = minChargeCents > 0 ?
                (isReservationOnly ? `€${(minChargeCents / 100).toFixed(2)}` :
                ticketPaidCents > 0 ?
                `€${(minChargeCents / 100).toFixed(2)} (€${(ticketPaidCents / 100).toFixed(2)})` :
                `€${(minChargeCents / 100).toFixed(2)}`) :
                '-';

                return (
                  <TableRow key={reservation.id} className="group hover:bg-transparent">
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-0.5">
                          <EditableCell
                          reservationId={reservation.id}
                          field="reservation_name"
                          displayValue={reservation.reservation_name}
                          rawValue={reservation.reservation_name} />
                          {reservation.phone_number &&
                        <span className="text-sm text-muted-foreground -ml-1.5">
                              {reservation.phone_number}
                            </span>
                        }
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm whitespace-nowrap -ml-0.5">
                            <EditableCell
                            reservationId={reservation.id}
                            field="party_size"
                            displayValue={`${reservation.party_size} ${t.people}`}
                            rawValue={String(reservation.party_size)} />
                          </span>
                          <span className="text-sm ml-2 font-thin text-muted-foreground mx-[18px]">{minAge}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start">
                          <EditableCell
                          reservationId={reservation.id}
                          field="ticket_credit_cents"
                          displayValue={minChargeDisplay}
                          rawValue={ticketPaidCents > 0 ? (ticketPaidCents / 100).toFixed(2) : '0'} />
                        
                          {reservation.seating_type_id && seatingTypeNames[reservation.seating_type_id] &&
                        <span className="font-sans text-center my-0 px-0 font-normal text-muted-foreground text-sm">
                              {(() => {
                            const raw = seatingTypeNames[reservation.seating_type_id!];
                            const lower = raw.toLowerCase();
                            if (lower === 'table') return 'Τραπέζι';
                            if (lower === 'sofa') return 'Καναπές';
                            if (lower === 'vip') return 'VIP';
                            if (lower === 'bar') return 'Bar';
                            return raw;
                          })()}
                            </span>
                        }
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(reservation)}
                      </TableCell>
                    </TableRow>);

              })}
              </TableBody>
            </Table>
          </Card>
        }
      </div>);

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

      <div className="rounded-md border w-full overflow-x-auto">
          <Table className="w-full min-w-[600px] table-fixed text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4">{t.name}</TableHead>
                <TableHead className="w-1/4">{t.dateTime}</TableHead>
                <TableHead className="w-1/4">{t.details}</TableHead>
                <TableHead className="w-1/4">{t.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReservations.map((reservation) => {
                const typeLabel = reservation.offer_purchase
                  ? (language === 'el' ? 'Προσφορά' : 'Offer')
                  : (language === 'el' ? 'Προφίλ' : 'Profile');

                return (
                <TableRow key={reservation.id} className="hover:bg-transparent">
                  <TableCell className="min-w-0 align-top">
                    <div className="min-w-0">
                      <EditableCell
                        reservationId={reservation.id}
                        field="reservation_name"
                        displayValue={reservation.reservation_name}
                        rawValue={reservation.reservation_name}
                      />
                      {reservation.phone_number &&
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5 min-w-0">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span className="whitespace-nowrap">{reservation.phone_number}</span>
                        </div>
                      }
                    </div>
                  </TableCell>

                  <TableCell className="align-top pl-2">
                    {reservation.preferred_time &&
                      <div className="flex items-center gap-2 min-w-0 -ml-2">
                        <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <EditableCell
                          reservationId={reservation.id}
                          field="preferred_time"
                          displayValue={format(new Date(reservation.preferred_time), 'dd MMM, HH:mm', { locale: language === 'el' ? el : enUS })}
                          rawValue={format(new Date(reservation.preferred_time), "yyyy-MM-dd'T'HH:mm")}
                          inputType="datetime-local"
                        />
                      </div>
                    }
                  </TableCell>

                  <TableCell className="align-top">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <EditableCell
                          reservationId={reservation.id}
                          field="party_size"
                          displayValue={`${reservation.party_size} ${t.people}`}
                          rawValue={String(reservation.party_size)}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground ml-4">{typeLabel}</span>
                    </div>
                  </TableCell>

                  <TableCell className="align-top">{getStatusBadge(reservation)}</TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
      }
    </div>);
};