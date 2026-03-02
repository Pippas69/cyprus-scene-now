import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Euro, Users, Ticket, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface CombinedTicketReservationOverviewProps {
  eventId: string;
  businessId?: string;
}

const t = {
  el: {
    totalRevenue: "Συνολικά Έσοδα",
    reservations: "Κρατήσεις",
    ticketsSold: "Εισιτήρια Πωλημένα",
    checkedIn: "Check-ins",
    byCategory: "Ανά Κατηγορία",
    sold: "πωλημένα",
    available: "διαθέσιμα",
    booked: "κρατημένα",
    free: "Δωρεάν",
    noData: "Δεν υπάρχουν δεδομένα",
    tickets: "Εισιτήρια",
    tables: "Τραπέζια"
  },
  en: {
    totalRevenue: "Total Revenue",
    reservations: "Reservations",
    ticketsSold: "Tickets Sold",
    checkedIn: "Check-ins",
    byCategory: "By Category",
    sold: "sold",
    available: "available",
    booked: "booked",
    free: "Free",
    noData: "No data available",
    tickets: "Tickets",
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

      // Fetch ticket orders (revenue)
      const { data: orders, error: ordersError } = await supabase.
      from("ticket_orders").
      select("subtotal_cents, commission_cents").
      eq("event_id", eventId).
      eq("status", "completed");
      if (ordersError) throw ordersError;

      // Fetch actual tickets
      const { data: tickets, error: ticketsError } = await supabase.
      from("tickets").
      select("status, tier_id").
      eq("event_id", eventId).
      in("status", ["valid", "used"]);
      if (ticketsError) throw ticketsError;

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

      // Fetch accepted reservations
      const { data: reservations, error: resError } = await supabase.
      from("reservations").
      select("id, party_size, checked_in_at, seating_type_id, seating_preference, prepaid_min_charge_cents").
      eq("event_id", eventId).
      eq("status", "accepted");
      if (resError) throw resError;

      // --- Ticket stats ---
      const ticketRevenue = orders?.reduce((sum, o) => sum + (o.subtotal_cents || 0), 0) || 0;
      const ticketsSold = tickets?.length || 0;
      const ticketCheckedIn = tickets?.filter((t) => t.status === "used").length || 0;

      // Per-tier sold count
      const tierSoldCount = new Map<string, number>();
      tickets?.forEach((t) => {
        tierSoldCount.set(t.tier_id, (tierSoldCount.get(t.tier_id) || 0) + 1);
      });

      const enrichedTiers = (tiers || []).map((tier) => ({
        ...tier,
        actual_sold: tierSoldCount.get(tier.id) || 0
      }));

      // --- Reservation stats ---
      const seatingTypeIds = new Set(seatingTypes.map((st) => st.id));
      const seatingStats = seatingTypes.map((st) => {
        const stReservations = (reservations || []).filter(
          (r) => r.seating_type_id === st.id || r.seating_preference === st.seating_type
        );
        return {
          ...st,
          booked: stReservations.length,
          available: Math.max(0, st.available_slots - stReservations.length),
          revenue: stReservations.reduce((sum, r) => sum + (r.prepaid_min_charge_cents || 0), 0)
        };
      });

      const reservationRevenue = seatingStats.reduce((sum, st) => sum + st.revenue, 0);
      const totalReservations = seatingStats.reduce((sum, st) => sum + st.booked, 0);
      const reservationCheckedIn = (reservations || []).filter((r) => r.checked_in_at).length;

      // For linked ticket+reservation flows (Kaliva), check-ins are sourced strictly from tickets
      let isLinkedTicketReservationFlow = false;
      if (businessId) {
        const { data: businessSettings } = await supabase.
        from("businesses").
        select("ticket_reservation_linked").
        eq("id", businessId).
        maybeSingle();

        isLinkedTicketReservationFlow = !!businessSettings?.ticket_reservation_linked;
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
              <Euro className="h-4 w-4" />
              {text.totalRevenue}
            </div>
            <p className="text-xl font-bold mt-1 whitespace-nowrap">{formatPrice(overview.totalRevenue)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs whitespace-nowrap">
              <Users className="h-4 w-4" />
              {text.reservations}
            </div>
            <p className="text-xl font-bold mt-1 whitespace-nowrap">{overview.totalReservations}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs whitespace-nowrap">
              <Ticket className="h-4 w-4" />
              {text.ticketsSold}
            </div>
            <p className="text-xl font-bold mt-1 whitespace-nowrap">{overview.ticketsSold}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs whitespace-nowrap">
              <CheckCircle2 className="h-4 w-4" />
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
          {/* Ticket tiers section */}
          {overview.ticketTiers.length > 0 &&
          <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{text.tickets}</p>
              {overview.ticketTiers.map((tier) => {
              const actualSold = tier.actual_sold || 0;
              const soldPercent = tier.quantity_total > 0 ?
              actualSold / tier.quantity_total * 100 :
              0;
              const available = tier.quantity_total - actualSold;

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

          {/* Seating types section */}
          {overview.seatingStats.length > 0 &&
          <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">{text.tables}</p>
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
        </CardContent>
      </Card>
    </div>);

};

export default CombinedTicketReservationOverview;