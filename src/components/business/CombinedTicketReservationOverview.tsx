import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { isClubOrEventBusiness } from "@/lib/isClubOrEventBusiness";

import { useLanguage } from "@/hooks/useLanguage";

interface CombinedTicketReservationOverviewProps {
  eventId: string;
  businessId?: string;
}

const t = {
  el: {
    totalRevenue: "Συνολικά Έσοδα",
    reservations: "Κρατήσεις",
    ticketsSold: "Εισιτήρια",
    checkedIn: "Check-ins",
    byCategory: "Ανά Κατηγορία",
    sold: "πωλημένα",
    available: "διαθέσιμα",
    booked: "κρατημένα",
    free: "Δωρεάν",
    noData: "Δεν υπάρχουν δεδομένα",
    tickets: "ΕΙΣΙΤΗΡΙΑ (Walk-ins)",
    tables: "ΤΡΑΠΕΖΙΑ"
  },
  en: {
    totalRevenue: "Total Revenue",
    reservations: "Reservations",
    ticketsSold: "Ticket Sales",
    checkedIn: "Check-ins",
    byCategory: "By Category",
    sold: "sold",
    available: "available",
    booked: "booked",
    free: "Free",
    noData: "No data available",
    tickets: "TICKETS (Walk-ins)",
    tables: "Tables"
  }
};

export const CombinedTicketReservationOverview = ({ eventId, businessId }: CombinedTicketReservationOverviewProps) => {
  const { language } = useLanguage();
  const text = t[language];

  const { data: overview, isLoading } = useQuery({
    queryKey: ["combined-overview", eventId],
    queryFn: async () => {
      // Fetch ticket tiers
      const { data: tiers, error: tiersError } = await supabase.
      from("ticket_tiers").
      select("*").
      eq("event_id", eventId).
      order("sort_order");
      if (tiersError) throw tiersError;

      // Fetch ALL completed ticket orders (both walk-in and reservation-linked)
      const { data: allOrders, error: allOrdersError } = await supabase.
      from("ticket_orders").
      select("id, subtotal_cents, commission_cents, linked_reservation_id").
      eq("event_id", eventId).
      eq("status", "completed");
      if (allOrdersError) throw allOrdersError;

      const linkedReservationIds = (allOrders || [])
        .map((order) => order.linked_reservation_id)
        .filter((id): id is string => !!id);

      let legacyWalkInReservationIds = new Set<string>();
      if (linkedReservationIds.length > 0) {
        const { data: linkedReservations } = await supabase
          .from("reservations")
          .select("id, auto_created_from_tickets, seating_type_id")
          .in("id", linkedReservationIds);

        legacyWalkInReservationIds = new Set(
          (linkedReservations || [])
            .filter((reservation) => reservation.auto_created_from_tickets === true && !reservation.seating_type_id)
            .map((reservation) => reservation.id)
        );
      }

      // Separate walk-in orders (unlinked OR legacy mislinked walk-ins)
      const walkInOrders = (allOrders || []).filter(
        (order) =>
          !order.linked_reservation_id ||
          legacyWalkInReservationIds.has(order.linked_reservation_id)
      );
      const { data: allTickets, error: allTicketsError } = await supabase.
      from("tickets").
      select("status, tier_id, order_id").
      eq("event_id", eventId).
      in("status", ["valid", "used"]);
      if (allTicketsError) throw allTicketsError;

      const walkInIds = new Set(walkInOrders.map((o) => o.id));

      // Walk-in tickets = tickets whose order has no linked reservation
      const walkInTickets = (allTickets || []).filter((t) => walkInIds.has(t.order_id));
      const allTicketsArr = allTickets || [];

      // Fetch seating types
      const { data: seatingTypesRaw, error: seatingError } = await supabase.
      from("reservation_seating_types").
      select("*").
      eq("event_id", eventId);
      if (seatingError) throw seatingError;

      // Fetch seating type tiers for min price display
      const seatingTypes = [];
      for (const st of seatingTypesRaw || []) {
        const { data: stTiers } = await supabase.
        from("seating_type_tiers").
        select("prepaid_min_charge_cents").
        eq("seating_type_id", st.id).
        order("min_people", { ascending: true });
        seatingTypes.push({
          ...st,
          minPrice: stTiers && stTiers.length > 0 ? Math.min(...stTiers.map((t) => t.prepaid_min_charge_cents)) : 0
        });
      }

      // Fetch accepted reservations (used for revenue + reservation KPI)
      const { data: reservations, error: resError } = await supabase
        .from("reservations")
        .select("id, party_size, checked_in_at, seating_type_id, seating_preference, prepaid_min_charge_cents")
        .eq("event_id", eventId)
        .eq("status", "accepted")
        .or("auto_created_from_tickets.is.null,auto_created_from_tickets.eq.false,seating_type_id.not.is.null");
      if (resError) throw resError;

      // Fetch live seating occupancy (pending + accepted) for availability display
      const { data: liveBookedCounts, error: liveBookedCountsError } = await supabase.rpc(
        'get_event_seating_booked_counts',
        { p_event_id: eventId }
      );
      if (liveBookedCountsError) throw liveBookedCountsError;

      const liveBookedMap: Record<string, number> = {};
      for (const row of (liveBookedCounts || []) as { seating_type_id: string; slots_booked: number | string }[]) {
        if (row.seating_type_id) {
          liveBookedMap[row.seating_type_id] = Number(row.slots_booked) || 0;
        }
      }

      // --- Ticket stats (ALL tickets including reservation-linked) ---
      const ticketRevenue = allOrders?.reduce((sum, o) => sum + (o.subtotal_cents || 0), 0) || 0;
      const ticketsSold = allTicketsArr.length;
      const ticketCheckedIn = allTicketsArr.filter((t) => t.status === "used").length;

      // Per-tier sold count (walk-in only for display)
      const tierSoldCount = new Map<string, number>();
      walkInTickets.forEach((t) => {
        tierSoldCount.set(t.tier_id, (tierSoldCount.get(t.tier_id) || 0) + 1);
      });

      const walkInDisplayTiers = (tiers || []).filter((tier) => tier.quantity_total > 0 && tier.quantity_total !== 999999);
      const enrichedTiers = walkInDisplayTiers.map((tier) => ({
        ...tier,
        actual_sold: tierSoldCount.get(tier.id) || 0
      }));

      // --- Reservation stats ---
      const seatingStats = seatingTypes.map((st) => {
        const stReservations = (reservations || []).filter(
          (r) => r.seating_type_id === st.id || r.seating_preference === st.seating_type
        );

        const acceptedBooked = stReservations.length;
        const bookedForAvailability = liveBookedMap[st.id] ?? acceptedBooked;

        return {
          ...st,
          acceptedBooked,
          booked: bookedForAvailability,
          available: Math.max(0, st.available_slots - bookedForAvailability),
          revenue: stReservations.reduce((sum, r) => sum + (r.prepaid_min_charge_cents || 0), 0)
        };
      });

      const reservationRevenue = seatingStats.reduce((sum, st) => sum + st.revenue, 0);
      const totalReservations = seatingStats.reduce((sum, st) => sum + st.acceptedBooked, 0);
      const reservationCheckedIn = (reservations || []).filter((r) => r.checked_in_at).length;

      // For linked ticket+reservation flows (Kaliva), check-ins are sourced strictly from tickets
      let isLinkedTicketReservationFlow = false;
      if (businessId) {
        const { data: businessSettings } = await supabase.
        from("businesses").
        select("ticket_reservation_linked, category").
        eq("id", businessId).
        maybeSingle();

        isLinkedTicketReservationFlow = !!businessSettings?.ticket_reservation_linked || isClubOrEventBusiness(businessSettings?.category || []);
      }

      // --- Combined ---
      const totalRevenue = ticketRevenue + reservationRevenue;
      const totalCheckedIn = isLinkedTicketReservationFlow ?
      ticketCheckedIn :
      ticketCheckedIn + reservationCheckedIn;

      return {
        totalRevenue,
        totalReservations,
        ticketsSold,
        totalCheckedIn,
        ticketTiers: enrichedTiers,
        seatingStats
      };
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>);

  }

  if (!overview) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <p>{text.noData}</p>
        </CardContent>
      </Card>);

  }

  const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  return (
    <div className="space-y-4">
      {/* Stats cards - 4 metrics only */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs whitespace-nowrap">
              
              {text.totalRevenue}
            </div>
            <p className="text-xl font-bold mt-1 whitespace-nowrap">{formatPrice(overview.totalRevenue)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs whitespace-nowrap">
              
              {text.reservations}
            </div>
            <p className="text-xl font-bold mt-1 whitespace-nowrap">{overview.totalReservations}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs whitespace-nowrap">
              
              {text.ticketsSold}
            </div>
            <p className="text-xl font-bold mt-1 whitespace-nowrap">{overview.ticketsSold}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs whitespace-nowrap">
              
              {text.checkedIn}
            </div>
            <p className="text-xl font-bold mt-1 whitespace-nowrap">{overview.totalCheckedIn}</p>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown - ticket tiers + seating types */}
      <Card>
        <CardHeader className="pb-2">
          
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seating types section - TABLES FIRST */}
          {overview.seatingStats.length > 0 &&
          <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{text.tables}</p>
              {overview.seatingStats.map((seating) => {
              const total = seating.available_slots || 1;
              const bookedPercent = total > 0 ? seating.booked / total * 100 : 0;

              return (
                <div key={seating.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-medium text-[10px] md:text-sm whitespace-nowrap">{seating.seating_type}</span>
                        {seating.minPrice > 0 &&
                      <Badge
                        variant="outline"
                        className="text-[10px] md:text-xs px-1.5 md:px-2 h-5 md:h-6 whitespace-nowrap flex-shrink-0">
                        
                            {formatPrice(seating.minPrice)}
                          </Badge>
                      }
                      </div>
                      <span className="text-[11px] md:text-xs lg:text-sm text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {seating.booked} {text.booked} / {seating.available} {text.available}
                      </span>
                    </div>
                    <Progress value={bookedPercent} className="h-2" />
                  </div>);

            })}
            </>
          }

          {/* Ticket tiers section - TICKETS (Walk-ins) SECOND */}
          {overview.ticketTiers.length > 0 &&
          <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">{text.tickets}</p>
              {overview.ticketTiers.map((tier) => {
              const actualSold = tier.actual_sold || 0;
              const available = Math.max(tier.quantity_total - actualSold, 0);
              const soldPercent = tier.quantity_total > 0 ?
              Math.min(actualSold / tier.quantity_total * 100, 100) :
              0;

              return (
                <div key={tier.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-medium text-[10px] md:text-sm whitespace-nowrap">{tier.name}</span>
                        <Badge
                        variant="outline"
                        className="text-[10px] md:text-xs px-1.5 md:px-2 h-5 md:h-6 whitespace-nowrap flex-shrink-0">
                        
                          {tier.price_cents === 0 ? text.free : formatPrice(tier.price_cents)}
                        </Badge>
                      </div>
                      <span className="text-[11px] md:text-xs lg:text-sm text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {actualSold} {text.sold} / {available} {text.available}
                      </span>
                    </div>
                    <Progress value={soldPercent} className="h-2" />
                  </div>);

            })}
            </>
          }
        </CardContent>
      </Card>
    </div>);

};

export default CombinedTicketReservationOverview;