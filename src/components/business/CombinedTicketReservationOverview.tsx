import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { isClubOrEventBusiness } from "@/lib/isClubOrEventBusiness";
import { sortSeatingTypes } from "@/lib/seatingTypeOrder";

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
      // Parallel fetch all independent queries
      const [tiersResult, ordersResult, ticketsResult, seatingResult, reservationsResult, liveBookedResult] = await Promise.all([
        supabase.from("ticket_tiers").select("*").eq("event_id", eventId).order("sort_order"),
        supabase.from("ticket_orders").select("id, subtotal_cents, commission_cents, linked_reservation_id").eq("event_id", eventId).eq("status", "completed"),
        supabase.from("tickets").select("status, tier_id, order_id").eq("event_id", eventId).in("status", ["valid", "used"]),
        supabase.from("reservation_seating_types").select("*").eq("event_id", eventId),
        supabase.from("reservations").select("id, party_size, checked_in_at, seating_type_id, seating_preference, prepaid_min_charge_cents").eq("event_id", eventId).eq("status", "accepted").or("auto_created_from_tickets.is.null,auto_created_from_tickets.eq.false,seating_type_id.not.is.null"),
        supabase.rpc('get_event_seating_booked_counts', { p_event_id: eventId }),
      ]);

      if (tiersResult.error) throw tiersResult.error;
      if (ordersResult.error) throw ordersResult.error;
      if (ticketsResult.error) throw ticketsResult.error;
      if (seatingResult.error) throw seatingResult.error;
      if (reservationsResult.error) throw reservationsResult.error;
      if (liveBookedResult.error) throw liveBookedResult.error;

      const tiers = tiersResult.data;
      const allOrders = ordersResult.data;
      const allTickets = ticketsResult.data;
      const seatingTypesRaw = seatingResult.data || [];
      const reservations = reservationsResult.data;
      const liveBookedCounts = liveBookedResult.data;

      const liveBookedMap: Record<string, number> = {};
      for (const row of (liveBookedCounts || []) as { seating_type_id: string; slots_booked: number | string }[]) {
        if (row.seating_type_id) {
          liveBookedMap[row.seating_type_id] = Number(row.slots_booked) || 0;
        }
      }

      // Identify walk-in orders
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

      const walkInOrders = (allOrders || []).filter(
        (order) =>
          !order.linked_reservation_id ||
          legacyWalkInReservationIds.has(order.linked_reservation_id)
      );
      const walkInIds = new Set(walkInOrders.map((o) => o.id));
      const walkInTickets = (allTickets || []).filter((t) => walkInIds.has(t.order_id));
      const allTicketsArr = allTickets || [];

      // Batch fetch seating type tiers in one query
      const seatingTypeIds = seatingTypesRaw.map(st => st.id);
      let allStTiers: any[] = [];
      if (seatingTypeIds.length > 0) {
        const { data: stTiersData } = await supabase
          .from("seating_type_tiers")
          .select("seating_type_id, prepaid_min_charge_cents")
          .in("seating_type_id", seatingTypeIds)
          .order("min_people", { ascending: true });
        allStTiers = stTiersData || [];
      }

      const seatingTypes = seatingTypesRaw.map(st => {
        const stTiers = allStTiers.filter(t => t.seating_type_id === st.id);
        return {
          ...st,
          minPrice: stTiers.length > 0 ? Math.min(...stTiers.map((t: any) => t.prepaid_min_charge_cents)) : 0
        };
      });

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
      
      const tierAggMap = new Map<string, { name: string; price_cents: number; quantity_total: number; actual_sold: number; id: string }>();
      walkInDisplayTiers.forEach((tier) => {
        const sold = tierSoldCount.get(tier.id) || 0;
        const existing = tierAggMap.get(tier.name);
        if (existing) {
          existing.quantity_total += tier.quantity_total;
          existing.actual_sold += sold;
        } else {
          tierAggMap.set(tier.name, {
            name: tier.name,
            price_cents: tier.price_cents,
            quantity_total: tier.quantity_total,
            actual_sold: sold,
            id: tier.id,
          });
        }
      });
      const enrichedTiers = Array.from(tierAggMap.values());

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

      const sortedSeatingStats = sortSeatingTypes(seatingStats, (st: any) => st.seating_type);
      const reservationRevenue = sortedSeatingStats.reduce((sum, st) => sum + st.revenue, 0);
      const totalReservations = sortedSeatingStats.reduce((sum, st) => sum + st.acceptedBooked, 0);

      // --- Combined ---
      const totalRevenue = ticketRevenue + reservationRevenue;
      // All check-ins happen through tickets (each guest gets a ticket/QR), so count all used tickets
      const totalCheckedIn = ticketCheckedIn;
      

      return {
        totalRevenue,
        totalReservations,
        ticketsSold,
        totalCheckedIn,
        ticketTiers: enrichedTiers,
        seatingStats: sortedSeatingStats
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