import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActiveProfileBoost {
  id: string;
  business_id: string;
  boost_tier: string;
  targeting_quality: number | null;
  businesses: {
    id: string;
    name: string;
    logo_url: string | null;
    city: string;
    category: string[];
    verified: boolean | null;
  };
}

export const useActiveProfileBoosts = (selectedCity?: string | null) => {
  return useQuery({
    queryKey: ['active-profile-boosts', selectedCity],
    queryFn: async () => {
      const now = new Date().toISOString().split('T')[0];
      
      let query = supabase
        .from('profile_boosts')
        .select(`
          id,
          business_id,
          boost_tier,
          targeting_quality,
          businesses!inner (
            id,
            name,
            logo_url,
            city,
            category,
            verified
          )
        `)
        .eq('status', 'active')
        .lte('start_date', now)
        .gte('end_date', now);

      if (selectedCity) {
        query = query.eq('businesses.city', selectedCity);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching active profile boosts:', error);
        return [];
      }

      // Sort by targeting quality (premium first)
      return (data as unknown as ActiveProfileBoost[]).sort((a, b) => 
        (b.targeting_quality || 0) - (a.targeting_quality || 0)
      );
    },
    staleTime: 60000, // Cache for 1 minute
  });
};
