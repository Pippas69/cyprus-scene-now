import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  getPlanTierIndex, 
  mapToPlanSlug, 
  sortBusinessesByPlanAndProximity,
  type PlanSlug 
} from "@/lib/businessRanking";

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
            verified,
            business_subscriptions (
              plan_id,
              status,
              subscription_plans (
                slug
              )
            )
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
          const { data: coordsData, error: coordsError } = await supabase
            .rpc('get_business_coordinates', { business_ids: businessIds });

          if (coordsError) {
            console.error('Error fetching coordinates:', coordsError);
          }

          const coordsMap = new Map(
            coordsData?.map((item: any) => [
              item.business_id,
              { lng: item.longitude, lat: item.latitude }
            ]) || []
          );

          let mappedBusinesses: BusinessLocation[] = data
            .filter(business => coordsMap.has(business.id))
            .map(business => {
              const coords = coordsMap.get(business.id)!;
              
              // Get subscription plan
              const subscriptionRaw: any = (business as any).business_subscriptions;
              const subscription = Array.isArray(subscriptionRaw) ? subscriptionRaw[0] : subscriptionRaw;
              const isActive = subscription?.status === 'active';
              const planSlug = isActive 
                ? mapToPlanSlug(subscription?.plan_id, subscription?.subscription_plans?.slug ?? null)
                : 'free';
              
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
                planTierIndex: getPlanTierIndex(planSlug), // 0=Elite, 1=Pro, 2=Basic, 3=Free
              };
            });

          // Category filtering
          if (selectedCategories.length > 0) {
            const categoryMap: Record<string, string[]> = {
              'nightlife': ['Nightlife', 'nightlife', 'Νυχτερινή Ζωή'],
              'bars': ['Bars', 'bars', 'Μπαρ'],
              'clubs': ['Clubs', 'clubs', 'Κλαμπ'],
              'live-music': ['Live Music', 'live-music', 'Ζωντανή Μουσική'],
              'dining': ['Dining', 'dining', 'Εστίαση', 'Restaurants', 'restaurants'],
              'restaurants': ['Restaurants', 'restaurants', 'Εστιατόρια'],
              'cafes': ['Cafes', 'cafes', 'Καφέ'],
              'street-food': ['Street Food', 'street-food', 'Φαγητό Δρόμου'],
              'beach-summer': ['Beach & Summer', 'beach-summer', 'Παραλία & Καλοκαίρι'],
              'beach-bars': ['Beach Bars', 'beach-bars', 'Μπαρ Παραλίας'],
              'pool-parties': ['Pool Parties', 'pool-parties', 'Πάρτι Πισίνας'],
              'boat-parties': ['Boat Parties', 'boat-parties', 'Θαλάσσια Πάρτι'],
            };

            const dbCategories = selectedCategories.flatMap(cat => categoryMap[cat] || [cat]);
            
            mappedBusinesses = mappedBusinesses.filter(business =>
              business.category.some(cat => 
                dbCategories.some(dbCat => 
                  cat.toLowerCase() === dbCat.toLowerCase()
                )
              )
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
