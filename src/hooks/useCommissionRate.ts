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
      // COMMISSION DISABLED: Platform is in early stage, no commission charged
      return { commissionPercent: 0, planSlug: null };
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
