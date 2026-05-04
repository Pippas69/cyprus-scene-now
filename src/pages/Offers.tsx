/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { X, Tag } from "lucide-react";
import { reducedMotion } from "@/lib/motion";
import { DateRange } from "react-day-picker";
import { CompactDateRangeFilter } from "@/components/CompactDateRangeFilter";
import { PremiumBadge } from "@/components/ui/premium-badge";
import OfferCard from "@/components/OfferCard";
import OfferCardSkeleton from "@/components/OfferCardSkeleton";
import LocationSwitcher from "@/components/feed/LocationSwitcher";
import HierarchicalCategoryFilter from "@/components/HierarchicalCategoryFilter";
import { FilterChips } from "@/components/feed/FilterChips";
import { mapFilterIdsToDbCategories, doesCategoryMatchFilters } from "@/lib/categoryFilterMapping";
import { Button } from "@/components/ui/button";
import { isBoostCurrentlyActive, type OfferBoostRecord } from "@/lib/boostUtils";

const Offers = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const text = {
    el: {
      loginRequired: "Συνδεθείτε για να δείτε όλες τις προσφορές!",
      loginSubtitle: "Γίνετε μέλος της κοινότητας ΦΟΜΟ και εξοικονομήστε χρήματα.",
      joinButton: "Εγγραφή στο ΦΟΜΟ",
      clearFilters: "Καθαρισμός",
    },
    en: {
      loginRequired: "Log in to see all offers!",
      loginSubtitle: "Join the ΦΟΜΟ community and save money.",
      joinButton: "Join ΦΟΜΟ",
      clearFilters: "Clear",
    },
  };

  const t = text[language];

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedCity(null);
  };

  const hasActiveFilters = selectedCategories.length > 0 || selectedCity;

  const handleRemoveCategory = (category: string) => {
    setSelectedCategories(prev => prev.filter(c => c !== category));
  };

  const handleRemoveCity = () => {
    setSelectedCity(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <OfferCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient offers header */}
      <div className="relative overflow-hidden px-4 pt-5 pb-4 bg-background">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-golden/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-0 w-48 h-48 bg-seafoam/8 rounded-full blur-3xl pointer-events-none" />
        <p className="relative text-white/35 text-[10px] font-semibold tracking-[0.2em] uppercase mb-1.5">
          {language === 'el' ? 'Προσφορές' : 'Offers'}{selectedCity ? ` · ${selectedCity}` : ` · ${language === 'el' ? 'Κύπρος' : 'Cyprus'}`}
        </p>
        <h1 className="relative font-urbanist font-black text-3xl sm:text-4xl text-white leading-none">
          {language === 'el' ? 'Αποκλειστικά για σένα' : 'Exclusive for you'}
        </h1>
      </div>

      {/* Sticky Filter Bar */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-white/[0.07] px-3 py-2 lg:px-4 lg:py-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 md:gap-2.5 lg:gap-3 overflow-x-auto scrollbar-hide">
            <LocationSwitcher 
              language={language} 
              selectedCity={selectedCity} 
              onCityChange={setSelectedCity}
              mapMode={true}
            />
            
            <HierarchicalCategoryFilter
              selectedCategories={selectedCategories}
              onCategoryChange={setSelectedCategories}
              language={language}
              mapMode={true}
            />

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="gap-1 md:gap-1.5 lg:gap-2 whitespace-nowrap shrink-0 h-7 md:h-8 lg:h-9 px-2 md:px-2.5 lg:px-3 text-[10px] md:text-xs lg:text-sm"
              >
                <X className="h-3 w-3 md:h-3.5 md:w-3.5 lg:h-4 lg:w-4" />
                {t.clearFilters}
              </Button>
            )}
          </div>

          <FilterChips
            categories={selectedCategories}
            quickFilters={[]}
            selectedCity={selectedCity}
            onRemoveCategory={handleRemoveCategory}
            onRemoveQuickFilter={() => {}}
            onRemoveCity={handleRemoveCity}
            onClearAll={clearAllFilters}
            language={language}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {!user ? (
          <LimitedOffersView 
            language={language} 
            t={t}
            onSignupClick={() => navigate("/signup?redirect=/offers")}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <FullOffersView 
              language={language} 
              user={user}
              selectedCity={selectedCity}
              selectedCategories={selectedCategories}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Limited View for Visitors
const LimitedOffersView = ({ language, t, onSignupClick }: any) => {
  const { data: offers, isLoading } = useQuery({
    queryKey: ['offers-preview'],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const now = new Date().toISOString();
        const { data, error } = await supabase
          .from('discounts')
          .select(`
            *,
            businesses!inner (name, logo_url, cover_url, city, verified, stripe_payouts_enabled, accepts_direct_reservations, reservation_time_slots, reservation_days)
          `)
        .eq('active', true)
        .eq('businesses.verified', true)
        .lte('start_at', now)
        .gte('end_at', now)
        .order('end_at', { ascending: true })
        .limit(12);

      if (error) throw error;
      
      // Filter out sold-out offers (people_remaining = 0)
      return (data || []).filter((offer: any) => {
        if (offer.total_people !== null && offer.total_people > 0 && offer.people_remaining !== null && offer.people_remaining <= 0) {
          return false;
        }
        return true;
      });
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 relative">
        {isLoading ? (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <OfferCardSkeleton key={i} />
          ))
        ) : offers && offers.length > 0 ? (
          offers.map((offer: any, index: number) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
              className={index > 3 ? 'blur-md opacity-60 pointer-events-none scale-95' : ''}
            >
              <OfferCard 
                offer={offer}
                language={language}
                user={null}
              />
            </motion.div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center gap-3">
            <Tag className="w-10 h-10 text-white/20" />
            <p className="font-urbanist font-black text-lg text-white/60">{language === "el" ? "Δεν υπάρχουν διαθέσιμες προσφορές" : "No offers available"}</p>
            <p className="text-sm text-white/35">{language === "el" ? "Δοκίμασε αλλαγή φίλτρων" : "Try adjusting your filters"}</p>
          </div>
        )}
        
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-background/80" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl border border-white/[0.07] p-8 md:p-14 text-center"
        style={{ background: 'linear-gradient(135deg, hsl(38 88% 52% / 0.12) 0%, hsl(207 72% 12% / 0.95) 60%)' }}
      >
        <div className="absolute top-0 left-0 w-72 h-72 bg-golden/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-seafoam/8 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col items-center justify-center text-center relative">
          <p className="text-golden text-[10px] font-semibold tracking-[0.25em] uppercase mb-5">ΦΟΜΟ DEALS</p>
          <h2 className="font-urbanist font-black text-3xl md:text-4xl text-white mb-4 leading-tight">
            {t.loginRequired}
          </h2>
          <p className="text-sm text-white/50 max-w-sm mx-auto mb-8">
            {t.loginSubtitle}
          </p>
          <motion.button
            onClick={onSignupClick}
            className="gradient-brand text-white px-8 py-3.5 rounded-2xl font-semibold shadow-glow text-base transition-all"
            whileHover={reducedMotion ? {} : { scale: 1.04 }}
            whileTap={reducedMotion ? {} : { scale: 0.97 }}
          >
            {t.joinButton}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Full View for Logged-in Users - FOMO Style
const FullOffersView = ({ language, user, selectedCity, selectedCategories }: { 
  language: "el" | "en"; 
  user: any;
  selectedCity: string | null;
  selectedCategories: string[];
}) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Calculate time boundaries from date range
  const getTimeBoundaries = () => {
    if (!dateRange?.from) return null;

    const start = new Date(dateRange.from);
    start.setHours(0, 0, 0, 0);

    const end = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
    end.setHours(23, 59, 59, 999);

    return { start: start.toISOString(), end: end.toISOString() };
  };

  // Fetch active offer boosts (with hourly window support)
  const { data: activeBoosts } = useQuery({
    queryKey: ["active-offer-boosts-offers"],
    staleTime: 60000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offer_boosts")
        .select("discount_id, targeting_quality, business_id, start_date, end_date, created_at, duration_mode, duration_hours")
        .eq("status", "active");

      if (error) throw error;
      
      // Filter to only currently active boosts (respecting hourly windows)
      const now = new Date().toISOString();
      return (data || []).filter((b) =>
        isBoostCurrentlyActive(b as OfferBoostRecord, now)
      );
    },
  });


  const boostedOfferIds = new Set(activeBoosts?.map(b => b.discount_id) || []);

  const timeBoundaries = getTimeBoundaries();

  // Fetch BOOSTED offers (shown at top, but STILL filtered by selected time window)
  const { data: boostedOffers, isLoading: loadingBoosted } = useQuery({
    queryKey: ["boosted-offers-page", dateRange, selectedCity, selectedCategories, Array.from(boostedOfferIds)],
    staleTime: 60000,
    queryFn: async () => {
      if (boostedOfferIds.size === 0) return [];

      const now = new Date().toISOString();
       let query = supabase
         .from('discounts')
         .select(`
           id, title, description, percent_off, original_price_cents, offer_image_url,
           start_at, end_at, business_id, terms, max_per_user,
           valid_days, valid_start_time, valid_end_time, category, discount_type, special_deal_text,
           total_people, people_remaining, max_people_per_redemption, one_per_user, show_reservation_cta, requires_reservation,
           offer_type, bonus_percent, credit_amount_cents, pricing_type, bundle_price_cents,
            businesses!inner (name, logo_url, cover_url, city, category, verified, stripe_payouts_enabled, accepts_direct_reservations, reservation_time_slots, reservation_days)
         `)
        .in('id', Array.from(boostedOfferIds))
        .eq('active', true)
        .eq('businesses.verified', true)
        .lte('start_at', now)
        .gte('end_at', now)
        .order('end_at', { ascending: true });

      // Filter by city if selected
      if (selectedCity) {
        query = query.eq('businesses.city', selectedCity);
      }

      // Apply time filter if selected (Boosted must respect the same time window)
      if (timeBoundaries) {
        query = query.lte('end_at', timeBoundaries.end);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Filter out sold-out offers and apply category filtering client-side
      let results = (data || []).filter((offer: any) => {
        if (offer.total_people !== null && offer.total_people > 0 && offer.people_remaining !== null && offer.people_remaining <= 0) {
          return false;
        }
        return true;
      });

      // Client-side category filtering (reliable across all PostgREST versions)
      if (selectedCategories.length > 0) {
        results = results.filter((offer: any) => {
          const bizCats: string[] = offer.businesses?.category || [];
          return doesCategoryMatchFilters(bizCats, selectedCategories);
        });
      }

      return results;
    },
    enabled: boostedOfferIds.size > 0,
  });

  // Fetch NON-BOOSTED offers (filtered by time and city)
  const { data: regularOffers, isLoading: loadingRegular } = useQuery({
    queryKey: ["regular-offers", dateRange, selectedCity, selectedCategories, Array.from(boostedOfferIds)],
    staleTime: 60000,
    queryFn: async () => {
      const now = new Date().toISOString();
      
       let query = supabase
         .from('discounts')
         .select(`
           id, title, description, percent_off, original_price_cents, offer_image_url,
           start_at, end_at, business_id, terms, max_per_user,
           valid_days, valid_start_time, valid_end_time, category, discount_type, special_deal_text,
           total_people, people_remaining, max_people_per_redemption, one_per_user, show_reservation_cta, requires_reservation,
           offer_type, bonus_percent, credit_amount_cents, pricing_type, bundle_price_cents,
            businesses!inner (name, logo_url, cover_url, city, category, verified, stripe_payouts_enabled, accepts_direct_reservations, reservation_time_slots, reservation_days)
         `)
        .eq('active', true)
        .eq('businesses.verified', true)
        .lte('start_at', now)
        .gte('end_at', now)
        .order('end_at', { ascending: true });

      // Filter by city if selected
      if (selectedCity) {
        query = query.eq('businesses.city', selectedCity);
      }

      // Apply time filter: show offers that END within the selected time window
      if (timeBoundaries) {
        query = query.lte('end_at', timeBoundaries.end);
      }

      // Exclude boosted offers
      if (boostedOfferIds.size > 0) {
        query = query.not('id', 'in', `(${Array.from(boostedOfferIds).join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter out sold-out offers and apply category filtering client-side
      let results = (data || []).filter((offer: any) => {
        if (offer.total_people !== null && offer.total_people > 0 && offer.people_remaining !== null && offer.people_remaining <= 0) {
          return false;
        }
        return true;
      });

      // Client-side category filtering
      if (selectedCategories.length > 0) {
        results = results.filter((offer: any) => {
          const bizCats: string[] = offer.businesses?.category || [];
          return doesCategoryMatchFilters(bizCats, selectedCategories);
        });
      }

      return results;
    },
  });

  const hasBoostedOffers = boostedOffers && boostedOffers.length > 0;
  const isLoading = loadingBoosted || loadingRegular;

  // Urgency strip: count regular offers expiring within 24h
  const expiringCount = (regularOffers || []).filter((o: any) => {
    const hoursLeft = (new Date(o.end_at).getTime() - Date.now()) / 3_600_000;
    return hoursLeft > 0 && hoursLeft <= 24;
  }).length;

  return (
    <div className="space-y-4">
      {/* Date Range Filter */}
      <div className="flex items-center gap-2">
        <CompactDateRangeFilter
          value={dateRange}
          onChange={setDateRange}
          language={language}
        />
      </div>

      {/* Urgency strip */}
      {expiringCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-golden/10 border border-golden/25 text-golden text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-golden animate-pulse flex-shrink-0" />
          {language === 'el'
            ? `${expiringCount} προσφορ${expiringCount === 1 ? 'ά λήγει' : 'ές λήγουν'} σε λιγότερο από 24 ώρες`
            : `${expiringCount} offer${expiringCount === 1 ? '' : 's'} expiring within 24 hours`}
        </div>
      )}

      {/* BOOSTED ZONE — horizontal spotlight row */}
      {hasBoostedOffers && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-urbanist font-black text-xl text-white flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-golden inline-block" />
              {language === 'el' ? 'Προτεινόμενες Προσφορές' : 'Featured Offers'}
            </h2>
            <span className="text-[10px] text-white/30 font-medium tracking-wider">
              {language === 'el' ? 'ΣΥΡΕ →' : 'SWIPE →'}
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory -mx-4 px-4">
            {boostedOffers.map((offer: any) => (
              <div key={offer.id} className="relative w-[260px] sm:w-[300px] flex-shrink-0 snap-start">
                <div className="absolute -top-2 -right-2 z-10">
                  <PremiumBadge type="offer" />
                </div>
                <OfferCard
                  offer={offer}
                  language={language}
                  user={user}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Regular Offers List */}
      <section className="space-y-3">
        <h2 className="font-urbanist font-black text-xl text-white flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-white/25 inline-block" />
          {language === 'el' ? 'Όλες οι Προσφορές' : 'All Offers'}
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <OfferCardSkeleton key={i} />
            ))}
          </div>
        ) : regularOffers && regularOffers.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {regularOffers.map((offer: any, index: number) => (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.3 }}
              >
                <OfferCard
                  offer={offer}
                  language={language}
                  user={user}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Tag className="w-10 h-10 text-white/20" />
            <p className="font-urbanist font-black text-lg text-white/60">
              {language === 'el' ? 'Δεν βρέθηκαν προσφορές' : 'No offers found'}
            </p>
            <p className="text-sm text-white/35">
              {language === 'el' ? 'Δοκίμασε να αλλάξεις τα φίλτρα' : 'Try adjusting your filters'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Offers;
