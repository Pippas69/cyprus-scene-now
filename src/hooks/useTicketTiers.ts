import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useTicketTiers = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["ticket-tiers", eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data: tiers, error } = await supabase
        .from("ticket_tiers")
        .select("*")
        .eq("event_id", eventId)
        .order("sort_order");

      if (error) throw error;
      if (!tiers || tiers.length === 0) return [];

      // Count actual tickets per tier for accurate availability
      // IMPORTANT: finite tiers (walk-ins) should count ONLY non-reservation-linked orders
      const tierIds = tiers.map(t => t.id);
      const { data: tickets } = await supabase
        .from("tickets")
        .select("tier_id, order_id")
        .in("tier_id", tierIds)
        .in("status", ["valid", "used"]);

      if (tickets) {
        const tierMap = new Map(tiers.map((tier) => [tier.id, tier]));
        const orderIds = [...new Set(tickets.map((ticket) => ticket.order_id).filter(Boolean))] as string[];

        let walkInOrderIds = new Set<string>();
        if (orderIds.length > 0) {
          const { data: orders } = await supabase
            .from("ticket_orders")
            .select("id, linked_reservation_id")
            .in("id", orderIds);

          walkInOrderIds = new Set((orders || []).filter((order) => !order.linked_reservation_id).map((order) => order.id));
        }

        const countMap: Record<string, number> = {};
        for (const ticket of tickets) {
          const tier = tierMap.get(ticket.tier_id);
          if (!tier) continue;

          const isFiniteTier = tier.quantity_total > 0 && tier.quantity_total !== 999999;
          if (!isFiniteTier) {
            countMap[ticket.tier_id] = (countMap[ticket.tier_id] || 0) + 1;
            continue;
          }

          if (!ticket.order_id || walkInOrderIds.has(ticket.order_id)) {
            countMap[ticket.tier_id] = (countMap[ticket.tier_id] || 0) + 1;
          }
        }

        return tiers.map(tier => ({
          ...tier,
          quantity_sold: countMap[tier.id] ?? 0,
        }));
      }

      return tiers;
    },
    enabled: !!eventId,
  });
};

export const useCommissionRate = () => {
  return useQuery({
    queryKey: ["commission-rate"],
    queryFn: async () => {
      // First get the user's business subscription
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 12; // Default to free plan rate

      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!business) return 12;

      const { data: subscription } = await supabase
        .from("business_subscriptions")
        .select("subscription_plans(slug)")
        .eq("business_id", business.id)
        .eq("status", "active")
        .maybeSingle();

      const planSlug = subscription?.subscription_plans?.slug || "free";

      const { data: rate } = await supabase
        .from("ticket_commission_rates")
        .select("commission_percent")
        .eq("plan_slug", planSlug)
        .single();

      return rate?.commission_percent ?? 12;
    },
  });
};
