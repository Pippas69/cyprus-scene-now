import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BusinessBoostBadges } from "./BusinessBoostBadges";
import { getPlanScore, getRotationSeed, type PlanSlug } from "@/lib/personalization";

type CategoryKey = "nightlife" | "clubs" | "dining" | "beach";

interface Business {
  id: string;
  name: string;
  logo_url: string | null;
  category: string[];
  city: string;
  verified: boolean | null;
  student_discount_percent?: number | null;
  student_discount_mode?: "once" | "unlimited" | string | null;
  hasEventBoost?: boolean;
  hasOfferBoost?: boolean;
  planSlug?: PlanSlug | string | null;
  planScore?: number;
}

interface CategoryBusinessesSectionProps {
  language: "el" | "en";
  /** When set, applies a city filter to the business lists */
  selectedCity?: string | null;
}

const CATEGORY_DEFS: Record<
  CategoryKey,
  {
    categoryValue: string;
    title: { el: string; en: string };
  }
> = {
  nightlife: {
    categoryValue: "Nightlife",
    title: { el: "Νυχτερινή Ζωή", en: "Nightlife" },
  },
  clubs: {
    categoryValue: "Clubs",
    title: { el: "Clubs", en: "Clubs" },
  },
  dining: {
    categoryValue: "Dining",
    title: { el: "Εστίαση", en: "Dining" },
  },
  beach: {
    categoryValue: "Beach & Summer",
    title: { el: "Παραλία & Καλοκαίρι", en: "Beach & Summer" },
  },
};

export const CategoryBusinessesSections = ({ language, selectedCity }: CategoryBusinessesSectionProps) => {
  const rotationSeed = getRotationSeed();

  const categories = useMemo(
    () => ["nightlife", "clubs", "dining", "beach"] as CategoryKey[],
    []
  );

  const { data, isLoading } = useQuery({
    queryKey: ["feed-category-businesses", selectedCity],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];

      // Fetch per-category business lists in parallel.
      const results = await Promise.all(
        categories.map(async (key) => {
          const def = CATEGORY_DEFS[key];

          let query = supabase
            .from("businesses")
            .select("id, name, logo_url, category, city, verified, student_discount_percent, student_discount_mode")
            .eq("verified", true)
            .overlaps("category", [def.categoryValue])
            .order("created_at", { ascending: false });

          if (selectedCity) query = query.eq("city", selectedCity);

          // Pull extra for ranking fairness.
          const { data: businessList, error } = await query.limit(50);
          if (error) throw error;

          if (!businessList?.length) return { key, businesses: [] as Business[] };

          const businessIds = businessList.map((b) => b.id);

          const [eventBoostsRes, offerBoostsRes, subscriptionsRes] = await Promise.all([
            supabase
              .from("event_boosts")
              .select("business_id")
              .in("business_id", businessIds)
              .eq("status", "active")
              .lte("start_date", today)
              .gte("end_date", today),
            supabase
              .from("offer_boosts")
              .select("business_id")
              .in("business_id", businessIds)
              .eq("active", true),
            supabase
              .from("business_subscriptions")
              .select("business_id, subscription_plans(slug)")
              .in("business_id", businessIds)
              .eq("status", "active"),
          ]);

          const hasEventBoost = new Set(eventBoostsRes.data?.map((b) => b.business_id) || []);
          const hasOfferBoost = new Set(offerBoostsRes.data?.map((b) => b.business_id) || []);

          const subscriptionMap = new Map<string, string>();
          subscriptionsRes.data?.forEach((sub: any) => {
            if (sub.subscription_plans?.slug) subscriptionMap.set(sub.business_id, sub.subscription_plans.slug);
          });

          const businessesWithScores = businessList.map((business) => {
            const planSlug = subscriptionMap.get(business.id) || "free";
            const basePlanScore = getPlanScore(planSlug);

            // Small rotation factor for fair distribution within the same plan tier.
            const itemSeed = business.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const rotationFactor = (rotationSeed + itemSeed) % 20;

            return {
              ...business,
              hasEventBoost: hasEventBoost.has(business.id),
              hasOfferBoost: hasOfferBoost.has(business.id),
              planSlug,
              planScore: basePlanScore + rotationFactor,
            } as Business;
          });

          const ranked = businessesWithScores.sort((a, b) => (b.planScore || 0) - (a.planScore || 0)).slice(0, 12);
          return { key, businesses: ranked };
        })
      );

      return results.reduce((acc, r) => {
        acc[r.key] = r.businesses;
        return acc;
      }, {} as Record<CategoryKey, Business[]>);
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="w-full space-y-10">
        {Array.from({ length: 4 }).map((_, idx) => (
          <section key={idx} className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((__, i) => (
                <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full space-y-10">
      {categories.map((key) => {
        const def = CATEGORY_DEFS[key];
        const businesses = data?.[key] || [];
        if (!businesses.length) return null;

        return (
          <section key={key} className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{def.title[language]}</h2>
            </div>

            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.05 }}
            >
              {businesses.map((business, index) => (
                <motion.div
                  key={business.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Link
                    to={`/business/${business.id}`}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="relative">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={business.logo_url || undefined} alt={business.name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {business.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <BusinessBoostBadges
                        hasEventBoost={business.hasEventBoost}
                        hasOfferBoost={business.hasOfferBoost}
                        studentDiscountPercent={business.student_discount_percent}
                        studentDiscountMode={business.student_discount_mode}
                        language={language}
                      />

                      {business.verified && (
                        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                          <BadgeCheck className="h-4 w-4 text-primary fill-primary/20" />
                        </div>
                      )}
                    </div>

                    <span className="text-xs font-medium text-center line-clamp-1 max-w-full group-hover:text-primary transition-colors">
                      {business.name}
                    </span>

                    <span className="text-[10px] text-muted-foreground">{business.city}</span>

                    {business.category?.[0] && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {business.category[0]}
                      </Badge>
                    )}
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </section>
        );
      })}
    </div>
  );
};

export default CategoryBusinessesSections;
