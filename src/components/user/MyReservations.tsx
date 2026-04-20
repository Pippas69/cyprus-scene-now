import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, QrCode, Clock, ChevronDown, ChevronLeft, ChevronRight, CreditCard, Loader2 } from 'lucide-react';
import { el, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { toastTranslations } from '@/translations/toastTranslations';
import { useNavigate, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
'@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ReservationQRCard } from './ReservationQRCard';
import { SuccessQRCard } from '@/components/ui/SuccessQRCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { isBottleTier, formatBottleLabel } from '@/lib/bottlePricing';
import { AddGuestsDialog } from './AddGuestsDialog';
import { ReservationSuccessDialog } from './ReservationSuccessDialog';
import { Plus } from 'lucide-react';

interface MyReservationsProps {
  userId: string;
  language: 'el' | 'en';
}

interface ReservationData {
  id: string;
  event_id: string | null;
  business_id: string | null;
  user_id: string;
  reservation_name: string;
  party_size: number;
  status: string;
  created_at: string;
  checked_in_at?: string | null;
  phone_number: string | null;
  preferred_time: string | null;
  seating_preference: string | null;
  special_requests: string | null;
  business_notes: string | null;
  confirmation_code: string | null;
  qr_code_token: string | null;
  seating_type_id: string | null;
  prepaid_min_charge_cents: number | null;
  prepaid_charge_status: string | null;
  email?: string | null;
  deferred_status?: string | null;
  deferred_confirmation_deadline?: string | null;
  deferred_payment_mode?: string | null;
  events?: {
    id: string;
    title: string;
    start_at: string;
    end_at: string;
    location: string;
    event_type: string | null;
    cover_image_url: string | null;
    minimum_age?: number | null;
    businesses: {id: string;name: string;logo_url: string | null;};
  } | null;
  businesses?: {
    id: string;
    name: string;
    logo_url: string | null;
    address: string | null;
  } | null;
  isOfferBased?: boolean;
}

export const MyReservations = ({ userId, language }: MyReservationsProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const isPreviewOrigin =
  typeof window !== 'undefined' && (
  window.location.origin.includes('lovable.app') || window.location.origin.includes('localhost'));
  const initialReservationsTab = searchParams.get('subtab') === 'direct' ? 'direct' : 'event';
  const [activeReservationsTab, setActiveReservationsTab] = useState<'event' | 'direct'>(initialReservationsTab);
  const [upcomingReservations, setUpcomingReservations] = useState<ReservationData[]>([]);
  const [pastReservations, setPastReservations] = useState<ReservationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [cancelDialog, setCancelDialog] = useState<{open: boolean;reservationId: string | null;}>({
    open: false,
    reservationId: null
  });
  const [cancellationReason, setCancellationReason] = useState('');
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [selectedReservationForQR, setSelectedReservationForQR] = useState<ReservationData | null>(null);
  // Guest tickets per reservation (for reservation-only events with individual QR codes)
  const [guestTickets, setGuestTickets] = useState<Record<string, {id: string;guest_name: string;guest_age: number | null;qr_code_token: string;status: string;}[]>>({});
  const [guestQrCodes, setGuestQrCodes] = useState<Record<string, string>>({});
  // Direct reservation guests (per-guest QR codes)
  const [directGuests, setDirectGuests] = useState<Record<string, {id: string;guest_name: string;qr_code_token: string;status: string;checked_in_at: string | null;}[]>>({});
  const [directGuestQrCodes, setDirectGuestQrCodes] = useState<Record<string, string>>({});
  const [selectedDirectGuestsReservation, setSelectedDirectGuestsReservation] = useState<ReservationData | null>(null);
  const [currentDirectGuestIndex, setCurrentDirectGuestIndex] = useState(0);
  // Event reservation guest QR dialog
  const [selectedEventGuestsReservation, setSelectedEventGuestsReservation] = useState<ReservationData | null>(null);
  const [currentEventGuestIndex, setCurrentEventGuestIndex] = useState(0);
  const [ticketOrderTotals, setTicketOrderTotals] = useState<Record<string, number>>({});
  const [seatingMinCharge, setSeatingMinCharge] = useState<Record<string, number>>({});
  const [seatingBottleInfo, setSeatingBottleInfo] = useState<Record<string, { bottle_type: 'bottle' | 'premium_bottle'; bottle_count: number }>>({});
  const [confirmingDeferredId, setConfirmingDeferredId] = useState<string | null>(null);
  const [addGuestsReservation, setAddGuestsReservation] = useState<ReservationData | null>(null);
  const [addGuestsSuccessData, setAddGuestsSuccessData] = useState<{
    confirmation_code: string;
    qr_code_token: string;
    reservation_name: string;
    party_size: number;
    preferred_time: string;
    business_name: string;
    business_logo?: string | null;
    guests: { guest_name: string; qr_code_token: string }[];
  } | null>(null);
  const tt = toastTranslations[language];

  useEffect(() => {
    fetchReservations();

    const reservationsChannel = supabase
      .channel('my_reservations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations', filter: `user_id=eq.${userId}` },
        () => fetchReservations()
      )
      .subscribe();

    const ticketOrdersChannel = supabase
      .channel('my_reservation_ticket_orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ticket_orders', filter: `user_id=eq.${userId}` },
        () => {
          window.setTimeout(() => {
            fetchReservations();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reservationsChannel);
      supabase.removeChannel(ticketOrdersChannel);
    };
  }, [userId]);

  useEffect(() => {
    setActiveReservationsTab(searchParams.get('subtab') === 'direct' ? 'direct' : 'event');
  }, [searchParams]);

  const openAddGuestsSuccessFor = async (reservationId: string) => {
    try {
      const { data: res } = await supabase
        .from('reservations')
        .select('id, confirmation_code, qr_code_token, reservation_name, party_size, preferred_time, event_id, business_id')
        .eq('id', reservationId)
        .maybeSingle();
      if (!res) return;

      let businessName = '';
      let businessLogo: string | null = null;
      if (res.event_id) {
        const { data: ev } = await supabase
          .from('events')
          .select('business_id')
          .eq('id', res.event_id)
          .maybeSingle();
        const bizId = (ev as any)?.business_id;
        if (bizId) {
          const { data: biz } = await supabase
            .from('businesses')
            .select('name, logo_url')
            .eq('id', bizId)
            .maybeSingle();
          businessName = biz?.name || '';
          businessLogo = biz?.logo_url || null;
        }
      } else if (res.business_id) {
        const { data: biz } = await supabase
          .from('businesses')
          .select('name, logo_url')
          .eq('id', res.business_id)
          .maybeSingle();
        businessName = biz?.name || '';
        businessLogo = biz?.logo_url || null;
      }

      let guests: { guest_name: string; qr_code_token: string }[] = [];
      const { data: orders } = await (supabase as any)
        .from('ticket_orders')
        .select('id')
        .eq('linked_reservation_id', reservationId);
      const orderIds = (orders || []).map((o: any) => o.id);
      if (orderIds.length > 0) {
        const { data: tks } = await (supabase as any)
          .from('tickets')
          .select('guest_name, qr_code_token')
          .in('order_id', orderIds);
        guests = (tks || [])
          .filter((t: any) => t.qr_code_token)
          .map((t: any) => ({ guest_name: t.guest_name || '', qr_code_token: t.qr_code_token }));
      }
      if (guests.length === 0) {
        const { data: dg } = await supabase
          .from('reservation_guests')
          .select('guest_name, qr_code_token')
          .eq('reservation_id', reservationId);
        guests = (dg || [])
          .filter((g: any) => g.qr_code_token)
          .map((g: any) => ({ guest_name: g.guest_name || '', qr_code_token: g.qr_code_token }));
      }

      setAddGuestsSuccessData({
        confirmation_code: res.confirmation_code || '',
        qr_code_token: res.qr_code_token || (guests[0]?.qr_code_token ?? ''),
        reservation_name: res.reservation_name || '',
        party_size: res.party_size || guests.length,
        preferred_time: res.preferred_time || '',
        business_name: businessName,
        business_logo: businessLogo,
        guests,
      });
    } catch (e) {
      console.error('openAddGuestsSuccessFor error', e);
    }
  };

  useEffect(() => {
    const addGuests = searchParams.get('add_guests');
    const reservationId = searchParams.get('reservation_id');
    if (addGuests === 'success' && reservationId) {
      const timer = window.setTimeout(() => {
        openAddGuestsSuccessFor(reservationId);
        fetchReservations();
        const url = new URL(window.location.href);
        url.searchParams.delete('add_guests');
        url.searchParams.delete('reservation_id');
        window.history.replaceState({}, '', url.toString());
      }, 1500);
      return () => window.clearTimeout(timer);
    }
    if (addGuests === 'cancelled') {
      const url = new URL(window.location.href);
      url.searchParams.delete('add_guests');
      window.history.replaceState({}, '', url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchReservations = async () => {
    setLoading(true);
    const nowIso = new Date().toISOString();

    const reservationFields = `
      id, event_id, business_id, user_id, reservation_name, party_size, status,
      created_at, checked_in_at, phone_number, preferred_time, seating_preference, special_requests,
      business_notes, confirmation_code, qr_code_token, email,
      seating_type_id, prepaid_min_charge_cents, prepaid_charge_status,
      deferred_status, deferred_confirmation_deadline, deferred_payment_mode
    `;

    const [
      offerPurchasesResult,
      upcomingEventResResult,
      pastEventResResult,
      upcomingDirectResResult,
      pastDirectResResult,
      orphanReservationOrdersResult,
    ] = await Promise.all([
      supabase
        .from('offer_purchases')
        .select('reservation_id')
        .eq('user_id', userId)
        .not('reservation_id', 'is', null),
      supabase
        .from('reservations')
        .select(`
          ${reservationFields},
          events!inner(
            id, title, start_at, end_at, location, event_type, cover_image_url, minimum_age, pay_at_door,
            businesses(id, name, logo_url)
          )
        `)
        .eq('user_id', userId)
        .not('event_id', 'is', null)
        .neq('status', 'cancelled')
        .gte('events.end_at', nowIso),
      supabase
        .from('reservations')
        .select(`
          ${reservationFields},
          events!inner(
            id, title, start_at, end_at, location, event_type, cover_image_url, minimum_age, pay_at_door,
            businesses(id, name, logo_url)
          )
        `)
        .eq('user_id', userId)
        .not('event_id', 'is', null)
        .lt('events.end_at', nowIso)
        .limit(100),
      supabase
        .from('reservations')
        .select(`${reservationFields}, businesses(id, name, logo_url, address)`)
        .eq('user_id', userId)
        .is('event_id', null)
        .not('business_id', 'is', null)
        .neq('status', 'cancelled')
        .gte('preferred_time', nowIso),
      supabase
        .from('reservations')
        .select(`${reservationFields}, businesses(id, name, logo_url, address)`)
        .eq('user_id', userId)
        .is('event_id', null)
        .not('business_id', 'is', null)
        .lt('preferred_time', nowIso)
        .limit(100),
      // Fallback for legacy/missing linkage:
      // completed ticket orders for reservation-enabled events without linked_reservation_id.
      supabase
        .from('ticket_orders')
        .select(`
          id,
          user_id,
          event_id,
          customer_name,
          total_cents,
          created_at,
          events!inner(
            id, title, start_at, end_at, location, event_type, cover_image_url, minimum_age, pay_at_door,
            businesses(id, name, logo_url)
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'completed')
        .is('linked_reservation_id', null)
        .eq('events.accepts_reservations', true),
    ]);

    const offerPurchases = offerPurchasesResult.data || [];
    const upcomingEventRes = (upcomingEventResResult.data as unknown as ReservationData[]) || [];
    const pastEventRes = (pastEventResResult.data as unknown as ReservationData[]) || [];
    const upcomingDirectRes = (upcomingDirectResResult.data as unknown as ReservationData[]) || [];
    const pastDirectRes = (pastDirectResResult.data as unknown as ReservationData[]) || [];
    const orphanReservationOrders = (orphanReservationOrdersResult.data as any[]) || [];

    const offerReservationIds = new Set(
      offerPurchases.map((p) => p.reservation_id).filter(Boolean)
    );

    const orphanOrderIds = orphanReservationOrders.map((o) => o.id);
    const { data: orphanTickets } = orphanOrderIds.length > 0
      ? await supabase
          .from('tickets')
          .select('order_id, ticket_tiers(quantity_total)')
          .in('order_id', orphanOrderIds)
      : { data: [] as any[] };

    const orphanTicketCountByOrder: Record<string, number> = {};
    const orphanOrderHasReservationTier: Record<string, boolean> = {};
    (orphanTickets || []).forEach((ticket: any) => {
      orphanTicketCountByOrder[ticket.order_id] = (orphanTicketCountByOrder[ticket.order_id] || 0) + 1;
      const quantityTotal = ticket?.ticket_tiers?.quantity_total;
      if (quantityTotal === 999999) {
        orphanOrderHasReservationTier[ticket.order_id] = true;
      }
    });

    const existingEventReservations = [...upcomingEventRes, ...pastEventRes];
    const syntheticOrderToReservationId: Record<string, string> = {};
    const syntheticReservationTotals: Record<string, number> = {};

    const syntheticEventReservations: ReservationData[] = orphanReservationOrders
      .filter((order) => orphanOrderHasReservationTier[order.id])
      .filter((order) => {
        const duplicateWindowMs = 10 * 60 * 1000;
        return !existingEventReservations.some((reservation) => {
          if (!reservation.event_id || reservation.event_id !== order.event_id) return false;
          const reservationTs = new Date(reservation.created_at).getTime();
          const orderTs = new Date(order.created_at).getTime();
          return Math.abs(reservationTs - orderTs) <= duplicateWindowMs;
        });
      })
      .map((order) => {
        const syntheticId = `order-${order.id}`;
        syntheticOrderToReservationId[order.id] = syntheticId;
        syntheticReservationTotals[syntheticId] = order.total_cents || 0;

        return {
          id: syntheticId,
          event_id: order.event_id,
          business_id: order.events?.businesses?.id || null,
          user_id: order.user_id,
          reservation_name: order.customer_name || '-',
          party_size: orphanTicketCountByOrder[order.id] || 1,
          status: 'completed',
          created_at: order.created_at,
          checked_in_at: null,
          phone_number: null,
          preferred_time: order.events?.start_at || null,
          seating_preference: null,
          special_requests: null,
          business_notes: null,
          confirmation_code: null,
          qr_code_token: null,
          seating_type_id: null,
          prepaid_min_charge_cents: null,
          prepaid_charge_status: null,
          events: order.events
            ? {
                id: order.events.id,
                title: order.events.title,
                start_at: order.events.start_at,
                end_at: order.events.end_at,
                location: order.events.location,
                event_type: order.events.event_type,
                cover_image_url: order.events.cover_image_url || null,
                businesses: order.events.businesses,
              }
            : null,
          businesses: null,
        };
      });

    const syntheticUpcoming = syntheticEventReservations.filter(
      (r) => r.events && new Date(r.events.end_at) >= new Date(nowIso)
    );
    const syntheticPast = syntheticEventReservations.filter(
      (r) => !r.events || new Date(r.events.end_at) < new Date(nowIso)
    );

    const filterOutOffers = (reservations: ReservationData[]) =>
      reservations.filter((r) => !offerReservationIds.has(r.id));

    const allUpcoming = filterOutOffers([
      ...upcomingEventRes,
      ...upcomingDirectRes,
      ...syntheticUpcoming,
    ]).sort((a, b) => {
      const dateA = a.events?.start_at || a.preferred_time || '';
      const dateB = b.events?.start_at || b.preferred_time || '';
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    const allPast = filterOutOffers([
      ...pastEventRes,
      ...pastDirectRes,
      ...syntheticPast,
    ]).sort((a, b) => {
      const dateA = a.events?.end_at || a.preferred_time || '';
      const dateB = b.events?.end_at || b.preferred_time || '';
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    const realReservationIds = [...new Set([...allUpcoming, ...allPast].filter((r) => !r.id.startsWith('order-')).map((r) => r.id))];
    if (realReservationIds.length > 0) {
      const { data: linkedOrderEmails } = await supabase
        .from('ticket_orders')
        .select('linked_reservation_id, customer_email, created_at')
        .in('linked_reservation_id', realReservationIds)
        .not('customer_email', 'is', null)
        .order('created_at', { ascending: false });

      if (linkedOrderEmails?.length) {
        const emailByReservationId = new Map<string, string>();
        linkedOrderEmails.forEach((order) => {
          if (order.linked_reservation_id && order.customer_email && !emailByReservationId.has(order.linked_reservation_id)) {
            emailByReservationId.set(order.linked_reservation_id, order.customer_email);
          }
        });

        const mergeReservationEmail = (reservation: ReservationData): ReservationData => ({
          ...reservation,
          email: reservation.email || emailByReservationId.get(reservation.id) || reservation.email,
        });

        for (let i = 0; i < allUpcoming.length; i += 1) allUpcoming[i] = mergeReservationEmail(allUpcoming[i]);
        for (let i = 0; i < allPast.length; i += 1) allPast[i] = mergeReservationEmail(allPast[i]);
      }
    }

    // Preview-only seeding
    try {
      const hasAnyEventReservations =
        (upcomingEventRes?.length || 0) + (pastEventRes?.length || 0) > 0;
      const seedKey = `seeded_event_reservation_${userId}`;
      if (isPreviewOrigin && !hasAnyEventReservations && !localStorage.getItem(seedKey)) {
        localStorage.setItem(seedKey, '1');
        await supabase.functions.invoke('create-free-reservation-event', { body: {} });
        await fetchReservations();
        return;
      }
    } catch (e) {
      console.warn('Event reservation seeding failed', e);
    }

    setUpcomingReservations(allUpcoming);
    setPastReservations(allPast);
    setLoading(false);

    // Load secondary data (QR codes, guests, charges) in background — no spinner
    const allRes = [...allUpcoming, ...allPast];
    Promise.all([
      generateQRCodes(allRes),
      fetchGuestTickets(allRes, syntheticOrderToReservationId, syntheticReservationTotals),
      fetchDirectReservationGuests(allRes),
      fetchSeatingMinCharges(allRes),
    ]).catch(console.error);
  };

  const fetchSeatingMinCharges = async (reservations: ReservationData[]) => {
    // Get min charge & bottle info from seating_type_tiers for ANY reservation with a seating_type_id
    const resWithSeating = reservations.filter((r) => !!r.seating_type_id);
    if (resWithSeating.length === 0) return;

    const uniqueSeatingTypeIds = [...new Set(resWithSeating.map((r) => r.seating_type_id!))];
    const { data: tiers } = await supabase
      .from('seating_type_tiers')
      .select('seating_type_id, min_people, max_people, prepaid_min_charge_cents, pricing_mode, bottle_type, bottle_count')
      .in('seating_type_id', uniqueSeatingTypeIds);

    if (!tiers) return;

    const chargeMap: Record<string, number> = {};
    const bottleMap: Record<string, { bottle_type: 'bottle' | 'premium_bottle'; bottle_count: number }> = {};
    resWithSeating.forEach((r) => {
      const matchingTiers = tiers.filter((t) => t.seating_type_id === r.seating_type_id);
      const matchedTier = matchingTiers.find(
        (t) => r.party_size >= t.min_people && r.party_size <= t.max_people
      ) || matchingTiers[0];
      if (!matchedTier) return;
      if (isBottleTier(matchedTier as any)) {
        bottleMap[r.id] = {
          bottle_type: (matchedTier as any).bottle_type,
          bottle_count: (matchedTier as any).bottle_count,
        };
      }
      if (matchedTier.prepaid_min_charge_cents != null) {
        chargeMap[r.id] = matchedTier.prepaid_min_charge_cents;
      }
    });
    setSeatingMinCharge(chargeMap);
    setSeatingBottleInfo(bottleMap);
  };

  const fetchDirectReservationGuests = async (reservations: ReservationData[]) => {
    const directResIds = reservations
      .filter((r) => !r.event_id && r.business_id && (r.status === 'accepted' || r.status === 'pending'))
      .map((r) => r.id);

    if (directResIds.length === 0) return;

    const { data: guests, error } = await supabase
      .from('reservation_guests')
      .select('id, reservation_id, guest_name, qr_code_token, status, checked_in_at')
      .in('reservation_id', directResIds);

    if (error || !guests) return;

    const guestsByRes: Record<string, typeof guests> = {};
    const qrCodesToGenerate: Record<string, string> = {};

    guests.forEach((g) => {
      if (!guestsByRes[g.reservation_id]) guestsByRes[g.reservation_id] = [];
      guestsByRes[g.reservation_id].push(g);
      if (g.qr_code_token) {
        qrCodesToGenerate[g.id] = g.qr_code_token;
      }
    });

    setDirectGuests(guestsByRes);

    const codes: Record<string, string> = {};
    for (const [guestId, token] of Object.entries(qrCodesToGenerate)) {
      try {
        codes[guestId] = await QRCode.toDataURL(token, {
          width: 256,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' }
        });
      } catch (e) {
        console.error('Error generating direct guest QR code:', e);
      }
    }
    setDirectGuestQrCodes(codes);
  };

  const fetchGuestTickets = async (
    reservations: ReservationData[],
    syntheticOrderToReservationId: Record<string, string> = {},
    syntheticReservationTotals: Record<string, number> = {}
  ) => {
    const realEventResIds = reservations
      .filter((r) => !!r.events && !r.id.startsWith('order-'))
      .map((r) => r.id);

    const mergedOrderMappings: { orderId: string; reservationId: string; totalCents: number }[] = [];

    if (realEventResIds.length > 0) {
      const { data: linkedOrders } = await supabase
        .from('ticket_orders')
        .select('id, linked_reservation_id, subtotal_cents, created_at')
        .in('linked_reservation_id', realEventResIds)
        .order('created_at', { ascending: true });

      (linkedOrders || []).forEach((order) => {
        if (!order.linked_reservation_id) return;
        mergedOrderMappings.push({
          orderId: order.id,
          reservationId: order.linked_reservation_id,
          totalCents: (order as any).subtotal_cents || 0,
        });
      });
    }

    Object.entries(syntheticOrderToReservationId).forEach(([orderId, reservationId]) => {
      mergedOrderMappings.push({
        orderId,
        reservationId,
        totalCents: syntheticReservationTotals[reservationId] || 0,
      });
    });

    if (mergedOrderMappings.length === 0) return;

    const orderIds = mergedOrderMappings.map((m) => m.orderId);
    const orderToReservation: Record<string, string> = {};
    const reservationTotals: Record<string, number> = {};

    // SUM totals across ALL linked orders (initial reservation + all add-guests batches)
    mergedOrderMappings.forEach((mapping) => {
      orderToReservation[mapping.orderId] = mapping.reservationId;
      reservationTotals[mapping.reservationId] =
        (reservationTotals[mapping.reservationId] || 0) + mapping.totalCents;
    });

    setTicketOrderTotals(reservationTotals);

    // Track creation order per order so we can sort tickets old → new in the card view
    const orderCreatedAt: Record<string, string> = {};
    if (realEventResIds.length > 0) {
      mergedOrderMappings.forEach((m, idx) => {
        // index is already in created_at ASC order from the query above
        orderCreatedAt[m.orderId] = String(idx).padStart(6, '0');
      });
    }

    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, order_id, guest_name, guest_age, qr_code_token, status, created_at')
      .in('order_id', orderIds)
      .order('created_at', { ascending: true });

    if (!tickets) return;

    const ticketsByReservation: Record<string, typeof tickets> = {};
    const qrCodesToGenerate: Record<string, string> = {};

    tickets.forEach((ticket) => {
      const reservationId = orderToReservation[ticket.order_id];
      if (!reservationId) return;

      if (!ticketsByReservation[reservationId]) ticketsByReservation[reservationId] = [];
      ticketsByReservation[reservationId].push(ticket);

      if (ticket.qr_code_token) {
        qrCodesToGenerate[ticket.id] = ticket.qr_code_token;
      }
    });

    setGuestTickets(ticketsByReservation);

    const codes: Record<string, string> = {};
    for (const [ticketId, token] of Object.entries(qrCodesToGenerate)) {
      try {
        codes[ticketId] = await QRCode.toDataURL(token, {
          width: 256,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' }
        });
      } catch (e) {
        console.error('Error generating guest QR code:', e);
      }
    }

    setGuestQrCodes(codes);
  };

  const generateQRCodes = async (reservations: ReservationData[]) => {
    const codes: Record<string, string> = {};
    for (const reservation of reservations) {
      if (reservation.qr_code_token) {
        try {
          const qrDataUrl = await QRCode.toDataURL(reservation.qr_code_token, {
            width: 256,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' }
          });
          codes[reservation.id] = qrDataUrl;
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      }
    }
    setQrCodes(codes);
  };

  const handleCancelReservation = async (reservationId: string) => {
    setCancelDialog({ open: false, reservationId: null });
    setCancellationReason('');
    setUpcomingReservations((prev) => prev.filter((r) => r.id !== reservationId));
    toast.success(tt.reservationCancelled);

    try {
      const cancelReservation = supabase.
      from('reservations').
      update({ status: 'cancelled', cancellation_reason: cancellationReason || null, updated_at: new Date().toISOString() } as any).
      eq('id', reservationId).
      eq('user_id', userId);

      const cancelLinkedOffer = supabase.
      from('offer_purchases').
      update({ status: 'cancelled' }).
      eq('reservation_id', reservationId).
      neq('status', 'redeemed').
      neq('status', 'cancelled');

      const [resResult] = await Promise.all([cancelReservation, cancelLinkedOffer]);
      if (resResult.error) throw resResult.error;

      const { data: profile } = await supabase.
      from('profiles').
      select('reservation_cancellation_count').
      eq('id', userId).
      single();

      const newCount = (profile?.reservation_cancellation_count || 0) + 1;
      const updateData: any = { reservation_cancellation_count: newCount };
      if (newCount >= 3) {
        const restrictedUntil = new Date();
        restrictedUntil.setDate(restrictedUntil.getDate() + 14);
        updateData.reservation_restricted_until = restrictedUntil.toISOString();
      }
      await supabase.from('profiles').update(updateData).eq('id', userId);

      supabase.functions.invoke('send-reservation-notification', {
        body: { reservationId, type: 'cancellation' }
      }).catch(console.error);

      fetchReservations();
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      toast.error(tt.failed);
      fetchReservations();
    }
  };

  // Confirm deferred reservation
  const handleConfirmDeferred = async (reservationId: string) => {
    setConfirmingDeferredId(reservationId);
    try {
      const { data, error } = await supabase.functions.invoke('confirm-deferred-reservation', {
        body: { reservation_id: reservationId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(language === 'el' ? 'Η κράτηση επιβεβαιώθηκε!' : 'Reservation confirmed!');
      fetchReservations();
    } catch (err) {
      console.error('Error confirming deferred reservation:', err);
      toast.error(language === 'el' ? 'Σφάλμα επιβεβαίωσης' : 'Confirmation error');
    } finally {
      setConfirmingDeferredId(null);
    }
  };

  const formatDeadlineCountdown = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return language === 'el' ? 'Έληξε' : 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const text = {
    el: {
      title: 'Οι Κρατήσεις Μου',
      noReservations: 'Δεν έχετε κρατήσεις ακόμα',
      people: 'άτομα',
      cancelReservation: 'Ακύρωση',
      confirmCancel: 'Επιβεβαίωση Ακύρωσης',
      confirmCancelDescription: 'Είστε σίγουροι ότι θέλετε να ακυρώσετε αυτήν την κράτηση;',
      cancellationReasonLabel: 'Λόγος ακύρωσης (προαιρετικό)',
      cancellationReasonPlaceholder: 'Γράψτε τον λόγο ακύρωσης...',
      cancel: 'Όχι',
      confirm: 'Ναι, Ακύρωση',
      history: 'Ιστορικό Κρατήσεων',
      tableReservation: 'Κράτηση Τραπεζιού',
      confirmed: 'Επιβεβαιωμένη',
      pending: 'Εκκρεμής',
      checkedIn: 'Check-in',
      noShow: 'No-Show',
      directTab: 'Απλές Κρατήσεις',
      eventTab: 'Μέσω Εκδηλώσεων',
      noDirectReservations: 'Δεν υπάρχουν απλές κρατήσεις',
      noEventReservations: 'Δεν υπάρχουν κρατήσεις μέσω εκδηλώσεων',
      code: 'Κωδικός',
      viewQRCodes: 'Εμφάνιση QR Codes',
      minCharge: 'Ελάχιστη χρέωση',
      prepaidCredit: 'Προπληρωμένο',
      balanceAtVenue: 'Υπόλοιπο',
      tickets: 'εισιτήρια',
      contactForCancel: 'Για ακύρωση, επικοινωνήστε με την επιχείρηση'
    },
    en: {
      title: 'My Reservations',
      noReservations: 'You have no reservations yet',
      people: 'people',
      cancelReservation: 'Cancel',
      confirmCancel: 'Confirm Cancellation',
      confirmCancelDescription: 'Are you sure you want to cancel this reservation?',
      cancellationReasonLabel: 'Reason for cancellation (optional)',
      cancellationReasonPlaceholder: 'Enter your reason for cancelling...',
      cancel: 'No',
      confirm: 'Yes, Cancel',
      history: 'Reservation History',
      tableReservation: 'Table Reservation',
      confirmed: 'Confirmed',
      pending: 'Pending',
      checkedIn: 'Check-in',
      noShow: 'No-Show',
      directTab: 'Direct Reservations',
      eventTab: 'Via Events',
      noDirectReservations: 'No direct reservations',
      noEventReservations: 'No reservations via events',
      code: 'Code',
      viewQRCodes: 'Show QR Codes',
      minCharge: 'Min. charge',
      prepaidCredit: 'Prepaid',
      balanceAtVenue: 'Balance',
      tickets: 'tickets',
      contactForCancel: 'For cancellation, please contact the venue'
    }
  };

  const t = text[language];

  const getStatusBadge = (reservation: ReservationData) => {
    if (reservation.checked_in_at) {
      return <Badge className="bg-green-500 text-white text-xs h-7 px-3">{t.checkedIn}</Badge>;
    }
    if (reservation.status === 'accepted' && reservation.preferred_time) {
      const slotTime = new Date(reservation.preferred_time);
      const graceEnd = new Date(slotTime.getTime() + 15 * 60 * 1000);
      if (new Date() > graceEnd) {
        return <Badge variant="destructive" className="text-xs h-7 px-3">{t.noShow}</Badge>;
      }
      return <Badge className="bg-primary text-primary-foreground text-xs h-7 px-3">{t.confirmed}</Badge>;
    }
    if (reservation.deferred_status === 'awaiting_confirmation') {
      return <Badge className="bg-amber-500 text-white text-xs h-7 px-3">{language === 'el' ? 'Αναμονή Επιβεβ.' : 'Awaiting Confirm'}</Badge>;
    }
    if (reservation.deferred_status === 'payment_failed') {
      return <Badge variant="destructive" className="text-xs h-7 px-3">{language === 'el' ? 'Αποτυχία Πληρωμής' : 'Payment Failed'}</Badge>;
    }
    if (reservation.deferred_status === 'auto_charged') {
      return <Badge variant="destructive" className="text-xs h-7 px-3">{language === 'el' ? 'Χρεώθηκε Ακύρωση' : 'Fee Charged'}</Badge>;
    }
    if (reservation.status === 'pending') {
      return <Badge variant="secondary" className="text-xs h-7 px-3">{t.pending}</Badge>;
    }
    return <Badge className="bg-primary text-primary-foreground text-xs h-7 px-3">{t.confirmed}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const locale = language === 'el' ? 'el-GR' : 'en-GB';
    const timeZone = 'Europe/Nicosia';
    const day = new Intl.DateTimeFormat(locale, { timeZone, day: 'numeric' }).format(date);
    const month = new Intl.DateTimeFormat(locale, { timeZone, month: 'long' }).format(date);
    const time = new Intl.DateTimeFormat(locale, { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
    return language === 'el' ? `${day} ${month}, ${time}` : `${month} ${day}, ${time}`;
  };

  // ============= EVENT RESERVATION CARD (ticket-style design) =============
  const renderEventReservationCard = (reservation: ReservationData, isPast: boolean = false) => {
    const businessInfo = reservation.events?.businesses;
    const dateTime = reservation.events?.start_at;
    const location = reservation.events?.location;
    const title = reservation.events?.title;
    const coverImage = reservation.events?.cover_image_url;

    const minCharge = reservation.prepaid_min_charge_cents || seatingMinCharge[reservation.id] || 0;
    const ticketTotal = ticketOrderTotals[reservation.id] || 0;
    const isHybrid = ticketTotal > 0;
    const bottleInfo = seatingBottleInfo[reservation.id];
    const isBottle = !!bottleInfo;

    return (
      <Card key={reservation.id} className={`overflow-hidden hover:shadow-md transition-shadow ${isPast ? 'opacity-60' : ''}`}>
        {/* Cover image like MyTickets */}
        {coverImage && (
          <div className="relative w-full aspect-[3/2] overflow-hidden">
            <img
              src={coverImage}
              alt={title || ''}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardContent className="p-4 space-y-1.5">
          {/* Title */}
          <h3 className="font-semibold text-sm">{title}</h3>

          {/* Business name */}
          {businessInfo && (
            <div className="flex items-center gap-1.5">
              {businessInfo.logo_url && (
                <img src={businessInfo.logo_url} alt="" className="h-4 w-4 rounded-full object-cover shrink-0" />
              )}
              <p className="text-xs text-muted-foreground truncate">{businessInfo.name}</p>
            </div>
          )}

          {/* Date/Time + Party size — single line */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {dateTime && (
              <span className="flex items-center gap-1 shrink-0">
                <Calendar className="h-3 w-3 shrink-0" />
                {formatDateTime(dateTime)}
              </span>
            )}
            <span className="flex items-center gap-1 shrink-0">
              <Users className="h-3 w-3 shrink-0" />
              {reservation.party_size} {t.people}
            </span>
          </div>

          {/* Location — single line */}
          {location && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{location}</span>
            </a>
          )}

          {/* Payment info — each on single line */}
          {(isBottle || minCharge >= 0 || ticketTotal > 0) && (
            <div className="space-y-0.5">
              {isBottle ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>
                    {t.minCharge}: {formatBottleLabel(bottleInfo.bottle_type, bottleInfo.bottle_count, language)}
                    {' '}({language === 'el' ? 'στο κατάστημα' : 'at venue'}
                    {isHybrid && ticketTotal > 0 && (
                      <>
                        {language === 'el' ? ' — ' : ' — '}
                        €{(ticketTotal / 100).toFixed(2)}{' '}
                        {language === 'el' ? 'προπληρωμένο' : 'prepaid'}
                      </>
                    )}
                    )
                  </span>
                </div>
              ) : (
                <>
                  {minCharge >= 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CreditCard className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{t.minCharge}: €{(minCharge / 100).toFixed(2)}</span>
                    </div>
                  )}
                  {isHybrid && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CreditCard className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>
                        {t.prepaidCredit}: €{(ticketTotal / 100).toFixed(2)}
                        {(() => {
                          const balance = Math.max(0, minCharge - ticketTotal);
                          return balance > 0 ? (
                            <span> → {t.balanceAtVenue}: €{(balance / 100).toFixed(2)}</span>
                          ) : null;
                        })()}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Deferred Payment: Confirm Attendance */}
          {!isPast && reservation.deferred_status === 'awaiting_confirmation' && reservation.deferred_confirmation_deadline && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-2.5 space-y-2">
              <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                ⏰ {language === 'el' ? 'Επιβεβαίωση σε' : 'Confirm in'}: {formatDeadlineCountdown(reservation.deferred_confirmation_deadline)}
              </span>
              <Button
                size="sm"
                className="w-full h-8 text-xs"
                disabled={confirmingDeferredId === reservation.id}
                onClick={() => handleConfirmDeferred(reservation.id)}
              >
                {confirmingDeferredId === reservation.id
                  ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />{language === 'el' ? 'Επεξεργασία...' : 'Processing...'}</>
                  : (language === 'el' ? '✅ Επιβεβαίωση Παρουσίας' : '✅ Confirm Attendance')
                }
              </Button>
            </div>
          )}

          {/* Deferred Payment: Payment Failed */}
          {!isPast && reservation.deferred_status === 'payment_failed' && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-2.5 space-y-2">
              <span className="text-xs font-medium text-destructive">
                {language === 'el' ? '❌ Η κάρτα σας απορρίφθηκε. Δοκιμάστε ξανά.' : '❌ Your card was declined. Please retry.'}
              </span>
              <Button
                size="sm"
                variant="destructive"
                className="w-full h-8 text-xs"
                disabled={confirmingDeferredId === reservation.id}
                onClick={() => handleConfirmDeferred(reservation.id)}
              >
                {confirmingDeferredId === reservation.id
                  ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />{language === 'el' ? 'Επεξεργασία...' : 'Processing...'}</>
                  : (language === 'el' ? '🔄 Δοκιμάστε Ξανά' : '🔄 Retry Payment')
                }
              </Button>
            </div>
          )}

          {/* Reservation-only event: cancellation note */}
          {!isHybrid && !isPast && (
            <p className="text-[10px] text-muted-foreground italic">
              {t.contactForCancel}
            </p>
          )}

          {/* QR Codes button — full width at bottom */}
          {!isPast && (
            <div className="flex gap-1.5 mt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-xs"
                onClick={() => {
                  setCurrentEventGuestIndex(0);
                  setSelectedEventGuestsReservation(reservation);
                }}
              >
                <QrCode className="h-3.5 w-3.5 mr-1.5" />
                {t.viewQRCodes}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="default"
                className="h-8 text-xs px-3"
                onClick={() => setAddGuestsReservation(reservation)}
                title={language === 'el' ? 'Προσθήκη ατόμων' : 'Add guests'}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {language === 'el' ? 'Άτομα' : 'Guests'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ============= DIRECT RESERVATION CARD (unchanged design) =============
  const renderDirectReservationCard = (reservation: ReservationData, isPast: boolean = false) => {
    const businessInfo = reservation.businesses;
    const dateTime = reservation.preferred_time;
    const location = reservation.businesses?.address;

    return (
      <Card key={reservation.id} className={`overflow-hidden ${isPast ? 'opacity-60' : ''}`}>
        <CardContent className="p-4 space-y-0.5">
          {/* Row 1: Title + Status */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-semibold text-base line-clamp-1">{t.tableReservation}</h4>
            {getStatusBadge(reservation)}
          </div>

          {/* Row 2: Business */}
          <div className="flex items-center gap-1.5">
            {businessInfo?.logo_url &&
            <img src={businessInfo.logo_url} alt="" className="h-4 w-4 rounded-full object-cover" />
            }
            <span className="text-sm font-medium">{businessInfo?.name}</span>
          </div>

          {/* Row 3: Date/Time + Party size */}
          {dateTime &&
          <div className="flex items-center gap-3 text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs">{formatDateTime(dateTime)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs">{reservation.party_size} {t.people}</span>
              </div>
            </div>
          }

          {/* Deferred Payment: Confirm Attendance */}
          {!isPast && reservation.deferred_status === 'awaiting_confirmation' && reservation.deferred_confirmation_deadline && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-2.5 space-y-2 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                  ⏰ {language === 'el' ? 'Επιβεβαίωση σε' : 'Confirm in'}: {formatDeadlineCountdown(reservation.deferred_confirmation_deadline)}
                </span>
              </div>
              <Button
                size="sm"
                className="w-full h-8 text-xs"
                disabled={confirmingDeferredId === reservation.id}
                onClick={() => handleConfirmDeferred(reservation.id)}
              >
                {confirmingDeferredId === reservation.id
                  ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />{language === 'el' ? 'Επεξεργασία...' : 'Processing...'}</>
                  : (language === 'el' ? '✅ Επιβεβαίωση Παρουσίας' : '✅ Confirm Attendance')
                }
              </Button>
            </div>
          )}

          {/* Deferred Payment: Payment Failed */}
          {!isPast && reservation.deferred_status === 'payment_failed' && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-2.5 space-y-2 mt-1">
              <span className="text-xs font-medium text-destructive">
                {language === 'el' ? '❌ Η κάρτα σας απορρίφθηκε. Δοκιμάστε ξανά.' : '❌ Your card was declined. Please retry.'}
              </span>
              <Button
                size="sm"
                variant="destructive"
                className="w-full h-8 text-xs"
                disabled={confirmingDeferredId === reservation.id}
                onClick={() => handleConfirmDeferred(reservation.id)}
              >
                {confirmingDeferredId === reservation.id
                  ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />{language === 'el' ? 'Επεξεργασία...' : 'Processing...'}</>
                  : (language === 'el' ? '🔄 Δοκιμάστε Ξανά' : '🔄 Retry Payment')
                }
              </Button>
            </div>
          )}

          {/* Row 5: Location */}
          {location && (
          <button
            onClick={() => reservation.business_id && navigate(`/xartis?business=${reservation.business_id}&src=dashboard_user`)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs truncate">{location}</span>
              </button>)
          }

          {/* Direct reservations with guest QR codes */}
          {!isPast && directGuests[reservation.id]?.length > 0 &&
          <div className="flex items-center justify-between gap-1.5 mt-2 flex-wrap">
              <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs px-3"
              onClick={() => {
                setCurrentDirectGuestIndex(0);
                setSelectedDirectGuestsReservation(reservation);
              }}>
                <QrCode className="h-3.5 w-3.5 mr-1.5" />
                {t.viewQRCodes}
              </Button>
              <Button
              type="button"
              size="sm"
              variant="default"
              className="h-8 text-xs px-3"
              onClick={() => setAddGuestsReservation(reservation)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                {language === 'el' ? 'Άτομα' : 'Guests'}
              </Button>
              {(reservation.status === 'pending' || reservation.status === 'accepted') &&
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs px-3 text-destructive shrink-0"
              onClick={() => setCancelDialog({ open: true, reservationId: reservation.id })}>
                  {t.cancelReservation}
                </Button>
            }
            </div>
          }

          {/* QR Code + Cancel (fallback for direct reservations without guests) */}
          {!isPast && !directGuests[reservation.id]?.length &&
          <div className="flex items-center gap-1.5 mt-2">
              {reservation.confirmation_code &&
            <button
              type="button"
              onClick={() => qrCodes[reservation.id] && setSelectedReservationForQR(reservation)}
              className="flex-1 flex items-center justify-between bg-muted/50 border border-border rounded-md px-2.5 py-1.5 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">{t.code}</span>
                    <span className="text-xs font-semibold text-foreground tracking-wider">{reservation.confirmation_code}</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-primary">
                    <QrCode className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-medium">QR</span>
                  </div>
                </button>
            }
              {(reservation.status === 'pending' || reservation.status === 'accepted') &&
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs px-3 text-destructive shrink-0"
              onClick={() => setCancelDialog({ open: true, reservationId: reservation.id })}>
                  {t.cancelReservation}
                </Button>
            }
            </div>
          }
        </CardContent>
      </Card>);

  };

  // Categorize
  const directReservations = upcomingReservations.filter((r) => !r.events);
  const eventReservations = upcomingReservations.filter((r) => !!r.events);

  const pastDirectReservations = pastReservations.filter((r) => !r.events);
  const pastEventReservations = pastReservations.filter((r) => !!r.events);

  const hasPast = pastReservations.length > 0;

  return (
    <div className="space-y-4">
      <Tabs
        value={activeReservationsTab}
        onValueChange={(value) => {
          const nextTab = value === 'direct' ? 'direct' : 'event';
          setActiveReservationsTab(nextTab);
          navigate(`/dashboard-user?tab=reservations&subtab=${nextTab}`, { replace: true });
        }}
        className="w-full">
        <TabsList className="w-full h-auto p-1 sm:p-1.5 bg-muted/40 rounded-xl gap-0.5 sm:gap-1">
          <TabsTrigger
            value="event"
            className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-1.5 sm:px-3 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
            
            
            <span className="truncate">{t.eventTab}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted/80 px-1 sm:px-1.5 py-0.5 rounded-full shrink-0">
              {eventReservations.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="direct"
            className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-1.5 sm:px-3 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
            
            
            <span className="truncate">{t.directTab}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted/80 px-1 sm:px-1.5 py-0.5 rounded-full shrink-0">
              {directReservations.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="event" className="mt-4">
          {eventReservations.length === 0 ?
          <p className="text-center text-muted-foreground py-6 text-sm">{t.noEventReservations}</p> :

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {eventReservations.map((r) => renderEventReservationCard(r, false))}
            </div>
          }
        </TabsContent>

        <TabsContent value="direct" className="mt-4">
          {directReservations.length === 0 ?
          <p className="text-center text-muted-foreground py-6 text-sm">{t.noDirectReservations}</p> :

          <div className="grid gap-3">
              {directReservations.map((r) => renderDirectReservationCard(r, false))}
            </div>
          }
        </TabsContent>
      </Tabs>

      {/* History */}
      {hasPast &&
      <Collapsible open={showHistory} onOpenChange={setShowHistory}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t.history} ({pastReservations.length})</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <Tabs defaultValue="past-event" className="w-full">
              <TabsList className="w-full h-auto gap-1 bg-muted/30 p-1 rounded-lg">
                <TabsTrigger value="past-event" className="flex-1 text-xs px-2 py-1.5">
                  {t.eventTab} ({pastEventReservations.length})
                </TabsTrigger>
                <TabsTrigger value="past-direct" className="flex-1 text-xs px-2 py-1.5">
                  {t.directTab} ({pastDirectReservations.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="past-event" className="mt-4">
                {pastEventReservations.length === 0 ?
              <p className="text-center text-muted-foreground py-6 text-sm">{t.noEventReservations}</p> :

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {pastEventReservations.map((r) => renderEventReservationCard(r, true))}
                  </div>
              }
              </TabsContent>
              <TabsContent value="past-direct" className="mt-4">
                {pastDirectReservations.length === 0 ?
              <p className="text-center text-muted-foreground py-6 text-sm">{t.noDirectReservations}</p> :

              <div className="grid gap-3">
                    {pastDirectReservations.map((r) => renderDirectReservationCard(r, true))}
                  </div>
              }
              </TabsContent>
            </Tabs>
          </CollapsibleContent>
        </Collapsible>
      }

      <AlertDialog open={cancelDialog.open} onOpenChange={(open) => { setCancelDialog({ ...cancelDialog, open }); if (!open) setCancellationReason(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmCancel}</AlertDialogTitle>
            <AlertDialogDescription>{t.confirmCancelDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1">
            <label className="text-sm text-muted-foreground">{t.cancellationReasonLabel}</label>
            <textarea
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px] resize-none"
              placeholder={t.cancellationReasonPlaceholder}
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              maxLength={500}
            />
          </div>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogAction
              className="flex-1 h-9 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!cancelDialog.reservationId) return;
                await handleCancelReservation(cancelDialog.reservationId);
              }}>
              
              {t.confirm}
            </AlertDialogAction>
            <AlertDialogCancel className="flex-1 h-9 text-xs mt-0">{t.cancel}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReservationQRCard
        reservation={selectedReservationForQR ? {
          qrCodeToken: selectedReservationForQR.qr_code_token || undefined,
          qrCode: qrCodes[selectedReservationForQR.id],
          confirmationCode: selectedReservationForQR.confirmation_code || '',
          businessName: selectedReservationForQR.events?.businesses?.name || selectedReservationForQR.businesses?.name || '',
          businessLogo: selectedReservationForQR.events?.businesses?.logo_url || selectedReservationForQR.businesses?.logo_url,
          reservationDate: selectedReservationForQR.preferred_time || selectedReservationForQR.events?.start_at,
          partySize: selectedReservationForQR.party_size,
          seatingType: selectedReservationForQR.seating_preference || undefined,
          eventTitle: selectedReservationForQR.events?.title,
          prepaidAmountCents: selectedReservationForQR.prepaid_min_charge_cents || 0,
          isEventBased: !!selectedReservationForQR.events
        } : null}
        language={language}
        onClose={() => setSelectedReservationForQR(null)} />
      

      {/* Multi-guest QR dialog for direct reservations */}
      {selectedDirectGuestsReservation && directGuests[selectedDirectGuestsReservation.id]?.length > 0 && (() => {
        const guests = directGuests[selectedDirectGuestsReservation.id];
        const currentGuest = guests[currentDirectGuestIndex];
        const businessInfo = selectedDirectGuestsReservation.businesses;
        const closeDialog = () => {
          setSelectedDirectGuestsReservation(null);
          setCurrentDirectGuestIndex(0);
        };

        const content =
        <div className="space-y-4">
            <SuccessQRCard
            type="reservation"
            qrToken={currentGuest?.qr_code_token || ''}
            title={language === 'el' ? 'Κράτηση Τραπεζιού' : 'Table Reservation'}
            businessName={businessInfo?.name || ''}
            businessLogo={businessInfo?.logo_url}
            language={language}
            guestName={currentGuest?.guest_name}
            reservationDate={selectedDirectGuestsReservation.preferred_time || undefined}
            bottleType={seatingBottleInfo[selectedDirectGuestsReservation.id]?.bottle_type ?? null}
            bottleCount={seatingBottleInfo[selectedDirectGuestsReservation.id]?.bottle_count ?? null}
            showSuccessMessage={false}
            onClose={closeDialog} />
          
            {guests.length > 1 &&
          <div className="flex items-center justify-center gap-3 pb-2">
                <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDirectGuestIndex(Math.max(0, currentDirectGuestIndex - 1))}
              disabled={currentDirectGuestIndex === 0}>
              
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium text-foreground">
                  {currentGuest?.guest_name} ({currentDirectGuestIndex + 1}/{guests.length})
                </span>
                <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDirectGuestIndex(Math.min(guests.length - 1, currentDirectGuestIndex + 1))}
              disabled={currentDirectGuestIndex === guests.length - 1}>
              
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
          }
          </div>;


        return (
          <Dialog open onOpenChange={closeDialog}>
            <DialogContent className="w-[92vw] max-w-sm p-0 overflow-hidden border-0 bg-transparent [&>button]:hidden max-h-[90vh] overflow-y-auto overflow-x-hidden">
              <VisuallyHidden>
                <DialogTitle>{language === 'el' ? 'Κράτηση Τραπεζιού' : 'Table Reservation'}</DialogTitle>
              </VisuallyHidden>
              {content}
            </DialogContent>
          </Dialog>);

      })()}

      {/* Multi-guest QR dialog for event reservations */}
      {selectedEventGuestsReservation && (() => {
        const tickets = guestTickets[selectedEventGuestsReservation.id] || [];
        const hasTickets = tickets.length > 0;
        const businessInfo = selectedEventGuestsReservation.events?.businesses;
        const closeDialog = () => {
          setSelectedEventGuestsReservation(null);
          setCurrentEventGuestIndex(0);
        };

        const currentTicket = hasTickets ? tickets[currentEventGuestIndex] : null;

        const content =
        <div className="space-y-4">
            <SuccessQRCard
            type="reservation"
            shareViewType={hasTickets ? "ticket" : "reservation"}
            qrToken={hasTickets ? (currentTicket?.qr_code_token || '') : (selectedEventGuestsReservation.qr_code_token || '')}
            title={selectedEventGuestsReservation.events?.title || ''}
            businessName={businessInfo?.name || ''}
            businessLogo={businessInfo?.logo_url}
            language={language}
            guestName={hasTickets ? currentTicket?.guest_name : selectedEventGuestsReservation.reservation_name}
            guestAge={hasTickets ? (currentTicket?.guest_age || undefined) : undefined}
            reservationDate={selectedEventGuestsReservation.events?.start_at || undefined}
            partySize={selectedEventGuestsReservation.party_size}
            prepaidAmountCents={(() => {
              const ticketTotal = ticketOrderTotals[selectedEventGuestsReservation.id] || 0;
              return ticketTotal > 0 ? ticketTotal : undefined;
            })()}
            minChargeCents={(() => {
              const ticketTotal = ticketOrderTotals[selectedEventGuestsReservation.id] || 0;
              if (ticketTotal <= 0) return undefined;
              return selectedEventGuestsReservation.prepaid_min_charge_cents || seatingMinCharge[selectedEventGuestsReservation.id] || undefined;
            })()}
            showSuccessMessage={false}
            onClose={closeDialog} />
          
            {hasTickets && tickets.length > 1 &&
          <div className="flex items-center justify-center gap-3 pb-2">
                <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentEventGuestIndex(Math.max(0, currentEventGuestIndex - 1))}
              disabled={currentEventGuestIndex === 0}>
              
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium text-foreground">
                  {currentTicket?.guest_name} ({currentEventGuestIndex + 1}/{tickets.length})
                </span>
                <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentEventGuestIndex(Math.min(tickets.length - 1, currentEventGuestIndex + 1))}
              disabled={currentEventGuestIndex === tickets.length - 1}>
              
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
          }
          </div>;


        return (
          <Dialog open onOpenChange={closeDialog}>
            <DialogContent className="w-[92vw] max-w-sm p-0 overflow-hidden border-0 bg-transparent [&>button]:hidden max-h-[90vh] overflow-y-auto overflow-x-hidden">
              <VisuallyHidden>
                <DialogTitle>{selectedEventGuestsReservation.events?.title || ''}</DialogTitle>
              </VisuallyHidden>
              {content}
            </DialogContent>
          </Dialog>);

      })()}

      {/* Add Guests Dialog */}
      {addGuestsReservation && (
        <AddGuestsDialog
          open={!!addGuestsReservation}
          onOpenChange={(o) => { if (!o) setAddGuestsReservation(null); }}
          reservation={{
            id: addGuestsReservation.id,
            event_id: addGuestsReservation.event_id,
            party_size: addGuestsReservation.party_size,
            seating_type_id: addGuestsReservation.seating_type_id,
            reservation_name: addGuestsReservation.reservation_name,
            email: addGuestsReservation.email,
            phone_number: (addGuestsReservation as any).phone_number ?? null,
            event_minimum_age: addGuestsReservation.events?.minimum_age,
            event_type: addGuestsReservation.events?.event_type ?? null,
            pay_at_door: (addGuestsReservation.events as any)?.pay_at_door ?? false,
            prepaid_min_charge_cents: addGuestsReservation.prepaid_min_charge_cents,
            event_title: addGuestsReservation.events?.title ?? null,
            business_id: addGuestsReservation.events?.businesses?.id || addGuestsReservation.businesses?.id || null,
            business_name: addGuestsReservation.events?.businesses?.name || addGuestsReservation.businesses?.name || null,
            seating_type: (addGuestsReservation as any).seating_preference || null,
            initial_ticket_total_cents: ticketOrderTotals[addGuestsReservation.id] || 0,
          }}
          language={language}
          onSuccess={() => { setAddGuestsReservation(null); fetchReservations(); }}
          onShowSuccess={(rid) => {
            setAddGuestsReservation(null);
            // small delay so newly inserted tickets are queryable
            window.setTimeout(() => {
              openAddGuestsSuccessFor(rid);
              fetchReservations();
            }, 500);
          }}
        />
      )}

      {/* Add Guests Success Dialog (with all QR codes) */}
      <ReservationSuccessDialog
        open={!!addGuestsSuccessData}
        onOpenChange={(o) => { if (!o) setAddGuestsSuccessData(null); }}
        reservation={addGuestsSuccessData}
        language={language}
      />
    </div>);

};