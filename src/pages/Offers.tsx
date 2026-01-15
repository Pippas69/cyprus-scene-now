import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { PremiumBadge } from "@/components/ui/premium-badge";
import OfferCard from "@/components/OfferCard";
import OfferCardSkeleton from "@/components/OfferCardSkeleton";
import SignupModal from "@/components/SignupModal";
import CompactLocationDropdown from "@/components/feed/CompactLocationDropdown";

const Offers = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSignupModal, setShowSignupModal] = useState(false);

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
    },
    en: {
      loginRequired: "Log in to see all offers!",
      loginSubtitle: "Join the ΦΟΜΟ community and save money.",
      joinButton: "Join ΦΟΜΟ",
    },
  };

  const t = text[language];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content - No hero banner */}
      <div className="container mx-auto px-4 py-6">
        {!user ? (
          <LimitedOffersView 
            language={language} 
            t={t}
            onSignupClick={() => setShowSignupModal(true)}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <FullOffersView language={language} user={user} />
          </motion.div>
        )}
      </div>

      {showSignupModal && (
        <SignupModal 
          onClose={() => setShowSignupModal(false)} 
          language={language}
        />
      )}
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
            businesses!inner (name, logo_url, cover_url, city, verified, stripe_payouts_enabled)
          `)
        .eq('active', true)
        .eq('businesses.verified', true)
        .lte('start_at', now)
        .gte('end_at', now)
        .gt('original_price_cents', 0)
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
const FullOffersView = ({ language, user }: { language: "el" | "en"; user: any }) => {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const text = {
    el: {
      today: "Σήμερα",
      week: "Επόμενες 7 Μέρες",
      month: "Επόμενες 30 Μέρες",
    },
    en: {
      today: "Today",
      week: "Next 7 Days",
      month: "Next 30 Days",
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
    queryKey: ["boosted-offers-page", timeFilter, selectedCity, Array.from(boostedOfferIds)],
    queryFn: async () => {
      if (boostedOfferIds.size === 0) return [];

      const now = new Date().toISOString();
       let query = supabase
         .from('discounts')
         .select(`
           *,
           businesses!inner (name, logo_url, cover_url, city, verified, stripe_payouts_enabled, accepts_direct_reservations)
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
      return data || [];
    },
    enabled: boostedOfferIds.size > 0,
  });

  // Fetch NON-BOOSTED offers (filtered by time and city)
  const { data: regularOffers, isLoading: loadingRegular } = useQuery({
    queryKey: ["regular-offers", timeFilter, selectedCity, Array.from(boostedOfferIds)],
    queryFn: async () => {
      const now = new Date().toISOString();
      
       let query = supabase
         .from('discounts')
         .select(`
           *,
           businesses!inner (name, logo_url, cover_url, city, verified, stripe_payouts_enabled, accepts_direct_reservations)
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
    <div className="space-y-6">
      {/* Location Dropdown at top */}
      <div className="flex items-center">
        <CompactLocationDropdown
          language={language}
          selectedCity={selectedCity}
          onCityChange={setSelectedCity}
        />
      </div>

      {/* Time Filter Chips - At top */}
      <div className="flex flex-wrap gap-2">
        {(['today', 'week', 'month'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => handleFilterClick(filter)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
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
