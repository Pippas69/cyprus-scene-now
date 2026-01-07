import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { MapPin, Calendar, RefreshCw, ChevronUp, Filter, Map, ArrowUp } from "lucide-react";
import { FloatingActionButton, FABAction } from "@/components/ui/floating-action-button";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import EventCard from "@/components/EventCard";
import EventListItem from "@/components/EventListItem";
import EventCardSkeleton from "@/components/EventCardSkeleton";
import OfferCard from "@/components/OfferCard";
import OfferCardSkeleton from "@/components/OfferCardSkeleton";
import HierarchicalCategoryFilter from "@/components/HierarchicalCategoryFilter";

import MapWrapper from "@/components/map/MapWrapper";
import HeroCarousel from "@/components/feed/HeroCarousel";
import SmartSearchBar from "@/components/feed/SmartSearchBar";
import FeedSidebar from "@/components/feed/FeedSidebar";
import TimeAccessFilters from "@/components/feed/TimeAccessFilters";
import SortDropdown from "@/components/feed/SortDropdown";
import ViewModeToggle from "@/components/feed/ViewModeToggle";
import LocationSwitcher from "@/components/feed/LocationSwitcher";
import EmptyState from "@/components/feed/EmptyState";
import { FilterChips } from "@/components/feed/FilterChips";
import { BoostedProfilesScroller } from "@/components/feed/BoostedProfilesScroller";
import { ErrorState } from "@/components/ErrorState";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { PullIndicator } from "@/components/ui/pull-indicator";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/useLanguage";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useScrollMemory } from "@/hooks/useScrollMemory";
import { useStaggeredAnimation } from "@/hooks/useStaggeredAnimation";
import { useActiveProfileBoosts } from "@/hooks/useActiveProfileBoosts";
import { hapticFeedback } from "@/lib/haptics";
import { getPersonalizedScore, type ActiveBoost } from "@/lib/personalization";
import type { User } from "@supabase/supabase-js";

interface FeedProps {
  showNavbar?: boolean;
}

const Feed = ({ showNavbar = true }: FeedProps = {}) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState(1);
  const [timeAccessFilters, setTimeAccessFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("popular");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "compact">("card");
  const [searchParams, setSearchParams] = useState<{
    date: Date | null;
    time: string | null;
    partySize: number | null;
  }>({ date: null, time: null, partySize: null });
  const startYRef = useRef<number | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { language, setLanguage } = useLanguage();
  
  // Enable scroll memory
  useScrollMemory();
  
  // Get user preferences
  const { preferences, updatePreferences } = useUserPreferences(user?.id || "");
  
  // Initialize view mode from preferences or localStorage
  useEffect(() => {
    if (user && preferences?.feed_view_mode) {
      setViewMode(preferences.feed_view_mode as "card" | "compact");
    } else {
      const savedMode = localStorage.getItem("feed_view_mode") as "card" | "compact" | null;
      if (savedMode) setViewMode(savedMode);
    }
  }, [user, preferences]);
  
  // Handle view mode change
  const handleViewModeChange = (mode: "card" | "compact") => {
    setViewMode(mode);
    if (user) {
      updatePreferences({ feed_view_mode: mode });
    } else {
      localStorage.setItem("feed_view_mode", mode);
    }
  };
  
  const ITEMS_PER_PAGE = 12;
  const translations = {
    el: {
      title: "Ανακαλύψτε το ΦΟΜΟ",
      subtitle: "Δείτε τι συμβαίνει τώρα στην Κύπρο",
      loadMore: "Φόρτωση Περισσότερων",
      offers: "Προσφορές",
      offersSubtitle: "Αποκλειστικές εκπτώσεις από επιχειρήσεις",
      events: "Εκδηλώσεις",
    },
    en: {
      title: "Discover ΦΟΜΟ",
      subtitle: "See what's happening now in Cyprus",
      loadMore: "Load More",
      offers: "Offers",
      offersSubtitle: "Exclusive discounts from businesses",
      events: "Events",
    }
  };
  const t = translations[language];

  useEffect(() => {
    supabase.auth.getUser().then(({
      data: {
        user
      }
    }) => setUser(user));
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [selectedCategories, timeAccessFilters, sortBy, selectedCity]);

  // Scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll to results on filter changes
  useEffect(() => {
    if (resultsRef.current && (selectedCategories.length > 0 || selectedCity || timeAccessFilters.length > 0)) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [selectedCategories, selectedCity, timeAccessFilters]);

  const getTimeAccessFilterQuery = (query: any) => {
    const now = new Date();
    
    // Live Now filter
    if (timeAccessFilters.includes("liveNow")) {
      query = query
        .lte("start_at", now.toISOString())
        .gte("end_at", now.toISOString());
    }
    
    // Tonight filter (6PM - midnight today)
    if (timeAccessFilters.includes("tonight")) {
      const start = new Date(now);
      start.setHours(18, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      query = query.gte("start_at", start.toISOString()).lte("start_at", end.toISOString());
    }
    
    // Mon-Fri filter (weekdays of current week)
    if (timeAccessFilters.includes("monFri")) {
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      monday.setHours(0, 0, 0, 0);
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);
      friday.setHours(23, 59, 59, 999);
      query = query.gte("start_at", monday.toISOString()).lte("start_at", friday.toISOString());
    }
    
    // The Weekend filter (Saturday-Sunday)
    if (timeAccessFilters.includes("theWeekend")) {
      const day = now.getDay();
      const daysUntilSaturday = day === 0 ? 6 : 6 - day;
      const saturday = new Date(now);
      saturday.setDate(now.getDate() + daysUntilSaturday);
      saturday.setHours(0, 0, 0, 0);
      const sunday = new Date(saturday);
      sunday.setDate(saturday.getDate() + 1);
      sunday.setHours(23, 59, 59, 999);
      query = query.gte("start_at", saturday.toISOString()).lte("start_at", sunday.toISOString());
    }
    
    // This Month filter
    if (timeAccessFilters.includes("thisMonth")) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      query = query.gte("start_at", startOfMonth.toISOString()).lte("start_at", endOfMonth.toISOString());
    }
    
    // Free Entrance filter
    if (timeAccessFilters.includes("freeEntrance")) {
      query = query.eq("price_tier", "free");
    }
    
    // With Reservations filter
    if (timeAccessFilters.includes("withReservations")) {
      query = query.eq("accepts_reservations", true);
    }
    
    // With Tickets filter - events that have ticket tiers
    if (timeAccessFilters.includes("withTickets")) {
      query = query.not("external_ticket_url", "is", null);
    }
    
    return query;
  };

  const applySorting = (data: any[]) => {
    if (!data) return [];
    const priceOrder: any = {
      free: 0,
      low: 1,
      medium: 2,
      high: 3
    };
    const priceOrderDesc: any = {
      high: 0,
      medium: 1,
      low: 2,
      free: 3
    };
    switch (sortBy) {
      case "popular":
        return data.sort((a, b) => (b.realtime_stats?.[0]?.interested_count || 0) + (b.realtime_stats?.[0]?.going_count || 0) * 2 - ((a.realtime_stats?.[0]?.interested_count || 0) + (a.realtime_stats?.[0]?.going_count || 0) * 2));
      case "newest":
        return data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "startingSoon":
        return data.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
      case "priceLowHigh":
        return data.sort((a, b) => (priceOrder[a.price_tier] || 0) - (priceOrder[b.price_tier] || 0));
      case "priceHighLow":
        return data.sort((a, b) => (priceOrderDesc[a.price_tier] || 0) - (priceOrderDesc[b.price_tier] || 0));
      default:
        return data;
    }
  };

  const {
    data: events,
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents
  } = useQuery({
    queryKey: ['events', selectedCategories, page, timeAccessFilters, sortBy, selectedCity],
    queryFn: async () => {
      let query = supabase.from('events').select(`*, businesses!inner (name, logo_url, verified, city), realtime_stats (interested_count, going_count)`).eq('businesses.verified', true);
      if (selectedCategories.length > 0) query = query.overlaps('category', selectedCategories);
      if (selectedCity) query = query.eq('businesses.city', selectedCity);
      query = getTimeAccessFilterQuery(query);
      query = query.gte('end_at', new Date().toISOString()).order('start_at', { ascending: true });
      query = query.limit(ITEMS_PER_PAGE * page);
      const {
        data,
        error
      } = await query;
      if (error) throw error;
      return applySorting(data || []);
    },
  });

  const {
    data: personalizedData
  } = useQuery({
    queryKey: ['personalized-events', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const [profileRes, rsvpsRes, favoritesRes] = await Promise.all([supabase.from('profiles').select('city, interests').eq('id', user.id).single(), supabase.from('rsvps').select('event_id, events(category, start_at)').eq('user_id', user.id).limit(50), supabase.from('favorites').select('event_id, events(category)').eq('user_id', user.id)]);
      return {
        profile: profileRes.data,
        rsvps: rsvpsRes.data || [],
        favorites: favoritesRes.data || []
      };
    },
    enabled: !!user
  });

  // Fetch active boosts to apply to personalization
  const {
    data: activeBoosts
  } = useQuery({
    queryKey: ['active-boosts'],
    queryFn: async () => {
      const now = new Date().toISOString().split('T')[0]; // Just the date part
      const { data, error } = await supabase
        .from('event_boosts')
        .select('event_id, targeting_quality, boost_tier')
        .eq('status', 'active')
        .lte('start_date', now)
        .gte('end_date', now);
      
      if (error) {
        console.error('Error fetching active boosts:', error);
        return [];
      }
      return data as ActiveBoost[];
    },
    staleTime: 60000 // Cache for 1 minute
  });

  // Fetch active offers (discounts)
  const {
    data: offers,
    isLoading: offersLoading
  } = useQuery({
    queryKey: ['feed-offers', selectedCity],
    queryFn: async () => {
      const now = new Date().toISOString();
      let query = supabase
        .from('discounts')
        .select(`
          id, title, description, percent_off, original_price_cents, 
          start_at, end_at, business_id, terms, max_per_user,
          businesses!inner (name, logo_url, city, verified, stripe_payouts_enabled)
        `)
        .eq('active', true)
        .eq('businesses.verified', true)
        .lte('start_at', now)
        .gte('end_at', now)
        .gt('original_price_cents', 0);
      
      if (selectedCity) {
        query = query.eq('businesses.city', selectedCity);
      }
      
      const { data, error } = await query.limit(6);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000
  });

  // Fetch offer boosts for prioritization
  const {
    data: offerBoosts
  } = useQuery({
    queryKey: ['active-offer-boosts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offer_boosts')
        .select('discount_id, targeting_quality, commission_percent')
        .eq('active', true);
      
      if (error) {
        console.error('Error fetching offer boosts:', error);
        return [];
      }
      return data || [];
    },
    staleTime: 60000
  });

  // Fetch active profile boosts for Featured Businesses scroller
  const { data: profileBoosts } = useActiveProfileBoosts(selectedCity);

  // Prioritize boosted offers
  const getPersonalizedOffers = () => {
    if (!offers) return [];
    
    return offers.map(offer => {
      const boost = offerBoosts?.find(b => b.discount_id === offer.id);
      const boostScore = boost ? boost.targeting_quality * 10 : 0;
      return { ...offer, boostScore };
    }).sort((a, b) => b.boostScore - a.boostScore);
  };

  const displayedOffers = getPersonalizedOffers();

  const getPersonalizedEvents = () => {
    if (!events) return [];
    
    // Apply personalization with boosts (works for all users, not just logged in)
    return events.map(event => ({
      ...event,
      personalizedScore: getPersonalizedScore(
        event, 
        personalizedData?.profile || null, 
        personalizedData?.rsvps || [], 
        personalizedData?.favorites || [],
        activeBoosts || []
      )
    })).sort((a, b) => b.personalizedScore - a.personalizedScore);
  };

  useEffect(() => {
    const eventsChannel = supabase.channel('events-feed').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'events'
    }, () => queryClient.invalidateQueries({
      queryKey: ['events']
    })).subscribe();
    return () => {
      supabase.removeChannel(eventsChannel);
    };
  }, [queryClient]);

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
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
    setIsPulling(false);
    setPullDistance(0);
    startYRef.current = null;
  };

  const handleClearFilters = () => {
    setSelectedCategories([]);
    setTimeAccessFilters([]);
    setSelectedCity(null);
    setPage(1);
  };
  
  const handleRemoveCategory = (category: string) => {
    setSelectedCategories(prev => prev.filter(c => c !== category));
  };
  
  const handleRemoveQuickFilter = (filter: string) => {
    setTimeAccessFilters(prev => prev.filter(f => f !== filter));
  };
  
  const handleRemoveCity = () => {
    setSelectedCity(null);
  };

  // Always apply personalization to include boost effects for all users
  const displayedEvents = activeBoosts?.length || (user && personalizedData) ? getPersonalizedEvents() : events;
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Stagger animation config
  const { getStaggerDelay } = useStaggeredAnimation({ baseDelay: 0, delayIncrement: 60, maxDelay: 400 });

  // Animation variants for staggered grid
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 30,
      },
    },
  };

  // Helper function to render events based on view mode
  const renderEvents = (events: any[]) => {
    if (!events || events.length === 0) return null;

    if (viewMode === "compact") {
      return (
        <motion.div 
          className="flex flex-col gap-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {events.map((event: any, index: number) => (
            <motion.div key={event.id} variants={itemVariants}>
              <EventListItem
                event={{
                  ...event,
                  interested_count: event.realtime_stats?.[0]?.interested_count || 0,
                  going_count: event.realtime_stats?.[0]?.going_count || 0
                }}
                interestedCount={event.realtime_stats?.[0]?.interested_count || 0}
                goingCount={event.realtime_stats?.[0]?.going_count || 0}
                userRSVP={event.rsvps?.[0] || null}
                onRSVPChange={(eventId, newStatus) => {
                  queryClient.invalidateQueries({ queryKey: ['events'] });
                }}
                user={user}
                language={language}
              />
            </motion.div>
          ))}
        </motion.div>
      );
    }

    return (
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {events.map((event: any, index: number) => (
          <motion.div key={event.id} variants={itemVariants}>
            <EventCard
              event={{
                ...event,
                interested_count: event.realtime_stats?.[0]?.interested_count || 0,
                going_count: event.realtime_stats?.[0]?.going_count || 0
              }}
              language={language}
              user={user}
            />
          </motion.div>
        ))}
      </motion.div>
    );
  };

  const handleSmartSearch = (params: { date: Date | null; time: string | null; partySize: number | null }) => {
    setSearchParams(params);
    // Apply time-based filters
    if (params.time === "evening" || params.time === "night") {
      setTimeAccessFilters(prev => {
        const filtered = prev.filter(f => !["tonight", "liveNow"].includes(f));
        return [...filtered, "tonight"];
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex max-w-full overflow-x-hidden">
      {/* Desktop Sidebar */}
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
      
      {/* Mobile header when inside UserLayout */}
      {!showNavbar && (
        <div className="sticky top-0 z-40 bg-background border-b shadow-sm overflow-hidden">
          <div className="px-3 py-3 space-y-3 max-w-full">
            <h1 className="text-xl font-bold text-foreground">{t.title}</h1>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <LocationSwitcher language={language} selectedCity={selectedCity} onCityChange={setSelectedCity} />
            </div>
            <HierarchicalCategoryFilter language={language} selectedCategories={selectedCategories} onCategoryChange={setSelectedCategories} />
            {(selectedCategories.length > 0 || timeAccessFilters.length > 0 || selectedCity) && (
              <FilterChips
                categories={selectedCategories}
                quickFilters={timeAccessFilters}
                selectedCity={selectedCity}
                onRemoveCategory={handleRemoveCategory}
                onRemoveQuickFilter={handleRemoveQuickFilter}
                onRemoveCity={handleRemoveCity}
                onClearAll={handleClearFilters}
                language={language}
              />
            )}
          </div>
        </div>
      )}

      {showNavbar && (
        <div className="sticky top-0 z-40 bg-background border-b shadow-sm">
          <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-3 overflow-hidden">
            <div className="flex flex-col gap-3">
              <div>
                <h1 className="text-3xl font-bold mb-1 text-foreground">{t.title}</h1>
                <p className="text-muted-foreground text-sm">{t.subtitle}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <LocationSwitcher language={language} selectedCity={selectedCity} onCityChange={setSelectedCity} />
                <HierarchicalCategoryFilter language={language} selectedCategories={selectedCategories} onCategoryChange={setSelectedCategories} />
              </div>
              <FilterChips
                categories={selectedCategories}
                quickFilters={timeAccessFilters}
                selectedCity={selectedCity}
                onRemoveCategory={handleRemoveCategory}
                onRemoveQuickFilter={handleRemoveQuickFilter}
                onRemoveCity={handleRemoveCity}
                onClearAll={handleClearFilters}
                language={language}
              />
            </div>
          </div>
        </div>
      )}

      {/* Smart Search Bar - RSRVIN Inspired */}
      {showNavbar && (
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 -mt-4 mb-6 relative z-30">
          <SmartSearchBar
            language={language}
            onSearch={handleSmartSearch}
            className="max-w-4xl mx-auto"
          />
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8 overflow-hidden">
        <div className="space-y-6">
          {/* Boosted Profiles Scroller - Featured Businesses */}
          {profileBoosts && profileBoosts.length > 0 && (
            <BoostedProfilesScroller profiles={profileBoosts} language={language} />
          )}

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TimeAccessFilters 
              language={language} 
              selectedFilters={timeAccessFilters} 
              onFilterChange={setTimeAccessFilters} 
            />
            <div className="flex items-center gap-2 flex-wrap">
              <ViewModeToggle 
                viewMode={viewMode} 
                onViewModeChange={handleViewModeChange}
                language={language}
              />
              <SortDropdown language={language} sortBy={sortBy} onSortChange={setSortBy} />
            </div>
          </div>

          {/* Results container ref for smooth scroll */}
          <div ref={resultsRef} />

          {/* Offers Section */}
          {displayedOffers && displayedOffers.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{t.offers}</h2>
                  <p className="text-sm text-muted-foreground">{t.offersSubtitle}</p>
                </div>
              </div>
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {displayedOffers.map((offer: any) => (
                  <motion.div key={offer.id} variants={itemVariants}>
                    <OfferCard
                      offer={offer}
                      language={language}
                      user={user}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}

          {offersLoading && (
            <div className="mb-8">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-foreground">{t.offers}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => <OfferCardSkeleton key={i} />)}
              </div>
            </div>
          )}

          {/* Events Section */}
          {(displayedOffers && displayedOffers.length > 0) && (
            <h2 className="text-xl font-bold text-foreground mb-4">{t.events}</h2>
          )}

          <div className="animate-fade-in">
            {eventsLoading ? (
              <div className={viewMode === "card" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-2"}>
                {Array.from({ length: 6 }).map((_, i) => <EventCardSkeleton key={i} />)}
              </div>
            ) : eventsError ? (
              <ErrorState
                title={language === 'el' ? 'Σφάλμα φόρτωσης' : 'Failed to load events'}
                message={language === 'el' 
                  ? `Δεν ήταν δυνατή η φόρτωση των εκδηλώσεων: ${(eventsError as Error).message}` 
                  : `Could not load events: ${(eventsError as Error).message}`}
                onRetry={() => refetchEvents()}
                showRetry
              />
            ) : displayedEvents && displayedEvents.length > 0 ? (
              <>
                {renderEvents(displayedEvents)}
                {displayedEvents.length >= ITEMS_PER_PAGE * page && (
                  <div className="flex justify-center mt-8">
                    <Button onClick={() => setPage(p => p + 1)} variant="outline" size="lg">
                      {t.loadMore}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState 
                type="no-results" 
                filters={{ categories: selectedCategories, city: selectedCity }} 
                onClearFilters={handleClearFilters} 
                language={language} 
              />
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button with Quick Actions */}
      {showScrollTop && (
        <FloatingActionButton
          icon={<ArrowUp size={24} />}
          onClick={scrollToTop}
          actions={[
            {
              icon: <Filter size={20} />,
              label: language === 'el' ? 'Φίλτρα' : 'Filters',
              onClick: () => {
                const filtersEl = document.querySelector('[data-filters]');
                filtersEl?.scrollIntoView({ behavior: 'smooth' });
              }
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
