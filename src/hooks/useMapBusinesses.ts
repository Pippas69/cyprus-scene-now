import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  getPlanTierIndex, 
  mapToPlanSlug, 
  sortBusinessesByPlanAndProximity,
  type PlanSlug 
} from "@/lib/businessRanking";
import { doesCategoryMatchFilters } from "@/lib/categoryFilterMapping";

export interface BusinessLocation {
  id: string;
  name: string;
  description: string | null;
  city: string;
  address: string | null;
  category: string[];
  logo_url: string | null;
  cover_url: string | null;
  coordinates: [number, number];
  verified: boolean;
  planSlug: PlanSlug;
  planTierIndex: number;
}

const fetchAllMapBusinesses = async (selectedCity: string | null): Promise<BusinessLocation[]> => {
  let query = supabase
    .from("public_businesses_safe")
    .select(`id, name, description, city, address, category, logo_url, cover_url, verified`);

  if (selectedCity) {
    const cityVariants: Record<string, string[]> = {
      'Λευκωσία': ['Λευκωσία', 'Nicosia'],
      'Nicosia': ['Λευκωσία', 'Nicosia'],
      'Λεμεσός': ['Λεμεσός', 'Limassol'],
      'Limassol': ['Λεμεσός', 'Limassol'],
      'Λάρνακα': ['Λάρνακα', 'Larnaca'],
      'Larnaca': ['Λάρνακα', 'Larnaca'],
      'Πάφος': ['Πάφος', 'Paphos'],
      'Paphos': ['Πάφος', 'Paphos'],
      'Αγία Νάπα': ['Αγία Νάπα', 'Ayia Napa'],
      'Ayia Napa': ['Αγία Νάπα', 'Ayia Napa'],
      'Παραλίμνι': ['Παραλίμνι', 'Paralimni'],
      'Paralimni': ['Παραλίμνι', 'Paralimni'],
    };
    const variants = cityVariants[selectedCity] || [selectedCity];
    query = query.in('city', variants);
  }

  const { data, error: fetchError } = await query;
  if (fetchError) throw new Error(fetchError.message);
  if (!data || data.length === 0) return [];

  const businessIds = data.map(b => b.id);

  const [coordsResult, subscriptionsResult] = await Promise.all([
    supabase.rpc('get_business_coordinates', { business_ids: businessIds }),
    supabase
      .from("public_business_subscriptions" as any)
      .select("business_id, plan_slug, status")
      .in("business_id", businessIds)
      .eq("status", "active"),
  ]);

  const coordsMap = new Map(
    coordsResult.data?.map((item: any) => [
      item.business_id,
      { lng: item.longitude, lat: item.latitude }
    ]) || []
  );

  const subscriptionMap = new Map<string, string>();
  subscriptionsResult.data?.forEach((sub: any) => {
    if (sub.plan_slug) subscriptionMap.set(sub.business_id, sub.plan_slug);
  });

  const mappedBusinesses: BusinessLocation[] = data
    .filter(business => coordsMap.has(business.id))
    .map(business => {
      const coords = coordsMap.get(business.id)!;
      const planSlug = mapToPlanSlug(
        'has-plan',
        subscriptionMap.get(business.id) ?? null
      );
      return {
        id: business.id,
        name: business.name,
        description: business.description,
        city: business.city,
        address: business.address,
        category: business.category || [],
        logo_url: business.logo_url,
        cover_url: business.cover_url,
        verified: business.verified || false,
        coordinates: [coords.lng, coords.lat] as [number, number],
        planSlug,
        planTierIndex: getPlanTierIndex(planSlug),
      };
    });

  return sortBusinessesByPlanAndProximity(mappedBusinesses, null);
};

export const useMapBusinesses = (
  selectedCategories: string[],
  selectedCity: string | null
) => {
  const { data: allBusinesses, isLoading, error: queryError } = useQuery({
    queryKey: ["map-businesses", selectedCity],
    queryFn: () => fetchAllMapBusinesses(selectedCity),
    staleTime: 2 * 60 * 1000,
  });

  const businesses = useMemo(() => {
    if (!allBusinesses) return [];
    if (selectedCategories.length === 0) return allBusinesses;
    return allBusinesses.filter(business =>
      doesCategoryMatchFilters(business.category, selectedCategories)
    );
  }, [allBusinesses, selectedCategories]);

  return { 
    businesses, 
    loading: isLoading, 
    error: queryError ? queryError.message : null 
  };
};
