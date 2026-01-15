import { useEffect, useRef, useState } from "react";
import { ArrowUp, Filter, GraduationCap } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

import FeedSidebar from "@/components/feed/FeedSidebar";
import SmartSearchBar from "@/components/feed/SmartSearchBar";
import { BoostedContentSection } from "@/components/feed/BoostedContentSection";
import { BoostedProfilesScroller } from "@/components/feed/BoostedProfilesScroller";

import BusinessDirectorySection from "@/components/feed/BusinessDirectorySection";
import HierarchicalCategoryFilter from "@/components/HierarchicalCategoryFilter";
import { FilterChips } from "@/components/feed/FilterChips";
import { Button } from "@/components/ui/button";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { PullIndicator } from "@/components/ui/pull-indicator";

import { supabase } from "@/integrations/supabase/client";
import { hapticFeedback } from "@/lib/haptics";
import {
  DISPLAY_CAPS,
  getOfferBoostScore,
  getPersonalizedScore,
  getRotationSeed,
  type ActiveBoost,
  type OfferBoost,
} from "@/lib/personalization";
import { useActiveProfileBoosts } from "@/hooks/useActiveProfileBoosts";
import { useLanguage } from "@/hooks/useLanguage";
import { useScrollMemory } from "@/hooks/useScrollMemory";

interface FeedProps {
  showNavbar?: boolean;
}

const Feed = ({ showNavbar = true }: FeedProps = {}) => {
  // NOTE: We intentionally removed the big “Discover ΦΟΜΟ” / “Όλη η Κύπρος” header per your requested hierarchy.
  // Order on Feed:
  // 1) Paid (boosted) events & offers (top of page)
  // 2) Featured businesses
  // 3) Core category sections + businesses
  // 4) Student Discount

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showStudentDiscounts, setShowStudentDiscounts] = useState(false);

  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const startYRef = useRef<number | null>(null);

  const queryClient = useQueryClient();
  const { language } = useLanguage();

  useScrollMemory();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch personalization data for logged-in users
  const { data: personalizedData } = useQuery({
    queryKey: ["personalized-events", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const [profileRes, rsvpsRes, favoritesRes] = await Promise.all([
        supabase.from("profiles").select("city, interests").eq("id", user.id).single(),
        supabase
          .from("rsvps")
          .select("event_id, events(category, start_at)")
          .eq("user_id", user.id)
          .limit(50),
        supabase.from("favorites").select("event_id, events(category)").eq("user_id", user.id),
      ]);

      return {
        profile: profileRes.data,
        rsvps: rsvpsRes.data || [],
        favorites: favoritesRes.data || [],
      };
    },
    enabled: !!user,
  });

  // Fetch active event boosts
  const { data: activeBoosts } = useQuery({
    queryKey: ["active-boosts"],
    queryFn: async () => {
      const now = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("event_boosts")
        .select("event_id, targeting_quality, boost_tier, business_id")
        .eq("status", "active")
        .lte("start_date", now)
        .gte("end_date", now);

      if (error) {
        console.error("Error fetching active boosts:", error);
        return [];
      }
      return data as (ActiveBoost & { business_id: string })[];
    },
    staleTime: 60000,
  });

  const eventBoostBusinessIds = new Set(activeBoosts?.map((b) => b.business_id) || []);

  // Boosted events ONLY (paid priority) - sorted chronologically by start_at
  const { data: boostedEvents } = useQuery({
    queryKey: ["boosted-events", selectedCity, activeBoosts?.map((b) => b.event_id).join(",")],
    queryFn: async () => {
      if (!activeBoosts || activeBoosts.length === 0) return [];

      const boostedEventIds = activeBoosts.map((b) => b.event_id);

      let query = supabase
        .from("events")
        .select("*, businesses!inner(name, logo_url, verified, city)")
        .in("id", boostedEventIds)
        .eq("businesses.verified", true)
        .gte("end_at", new Date().toISOString())
        .order("start_at", { ascending: true }); // Chronological order

      if (selectedCity) query = query.eq("businesses.city", selectedCity);
      if (selectedCategories.length > 0) query = query.overlaps("category", selectedCategories);

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    },
    enabled: !!activeBoosts,
    staleTime: 60000,
  });

  // Boosted offers (paid priority)
  const { data: offerBoosts } = useQuery({
    queryKey: ["active-offer-boosts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offer_boosts")
        .select("discount_id, targeting_quality, commission_percent, business_id")
        .eq("active", true);

      if (error) {
        console.error("Error fetching offer boosts:", error);
        return [];
      }
      return data || [];
    },
    staleTime: 60000,
  });

  const offerBoostBusinessIds = new Set(offerBoosts?.map((b: any) => b.business_id) || []);

  // Boosted offers (paid priority) - sorted chronologically by end_at (soonest expiry first)
  const { data: boostedOffers } = useQuery({
    queryKey: ["boosted-offers", selectedCity, offerBoosts?.map((b: any) => b.discount_id).join(",")],
    queryFn: async () => {
      if (!offerBoosts || offerBoosts.length === 0) return [];

      const boostedOfferIds = offerBoosts.map((b: any) => b.discount_id);
      const now = new Date().toISOString();

      let query = supabase
        .from("discounts")
        .select(
          `
          id, title, description, percent_off, original_price_cents,
          start_at, end_at, business_id, terms, max_per_user,
          businesses!inner (name, logo_url, city, verified)
        `
        )
        .in("id", boostedOfferIds)
        .eq("active", true)
        .eq("businesses.verified", true)
        .lte("start_at", now)
        .gte("end_at", now)
        .order("end_at", { ascending: true }); // Soonest expiry first

      if (selectedCity) query = query.eq("businesses.city", selectedCity);

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    },
    enabled: !!offerBoosts,
    staleTime: 60000,
  });

  // Featured businesses (plan-weighted)
  const { data: profileBoosts } = useActiveProfileBoosts({
    selectedCity,
    userProfile: personalizedData?.profile || null,
    userId: user?.id || null,
  });

  // Student discount (always below the 4 category sections)
  const { data: studentDiscountBusinesses } = useQuery({
    queryKey: ["student-discount-businesses", selectedCity],
    queryFn: async () => {
      let query = supabase
        .from("businesses")
        .select("id, name, logo_url, city, category, student_discount_percent, student_discount_mode")
        .eq("verified", true)
        .eq("student_discount_enabled", true)
        .gt("student_discount_percent", 0);

      if (selectedCity) query = query.eq("city", selectedCity);

      const { data, error } = await query.limit(12);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) startYRef.current = e.touches[0].pageY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const diff = e.touches[0].pageY - startYRef.current;
    if (diff > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(diff, 100));
      if (diff > 80) {
        setIsPulling(true);
        hapticFeedback.light();
      }
    }
  };

  const handleTouchEnd = () => {
    if (isPulling) {
      hapticFeedback.medium();
      queryClient.invalidateQueries({ queryKey: ["boosted-events"] });
      queryClient.invalidateQueries({ queryKey: ["boosted-offers"] });
      queryClient.invalidateQueries({ queryKey: ["active-profile-boosts"] });
    }
    setIsPulling(false);
    setPullDistance(0);
    startYRef.current = null;
  };

  const handleClearFilters = () => {
    setSelectedCategories([]);
    setSelectedCity(null);
  };

  const handleRemoveCategory = (category: string) => {
    setSelectedCategories((prev) => prev.filter((c) => c !== category));
  };

  const handleRemoveCity = () => {
    setSelectedCity(null);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      className="min-h-screen bg-background flex max-w-full overflow-x-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {showNavbar && <FeedSidebar language={language} user={user} />}

      <div className="flex-1 overflow-x-hidden max-w-full">
        <OfflineIndicator />

        <div className="md:hidden">
          {pullDistance > 0 && (
            <div className="fixed top-0 left-0 right-0 z-50 bg-background">
              <PullIndicator progress={pullDistance} isRefreshing={isPulling} />
            </div>
          )}
        </div>

        {/* PRIORITY 1: Paid content at the very top (above everything) - ALWAYS render container */}
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 pt-4 overflow-hidden">
          <BoostedContentSection events={boostedEvents || []} offers={boostedOffers || []} language={language} />
        </div>

        {/* Smart Search Bar */}
        {showNavbar && (
          <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 mt-2 mb-6 relative z-30">
            <SmartSearchBar language={language} onSearch={() => {}} className="max-w-4xl mx-auto" />
          </div>
        )}

        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8 overflow-hidden">
          <div className="space-y-6">
            {/* POSITION #2: Featured Businesses (no header, just profiles) */}
            {profileBoosts && profileBoosts.length > 0 && (
              <BoostedProfilesScroller
                profiles={profileBoosts}
                language={language}
                eventBoostBusinessIds={eventBoostBusinessIds}
                offerBoostBusinessIds={offerBoostBusinessIds}
              />
            )}

            {/* Filters (categories + student discount) - directly above businesses */}
            <div data-filters className="w-full">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <HierarchicalCategoryFilter
                    language={language}
                    selectedCategories={selectedCategories}
                    onCategoryChange={setSelectedCategories}
                  />

                  <Button
                    variant={showStudentDiscounts ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowStudentDiscounts(!showStudentDiscounts)}
                    className="h-8 px-3 text-xs gap-1.5 shrink-0"
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">
                      {language === "el" ? "Φοιτητική Έκπτωση" : "Student Discount"}
                    </span>
                    <span className="sm:hidden">🎓</span>
                  </Button>
                </div>

                {(selectedCategories.length > 0 || selectedCity) && (
                  <FilterChips
                    categories={selectedCategories}
                    quickFilters={[]}
                    selectedCity={selectedCity}
                    onRemoveCategory={handleRemoveCategory}
                    onRemoveQuickFilter={() => {}}
                    onRemoveCity={handleRemoveCity}
                    onClearAll={handleClearFilters}
                    language={language}
                  />
                )}
              </div>
            </div>

            {/* Student Discount results (only when filter is active) - NO HEADER since filter already shows */}
            {showStudentDiscounts && studentDiscountBusinesses && studentDiscountBusinesses.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {studentDiscountBusinesses.map((business: any) => (
                  <a
                    key={business.id}
                    href={`/business/${business.id}`}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="relative">
                      {business.logo_url ? (
                        <img
                          src={business.logo_url}
                          alt={business.name}
                          className="w-14 h-14 rounded-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-lg font-bold text-primary">{business.name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="absolute -top-1 -left-1 bg-primary text-primary-foreground rounded-full p-1">
                        <GraduationCap className="h-3 w-3" />
                      </div>
                    </div>

                    <span className="text-xs font-medium text-center line-clamp-1 max-w-full group-hover:text-primary transition-colors">
                      {business.name}
                    </span>

                    <span className="text-[10px] text-muted-foreground">{business.city}</span>

                    <span className="text-xs font-semibold text-primary">
                      🎓 {business.student_discount_percent}%
                      {business.student_discount_mode === "once" && (
                        <span className="text-muted-foreground font-normal ml-1">
                          ({language === "el" ? "1η" : "1st"})
                        </span>
                      )}
                    </span>
                  </a>
                ))}
              </div>
            )}

            {/* All businesses from FOMO - filtered by selected categories (hidden when student discount filter is active) */}
            {!showStudentDiscounts && (
              <BusinessDirectorySection 
                language={language} 
                selectedCity={selectedCity} 
                selectedCategories={selectedCategories}
              />
            )}

          </div>
        </div>

        {showScrollTop && (
          <FloatingActionButton
            icon={<ArrowUp size={24} />}
            onClick={scrollToTop}
            actions={[
              {
                icon: <Filter size={20} />,
                label: language === "el" ? "Φίλτρα" : "Filters",
                onClick: () => {
                  const filtersEl = document.querySelector("[data-filters]");
                  filtersEl?.scrollIntoView({ behavior: "smooth" });
                },
              },
            ]}
            position="bottom-right"
            size="large"
            variant="primary"
            pulse={false}
          />
        )}
      </div>
    </div>
  );
};

export default Feed;
