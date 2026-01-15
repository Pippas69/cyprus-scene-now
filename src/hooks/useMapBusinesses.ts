import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  planSlug: 'free' | 'basic' | 'pro' | 'elite';
  planTierIndex: number;
}

// Plan tier order for sorting and visibility
const PLAN_TIER_ORDER: ('free' | 'basic' | 'pro' | 'elite')[] = ['free', 'basic', 'pro', 'elite'];

const getPlanTierIndex = (plan: string | null): number => {
  if (!plan) return 0;
  const index = PLAN_TIER_ORDER.indexOf(plan as any);
  return index === -1 ? 0 : index;
};

const mapPlanSlug = (planId: string | null, slug: string | null): 'free' | 'basic' | 'pro' | 'elite' => {
  if (!planId || !slug) return 'free';
  // Map old slugs to new ones if needed
  const slugLower = slug.toLowerCase();
  if (slugLower.includes('elite') || slugLower.includes('premium')) return 'elite';
  if (slugLower.includes('pro') || slugLower.includes('professional')) return 'pro';
  if (slugLower.includes('basic') || slugLower.includes('starter')) return 'basic';
  return 'free';
};

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
          // Handle both Greek and English city names
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
            // Continue without coordinates for some businesses
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
              
              // Get subscription plan (business_subscriptions is one-to-one in DB, but may come back as object or array)
              const subscriptionRaw: any = (business as any).business_subscriptions;
              const subscription = Array.isArray(subscriptionRaw) ? subscriptionRaw[0] : subscriptionRaw;
              const isActive = subscription?.status === 'active';
              const planSlug = isActive 
                ? mapPlanSlug(subscription?.plan_id, subscription?.subscription_plans?.slug ?? null)
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
                planTierIndex: getPlanTierIndex(planSlug),
              };
            });

          // Category filtering
          if (selectedCategories.length > 0) {
            // Map filter IDs to database values
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

          // Sort by plan tier (Elite first, then Pro, Basic, Free)
          mappedBusinesses.sort((a, b) => b.planTierIndex - a.planTierIndex);

          setBusinesses(mappedBusinesses);
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

    // Subscribe to realtime changes
    const channel = supabase
      .channel('businesses-map-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'businesses'
        },
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
