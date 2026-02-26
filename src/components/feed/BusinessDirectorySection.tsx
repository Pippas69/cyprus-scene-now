import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessBoostBadges } from "./BusinessBoostBadges";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getPlanTierIndex, getCityDistance, type PlanSlug } from "@/lib/businessRanking";
import { useCallback, useRef } from "react";
import { trackEngagement, useViewTracking } from "@/lib/analyticsTracking";
import { translateCity } from "@/lib/cityTranslations";
import { mapFilterIdsToDbCategories } from "@/lib/categoryFilterMapping";
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
  showStudentDiscountBadges?: boolean;
}
const translations = {
  el: {
    noBusinesses: "Δεν βρέθηκαν επιχειρήσεις"
  },
  en: {
    noBusinesses: "No businesses found"
  }
};
export const BusinessDirectorySection = ({
  language,
  selectedCity,
  selectedCategories = [],
  userCity = null,
  showStudentDiscountBadges = false
}: BusinessDirectorySectionProps) => {
  const t = translations[language];
  const {
    data: businesses,
    isLoading
  } = useQuery({
    queryKey: ['all-businesses-directory', selectedCity, selectedCategories.join(','), userCity],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      let query = supabase.from('businesses').select('id, name, logo_url, cover_url, category, city, verified, student_discount_percent, student_discount_mode').eq('verified', true).order('created_at', {
        ascending: false
      });
      if (selectedCity) {
        query = query.eq('city', selectedCity);
      }

      // Apply category filter if categories are selected
      // Convert filter IDs to database category values
      if (selectedCategories.length > 0) {
        const dbCategories = mapFilterIdsToDbCategories(selectedCategories);
        query = query.overlaps('category', dbCategories);
      }

      // Fetch ALL businesses (no limit)
      const {
        data: businessList,
        error
      } = await query;
      if (error) throw error;
      if (!businessList?.length) return [];
      const businessIds = businessList.map(b => b.id);

      // Fetch active boosts and subscription plans in parallel
      const [eventBoostsRes, offerBoostsRes, profileBoostsRes, subscriptionsRes] = await Promise.all([supabase.from('event_boosts').select('business_id').in('business_id', businessIds).eq('status', 'active').lte('start_date', today).gte('end_date', today), supabase.from('offer_boosts').select('business_id').in('business_id', businessIds).eq('active', true), supabase.from('profile_boosts').select('business_id').in('business_id', businessIds).eq('status', 'active').lte('start_date', today).gte('end_date', today), supabase.from('business_subscriptions').select('business_id, subscription_plans(slug)').in('business_id', businessIds).eq('status', 'active')]);
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
          planTierIndex
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
    return <div className="w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({
          length: 12
        }).map((_, i) => <div key={i} className="aspect-square rounded-xl border border-border overflow-hidden">
              <Skeleton className="h-full w-full" />
            </div>)}
        </div>
      </div>;
  }
  if (!businesses || businesses.length === 0) {
    return <div className="w-full text-center py-8 text-muted-foreground">
        {t.noBusinesses}
      </div>;
  }
  return <div className="w-full">
      <motion.div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3" initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} transition={{
      staggerChildren: 0.05
    }}>
        {businesses.map((business, index) => <BusinessCard key={business.id} business={business} index={index} language={language} showStudentDiscountBadges={showStudentDiscountBadges} />)}
      </motion.div>
    </div>;
};

// Separate component for business card
// View = card became visible to the user in feed (NOT a click)
// This is the PRIMARY source of profile_view tracking
const BusinessCard = ({
  business,
  index,
  language,
  showStudentDiscountBadges
}: {
  business: Business;
  index: number;
  language: "el" | "en";
  showStudentDiscountBadges: boolean;
}) => {
  const cardRef = useRef<HTMLAnchorElement | null>(null);

  // PROFILE VIEW = user sees the business card in the feed (visibility tracking)
  const handleView = useCallback(() => {
    trackEngagement(business.id, 'profile_view', 'business', business.id, {
      source: 'feed'
    });
  }, [business.id]);
  useViewTracking(cardRef as any, handleView, {
    threshold: 0.5
  });
  return <motion.div initial={{
    opacity: 0,
    y: 10
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    delay: Math.min(index * 0.02, 0.5)
  }}>
      <Link ref={cardRef} to={`/business/${business.id}`} state={{
      analyticsTracked: true,
      analyticsSource: 'feed',
      from: `${window.location.pathname}${window.location.search}`
    }} onClick={() => {
      // PROFILE INTERACTION = user clicks on the business card to open the profile
      // This is separate from VIEW (seeing the card) - it's an active engagement
      trackEngagement(business.id, 'profile_click', 'business', business.id, {
        source: 'feed'
      });
    }} className="relative aspect-square rounded-xl overflow-hidden border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-200 group block">
        {/* Full background image - uses logo */}
        <div className="absolute inset-0 bg-cover bg-center" style={{
        backgroundImage: business.logo_url ? `url(${business.logo_url})` : undefined,
        backgroundColor: !business.logo_url ? 'hsl(var(--primary) / 0.1)' : undefined
      }} />
        
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        
        {/* Plan badges - top right (Pro=Star, Elite=Crown) */}
        <div className="absolute top-2 right-2">
          <BusinessBoostBadges planSlug={business.planSlug} showStudentDiscount={showStudentDiscountBadges} studentDiscountPercent={business.student_discount_percent} studentDiscountMode={business.student_discount_mode} language={language} />
        </div>
        
        {/* Verified badge - top left */}
        {business.verified}
        
        {/* Content at bottom (name + city only; no category) */}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <h4 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-primary-foreground transition-colors">
            {business.name}
          </h4>
          <p className="text-xs text-white/80 mt-1">
            {translateCity(business.city, language)}
          </p>
        </div>
      </Link>
    </motion.div>;
};
export default BusinessDirectorySection;