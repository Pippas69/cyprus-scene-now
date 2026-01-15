import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessBoostBadges } from "./BusinessBoostBadges";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getPlanTierIndex, getCityDistance, type PlanSlug } from "@/lib/personalization";

interface Business {
  id: string;
  name: string;
  logo_url: string | null;
  cover_url: string | null;
  category: string[];
  city: string;
  verified: boolean | null;
  student_discount_percent?: number | null;
  student_discount_mode?: "once" | "unlimited" | string | null;
  hasEventBoost?: boolean;
  hasOfferBoost?: boolean;
  hasProfileBoost?: boolean;
  planSlug?: PlanSlug | string | null;
  planTierIndex?: number;
}

interface BusinessDirectorySectionProps {
  language: "el" | "en";
  selectedCity?: string | null;
  selectedCategories?: string[];
  userCity?: string | null;
}

const translations = {
  el: {
    noBusinesses: "Δεν βρέθηκαν επιχειρήσεις",
  },
  en: {
    noBusinesses: "No businesses found",
  },
};

export const BusinessDirectorySection = ({ 
  language,
  selectedCity,
  selectedCategories = [],
  userCity = null,
}: BusinessDirectorySectionProps) => {
  const t = translations[language];

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['all-businesses-directory', selectedCity, selectedCategories.join(','), userCity],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      let query = supabase
        .from('businesses')
        .select('id, name, logo_url, cover_url, category, city, verified, student_discount_percent, student_discount_mode')
        .eq('verified', true)
        .order('created_at', { ascending: false });
      
      if (selectedCity) {
        query = query.eq('city', selectedCity);
      }

      // Apply category filter if categories are selected
      if (selectedCategories.length > 0) {
        query = query.overlaps('category', selectedCategories);
      }
      
      // Fetch ALL businesses (no limit)
      const { data: businessList, error } = await query;
      if (error) throw error;
      if (!businessList?.length) return [];

      const businessIds = businessList.map(b => b.id);

      // Fetch active boosts and subscription plans in parallel
      const [eventBoostsRes, offerBoostsRes, profileBoostsRes, subscriptionsRes] = await Promise.all([
        supabase
          .from('event_boosts')
          .select('business_id')
          .in('business_id', businessIds)
          .eq('status', 'active')
          .lte('start_date', today)
          .gte('end_date', today),
        supabase
          .from('offer_boosts')
          .select('business_id')
          .in('business_id', businessIds)
          .eq('active', true),
        supabase
          .from('profile_boosts')
          .select('business_id')
          .in('business_id', businessIds)
          .eq('status', 'active')
          .lte('start_date', today)
          .gte('end_date', today),
        supabase
          .from('business_subscriptions')
          .select('business_id, subscription_plans(slug)')
          .in('business_id', businessIds)
          .eq('status', 'active'),
      ]);

      const hasEventBoost = new Set(eventBoostsRes.data?.map(b => b.business_id) || []);
      const hasOfferBoost = new Set(offerBoostsRes.data?.map(b => b.business_id) || []);
      const hasProfileBoost = new Set(profileBoostsRes.data?.map(b => b.business_id) || []);
      
      // Map subscription plans to businesses
      const subscriptionMap = new Map<string, string>();
      subscriptionsRes.data?.forEach((sub: any) => {
        if (sub.subscription_plans?.slug) {
          subscriptionMap.set(sub.business_id, sub.subscription_plans.slug);
        }
      });

      // Build businesses with plan tier index
      const businessesWithTiers = businessList.map(business => {
        const planSlug = subscriptionMap.get(business.id) || 'free';
        const planTierIndex = getPlanTierIndex(planSlug);
        
        return {
          ...business,
          hasEventBoost: hasEventBoost.has(business.id),
          hasOfferBoost: hasOfferBoost.has(business.id),
          hasProfileBoost: hasProfileBoost.has(business.id),
          planSlug,
          planTierIndex,
        };
      });

      // STRICT SORTING: Plan hierarchy first (Elite>Pro>Basic>Free), then proximity
      // NO ROTATION. NO RANDOMNESS.
      return businessesWithTiers.sort((a, b) => {
        // PRIMARY: Plan tier (Elite=0, Pro=1, Basic=2, Free=3)
        if (a.planTierIndex !== b.planTierIndex) {
          return a.planTierIndex - b.planTierIndex;
        }
        
        // SECONDARY: Geographic proximity (within same plan tier)
        const distanceA = getCityDistance(userCity, a.city);
        const distanceB = getCityDistance(userCity, b.city);
        return distanceA - distanceB;
      }) as Business[];
    },
    staleTime: 60000
  });

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl border border-border overflow-hidden">
              <Skeleton className="h-full w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!businesses || businesses.length === 0) {
    return (
      <div className="w-full text-center py-8 text-muted-foreground">
        {t.noBusinesses}
      </div>
    );
  }

  return (
    <div className="w-full">
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.05 }}
      >
        {businesses.map((business, index) => (
          <motion.div
            key={business.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.02, 0.5) }}
          >
            <Link
              to={`/business/${business.id}`}
              className="relative aspect-square rounded-xl overflow-hidden border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-200 group block"
            >
              {/* Full cover background image */}
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ 
                  backgroundImage: business.cover_url || business.logo_url 
                    ? `url(${business.cover_url || business.logo_url})` 
                    : undefined,
                  backgroundColor: !business.cover_url && !business.logo_url ? 'hsl(var(--primary) / 0.1)' : undefined
                }}
              />
              
              {/* Gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              
              {/* Boost badges - top right */}
              <div className="absolute top-2 right-2">
                <BusinessBoostBadges
                  hasEventBoost={business.hasEventBoost}
                  hasOfferBoost={business.hasOfferBoost}
                  studentDiscountPercent={business.student_discount_percent}
                  studentDiscountMode={business.student_discount_mode}
                  language={language}
                />
              </div>
              
              {/* Verified badge - top left */}
              {business.verified && (
                <div className="absolute top-2 left-2 bg-background/90 rounded-full p-1">
                  <BadgeCheck className="h-4 w-4 text-primary fill-primary/20" />
                </div>
              )}
              
              {/* Content at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h4 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-primary-foreground transition-colors">
                  {business.name}
                </h4>
                <p className="text-xs text-white/80 mt-0.5">
                  {business.city}
                </p>
                {business.category?.[0] && (
                  <Badge variant="secondary" className="mt-1.5 text-[10px] px-1.5 py-0 h-4 bg-white/20 text-white border-0">
                    {business.category[0]}
                  </Badge>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default BusinessDirectorySection;
