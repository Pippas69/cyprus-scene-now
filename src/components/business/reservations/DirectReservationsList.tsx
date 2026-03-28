import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { isClubOrEventBusiness } from '@/lib/isClubOrEventBusiness';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users, Phone, Calendar, Building2,
  Tag, Clock, Loader2, QrCode, Ticket, Edit2, Check, X, CreditCard, MapPin, MessageSquare, StickyNote, Pencil, Save, Plus } from
'lucide-react';
import { ManualEntryDialog } from './ManualEntryDialog';
import { ManualStatusToggle } from './ManualStatusToggle';
import { format, isAfter, addMinutes } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FloorPlanAssignmentDialog } from '@/components/business/floorplan/FloorPlanAssignmentDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';

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
  staff_memo: string | null;
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
  is_manual_entry?: boolean;
  manual_status?: string | null;
  min_age?: number | null;
}

interface DirectReservationsListProps {
  businessId: string;
  language: 'el' | 'en';
  refreshNonce?: number;
  onReservationCountChange?: (count: number) => void;
  selectedEventId?: string | null;
  selectedEventType?: string | null;
  forceEventMode?: boolean;
  manualEntryOpen?: boolean;
  onManualEntryOpenChange?: (open: boolean) => void;
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
  staff_memo: string | null;
}
export const DirectReservationsList = ({ businessId, language, refreshNonce, onReservationCountChange, selectedEventId, selectedEventType, forceEventMode, manualEntryOpen: externalManualEntryOpen, onManualEntryOpenChange }: DirectReservationsListProps) => {
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
  const [editingMemo, setEditingMemo] = useState<string | null>(null);
  const [memoValue, setMemoValue] = useState('');
  // Ticket memo editing (for ticket-only mode)
  const [editingTicketMemo, setEditingTicketMemo] = useState<string | null>(null);
  const [ticketMemoValue, setTicketMemoValue] = useState('');
  // Ticket name editing (for ticket-only mode)
  const [editingTicketName, setEditingTicketName] = useState<string | null>(null);
  const [ticketNameValue, setTicketNameValue] = useState('');
  // Ticket-only mode: store ticket orders
  const [ticketOnlyOrders, setTicketOnlyOrders] = useState<TicketOnlyOrder[]>([]);
  // Floor plan assignment dialog
  const [floorPlanAssignment, setFloorPlanAssignment] = useState<{
    reservationId: string;
    reservationName: string;
    partySize: number;
    eventId?: string | null;
  } | null>(null);
  const [hasFloorPlan, setHasFloorPlan] = useState(false);
  const [internalManualEntryOpen, setInternalManualEntryOpen] = useState(false);
  const manualEntryOpen = externalManualEntryOpen ?? internalManualEntryOpen;
  const setManualEntryOpen = onManualEntryOpenChange ?? setInternalManualEntryOpen;
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
      minCharge: 'Ελάχιστη Χρέωση',
      saved: 'Αποθηκεύτηκε!',
      errorSaving: 'Σφάλμα αποθήκευσης',
      staffMemo: 'Σημειώσεις',
      staffMemoPlaceholder: 'Σημείωση για το team...',
      customerNote: 'Σχόλιο πελάτη',
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
      staffMemo: 'Notes',
      staffMemoPlaceholder: 'Note for the team...',
      customerNote: 'Customer note',
    }
  };

  const t = text[language];

  const nameCollator = useMemo(
    () => new Intl.Collator(language === 'el' ? 'el' : 'en', { sensitivity: 'base', numeric: true }),
    [language]
  );

  const sortReservationsByName = useCallback(
    (items: DirectReservation[]) =>
      [...items].sort((a, b) => nameCollator.compare(a.reservation_name || '', b.reservation_name || '')),
    [nameCollator]
  );

  const sortTicketOrdersByName = useCallback(
    (items: TicketOnlyOrder[]) =>
      [...items].sort((a, b) => nameCollator.compare(a.guest_name || '', b.guest_name || '')),
    [nameCollator]
  );

  useEffect(() => {
    checkBusinessFlags().then(() => fetchReservations());
    // Check if business has floor plan enabled AND has zones
    supabase.from('businesses').select('floor_plan_enabled').eq('id', businessId).single().then(async ({ data }) => {
      if (!data?.floor_plan_enabled) { setHasFloorPlan(false); return; }
      const { count } = await supabase.from('floor_plan_zones').select('id', { count: 'exact', head: true }).eq('business_id', businessId);
      setHasFloorPlan((count || 0) > 0);
    });
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
  }, [businessId, selectedEventId, selectedEventType, forceEventMode]);

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

    const linked = !!data?.ticket_reservation_linked || isClubOrEventBusiness(data?.category || []) || !!forceEventMode;
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

      const linked = !!bizData?.ticket_reservation_linked || isClubOrEventBusiness(bizData?.category || []) || !!forceEventMode;

      let query = supabase.
      from('reservations').
      select(`
          id, business_id, user_id, reservation_name, party_size, status,
          created_at, phone_number, preferred_time, seating_preference, special_requests,
          business_notes, staff_memo, confirmation_code, qr_code_token, checked_in_at,
          auto_created_from_tickets, ticket_credit_cents, actual_spend_cents, seating_type_id,
          prepaid_min_charge_cents, event_id, is_manual_entry, manual_status, min_age,
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

      query = query.order('reservation_name', { ascending: true });

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
      const sortedByName = sortReservationsByName(enrichedData);

      if (requestId !== fetchReservationsRequestRef.current) return;

      if (linked) {
        setReservations(sortedByName);

        const isTicketOnlyMode = selectedEventType === 'ticket' && !!selectedEventId;

        // For ticket-only events, fetch ticket orders and wait before removing loader
        if (isTicketOnlyMode && selectedEventId) {
          setTicketOnlyOrders([]);
          await fetchTicketOnlyOrders(selectedEventId, requestId);
        } else {
          setTicketOnlyOrders([]);
        }

        // Fetch enrichment data only for reservation/hybrid flows
        if (!isTicketOnlyMode) {
          fetchAgesForReservations(reservationIds);
          fetchCheckInCounts(reservationIds);
          const seatingTypeIds = [...new Set(sortedByName.map((r) => r.seating_type_id).filter(Boolean))] as string[];
          if (seatingTypeIds.length > 0) {
            fetchSeatingTiers(seatingTypeIds);
            fetchSeatingTypeNames(seatingTypeIds);
          }
        }
      } else {
        setReservations(sortedByName);
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

  const fetchTicketOnlyOrders = async (eventId: string, requestId?: number) => {
    const isStaleRequest = () => requestId !== undefined && requestId !== fetchReservationsRequestRef.current;

    try {
      // Fetch individual tickets directly — one row per guest
      const { data: tickets } = await supabase
        .from('tickets')
        .select('id, guest_name, guest_age, status, checked_in_at, tier_id, order_id, ticket_code, created_at, staff_memo')
        .eq('event_id', eventId)
        .order('guest_name', { ascending: true });

      if (isStaleRequest()) return;

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

      if (isStaleRequest()) return;

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

        if (isStaleRequest()) return;

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
          staff_memo: (t as any).staff_memo || null,
        };
      });

      if (isStaleRequest()) return;
      setTicketOnlyOrders(sortTicketOrdersByName(enrichedOrders));
    } catch (error) {
      console.error('Error fetching ticket-only orders:', error);
      if (!isStaleRequest()) {
        setTicketOnlyOrders([]);
      }
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

  const getMinAge = (reservation: DirectReservation): string => {
    const ages = agesByReservation[reservation.id];
    if (ages && ages.length > 0) {
      const min = Math.min(...ages);
      return `${min}+`;
    }
    if (typeof reservation.min_age === 'number' && reservation.min_age > 0) {
      return String(reservation.min_age);
    }
    return '-';
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
        // Business can set real spend manually; CRM splits this per person.
        updateData.actual_spend_cents = cents;
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
      setReservations((prev) => sortReservationsByName(prev.map((r) => r.id === id ? { ...r, ...updateData } : r)));
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
      ? ticketOnlyOrders.filter((o) => o.checked_in).length
      : reservations.filter((r) => Boolean(r.checked_in_at)).length
  };

  // Report count to parent for Kaliva header
  useEffect(() => {
    if (onReservationCountChange && !loading) {
      onReservationCountChange(stats.total);
    }
  }, [stats.total, onReservationCountChange, loading]);

  const getStatusBadge = (reservation: DirectReservation) => {
    // Manual entries use the ManualStatusToggle
    if (reservation.is_manual_entry) {
      return (
        <ManualStatusToggle
          id={reservation.id}
          currentStatus={reservation.manual_status ?? null}
          table="reservations"
          language={language}
          onStatusChange={(newStatus) => {
            setReservations((prev) => prev.map((r) => r.id === reservation.id ? { ...r, manual_status: newStatus, checked_in_at: newStatus === 'arrived' ? new Date().toISOString() : null, status: newStatus === 'no_show' ? 'no_show' : 'accepted' } : r));
          }}
        />
      );
    }

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
        return <span className="text-sm text-foreground whitespace-nowrap">{language === 'el' ? 'Επιβεβαιωμένη' : 'Confirmed'}</span>;
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
      return <span className="text-sm text-foreground whitespace-nowrap">{t.confirmed}</span>;
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
        <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover/edit:opacity-100 transition-opacity flex-shrink-0" />
      </span>);

  };

  const handleSaveMemo = async (reservationId: string) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ staff_memo: memoValue || null, updated_at: new Date().toISOString() } as any)
        .eq('id', reservationId);
      if (error) throw error;
      toast.success(t.saved);
      setEditingMemo(null);
      setMemoValue('');
      fetchReservations(true);
    } catch (error) {
      console.error('Error saving memo:', error);
      toast.error(t.errorSaving);
    }
  };

  // Save ticket memo
  const handleSaveTicketMemo = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ staff_memo: ticketMemoValue || null } as any)
        .eq('id', ticketId);
      if (error) throw error;
      toast.success(t.saved);
      setEditingTicketMemo(null);
      setTicketMemoValue('');
      setTicketOnlyOrders(prev => prev.map(t => t.ticket_id === ticketId ? { ...t, staff_memo: ticketMemoValue || null } : t));
    } catch (error) {
      console.error('Error saving ticket memo:', error);
      toast.error(t.errorSaving);
    }
  };

  // Save ticket guest name
  const handleSaveTicketName = async (ticketId: string) => {
    try {
      const trimmed = ticketNameValue.trim();
      if (!trimmed) return;
      const { error } = await supabase
        .from('tickets')
        .update({ guest_name: trimmed } as any)
        .eq('id', ticketId);
      if (error) throw error;
      toast.success(t.saved);
      setEditingTicketName(null);
      setTicketNameValue('');
      setTicketOnlyOrders(prev => sortTicketOrdersByName(prev.map(t => t.ticket_id === ticketId ? { ...t, guest_name: trimmed } : t)));
    } catch (error) {
      console.error('Error saving ticket name:', error);
      toast.error(t.errorSaving);
    }
  };

  // Render ticket memo cell
  const renderTicketMemoCell = (ticket: TicketOnlyOrder) => {
    if (editingTicketMemo === ticket.ticket_id) {
      return (
        <div className="flex items-center gap-1 min-w-[140px]">
          <Input
            value={ticketMemoValue}
            onChange={(e) => setTicketMemoValue(e.target.value)}
            placeholder={t.staffMemoPlaceholder}
            className="h-7 text-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTicketMemo(ticket.ticket_id);
              if (e.key === 'Escape') { setEditingTicketMemo(null); setTicketMemoValue(''); }
            }}
          />
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleSaveTicketMemo(ticket.ticket_id)}>
            <Save className="h-3 w-3 text-primary" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditingTicketMemo(null); setTicketMemoValue(''); }}>
            <X className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
      );
    }
    return (
      <button
        className="flex items-center gap-1.5 text-left group/memo min-w-[80px] hover:bg-muted/50 rounded px-1.5 py-1 -mx-1.5 -my-1 transition-colors"
        onClick={() => {
          setEditingTicketMemo(ticket.ticket_id);
          setTicketMemoValue(ticket.staff_memo || '');
        }}
      >
        {ticket.staff_memo ? (
          <span className="text-xs text-foreground max-w-[120px] truncate">{ticket.staff_memo}</span>
        ) : (
          <>
            <StickyNote className="h-3 w-3 text-muted-foreground/40 group-hover/memo:text-primary transition-colors" />
            <span className="text-xs text-muted-foreground/40 group-hover/memo:text-muted-foreground transition-colors">—</span>
          </>
        )}
        <Pencil className="h-2.5 w-2.5 text-transparent group-hover/memo:text-muted-foreground transition-colors ml-auto" />
      </button>
    );
  };

  // Helper to render Staff Memo cell
  const renderStaffMemoCell = (reservation: DirectReservation) => {
    if (editingMemo === reservation.id) {
      return (
        <div className="flex items-center gap-1 min-w-[140px]">
          <Input
            value={memoValue}
            onChange={(e) => setMemoValue(e.target.value)}
            placeholder={t.staffMemoPlaceholder}
            className="h-7 text-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveMemo(reservation.id);
              if (e.key === 'Escape') { setEditingMemo(null); setMemoValue(''); }
            }}
          />
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleSaveMemo(reservation.id)}>
            <Save className="h-3 w-3 text-primary" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditingMemo(null); setMemoValue(''); }}>
            <X className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
      );
    }
    return (
      <button
        className="flex items-center gap-1.5 text-left group/memo min-w-[80px] hover:bg-muted/50 rounded px-1.5 py-1 -mx-1.5 -my-1 transition-colors"
        onClick={() => {
          setEditingMemo(reservation.id);
          setMemoValue((reservation as any).staff_memo || '');
        }}
      >
        {(reservation as any).staff_memo ? (
          <span className="text-xs text-foreground max-w-[120px] truncate">{(reservation as any).staff_memo}</span>
        ) : (
          <>
            <StickyNote className="h-3 w-3 text-muted-foreground/40 group-hover/memo:text-primary transition-colors" />
            <span className="text-xs text-muted-foreground/40 group-hover/memo:text-muted-foreground transition-colors">—</span>
          </>
        )}
        <Pencil className="h-2.5 w-2.5 text-transparent group-hover/memo:text-muted-foreground transition-colors ml-auto" />
      </button>
    );
  };

  // Helper to render customer note bubble next to name
  // Auto-generated special_requests patterns to exclude from customer notes
  const isAutoGenerated = (text: string) =>
    /^Created from ticket/i.test(text) || /^Offer claim:/i.test(text);

  const renderCustomerNoteBubble = (reservation: DirectReservation) => {
    if (!reservation.special_requests || isAutoGenerated(reservation.special_requests)) return null;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center hover:bg-emerald-200 dark:hover:bg-emerald-800/60 transition-colors" title={t.customerNote}>
            <MessageSquare className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" side="right">
          <div className="p-2.5 border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {t.customerNote}
            </div>
          </div>
          <div className="p-2.5">
            <p className="text-sm leading-relaxed">{reservation.special_requests}</p>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>);
  }

  // Determine entry type for manual add dialog
  const getEntryType = (): 'direct' | 'ticket' | 'reservation' | 'hybrid' => {
    if (!isTicketLinked) return 'direct';
    if (selectedEventType === 'ticket') return 'ticket';
    if (selectedEventType === 'reservation') return 'reservation';
    return 'hybrid';
  };



  // ===================== KALIVA MODE =====================
  if (isTicketLinked) {
    const isTicketOnly = selectedEventType === 'ticket';
    const isReservationOnly = selectedEventType === 'reservation';
    const priceColumnLabel = isTicketOnly
      ? (language === 'el' ? 'Τιμή' : 'Price')
      : (language === 'el' ? 'Ελάχιστη Χρέωση' : 'Minimum Charge');

    // TICKET-ONLY: show ticket orders with same layout as hybrid
    if (isTicketOnly && ticketOnlyOrders.length > 0) {
      return (
        <div className="space-y-4 w-full max-w-full">
          <div className="rounded-md border w-full overflow-x-auto">
            <Table className="w-full min-w-[700px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-[22%]">{t.name}</TableHead>
                  <TableHead className="text-xs w-[16%]">{t.details}</TableHead>
                  <TableHead className="text-xs w-[22%]">{priceColumnLabel}</TableHead>
                  <TableHead className="text-xs w-[18%]">{t.status}</TableHead>
                  <TableHead className="text-xs w-[22%]">{t.staffMemo}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ticketOnlyOrders.map((ticket) => (
                  <TableRow key={ticket.ticket_id} className="hover:bg-transparent">
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-0.5">
                        {editingTicketName === ticket.ticket_id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={ticketNameValue}
                              onChange={(e) => setTicketNameValue(e.target.value)}
                              className="h-7 text-sm w-28"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveTicketName(ticket.ticket_id);
                                if (e.key === 'Escape') { setEditingTicketName(null); setTicketNameValue(''); }
                              }}
                            />
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleSaveTicketName(ticket.ticket_id)}>
                              <Check className="h-3 w-3 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditingTicketName(null); setTicketNameValue(''); }}>
                              <X className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        ) : (
                          <span
                            className="cursor-pointer rounded px-1 py-0.5 transition-colors inline-flex items-center gap-1 whitespace-nowrap -ml-1 group/edit"
                            onClick={() => { setEditingTicketName(ticket.ticket_id); setTicketNameValue(ticket.guest_name); }}
                          >
                            {ticket.guest_name}
                            <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover/edit:opacity-100 transition-opacity flex-shrink-0" />
                          </span>
                        )}
                        {ticket.buyer_phone && (
                          <span className="text-sm text-muted-foreground">{ticket.buyer_phone}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {ticket.guest_age ? (
                          <span className="text-sm text-muted-foreground">{ticket.guest_age}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium">
                          {ticket.subtotal_cents > 0 ? `€${(ticket.subtotal_cents / 100).toFixed(2)}` : (language === 'el' ? 'Δωρεάν' : 'Free')}
                        </span>
                        {ticket.tier_name && (
                          <span className="font-sans text-center my-0 px-0 font-normal text-muted-foreground text-sm">
                            {ticket.tier_name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {ticket.checked_in ? (
                        <Badge className="bg-green-600 text-white whitespace-nowrap">check in</Badge>
                      ) : (
                        <span className="text-sm text-foreground whitespace-nowrap">{language === 'el' ? 'Επιβεβαιωμένη' : 'Confirmed'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {renderTicketMemoCell(ticket)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ManualEntryDialog
            open={manualEntryOpen}
            onOpenChange={setManualEntryOpen}
            businessId={businessId}
            language={language}
            entryType={getEntryType()}
            eventId={selectedEventId}
            onSuccess={() => fetchReservations(true)}
          />
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
          <ManualEntryDialog
            open={manualEntryOpen}
            onOpenChange={setManualEntryOpen}
            businessId={businessId}
            language={language}
            entryType={getEntryType()}
            eventId={selectedEventId}
            onSuccess={() => fetchReservations(true)}
          />
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

        <div className="rounded-md border w-full overflow-x-auto">
            <Table className="w-full min-w-[750px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-[22%]">{t.name}</TableHead>
                  <TableHead className="text-xs w-[18%]">{t.details}</TableHead>
                  <TableHead className="text-xs w-[22%]">{priceColumnLabel}</TableHead>
                  <TableHead className="text-xs w-[16%]">{t.status}</TableHead>
                  <TableHead className="text-xs w-[22%]">{t.staffMemo}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.map((reservation) => {
                const minAge = getMinAge(reservation);
                const tierMinCharge = getMinChargeForPartySize(reservation.seating_type_id, reservation.party_size);
                const minChargeCents = reservation.is_manual_entry && reservation.prepaid_min_charge_cents != null
                  ? reservation.prepaid_min_charge_cents
                  : (tierMinCharge ?? reservation.prepaid_min_charge_cents ?? reservation.ticket_credit_cents ?? 0);
                const actualSpendCents = (reservation as any).actual_spend_cents ?? 0;
                const ticketPaidCents = reservation.ticket_credit_cents ?? 0;
                const minChargeDisplay = minChargeCents > 0 ?
                (isReservationOnly ? `€${(minChargeCents / 100).toFixed(2)}` :
                ticketPaidCents > 0 ?
                `€${(minChargeCents / 100).toFixed(2)} (€${(ticketPaidCents / 100).toFixed(2)})` :
                `€${(minChargeCents / 100).toFixed(2)}`) :
                '-';
                const actualSpendDisplay = actualSpendCents > 0
                  ? `${language === 'el' ? 'Πραγματικά' : 'Actual'}: €${(actualSpendCents / 100).toFixed(2)}`
                  : (language === 'el' ? 'Πραγματικά: -' : 'Actual: -');

                return (
                  <TableRow key={reservation.id} className="group hover:bg-transparent">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          <div className="flex flex-col gap-0.5 min-w-0">
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
                          {renderCustomerNoteBubble(reservation)}
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
                        <div className="flex flex-col items-start gap-1">
                          <span>{minChargeDisplay}</span>
                          <EditableCell
                          reservationId={reservation.id}
                          field="ticket_credit_cents"
                          displayValue={actualSpendDisplay}
                          rawValue={actualSpendCents > 0 ? (actualSpendCents / 100).toFixed(2) : '0'} />
                        
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
                        <div className="flex items-center gap-1.5">
                          {getStatusBadge(reservation)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {renderStaffMemoCell(reservation)}
                      </TableCell>
                    </TableRow>);
              })}
              </TableBody>
            </Table>
          </div>
        }

        {/* Floor Plan Assignment Dialog - Kaliva mode */}
        {floorPlanAssignment && (
          <FloorPlanAssignmentDialog
            open={!!floorPlanAssignment}
            onOpenChange={(open) => { if (!open) setFloorPlanAssignment(null); }}
            businessId={businessId}
            reservationId={floorPlanAssignment.reservationId}
            reservationName={floorPlanAssignment.reservationName}
            partySize={floorPlanAssignment.partySize}
            eventId={floorPlanAssignment.eventId}
            onAssigned={() => {
              setFloorPlanAssignment(null);
              fetchReservations(true);
            }}
          />
        )}
        <ManualEntryDialog
          open={manualEntryOpen}
          onOpenChange={setManualEntryOpen}
          businessId={businessId}
          language={language}
          entryType={getEntryType()}
          eventId={selectedEventId}
          onSuccess={() => fetchReservations(true)}
        />
      </div>);

  }

  // ===================== NORMAL MODE =====================
  return (
    <div className="space-y-4 w-full max-w-full">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-full">
        {[
          { value: stats.total, label: t.total },
          { value: stats.today, label: t.today },
          { value: stats.checkedIn, label: t.checkedInCount },
        ].map((stat, i) => (
          <div key={i} className="min-w-0 rounded-xl border border-border/15 bg-card/40 backdrop-blur-sm px-2 sm:px-3 py-2 sm:py-2.5 text-center">
            <div className="text-base sm:text-lg font-bold tracking-tight text-foreground">{stat.value}</div>
            <div className="text-[8px] sm:text-[10px] font-medium text-muted-foreground/70 tracking-wide mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      

      {filteredReservations.length === 0 ?
      <Card>
          <CardContent className="py-10 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">{t.noReservations}</p>
          </CardContent>
        </Card> :

      <div className="rounded-md border w-full overflow-x-auto">
          <Table className="w-full min-w-[700px] table-fixed text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[20%]">{t.name}</TableHead>
                <TableHead className="w-[20%]">{t.dateTime}</TableHead>
                <TableHead className="w-[20%]">{t.details}</TableHead>
                <TableHead className="w-[18%]">{t.status}</TableHead>
                <TableHead className="w-[22%]">{t.staffMemo}</TableHead>
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

                  <TableCell className="align-top">
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(reservation)}
                    </div>
                  </TableCell>

                  <TableCell className="align-top">
                    {renderStaffMemoCell(reservation)}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
      }

      {/* Floor Plan Assignment Dialog */}
      {floorPlanAssignment && (
        <FloorPlanAssignmentDialog
          open={!!floorPlanAssignment}
          onOpenChange={(open) => { if (!open) setFloorPlanAssignment(null); }}
          businessId={businessId}
          reservationId={floorPlanAssignment.reservationId}
          reservationName={floorPlanAssignment.reservationName}
          partySize={floorPlanAssignment.partySize}
          eventId={floorPlanAssignment.eventId}
          onAssigned={() => {
            setFloorPlanAssignment(null);
            fetchReservations(true);
          }}
        />
      )}
      <ManualEntryDialog
        open={manualEntryOpen}
        onOpenChange={setManualEntryOpen}
        businessId={businessId}
        language={language}
        entryType={getEntryType()}
        eventId={selectedEventId}
        onSuccess={() => fetchReservations(true)}
      />
    </div>);
};