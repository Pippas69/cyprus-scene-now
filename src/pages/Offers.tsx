import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, X, Tag, Percent, Clock, Sparkles } from "lucide-react";
import OfferCard from "@/components/OfferCard";
import OfferCardSkeleton from "@/components/OfferCardSkeleton";
import SignupModal from "@/components/SignupModal";
import LocationSwitcher from "@/components/feed/LocationSwitcher";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/useDebounce";

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
      title: "Ανακαλύψτε Προσφορές",
      subtitle: "Αποκλειστικές εκπτώσεις από επιχειρήσεις στην Κύπρο",
      loginRequired: "Συνδεθείτε για να δείτε όλες τις προσφορές!",
      loginSubtitle: "Γίνετε μέλος της κοινότητας ΦΟΜΟ και εξοικονομήστε χρήματα.",
      joinButton: "Εγγραφή στο ΦΟΜΟ",
    },
    en: {
      title: "Discover Offers",
      subtitle: "Exclusive deals from businesses in Cyprus",
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
      {/* Hero Section */}
      <div className="relative py-16 overflow-hidden bg-gradient-to-br from-accent via-primary to-primary">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/50 to-primary opacity-90" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-10 blur-3xl">
          <div className="w-full h-full rounded-full bg-accent" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-center text-primary-foreground"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Tag className="h-8 w-8" />
            </div>
            <h1 className="font-cinzel text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              {t.title}
            </h1>
            <p className="font-inter text-lg md:text-xl lg:text-2xl opacity-90">
              {t.subtitle}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
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
            transition={{ duration: 1.2 }}
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
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      return data || [];
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
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
              transition={{ delay: index * 0.1, duration: 0.6 }}
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
        transition={{ delay: 0.5, duration: 0.8 }}
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

// Full View for Logged-in Users
const FullOffersView = ({ language, user }: { language: "el" | "en"; user: any }) => {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [discountFilter, setDiscountFilter] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<string | null>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const text = {
    el: {
      search: "Αναζήτηση προσφορών...",
      filters: "Φίλτρα",
      clearFilters: "Καθαρισμός",
      noResults: "Δεν βρέθηκαν προσφορές",
      noResultsDesc: "Δοκιμάστε να αλλάξετε τα φίλτρα σας",
      discount10: "10-25%",
      discount25: "25-50%",
      discount50: "50%+",
      endingSoon: "Λήγει Σύντομα",
      newOffers: "Νέες Προσφορές",
      boosted: "Προτεινόμενες",
    },
    en: {
      search: "Search offers...",
      filters: "Filters",
      clearFilters: "Clear",
      noResults: "No offers found",
      noResultsDesc: "Try adjusting your filters",
      discount10: "10-25%",
      discount25: "25-50%",
      discount50: "50%+",
      endingSoon: "Ending Soon",
      newOffers: "New Offers",
      boosted: "Featured",
    },
  };

  const t = text[language];

  // Fetch offers with filters
  const { data: offers, isLoading } = useQuery({
    queryKey: ['offers-full', selectedCity, debouncedSearch, discountFilter, timeFilter],
    queryFn: async () => {
      const now = new Date().toISOString();
      let query = supabase
        .from('discounts')
        .select(`
          *,
          businesses!inner (name, logo_url, city, verified, stripe_payouts_enabled)
        `)
        .eq('active', true)
        .eq('businesses.verified', true)
        .lte('start_at', now)
        .gte('end_at', now)
        .gt('original_price_cents', 0);

      // City filter
      if (selectedCity) {
        query = query.eq('businesses.city', selectedCity);
      }

      // Search filter
      if (debouncedSearch) {
        query = query.or(`title.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`);
      }

      // Discount percentage filter
      if (discountFilter === '10-25') {
        query = query.gte('percent_off', 10).lt('percent_off', 25);
      } else if (discountFilter === '25-50') {
        query = query.gte('percent_off', 25).lt('percent_off', 50);
      } else if (discountFilter === '50+') {
        query = query.gte('percent_off', 50);
      }

      // Time filter
      if (timeFilter === 'ending') {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        query = query.lte('end_at', sevenDaysFromNow.toISOString());
      } else if (timeFilter === 'new') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        query = query.gte('created_at', sevenDaysAgo.toISOString());
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch active boosts for prioritization
  const { data: boosts } = useQuery({
    queryKey: ['offer-boosts-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offer_boosts')
        .select('discount_id, targeting_quality')
        .eq('active', true);

      if (error) throw error;
      return data || [];
    },
  });

  // Sort offers with boosted ones first
  const sortedOffers = offers?.sort((a: any, b: any) => {
    const aBoost = boosts?.find((boost: any) => boost.discount_id === a.id);
    const bBoost = boosts?.find((boost: any) => boost.discount_id === b.id);
    
    if (aBoost && !bBoost) return -1;
    if (!aBoost && bBoost) return 1;
    if (aBoost && bBoost) {
      return (bBoost.targeting_quality || 0) - (aBoost.targeting_quality || 0);
    }
    return 0;
  });

  const hasActiveFilters = selectedCity || discountFilter || timeFilter || debouncedSearch;

  const clearFilters = () => {
    setSelectedCity(null);
    setDiscountFilter(null);
    setTimeFilter(null);
    setSearchQuery("");
  };

  return (
    <div className="space-y-6">
      {/* Filters Row */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        {/* Search */}
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Location */}
        <LocationSwitcher
          language={language}
          selectedCity={selectedCity}
          onCityChange={setSelectedCity}
        />
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {/* Discount Filters */}
        <Badge
          variant={discountFilter === '10-25' ? 'default' : 'outline'}
          className="cursor-pointer hover:bg-primary/10"
          onClick={() => setDiscountFilter(discountFilter === '10-25' ? null : '10-25')}
        >
          <Percent className="h-3 w-3 mr-1" />
          {t.discount10}
        </Badge>
        <Badge
          variant={discountFilter === '25-50' ? 'default' : 'outline'}
          className="cursor-pointer hover:bg-primary/10"
          onClick={() => setDiscountFilter(discountFilter === '25-50' ? null : '25-50')}
        >
          <Percent className="h-3 w-3 mr-1" />
          {t.discount25}
        </Badge>
        <Badge
          variant={discountFilter === '50+' ? 'default' : 'outline'}
          className="cursor-pointer hover:bg-primary/10"
          onClick={() => setDiscountFilter(discountFilter === '50+' ? null : '50+')}
        >
          <Percent className="h-3 w-3 mr-1" />
          {t.discount50}
        </Badge>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Time Filters */}
        <Badge
          variant={timeFilter === 'ending' ? 'default' : 'outline'}
          className="cursor-pointer hover:bg-primary/10"
          onClick={() => setTimeFilter(timeFilter === 'ending' ? null : 'ending')}
        >
          <Clock className="h-3 w-3 mr-1" />
          {t.endingSoon}
        </Badge>
        <Badge
          variant={timeFilter === 'new' ? 'default' : 'outline'}
          className="cursor-pointer hover:bg-primary/10"
          onClick={() => setTimeFilter(timeFilter === 'new' ? null : 'new')}
        >
          <Sparkles className="h-3 w-3 mr-1" />
          {t.newOffers}
        </Badge>

        {hasActiveFilters && (
          <>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-6 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              {t.clearFilters}
            </Button>
          </>
        )}
      </div>

      {/* Offers Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <OfferCardSkeleton key={i} />
          ))}
        </div>
      ) : sortedOffers && sortedOffers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedOffers.map((offer: any, index: number) => {
            const isBoosted = boosts?.some((b: any) => b.discount_id === offer.id);
            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                className="relative"
              >
                {isBoosted && (
                  <Badge className="absolute -top-2 -right-2 z-10 bg-accent text-accent-foreground">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {t.boosted}
                  </Badge>
                )}
                <OfferCard 
                  offer={offer}
                  language={language}
                  user={user}
                />
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">{t.noResults}</h3>
          <p className="text-muted-foreground">{t.noResultsDesc}</p>
          {hasActiveFilters && (
            <Button variant="outline" className="mt-4" onClick={clearFilters}>
              {t.clearFilters}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default Offers;
