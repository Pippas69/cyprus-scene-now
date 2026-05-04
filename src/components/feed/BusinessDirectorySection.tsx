/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessBoostBadges } from "./BusinessBoostBadges";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getPlanTierIndex, getCityDistance, ELITE_MANUAL_ORDER, type PlanSlug } from "@/lib/businessRanking";
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
  el: { noBusinesses: "Δεν βρέθηκαν επιχειρήσεις" },
  en: { noBusinesses: "No businesses found" },
};

const getCategoryLabel = (cat: string, lang: "el" | "en"): string => {
  const labels: Record<string, { el: string; en: string }> = {
    bar:           { el: "Bars",          en: "Bars" },
    bars:          { el: "Bars",          en: "Bars" },
    club:          { el: "Clubs",         en: "Clubs" },
    clubs:         { el: "Clubs",         en: "Clubs" },
    nightclub:     { el: "Nightclubs",    en: "Nightclubs" },
    nightclubs:    { el: "Nightclubs",    en: "Nightclubs" },
    restaurant:    { el: "Εστιατόρια",   en: "Restaurants" },
    restaurants:   { el: "Εστιατόρια",   en: "Restaurants" },
    lounge:        { el: "Lounges",       en: "Lounges" },
    lounges:       { el: "Lounges",       en: "Lounges" },
    cafe:          { el: "Καφετέριες",   en: "Cafés" },
    cafes:         { el: "Καφετέριες",   en: "Cafés" },
    coffee:        { el: "Καφετέριες",   en: "Coffee" },
    beach_bar:     { el: "Beach Bars",    en: "Beach Bars" },
    beach_bars:    { el: "Beach Bars",    en: "Beach Bars" },
    hotel:         { el: "Ξενοδοχεία",   en: "Hotels" },
    hotels:        { el: "Ξενοδοχεία",   en: "Hotels" },
    sport:         { el: "Αθλητισμός",   en: "Sports" },
    sports:        { el: "Αθλητισμός",   en: "Sports" },
    entertainment: { el: "Διασκέδαση",   en: "Entertainment" },
    music:         { el: "Μουσική",      en: "Music" },
    other:         { el: "Άλλα",         en: "Other" },
  };
  const entry = labels[cat.toLowerCase()];
  if (entry) return entry[lang];
  return cat.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};

export const BusinessDirectorySection = ({
  language,
  selectedCity,
  selectedCategories = [],
  userCity = null,
  showStudentDiscountBadges = false,
}: BusinessDirectorySectionProps) => {
  const t = translations[language];

  const { data: businesses, isLoading } = useQuery({
    queryKey: ["all-businesses-directory", selectedCity, selectedCategories.join(","), userCity],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      let query = supabase
        .from("public_businesses_safe")
        .select("id, name, logo_url, cover_url, category, city, verified, student_discount_percent, student_discount_mode")
        .eq("verified", true)
        .order("created_at", { ascending: false });

      if (selectedCity) query = query.eq("city", selectedCity);
      if (selectedCategories.length > 0) {
        const dbCategories = mapFilterIdsToDbCategories(selectedCategories);
        query = query.overlaps("category", dbCategories);
      }

      const { data: businessList, error } = await query;
      if (error) throw error;
      if (!businessList?.length) return [];

      const businessIds = businessList.map((b) => b.id);

      const [eventBoostsRes, offerBoostsRes, profileBoostsRes, subscriptionsRes] = await Promise.all([
        supabase.from("event_boosts").select("business_id").in("business_id", businessIds).eq("status", "active").lte("start_date", today).gte("end_date", today),
        supabase.from("offer_boosts").select("business_id").in("business_id", businessIds).eq("active", true),
        supabase.from("profile_boosts").select("business_id").in("business_id", businessIds).eq("status", "active").lte("start_date", today).gte("end_date", today),
        supabase.from("public_business_subscriptions" as any).select("business_id, plan_slug").in("business_id", businessIds).eq("status", "active"),
      ]);

      const hasEventBoost  = new Set(eventBoostsRes.data?.map((b) => b.business_id) || []);
      const hasOfferBoost  = new Set(offerBoostsRes.data?.map((b) => b.business_id) || []);
      const hasProfileBoost = new Set(profileBoostsRes.data?.map((b) => b.business_id) || []);

      const subscriptionMap = new Map<string, string>();
      subscriptionsRes.data?.forEach((sub: any) => {
        if (sub.plan_slug) subscriptionMap.set(sub.business_id, sub.plan_slug);
      });

      const businessesWithTiers = businessList.map((business) => {
        const planSlug = subscriptionMap.get(business.id) || "free";
        return {
          ...business,
          hasEventBoost:  hasEventBoost.has(business.id),
          hasOfferBoost:  hasOfferBoost.has(business.id),
          hasProfileBoost: hasProfileBoost.has(business.id),
          planSlug,
          planTierIndex: getPlanTierIndex(planSlug),
        };
      });

      return businessesWithTiers.sort((a, b) => {
        if (a.planTierIndex !== b.planTierIndex) return a.planTierIndex - b.planTierIndex;
        if (a.planTierIndex === 0) {
          const orderA = ELITE_MANUAL_ORDER[a.id] ?? 999;
          const orderB = ELITE_MANUAL_ORDER[b.id] ?? 999;
          if (orderA !== orderB) return orderA - orderB;
        }
        return getCityDistance(userCity, a.city) - getCityDistance(userCity, b.city);
      }) as Business[];
    },
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-0.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className={`${i % 5 === 0 ? "col-span-2 aspect-video" : "col-span-1 aspect-square"} overflow-hidden`}
            >
              <Skeleton className="h-full w-full rounded-none" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!businesses || businesses.length === 0) {
    return (
      <div className="w-full text-center py-8 text-white/40 text-sm">{t.noBusinesses}</div>
    );
  }

  // Category filter active → flat mosaic, no section headings, full-bleed
  if (selectedCategories.length > 0) {
    return (
      <div className="w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-0.5">
          {businesses.map((business, index) => (
            <BusinessCard
              key={business.id}
              business={business}
              index={index}
              language={language}
              isFeatured={index % 5 === 0}
              showStudentDiscountBadges={showStudentDiscountBadges}
            />
          ))}
        </div>
      </div>
    );
  }

  // No filter → group by primary category, mosaic within each group
  const groupedByCategory = new Map<string, Business[]>();
  const categoryOrder: string[] = [];
  businesses.forEach((business) => {
    const primaryCat = (business.category?.[0] || "other").toLowerCase();
    if (!groupedByCategory.has(primaryCat)) {
      groupedByCategory.set(primaryCat, []);
      categoryOrder.push(primaryCat);
    }
    groupedByCategory.get(primaryCat)!.push(business);
  });

  return (
    <div className="w-full space-y-10">
      {categoryOrder.map((cat) => {
        const catBusinesses = groupedByCategory.get(cat)!;
        return (
          <section key={cat}>
            {/* Category heading — large editorial, padded, grid bleeds to edges */}
            <div className="px-4 sm:px-6 mb-3">
              <h3 className="font-urbanist font-black text-2xl sm:text-3xl text-white leading-none">
                {getCategoryLabel(cat, language)}
              </h3>
              <p className="text-white/25 text-xs mt-1">{catBusinesses.length} {language === 'el' ? 'επιχειρήσεις' : 'venues'}</p>
            </div>

            {/* Mosaic grid: edge-to-edge, every 5th card is a wide hero */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-0.5">
              {catBusinesses.map((business, idx) => (
                <BusinessCard
                  key={business.id}
                  business={business}
                  index={idx}
                  language={language}
                  isFeatured={idx % 5 === 0}
                  showStudentDiscountBadges={showStudentDiscountBadges}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

// ─── Business card ────────────────────────────────────────────────────────────
// isFeatured → col-span-2, aspect-video, prefers cover_url, larger text + hover scale
// normal     → col-span-1, aspect-square, prefers logo_url
const BusinessCard = ({
  business,
  index,
  language,
  isFeatured,
  showStudentDiscountBadges,
}: {
  business: Business;
  index: number;
  language: "el" | "en";
  isFeatured: boolean;
  showStudentDiscountBadges: boolean;
}) => {
  const cardRef = useRef<HTMLAnchorElement | null>(null);

  const handleView = useCallback(() => {
    trackEngagement(business.id, "profile_view", "business", business.id, { source: "feed" });
  }, [business.id]);
  useViewTracking(cardRef as any, handleView, { threshold: 0.5 });

  const imageUrl = isFeatured
    ? (business.cover_url || business.logo_url)
    : (business.logo_url  || business.cover_url);

  return (
    <motion.div
      className={isFeatured ? "col-span-2" : "col-span-1"}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.5) }}
    >
      <Link
        ref={cardRef}
        to={`/business/${business.id}`}
        state={{
          analyticsTracked: true,
          analyticsSource: "feed",
          from: `${window.location.pathname}${window.location.search}`,
        }}
        onClick={() => {
          trackEngagement(business.id, "profile_click", "business", business.id, { source: "feed" });
        }}
        className={`relative overflow-hidden group block ${
          isFeatured ? "aspect-video" : "aspect-square"
        }`}
      >
        {/* Background image with subtle zoom on hover */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{
            backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
            backgroundColor: !imageUrl ? "hsl(var(--primary) / 0.1)" : undefined,
          }}
        />

        {/* Gradient overlay — deeper at bottom for text legibility */}
        <div
          className={`absolute inset-0 bg-gradient-to-t ${
            isFeatured
              ? "from-black/80 via-black/20 to-black/5"
              : "from-black/85 via-black/25 to-transparent"
          }`}
        />

        {/* Plan / boost badges — top right */}
        <div className="absolute top-2 right-2 z-10">
          <BusinessBoostBadges
            planSlug={business.planSlug}
            showStudentDiscount={showStudentDiscountBadges}
            studentDiscountPercent={business.student_discount_percent}
            studentDiscountMode={business.student_discount_mode}
            language={language}
          />
        </div>

        {/* Name + city — pinned to bottom */}
        <div className={`absolute bottom-0 left-0 right-0 ${isFeatured ? "p-3 sm:p-4" : "p-2"}`}>
          <h4
            className={`font-urbanist font-bold text-white leading-tight transition-colors group-hover:text-seafoam/90 ${
              isFeatured
                ? "text-sm sm:text-base line-clamp-1"
                : "text-[10px] sm:text-xs line-clamp-2 sm:line-clamp-1"
            }`}
          >
            {business.name}
          </h4>
          <p className={`text-white/60 mt-0.5 ${isFeatured ? "text-xs" : "text-[9px] sm:text-[10px]"}`}>
            {translateCity(business.city, language)}
          </p>
        </div>
      </Link>
    </motion.div>
  );
};

export default BusinessDirectorySection;
