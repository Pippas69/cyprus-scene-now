import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Users, Euro, Ticket, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface EventReservationOverviewProps {
  eventId: string;
  businessId?: string;
}

interface SeatingTier {
  id: string;
  min_people: number;
  max_people: number;
  prepaid_min_charge_cents: number;
}

interface SeatingType {
  id: string;
  seating_type: string;
  available_slots: number;
  slots_booked: number;
  dress_code: string | null;
  no_show_policy: string;
  tiers: SeatingTier[];
}

const t = {
  el: {
    totalRevenue: "Συνολικά Έσοδα",
    reservations: "Κρατήσεις",
    tickets: "Εισιτήρια",
    checkedIn: "Check-ins",
    tables: "ΤΡΑΠΕΖΙΑ",
    walkInTickets: "ΕΙΣΙΤΗΡΙΑ (Walk-ins)",
    booked: "κρατημένα",
    available: "διαθέσιμα",
    sold: "πωλημένα",
    free: "Δωρεάν",
    noSeating: "Δεν υπάρχουν κρατήσεις",
  },
  en: {
    totalRevenue: "Total Revenue",
    reservations: "Reservations",
    tickets: "Tickets",
    checkedIn: "Check-ins",
    tables: "TABLES",
    walkInTickets: "TICKETS (Walk-ins)",
    booked: "booked",
    available: "available",
    sold: "sold",
    free: "Free",
    noSeating: "No reservations found",
  },
};

export const EventReservationOverview = ({ eventId, businessId }: EventReservationOverviewProps) => {
  const { language } = useLanguage();
  const text = t[language];

  const { data: overview, isLoading } = useQuery({
    queryKey: ["event-reservation-overview", eventId],
    queryFn: async () => {
      // Fetch seating types for this event
      const { data: seatingTypesRaw, error: seatingError } = await supabase
        .from("reservation_seating_types")
        .select("*")
        .eq("event_id", eventId);

      if (seatingError) throw seatingError;

      // Fetch tiers for each seating type
      const seatingTypes: SeatingType[] = [];
      for (const st of seatingTypesRaw || []) {
        const { data: tiers } = await supabase
          .from("seating_type_tiers")
          .select("*")
          .eq("seating_type_id", st.id)
          .order("min_people", { ascending: true });

        seatingTypes.push({
          id: st.id,
          seating_type: st.seating_type,
          available_slots: st.available_slots,
          slots_booked: st.slots_booked || 0,
          dress_code: st.dress_code,
          no_show_policy: st.no_show_policy,
          tiers: (tiers || []) as SeatingTier[],
        });
      }

      // Fetch confirmed (accepted) reservations
      const { data: reservationsRaw, error: reservationsError } = await supabase
        .from("reservations")
        .select("id, party_size, checked_in_at, seating_preference, seating_type_id, prepaid_min_charge_cents, created_at")
        .eq("event_id", eventId)
        .eq("status", "accepted");

      if (reservationsError) throw reservationsError;

      // Fetch live booked counts (pending + accepted) for availability display
      const { data: liveBookedCounts, error: liveBookedCountsError } = await supabase.rpc(
        "get_event_seating_booked_counts",
        { p_event_id: eventId }
      );

      if (liveBookedCountsError) throw liveBookedCountsError;

      const liveBookedMap: Record<string, number> = {};
      for (const row of (liveBookedCounts || []) as { seating_type_id: string; slots_booked: number | string }[]) {
        if (row.seating_type_id) {
          liveBookedMap[row.seating_type_id] = Number(row.slots_booked) || 0;
        }
      }

      const reservations = (reservationsRaw || []);

      // --- Walk-in tickets ---
      // Fetch ticket tiers
      const { data: ticketTiers, error: ticketTiersError } = await supabase
        .from("ticket_tiers")
        .select("*")
        .eq("event_id", eventId)
        .order("sort_order");
      if (ticketTiersError) throw ticketTiersError;

      // Fetch completed ticket orders
      const { data: allOrders, error: allOrdersError } = await supabase
        .from("ticket_orders")
        .select("id, subtotal_cents, linked_reservation_id")
        .eq("event_id", eventId)
        .eq("status", "completed");
      if (allOrdersError) throw allOrdersError;

      // Identify walk-in orders (no linked reservation or legacy walk-ins)
      const linkedReservationIds = (allOrders || [])
        .map(o => o.linked_reservation_id)
        .filter((id): id is string => !!id);

      let legacyWalkInReservationIds = new Set<string>();
      if (linkedReservationIds.length > 0) {
        const { data: linkedReservations } = await supabase
          .from("reservations")
          .select("id, auto_created_from_tickets, seating_type_id")
          .in("id", linkedReservationIds);

        legacyWalkInReservationIds = new Set(
          (linkedReservations || [])
            .filter(r => r.auto_created_from_tickets === true && !r.seating_type_id)
            .map(r => r.id)
        );
      }

      const walkInOrders = (allOrders || []).filter(
        o => !o.linked_reservation_id || legacyWalkInReservationIds.has(o.linked_reservation_id)
      );
      const walkInOrderIds = new Set(walkInOrders.map(o => o.id));

      // Fetch ALL tickets for this event (reservation-linked + walk-in)
      const { data: allTickets, error: allTicketsError } = await supabase
        .from("tickets")
        .select("status, tier_id, order_id")
        .eq("event_id", eventId)
        .in("status", ["valid", "used"]);
      if (allTicketsError) throw allTicketsError;

      const walkInTickets = (allTickets || []).filter(t => walkInOrderIds.has(t.order_id));
      const walkInTicketCount = walkInTickets.length;

      // Total check-ins = ALL tickets with status 'used' (reservation-linked + walk-in)
      const checkedIn = (allTickets || []).filter(t => t.status === 'used').length;

      // Per-tier sold count for walk-ins
      const tierSoldCount = new Map<string, number>();
      walkInTickets.forEach(t => {
        tierSoldCount.set(t.tier_id, (tierSoldCount.get(t.tier_id) || 0) + 1);
      });

      // Filter and aggregate walk-in display tiers
      const walkInDisplayTiers = (ticketTiers || []).filter(tier => tier.quantity_total > 0 && tier.quantity_total !== 999999);
      const tierAggMap = new Map<string, { name: string; price_cents: number; quantity_total: number; actual_sold: number; id: string }>();
      walkInDisplayTiers.forEach(tier => {
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
      const enrichedWalkInTiers = Array.from(tierAggMap.values());

      // Group by seating type
      const seatingStats = seatingTypes.map((st) => {
        const stReservations = reservations.filter(
          (r) => r.seating_type_id === st.id || r.seating_preference === st.seating_type,
        );
        const acceptedCount = stReservations.length;
        const bookedCountForAvailability = liveBookedMap[st.id] ?? 0;
        const revenue = stReservations.reduce((sum, r) => sum + (r.prepaid_min_charge_cents || 0), 0);
        const minPrice =
          st.tiers.length > 0 ? Math.min(...st.tiers.map((t) => t.prepaid_min_charge_cents)) : 0;

        const totalSlots = st.available_slots;
        const availableSlots = totalSlots - bookedCountForAvailability;

        return {
          ...st,
          acceptedBooked: acceptedCount,
          booked: bookedCountForAvailability,
          available: availableSlots > 0 ? availableSlots : 0,
          minPrice,
          revenue,
        };
      });

      const totalReservations = seatingStats.reduce((sum, st) => sum + st.acceptedBooked, 0);
      const totalRevenue = seatingStats.reduce((sum, st) => sum + st.revenue, 0);

      return {
        seatingTypes: seatingStats,
        totalRevenue,
        totalReservations,
        checkedIn,
        walkInTicketCount,
        walkInTiers: enrichedWalkInTiers,
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!overview || (overview.totalReservations === 0 && overview.walkInTicketCount === 0)) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{text.noSeating}</p>
        </CardContent>
      </Card>
    );
  }

  const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  return (
    <div className="space-y-4">
      {/* Stats cards: Revenue, Reservations, Tickets, Check-ins */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs md:text-xs whitespace-nowrap">
              <Euro className="h-4 w-4" />
              {text.totalRevenue}
            </div>
            <p className="text-xl md:text-xl font-bold mt-1 whitespace-nowrap">{formatPrice(overview.totalRevenue)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs md:text-xs whitespace-nowrap">
              <Users className="h-4 w-4" />
              {text.reservations}
            </div>
            <p className="text-xl md:text-xl font-bold mt-1 whitespace-nowrap">{overview.totalReservations}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs md:text-xs whitespace-nowrap">
              <Ticket className="h-4 w-4" />
              {text.tickets}
            </div>
            <p className="text-xl md:text-xl font-bold mt-1 whitespace-nowrap">{overview.walkInTicketCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs md:text-xs whitespace-nowrap">
              <CheckCircle2 className="h-4 w-4" />
              {text.checkedIn}
            </div>
            <p className="text-xl md:text-xl font-bold mt-1 whitespace-nowrap">{overview.checkedIn}</p>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown */}
      <Card>
        <CardHeader className="pb-2">
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seating types - TABLES */}
          {overview.seatingTypes.length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{text.tables}</p>
              {overview.seatingTypes.map((seating) => {
                const total = seating.available_slots || 1;
                const bookedPercent = total > 0 ? (seating.booked / total) * 100 : 0;

                return (
                  <div key={seating.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-medium text-[10px] md:text-sm whitespace-nowrap">{seating.seating_type}</span>
                        {seating.minPrice > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] md:text-xs px-1.5 md:px-2 h-5 md:h-6 whitespace-nowrap flex-shrink-0"
                          >
                            {formatPrice(seating.minPrice)}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] md:text-xs lg:text-sm text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {seating.booked} {text.booked} / {seating.available} {text.available}
                      </span>
                    </div>
                    <Progress value={bookedPercent} className="h-2" />
                  </div>
                );
              })}
            </>
          )}

          {/* Walk-in ticket tiers */}
          {overview.walkInTiers.length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">{text.walkInTickets}</p>
              {overview.walkInTiers.map((tier) => {
                const actualSold = tier.actual_sold || 0;
                const available = Math.max(tier.quantity_total - actualSold, 0);
                const soldPercent = tier.quantity_total > 0
                  ? Math.min((actualSold / tier.quantity_total) * 100, 100)
                  : 0;

                return (
                  <div key={tier.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-medium text-[10px] md:text-sm whitespace-nowrap">{tier.name}</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] md:text-xs px-1.5 md:px-2 h-5 md:h-6 whitespace-nowrap flex-shrink-0"
                        >
                          {tier.price_cents === 0 ? text.free : formatPrice(tier.price_cents)}
                        </Badge>
                      </div>
                      <span className="text-[11px] md:text-xs lg:text-sm text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {actualSold} {text.sold} / {available} {text.available}
                      </span>
                    </div>
                    <Progress value={soldPercent} className="h-2" />
                  </div>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventReservationOverview;
