import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AudienceMetrics {
  gender: { male: number; female: number; other: number };
  age: Record<string, number>;
  region: Record<string, number>;
}

export const useAudienceMetrics = (
  businessId: string,
  dateRange?: { from: Date; to: Date }
) => {
  return useQuery({
    queryKey: ["audience-metrics", businessId, dateRange?.from, dateRange?.to],
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    queryFn: async (): Promise<AudienceMetrics> => {
      // Use the secure RPC function that bypasses RLS to calculate demographics
      // This runs server-side with SECURITY DEFINER, so it can access all profiles
      const { data, error } = await supabase.rpc('get_audience_demographics', {
        p_business_id: businessId,
        p_start_date: dateRange?.from?.toISOString() || null,
        p_end_date: dateRange?.to?.toISOString() || null,
      });

      if (error) {
        console.error('Error fetching audience demographics:', error);
        return {
          gender: { male: 0, female: 0, other: 0 },
          age: { "18-24": 0, "25-34": 0, "35-44": 0, "45-54": 0, "55+": 0, "Άγνωστο": 0 },
          region: {},
        };
      }

      // Parse the response from the RPC function
      const result = data as {
        gender: { male: number; female: number; other: number };
        age: Record<string, number>;
        region: Record<string, number>;
      };

      return {
        gender: result?.gender || { male: 0, female: 0, other: 0 },
        age: result?.age || { "18-24": 0, "25-34": 0, "35-44": 0, "45-54": 0, "55+": 0, "Άγνωστο": 0 },
        region: result?.region || {},
      };
    },
    enabled: !!businessId,
  });
};
