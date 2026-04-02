import { useState, useEffect } from "react";
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
  // Subscription plan info
  planSlug: PlanSlug;
  planTierIndex: number; // 0=Elite, 1=Pro, 2=Basic, 3=Free
}

export const useMapBusinesses = (
  selectedCategories: string[],
  selectedCity: string | null
) => {
  const [businesses, setBusinesses] = useState<BusinessLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBusinesses = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch businesses with their subscription info
        let query = supabase
          .from("businesses")
          .select(`
            id,
            name,
            description,
            city,
            address,
            category,
            logo_url,
            cover_url,
            verified
          `);

        // Filter by city if selected
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

        if (fetchError) {
          setError(fetchError.message);
          return;
        }

        if (data && data.length > 0) {
          // Get coordinates for all businesses
          const businessIds = data.map(b => b.id);
          
          // Fetch coordinates and subscription plans in parallel
          const [coordsResult, subscriptionsResult] = await Promise.all([
            supabase.rpc('get_business_coordinates', { business_ids: businessIds }),
            supabase
              .from("public_business_subscriptions" as any)
              .select("business_id, plan_slug, status")
              .in("business_id", businessIds)
              .eq("status", "active"),
          ]);

          if (coordsResult.error) {
            console.error('Error fetching coordinates:', coordsResult.error);
          }

          const coordsMap = new Map(
            coordsResult.data?.map((item: any) => [
              item.business_id,
              { lng: item.longitude, lat: item.latitude }
            ]) || []
          );

          // Build subscription map from safe view
          const subscriptionMap = new Map<string, string>();
          subscriptionsResult.data?.forEach((sub: any) => {
            if (sub.plan_slug) subscriptionMap.set(sub.business_id, sub.plan_slug);
          });

          let mappedBusinesses: BusinessLocation[] = data
            .filter(business => coordsMap.has(business.id))
            .map(business => {
              const coords = coordsMap.get(business.id)!;
              const planSlug = mapToPlanSlug(
                'has-plan', // non-null to indicate active
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

          // Category filtering
          if (selectedCategories.length > 0) {
            mappedBusinesses = mappedBusinesses.filter(business =>
              doesCategoryMatchFilters(business.category, selectedCategories)
            );
          }

          // STRICT SORTING: Elite first (0), then Pro (1), Basic (2), Free (3)
          // Within each tier: sorted by city proximity (user city = null means no proximity sorting)
          const sorted = sortBusinessesByPlanAndProximity(mappedBusinesses, null);
          
          setBusinesses(sorted);
        } else {
          setBusinesses([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchBusinesses();

    // Subscribe to realtime changes (businesses + subscriptions) so plan changes reflect instantly on the map
    const channel = supabase
      .channel('businesses-map-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'businesses' },
        () => {
          fetchBusinesses();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'business_subscriptions' },
        () => {
          fetchBusinesses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCategories, selectedCity]);

  return { businesses, loading, error };
};
