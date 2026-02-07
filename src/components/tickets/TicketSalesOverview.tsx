import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Ticket, Euro, Users, TrendingUp, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useCommissionRate } from "@/hooks/useCommissionRate";

interface TicketSalesOverviewProps {
  eventId: string;
  businessId?: string;
}

const t = {
  el: {
    ticketSales: "Πωλήσεις Εισιτηρίων",
    totalRevenue: "Συνολικά Έσοδα",
    ticketsSold: "Εισιτήρια Πωλημένα",
    checkedIn: "Check-ins",
    byTier: "Ανά Κατηγορία",
    sold: "πωλημένα",
    available: "διαθέσιμα",
    free: "Δωρεάν",
    commission: "Προμήθεια",
    netRevenue: "Καθαρά Έσοδα",
    noTiers: "Δεν υπάρχουν κατηγορίες εισιτηρίων",
  },
  en: {
    ticketSales: "Ticket Sales",
    totalRevenue: "Total Revenue",
    ticketsSold: "Tickets Sold",
    checkedIn: "Check-ins",
    byTier: "By Tier",
    sold: "sold",
    available: "available",
    free: "Free",
    commission: "Commission",
    netRevenue: "Net Revenue",
    noTiers: "No ticket tiers available",
  },
};

export const TicketSalesOverview = ({ eventId, businessId }: TicketSalesOverviewProps) => {
  const { language } = useLanguage();
  const text = t[language];

  // Resolve businessId (if not provided) so commission can be dynamic everywhere this component is used.
  const { data: eventBusiness } = useQuery({
    queryKey: ["ticket-sales-event-business", eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("business_id")
        .eq("id", eventId)
        .maybeSingle();
      return data?.business_id ?? null;
    },
  });

  const resolvedBusinessId = businessId || eventBusiness || null;
  const { data: commissionData } = useCommissionRate(resolvedBusinessId);
  const commissionPercent = commissionData?.commissionPercent ?? 12;

  const { data: overview, isLoading } = useQuery({
    queryKey: ["ticket-sales-overview", eventId],
    queryFn: async () => {
      // Fetch tiers
      const { data: tiers, error: tiersError } = await supabase
        .from("ticket_tiers")
        .select("*")
        .eq("event_id", eventId)
        .order("sort_order");

      if (tiersError) throw tiersError;

      // Fetch orders (revenue source of truth)
      const { data: orders, error: ordersError } = await supabase
        .from("ticket_orders")
        .select("subtotal_cents")
        .eq("event_id", eventId)
        .eq("status", "completed");

      if (ordersError) throw ordersError;

      // Fetch tickets for check-in count
      const { data: tickets, error: ticketsError } = await supabase
        .from("tickets")
        .select("status, tier_id")
        .eq("event_id", eventId);

      if (ticketsError) throw ticketsError;

      const totalRevenue = orders?.reduce((sum, o) => sum + (o.subtotal_cents || 0), 0) || 0;
      const ticketsSold = tiers?.reduce((sum, t) => sum + (t.quantity_sold || 0), 0) || 0;
      const checkedIn = tickets?.filter((t) => t.status === "used").length || 0;

      return {
        tiers: tiers || [],
        totalRevenue,
        ticketsSold,
        checkedIn,
        totalTickets: tickets?.length || 0,
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

  if (!overview || overview.tiers.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Ticket className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{text.noTiers}</p>
        </CardContent>
      </Card>
    );
  }

  const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  const totalCommission = Math.round(
    (overview?.totalRevenue || 0) * (commissionPercent / 100)
  );
  const netRevenue = (overview?.totalRevenue || 0) - totalCommission;

  return (
    <div className="space-y-4">
      {/* Stats cards */}
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
              <Ticket className="h-4 w-4" />
              {text.ticketsSold}
            </div>
            <p className="text-xl md:text-xl font-bold mt-1 whitespace-nowrap">{overview.ticketsSold}</p>
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

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs md:text-xs whitespace-nowrap">
              <TrendingUp className="h-4 w-4" />
              {text.netRevenue}
            </div>
            <p className="text-xl md:text-xl font-bold mt-1 whitespace-nowrap">{formatPrice(netRevenue)}</p>
            {totalCommission > 0 && (
              <p className="text-[11px] md:text-xs text-muted-foreground whitespace-nowrap">
                {text.commission}: {formatPrice(totalCommission)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tier breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{text.byTier}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {overview.tiers.map((tier) => {
            const soldPercent = tier.quantity_total > 0 
              ? (tier.quantity_sold / tier.quantity_total) * 100 
              : 0;
            const available = tier.quantity_total - tier.quantity_sold;

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
                  {tier.quantity_sold} {text.sold} / {available} {text.available}
                </span>
              </div>
                <Progress value={soldPercent} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default TicketSalesOverview;
