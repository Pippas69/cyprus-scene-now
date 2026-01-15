import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import OfferCard from "@/components/OfferCard";
import OfferCardSkeleton from "@/components/OfferCardSkeleton";
import SignupModal from "@/components/SignupModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
          businesses!inner (name, logo_url, city, verified, stripe_payouts_enabled)
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
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('today');

  const text = {
    el: {
      boosted: "Προτεινόμενες",
      today: "Σήμερα",
      week: "Επόμενες 7 Μέρες",
      month: "Επόμενες 30 Μέρες",
      noOffers: "Δεν βρέθηκαν προσφορές",
      noOffersDesc: "Δοκιμάστε διαφορετικό χρονικό φίλτρο",
    },
    en: {
      boosted: "Featured",
      today: "Today",
      week: "Next 7 Days",
      month: "Next 30 Days",
      noOffers: "No offers found",
      noOffersDesc: "Try a different time filter",
    },
  };

  const t = text[language];

  // Calculate time boundaries for filtering
  const getTimeBoundaries = (filter: 'today' | 'week' | 'month') => {
    const now = new Date();
    const end = new Date();
    
    switch (filter) {
      case 'today':
        end.setHours(now.getHours() + 24);
        break;
      case 'week':
        end.setDate(now.getDate() + 7);
        break;
      case 'month':
        end.setDate(now.getDate() + 30);
        break;
    }
    
    return { start: now.toISOString(), end: end.toISOString() };
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

  // Fetch BOOSTED offers (always shown, sorted by end_at - earliest expiry first)
  const { data: boostedOffers, isLoading: loadingBoosted } = useQuery({
    queryKey: ["boosted-offers", Array.from(boostedOfferIds)],
    queryFn: async () => {
      if (boostedOfferIds.size === 0) return [];

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('discounts')
        .select(`
          *,
          businesses!inner (name, logo_url, city, verified, stripe_payouts_enabled, accepts_direct_reservations)
        `)
        .in('id', Array.from(boostedOfferIds))
        .eq('active', true)
        .eq('businesses.verified', true)
        .lte('start_at', now)
        .gte('end_at', now)
        .order('end_at', { ascending: true }); // Earliest expiry first

      if (error) throw error;
      return data || [];
    },
    enabled: boostedOfferIds.size > 0,
  });

  // Fetch NON-BOOSTED offers (filtered by time, sorted by end_at - earliest expiry first)
  const { start, end } = getTimeBoundaries(timeFilter);

  const { data: regularOffers, isLoading: loadingRegular } = useQuery({
    queryKey: ["regular-offers", timeFilter, Array.from(boostedOfferIds)],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      let query = supabase
        .from('discounts')
        .select(`
          *,
          businesses!inner (name, logo_url, city, verified, stripe_payouts_enabled, accepts_direct_reservations)
        `)
        .eq('active', true)
        .eq('businesses.verified', true)
        .lte('start_at', now)
        .gte('end_at', now)
        // Filter: offer must be active within the selected time window
        .lte('start_at', end)
        .order('end_at', { ascending: true }); // Earliest expiry first

      // Exclude boosted offers
      if (boostedOfferIds.size > 0) {
        query = query.not('id', 'in', `(${Array.from(boostedOfferIds).join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Additional client-side filter: only offers that end within the time window
      // or are still active during the time window
      const filteredOffers = (data || []).filter(offer => {
        const offerEnd = new Date(offer.end_at);
        const windowEnd = new Date(end);
        // Offer should be active at some point during the window
        return offerEnd >= new Date(now);
      });

      return filteredOffers;
    },
  });

  const hasBoostedOffers = boostedOffers && boostedOffers.length > 0;
  const isLoading = loadingBoosted || loadingRegular;

  return (
    <div className="space-y-8">
      {/* BOOSTED ZONE - Always at top, not filtered */}
      {hasBoostedOffers && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-semibold">{t.boosted}</h2>
          </div>
          
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
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent text-accent-foreground text-xs font-medium rounded-full">
                    <Sparkles className="h-3 w-3" />
                  </span>
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

      {/* TIME FILTER ZONE */}
      <section className="space-y-4">
        {/* Time Tabs */}
        <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="today">{t.today}</TabsTrigger>
            <TabsTrigger value="week">{t.week}</TabsTrigger>
            <TabsTrigger value="month">{t.month}</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Regular Offers List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <OfferCardSkeleton key={i} />
            ))}
          </div>
        ) : regularOffers && regularOffers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <div className="text-center py-12 bg-muted/30 rounded-xl">
            <p className="text-lg font-medium text-muted-foreground">{t.noOffers}</p>
            <p className="text-sm text-muted-foreground mt-1">{t.noOffersDesc}</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Offers;
