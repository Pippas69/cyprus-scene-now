import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";
import { PremiumBadge } from "@/components/ui/premium-badge";
import OfferCard from "@/components/OfferCard";
import OfferCardSkeleton from "@/components/OfferCardSkeleton";
import LocationSwitcher from "@/components/feed/LocationSwitcher";
import HierarchicalCategoryFilter from "@/components/HierarchicalCategoryFilter";
import { FilterChips } from "@/components/feed/FilterChips";
import { Button } from "@/components/ui/button";

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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Filter Bar - Same as Map - Always visible */}
      <div className="bg-background border-b border-border px-3 py-2 lg:px-4 lg:py-3">
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
      return data || [];
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 relative">
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
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground text-lg">
              {language === "el" ? "Δεν υπάρχουν διαθέσιμες προσφορές" : "No offers available"}
            </p>
          </div>
        )}
        
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-background/80" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="relative backdrop-blur-sm bg-card/90 rounded-3xl shadow-premium p-8 md:p-12 border border-primary/10"
      >
        <div className="flex flex-col items-center justify-center text-center">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-primary font-cinzel mb-3">
            {t.loginRequired}
          </h2>
          <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-md mb-8">
            {t.loginSubtitle}
          </p>

          <motion.button
            onClick={onSignupClick}
            className="gradient-brand text-white px-6 md:px-8 py-3 md:py-4 rounded-2xl shadow-glow hover:shadow-hover font-semibold text-base md:text-lg transition-all hover:scale-105"
            whileHover={{ scale: 1.05 }}
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
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | null>(null);

  const text = {
    el: {
      today: "Σήμερα",
      week: "Σε 7 Μέρες",
      month: "Σε 30 Μέρες",
    },
    en: {
      today: "Today",
      week: "In 7 Days",
      month: "In 30 Days",
    },
  };

  const t = text[language];

  // Calculate time boundaries for filtering
  const getTimeBoundaries = (filter: 'today' | 'week' | 'month' | null) => {
    if (!filter) return null; // No filter = show all

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);

    switch (filter) {
      case 'today':
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        end.setDate(start.getDate() + 7);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        end.setDate(start.getDate() + 30);
        end.setHours(23, 59, 59, 999);
        break;
    }

    return { start: start.toISOString(), end: end.toISOString() };
  };

  // Fetch active offer boosts
  const { data: activeBoosts } = useQuery({
    queryKey: ["active-offer-boosts-offers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offer_boosts")
        .select("discount_id, targeting_quality, business_id")
        .eq("active", true);

      if (error) throw error;
      return data || [];
    },
  });


  const boostedOfferIds = new Set(activeBoosts?.map(b => b.discount_id) || []);

  const timeBoundaries = getTimeBoundaries(timeFilter);

  // Fetch BOOSTED offers (shown at top, but STILL filtered by selected time window)
  const { data: boostedOffers, isLoading: loadingBoosted } = useQuery({
    queryKey: ["boosted-offers-page", timeFilter, selectedCity, selectedCategories, Array.from(boostedOfferIds)],
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
           businesses!inner (name, logo_url, cover_url, city, verified, stripe_payouts_enabled, accepts_direct_reservations, reservation_time_slots, reservation_days)
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

      // Filter by categories if selected (filter by business category)
      if (selectedCategories.length > 0) {
        query = query.overlaps('businesses.category', selectedCategories);
      }

      // Apply time filter if selected (Boosted must respect the same time window)
      if (timeBoundaries) {
        query = query.lte('end_at', timeBoundaries.end);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: boostedOfferIds.size > 0,
  });

  // Fetch NON-BOOSTED offers (filtered by time and city)
  const { data: regularOffers, isLoading: loadingRegular } = useQuery({
    queryKey: ["regular-offers", timeFilter, selectedCity, selectedCategories, Array.from(boostedOfferIds)],
    queryFn: async () => {
      const now = new Date().toISOString();
      
       let query = supabase
         .from('discounts')
         .select(`
           *,
           businesses!inner (name, logo_url, cover_url, city, verified, stripe_payouts_enabled, accepts_direct_reservations, reservation_time_slots, reservation_days)
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

      // Filter by categories if selected (filter by business category)
      if (selectedCategories.length > 0) {
        query = query.overlaps('businesses.category', selectedCategories);
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
      return data || [];
    },
  });

  const hasBoostedOffers = boostedOffers && boostedOffers.length > 0;
  const isLoading = loadingBoosted || loadingRegular;

  // Toggle filter - clicking same filter deselects it
  const handleFilterClick = (filter: 'today' | 'week' | 'month') => {
    setTimeFilter(prev => prev === filter ? null : filter);
  };

  return (
    <div className="space-y-4">

      {/* Time Filter Chips */}
      <div className="flex gap-1.5 sm:gap-2">
        {(['today', 'week', 'month'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => handleFilterClick(filter)}
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-sm font-medium transition-all whitespace-nowrap ${
              timeFilter === filter
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
          >
            {filter === 'today' && t.today}
            {filter === 'week' && t.week}
            {filter === 'month' && t.month}
          </button>
        ))}
      </div>

      {/* BOOSTED ZONE - No header, just cards with badge */}
      {hasBoostedOffers && (
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boostedOffers.map((offer: any, index: number) => (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                className="relative"
              >
                <div className="absolute -top-2 -right-2 z-10">
                  <PremiumBadge type="offer" />
                </div>
                <OfferCard 
                  offer={offer}
                  language={language}
                  user={user}
                />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Regular Offers List */}
      <section>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <OfferCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularOffers && regularOffers.map((offer: any, index: number) => (
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
        )}
      </section>
    </div>
  );
};

export default Offers;
