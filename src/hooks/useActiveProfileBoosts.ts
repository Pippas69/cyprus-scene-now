import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  getPersonalizedProfileBoosts, 
  getRotationSeed,
  type ProfileBoostData 
} from "@/lib/personalization";

export interface ActiveProfileBoost extends ProfileBoostData {
  boostScore?: number;
}

interface UserProfile {
  city?: string;
  interests?: string[];
}

interface UseActiveProfileBoostsOptions {
  selectedCity?: string | null;
  userProfile?: UserProfile | null;
  userId?: string | null;
}

export const useActiveProfileBoosts = (
  selectedCityOrOptions?: string | null | UseActiveProfileBoostsOptions,
  userProfile?: UserProfile | null,
  userId?: string | null
) => {
  // Handle both old and new API for backwards compatibility
  let selectedCity: string | null | undefined;
  let profile: UserProfile | null | undefined;
  let uid: string | null | undefined;

  if (typeof selectedCityOrOptions === 'object' && selectedCityOrOptions !== null && 'selectedCity' in selectedCityOrOptions) {
    // New API: options object
    selectedCity = selectedCityOrOptions.selectedCity;
    profile = selectedCityOrOptions.userProfile;
    uid = selectedCityOrOptions.userId;
  } else {
    // Old API: individual parameters
    selectedCity = selectedCityOrOptions as string | null | undefined;
    profile = userProfile;
    uid = userId;
  }

  return useQuery({
    queryKey: ['active-profile-boosts', selectedCity, profile?.city, profile?.interests?.join(','), uid],
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

      // Cast to ProfileBoostData
      const profiles = data as unknown as ProfileBoostData[];

      // Apply personalization, rotation, and display cap
      const rotationSeed = getRotationSeed(uid);
      const personalizedProfiles = getPersonalizedProfileBoosts(
        profiles,
        profile || null,
        rotationSeed
      );

      return personalizedProfiles as ActiveProfileBoost[];
    },
    staleTime: 60000, // Cache for 1 minute
  });
};
