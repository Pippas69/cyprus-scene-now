import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  DISPLAY_CAPS,
  getPersonalizedProfileBoosts, 
  getRotationSeed,
  type ProfileBoostData 
} from "@/lib/personalization";
import { ELITE_MANUAL_ORDER, getCityDistance, getPlanTierIndex, type PlanSlug } from "@/lib/businessRanking";

export interface ActiveProfileBoost extends ProfileBoostData {
  boostScore?: number;
  planSlug?: PlanSlug;
  planTierIndex?: number;
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
            verified,
            student_discount_percent,
            student_discount_mode
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

      const profiles = data as unknown as ProfileBoostData[];
      if (!profiles.length) return [];

      const businessIds = profiles.map((item) => item.business_id);
      const { data: subscriptionsData } = await supabase
        .from('public_business_subscriptions' as any)
        .select('business_id, plan_slug')
        .in('business_id', businessIds)
        .eq('status', 'active');

      const subscriptionMap = new Map<string, string>();
      subscriptionsData?.forEach((sub: any) => {
        if (sub.plan_slug) subscriptionMap.set(sub.business_id, sub.plan_slug);
      });

      const enrichedProfiles: ActiveProfileBoost[] = profiles.map((item) => {
        const planSlug = (subscriptionMap.get(item.business_id) || 'free') as PlanSlug;

        return {
          ...item,
          planSlug,
          planTierIndex: getPlanTierIndex(planSlug),
        };
      });

      const rotationSeed = getRotationSeed(uid);
      const personalizedProfiles = getPersonalizedProfileBoosts(
        enrichedProfiles,
        profile || null,
        rotationSeed,
        enrichedProfiles.length
      );

      const priorityCity = selectedCity || profile?.city || null;

      return [...personalizedProfiles]
        .sort((a, b) => {
          const tierA = a.planTierIndex ?? 3;
          const tierB = b.planTierIndex ?? 3;

          if (tierA !== tierB) return tierA - tierB;

          if (tierA === 0) {
            const orderA = ELITE_MANUAL_ORDER[a.business_id] ?? 999;
            const orderB = ELITE_MANUAL_ORDER[b.business_id] ?? 999;
            if (orderA !== orderB) return orderA - orderB;
          }

          const distanceA = getCityDistance(priorityCity, a.businesses.city);
          const distanceB = getCityDistance(priorityCity, b.businesses.city);
          if (distanceA !== distanceB) return distanceA - distanceB;

          return (b.boostScore ?? 0) - (a.boostScore ?? 0);
        })
        .slice(0, DISPLAY_CAPS.PROFILES);
    },
    staleTime: 60000, // Cache for 1 minute
  });
};
