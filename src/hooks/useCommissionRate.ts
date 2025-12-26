import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CommissionData {
  commissionPercent: number;
  planSlug: string | null;
}

export const useCommissionRate = (businessId: string | null) => {
  return useQuery<CommissionData>({
    queryKey: ["commission-rate", businessId],
    queryFn: async () => {
      if (!businessId) {
        return { commissionPercent: 12, planSlug: null };
      }

      // Get business subscription
      const { data: subscription } = await supabase
        .from("business_subscriptions")
        .select("plan_id, subscription_plans(slug)")
        .eq("business_id", businessId)
        .eq("status", "active")
        .maybeSingle();

      const planSlug = (subscription?.subscription_plans as any)?.slug || "free";

      // Get commission rate for plan
      const { data: commissionRate } = await supabase
        .from("ticket_commission_rates")
        .select("commission_percent")
        .eq("plan_slug", planSlug)
        .maybeSingle();

      return {
        commissionPercent: commissionRate?.commission_percent ?? 12,
        planSlug,
      };
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
