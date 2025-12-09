import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { MapPin, Calendar, TrendingUp, RefreshCw, ChevronUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import EventCard from "@/components/EventCard";
import EventListItem from "@/components/EventListItem";
import EventCardSkeleton from "@/components/EventCardSkeleton";
import OfferCard from "@/components/OfferCard";
import OfferCardSkeleton from "@/components/OfferCardSkeleton";
import CategoryFilter from "@/components/CategoryFilter";
import LanguageToggle from "@/components/LanguageToggle";
import MapWrapper from "@/components/map/MapWrapper";
import HeroCarousel from "@/components/feed/HeroCarousel";
import SmartSearchBar from "@/components/feed/SmartSearchBar";
import FeedSidebar from "@/components/feed/FeedSidebar";
import QuickFilters from "@/components/feed/QuickFilters";
import SortDropdown from "@/components/feed/SortDropdown";
import ViewModeToggle from "@/components/feed/ViewModeToggle";
import LocationSwitcher from "@/components/feed/LocationSwitcher";
import EmptyState from "@/components/feed/EmptyState";
import { FilterChips } from "@/components/feed/FilterChips";
import { ErrorState } from "@/components/ErrorState";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { PullIndicator } from "@/components/ui/pull-indicator";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/useLanguage";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useScrollMemory } from "@/hooks/useScrollMemory";
import { hapticFeedback } from "@/lib/haptics";
import { getPersonalizedScore } from "@/lib/personalization";
import type { User } from "@supabase/supabase-js";

interface FeedProps {
  showNavbar?: boolean;
}

const Feed = ({ showNavbar = true }: FeedProps = {}) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("trending");
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState(1);
  const [quickFilters, setQuickFilters] = useState<string[]>([]);
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
      trending: "Δημοφιλή",
      upcoming: "Επερχόμενα",
      forYou: "Για 'Σένα",
      offers: "Προσφορές",
      map: "Χάρτης",
      loadMore: "Φόρτωση Περισσότερων",
      loginToSeePersonalized: "Συνδεθείτε για εξατομικευμένες προτάσεις",
      login: "Σύνδεση"
    },
    en: {
      title: "Discover ΦΟΜΟ",
      subtitle: "See what's happening now in Cyprus",
      trending: "Trending",
      upcoming: "Upcoming",
      forYou: "For You",
      offers: "Offers",
      map: "Map",
      loadMore: "Load More",
      loginToSeePersonalized: "Login to see personalized recommendations",
      login: "Login"
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
  }, [activeTab, selectedCategories, quickFilters, sortBy, selectedCity]);

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
    if (resultsRef.current && (selectedCategories.length > 0 || selectedCity || quickFilters.length > 0)) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [selectedCategories, selectedCity, quickFilters]);
  const getQuickFilterQuery = (query: any) => {
    const now = new Date();
    if (quickFilters.includes("tonight")) {
      const start = new Date(now);
      start.setHours(18, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      query = query.gte("start_at", start.toISOString()).lte("start_at", end.toISOString());
    }
    if (quickFilters.includes("weekend")) {
      const day = now.getDay();
      const daysUntilFriday = day <= 5 ? 5 - day : 7 - day + 5;
      const friday = new Date(now);
      friday.setDate(now.getDate() + daysUntilFriday);
      friday.setHours(0, 0, 0, 0);
      const sunday = new Date(friday);
      sunday.setDate(friday.getDate() + 2);
      sunday.setHours(23, 59, 59, 999);
      query = query.gte("start_at", friday.toISOString()).lte("start_at", sunday.toISOString());
    }
    if (quickFilters.includes("free")) query = query.eq("price_tier", "free");
    if (quickFilters.includes("withReservations")) query = query.eq("accepts_reservations", true);
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
    isLoading: eventsLoading
  } = useQuery({
    queryKey: ['events', selectedCategories, activeTab, page, quickFilters, sortBy, selectedCity],
    queryFn: async () => {
      let query = supabase.from('events').select(`*, businesses!inner (name, logo_url, verified, city), realtime_stats (interested_count, going_count)`).eq('businesses.verified', true);
      if (selectedCategories.length > 0) query = query.overlaps('category', selectedCategories);
      if (selectedCity) query = query.eq('businesses.city', selectedCity);
      query = getQuickFilterQuery(query);
      if (activeTab === 'trending') query = query.order('created_at', {
        ascending: false
      });else if (activeTab === 'upcoming' || activeTab === 'forYou') query = query.gte('start_at', new Date().toISOString()).order('start_at', {
        ascending: true
      });
      query = query.limit(ITEMS_PER_PAGE * page);
      const {
        data,
        error
      } = await query;
      if (error) throw error;
      return applySorting(data || []);
    },
    enabled: activeTab !== 'offers' && activeTab !== 'map'
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
    enabled: activeTab === 'forYou' && !!user
  });
  const getPersonalizedEvents = () => {
    if (!personalizedData || !events) return [];
    return events.map(event => ({
      ...event,
      personalizedScore: getPersonalizedScore(event, personalizedData.profile, personalizedData.rsvps, personalizedData.favorites)
    })).sort((a, b) => b.personalizedScore - a.personalizedScore).slice(0, 20);
  };
  const {
    data: offers,
    isLoading: offersLoading
  } = useQuery({
    queryKey: ['offers', selectedCategories, selectedCity],
    queryFn: async () => {
      let query = supabase.from('discounts').select(`*, businesses!inner (name, logo_url, city, verified)`).eq('active', true).eq('businesses.verified', true).gte('end_at', new Date().toISOString()).order('created_at', {
        ascending: false
      });
      if (selectedCategories.length > 0) query = query.overlaps('businesses.category', selectedCategories);
      if (selectedCity) query = query.eq('businesses.city', selectedCity);
      const {
        data,
        error
      } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: activeTab === 'offers'
  });
  useEffect(() => {
    const eventsChannel = supabase.channel('events-feed').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'events'
    }, () => queryClient.invalidateQueries({
      queryKey: ['events']
    })).subscribe();
    const offersChannel = supabase.channel('offers-feed').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'discounts'
    }, () => queryClient.invalidateQueries({
      queryKey: ['offers']
    })).subscribe();
    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(offersChannel);
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
      queryClient.invalidateQueries({ queryKey: ['offers'] });
    }
    setIsPulling(false);
    setPullDistance(0);
    startYRef.current = null;
  };
  const handleClearFilters = () => {
    setSelectedCategories([]);
    setQuickFilters([]);
    setSelectedCity(null);
    setPage(1);
  };
  
  const handleRemoveCategory = (category: string) => {
    setSelectedCategories(prev => prev.filter(c => c !== category));
  };
  
  const handleRemoveQuickFilter = (filter: string) => {
    setQuickFilters(prev => prev.filter(f => f !== filter));
  };
  
  const handleRemoveCity = () => {
    setSelectedCity(null);
  };
  
  const handleQuickFilterToggle = (filter: string) => 
    setQuickFilters(prev => prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]);
  const displayedEvents = activeTab === 'forYou' ? getPersonalizedEvents() : events;
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper function to render events based on view mode
  const renderEvents = (events: any[]) => {
    if (!events || events.length === 0) return null;

    if (viewMode === "compact") {
      return (
        <div className="flex flex-col gap-2">
          {events.map((event: any) => (
            <EventListItem
              key={event.id}
              event={{
                ...event,
                interested_count: event.realtime_stats?.[0]?.interested_count || 0,
                going_count: event.realtime_stats?.[0]?.going_count || 0
              }}
              interestedCount={event.realtime_stats?.[0]?.interested_count || 0}
              goingCount={event.realtime_stats?.[0]?.going_count || 0}
              userRSVP={event.rsvps?.[0] || null}
              onRSVPChange={(eventId, newStatus) => {
                // Handle RSVP change
                queryClient.invalidateQueries({ queryKey: ['events'] });
              }}
              user={user}
              language={language}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event: any, index: number) => (
          <EventCard
            key={event.id}
            event={{
              ...event,
              interested_count: event.realtime_stats?.[0]?.interested_count || 0,
              going_count: event.realtime_stats?.[0]?.going_count || 0
            }}
            language={language}
            user={user}
            style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
            className="animate-fade-in"
          />
        ))}
      </div>
    );
  };
  const handleSmartSearch = (params: { date: Date | null; time: string | null; partySize: number | null }) => {
    setSearchParams(params);
    // Apply time-based quick filters
    if (params.time === "morning") {
      setQuickFilters(prev => [...prev.filter(f => !["tonight", "weekend"].includes(f))]);
    } else if (params.time === "evening" || params.time === "night") {
      setQuickFilters(prev => {
        const filtered = prev.filter(f => !["tonight", "weekend"].includes(f));
        return [...filtered, "tonight"];
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      {showNavbar && <FeedSidebar language={language} user={user} />}

      <div className="flex-1">
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
        <div className="sticky top-0 z-40 bg-background border-b shadow-sm">
          <div className="px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-foreground">{t.title}</h1>
              <LanguageToggle />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <LocationSwitcher language={language} selectedCity={selectedCity} onCityChange={setSelectedCity} />
            </div>
            <div className="overflow-hidden">
              <CategoryFilter language={language} selectedCategories={selectedCategories} onCategoryChange={setSelectedCategories} />
            </div>
            {(selectedCategories.length > 0 || quickFilters.length > 0 || selectedCity) && (
              <FilterChips
                categories={selectedCategories}
                quickFilters={quickFilters}
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
          <div className="container mx-auto px-4 py-3">
            <div className="flex flex-col gap-3">
              <div>
                <h1 className="text-3xl font-bold mb-1 text-foreground">{t.title}</h1>
                <p className="text-muted-foreground text-sm">{t.subtitle}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <LocationSwitcher language={language} selectedCity={selectedCity} onCityChange={setSelectedCity} />
                <CategoryFilter language={language} selectedCategories={selectedCategories} onCategoryChange={setSelectedCategories} />
              </div>
              <FilterChips
                categories={selectedCategories}
                quickFilters={quickFilters}
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
        <div className="container mx-auto px-4 -mt-4 mb-6 relative z-30">
          <SmartSearchBar
            language={language}
            onSearch={handleSmartSearch}
            className="max-w-4xl mx-auto"
          />
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList className="bg-muted">
              <TabsTrigger value="trending" className="gap-2"><TrendingUp size={16} />{t.trending}</TabsTrigger>
              <TabsTrigger value="upcoming" className="gap-2"><Calendar size={16} />{t.upcoming}</TabsTrigger>
              {user && <TabsTrigger value="forYou">{t.forYou}</TabsTrigger>}
              <TabsTrigger value="offers">{t.offers}</TabsTrigger>
              <TabsTrigger value="map" className="gap-2"><MapPin size={16} />{t.map}</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 flex-wrap">
              {activeTab !== 'offers' && activeTab !== 'map' && (
                <ViewModeToggle 
                  viewMode={viewMode} 
                  onViewModeChange={handleViewModeChange}
                  language={language}
                />
              )}
              <SortDropdown language={language} sortBy={sortBy} onSortChange={setSortBy} />
            </div>
          </div>

          {activeTab !== 'offers' && activeTab !== 'map' && <QuickFilters language={language} selectedFilters={quickFilters} onFilterToggle={handleQuickFilterToggle} />}

          {/* Results container ref for smooth scroll */}
          <div ref={resultsRef} />

          <TabsContent value="trending" className="mt-6 animate-fade-in">
            {eventsLoading ? (
              <div className={viewMode === "card" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-2"}>
                {Array.from({ length: 6 }).map((_, i) => <EventCardSkeleton key={i} />)}
              </div>
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
          </TabsContent>

          <TabsContent value="upcoming" className="mt-6 animate-fade-in">
            {eventsLoading ? (
              <div className={viewMode === "card" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-2"}>
                {Array.from({ length: 6 }).map((_, i) => <EventCardSkeleton key={i} />)}
              </div>
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
                type="no-upcoming" 
                filters={{ categories: selectedCategories, city: selectedCity }} 
                onClearFilters={handleClearFilters} 
                language={language} 
              />
            )}
          </TabsContent>

          <TabsContent value="forYou" className="mt-6 animate-fade-in">
            {!user ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">{t.loginToSeePersonalized}</p>
                <Button asChild>
                  <Link to="/login">{t.login}</Link>
                </Button>
              </div>
            ) : eventsLoading ? (
              <div className={viewMode === "card" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-2"}>
                {Array.from({ length: 6 }).map((_, i) => <EventCardSkeleton key={i} />)}
              </div>
            ) : displayedEvents && displayedEvents.length > 0 ? (
              renderEvents(displayedEvents)
            ) : (
              <EmptyState 
                type="no-results" 
                filters={{ categories: selectedCategories, city: selectedCity }} 
                onClearFilters={handleClearFilters} 
                language={language} 
              />
            )}
          </TabsContent>

          <TabsContent value="offers" className="mt-6 animate-fade-in">
            {offersLoading ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({
              length: 4
            }).map((_, i) => <EventCardSkeleton key={i} />)}</div> : offers && offers.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{offers.map((offer: any, index: number) => <OfferCard key={offer.id} offer={offer} language={language} style={{
              animationDelay: `${Math.min(index * 50, 500)}ms`
            }} className="animate-fade-in" />)}</div> : <EmptyState type="no-offers" filters={{
            categories: selectedCategories,
            city: selectedCity
          }} onClearFilters={handleClearFilters} language={language} />}
          </TabsContent>

          <TabsContent value="map" className="mt-6 animate-fade-in">
            <div className="h-[70vh]"><MapWrapper city={selectedCity || ""} neighborhood="" selectedCategories={selectedCategories} eventCounts={{}} /></div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && <Button onClick={scrollToTop} className="fixed bottom-24 md:bottom-8 right-8 z-50 rounded-full w-12 h-12 p-0 shadow-glow animate-fade-in" size="icon" aria-label="Scroll to top">
          <ChevronUp size={24} />
        </Button>}
      </div>
    </div>
  );
};
export default Feed;