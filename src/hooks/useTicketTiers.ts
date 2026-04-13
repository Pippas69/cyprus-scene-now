import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useTicketTiers = (eventId: string | undefined) => {
  const queryClient = useQueryClient();
  const queryKey = ["ticket-tiers", eventId, "availability-unified-v2"];

  // Realtime subscription for instant availability updates
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`ticket-availability-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_orders',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, queryClient]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!eventId) return [];

      const { data: tiers, error } = await supabase
        .from("ticket_tiers")
        .select("*")
        .eq("event_id", eventId)
        .eq("active", true)
        .order("sort_order");

      if (error) throw error;
      if (!tiers || tiers.length === 0) return [];

      // Count real sold tickets via backend aggregate so all users see identical availability
      const { data: soldCounts, error: soldCountsError } = await supabase.rpc(
        "get_event_walk_in_ticket_sold_counts",
        { p_event_ids: [eventId] }
      );

      if (soldCountsError) throw soldCountsError;

      const soldMap: Record<string, number> = {};
      for (const row of (soldCounts || []) as { tier_id: string; tickets_sold: number | string }[]) {
        if (row.tier_id) {
          soldMap[row.tier_id] = Number(row.tickets_sold) || 0;
        }
      }

      return tiers.map((tier) => ({
        ...tier,
        quantity_sold: soldMap[tier.id] ?? 0,
      }));
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
