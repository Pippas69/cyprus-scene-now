import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";

import { UnifiedEventCard } from "@/components/feed/UnifiedEventCard";
import EventCardSkeleton from "@/components/EventCardSkeleton";
import LocationSwitcher from "@/components/feed/LocationSwitcher";
import HierarchicalCategoryFilter from "@/components/HierarchicalCategoryFilter";
import { FilterChips } from "@/components/feed/FilterChips";
import { mapFilterIdsToDbCategories } from "@/lib/categoryFilterMapping";
import { Button } from "@/components/ui/button";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { isEventPaused } from "@/lib/eventVisibility";
import { isBoostCurrentlyActive, type EventBoostRecord } from "@/lib/boostUtils";

const Ekdiloseis = () => {
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
      loginRequired: "Συνδεθείτε ή εγγραφείτε για να δείτε όλες τις εκδηλώσεις!",
      loginSubtitle: "Γίνετε μέλος της κοινότητας ΦΟΜΟ και μην χάσετε τίποτα στην Κύπρο.",
      joinButton: "Εγγραφή στο ΦΟΜΟ",
      clearFilters: "Καθαρισμός",
    },
    en: {
      loginRequired: "Log in or sign up to see all events!",
      loginSubtitle: "Join the ΦΟΜΟ community and don't miss anything in Cyprus.",
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
          {/* All in one row with horizontal scroll if needed */}
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

            {/* Clear Filters */}
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

          {/* Filter Chips */}
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
          <LimitedExploreView 
            language={language} 
            navigate={navigate} 
            t={t}
            onSignupClick={() => navigate("/signup?redirect=/ekdiloseis")}
            selectedCity={selectedCity}
            selectedCategories={selectedCategories}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <FullExploreView 
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
const LimitedExploreView = ({ language, navigate, t, onSignupClick, selectedCity, selectedCategories }: any) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreviewEvents = async () => {
      try {
        const { data: eventsData, error } = await supabase
          .from('events')
          .select(`
            *,
            businesses!inner (
              name,
              logo_url,
              verified
            )
          `)
          .eq('businesses.verified', true)
          .gte('end_at', new Date().toISOString())
          .order('start_at', { ascending: true })
          .limit(12);

        if (error) throw error;

        if (eventsData) {
          const visibleEvents = eventsData.filter((e: any) => !isEventPaused(e));
          const eventsWithStats = await Promise.all(
            visibleEvents.map(async (event) => {
              const { data: rsvps } = await supabase
                .from('rsvps')
                .select('status')
                .eq('event_id', event.id);

              const interested_count = rsvps?.filter(r => r.status === 'interested').length || 0;
              const going_count = rsvps?.filter(r => r.status === 'going').length || 0;

              return {
                ...event,
                interested_count,
                going_count,
                user_status: null,
              };
            })
          );

          setEvents(eventsWithStats);
        }
      } catch (error) {
        console.error('Error fetching preview events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreviewEvents();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 relative">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <EventCardSkeleton key={i} />
          ))
        ) : events.length > 0 ? (
          events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
              className={index > 3 ? 'blur-md opacity-60 pointer-events-none scale-95' : ''}
            >
              <UnifiedEventCard 
                language={language} 
                event={event}
                size="full"
              />
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground text-lg">
              {language === "el" ? "Δεν υπάρχουν διαθέσιμες εκδηλώσεις" : "No events available"}
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
const FullExploreView = ({ language, user, selectedCity, selectedCategories }: { 
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

  // Calculate time boundaries
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

  // Fetch active event boosts (with hourly window support)
  const { data: activeBoosts } = useQuery({
    queryKey: ["active-event-boosts-ekdiloseis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_boosts")
        .select("event_id, targeting_quality, boost_tier, business_id, start_date, end_date, created_at, duration_mode, duration_hours")
        .eq("status", "active");

      if (error) throw error;
      
      // Filter to only currently active boosts (respecting hourly windows)
      const now = new Date().toISOString();
      return (data || []).filter((b) =>
        isBoostCurrentlyActive(b as EventBoostRecord, now)
      );
    },
  });


  const boostedEventIds = new Set(activeBoosts?.map(b => b.event_id) || []);

  const timeBoundaries = getTimeBoundaries(timeFilter);

  // Fetch BOOSTED events (shown at top, but STILL filtered by selected time window)
  const { data: boostedEvents, isLoading: loadingBoosted } = useQuery({
    queryKey: ["boosted-events-ekdiloseis", timeFilter, selectedCity, selectedCategories, Array.from(boostedEventIds)],
    queryFn: async () => {
      if (boostedEventIds.size === 0) return [];

      let query = supabase
        .from('events')
        .select(`
          *,
          businesses!inner (name, logo_url, city, verified, category)
        `)
        .in('id', Array.from(boostedEventIds))
        .eq('businesses.verified', true)
        .gte('end_at', new Date().toISOString())
        .order('start_at', { ascending: true });

      // Filter by city if selected
      if (selectedCity) {
        query = query.eq('businesses.city', selectedCity);
      }

      // Apply time filter if selected (Boosted must respect the same time window)
      if (timeBoundaries) {
        query = query
          .gte('start_at', timeBoundaries.start)
          .lte('start_at', timeBoundaries.end);
      }

       const { data, error } = await query;
       if (error) throw error;
       
       let visible = (data || []).filter((e: any) => !isEventPaused(e));

       // Client-side category filtering: match event OR business categories
       if (selectedCategories.length > 0) {
         const dbCats = mapFilterIdsToDbCategories(selectedCategories);
         visible = visible.filter((event: any) => {
           const eventCats: string[] = event.category || [];
           const bizCats: string[] = (event.businesses as any)?.category || [];
           return eventCats.some(c => dbCats.some(dc => c.toLowerCase() === dc.toLowerCase())) ||
                  bizCats.some(c => dbCats.some(dc => c.toLowerCase() === dc.toLowerCase()));
         });
       }

       // Fetch RSVP counts
       const eventsWithStats = await Promise.all(
         visible.map(async (event) => {
          const { data: rsvps } = await supabase
            .from('rsvps')
            .select('status, user_id')
            .eq('event_id', event.id);

          return {
            ...event,
            interested_count: rsvps?.filter(r => r.status === 'interested').length || 0,
            going_count: rsvps?.filter(r => r.status === 'going').length || 0,
            user_status: rsvps?.find(r => r.user_id === user?.id)?.status || null,
          };
        })
      );

      return eventsWithStats;
    },
    enabled: boostedEventIds.size > 0,
  });

  // Fetch NON-BOOSTED events (filtered by time and city)
  const { data: regularEvents, isLoading: loadingRegular } = useQuery({
    queryKey: ["regular-events", timeFilter, selectedCity, selectedCategories, Array.from(boostedEventIds)],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select(`
          *,
          businesses!inner (name, logo_url, city, verified, category)
        `)
        .eq('businesses.verified', true)
        .gte('end_at', new Date().toISOString())
        .order('start_at', { ascending: true });

      // Filter by city if selected
      if (selectedCity) {
        query = query.eq('businesses.city', selectedCity);
      }

      // Apply time filter only if selected
      if (timeBoundaries) {
        query = query
          .gte('start_at', timeBoundaries.start)
          .lte('start_at', timeBoundaries.end);
      }

      // Exclude boosted events
      if (boostedEventIds.size > 0) {
        query = query.not('id', 'in', `(${Array.from(boostedEventIds).join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;

      let visible = (data || []).filter((e: any) => !isEventPaused(e));

      // Client-side category filtering: match event OR business categories
      if (selectedCategories.length > 0) {
        const dbCats = mapFilterIdsToDbCategories(selectedCategories);
        visible = visible.filter((event: any) => {
          const eventCats: string[] = event.category || [];
          const bizCats: string[] = (event.businesses as any)?.category || [];
          return eventCats.some(c => dbCats.some(dc => c.toLowerCase() === dc.toLowerCase())) ||
                 bizCats.some(c => dbCats.some(dc => c.toLowerCase() === dc.toLowerCase()));
        });
      }

      // Fetch RSVP counts
      const eventsWithStats = await Promise.all(
        visible.map(async (event) => {
          const { data: rsvps } = await supabase
            .from('rsvps')
            .select('status, user_id')
            .eq('event_id', event.id);

          return {
            ...event,
            interested_count: rsvps?.filter(r => r.status === 'interested').length || 0,
            going_count: rsvps?.filter(r => r.status === 'going').length || 0,
            user_status: rsvps?.find(r => r.user_id === user?.id)?.status || null,
          };
        })
      );

      return eventsWithStats;
    },
  });

  const hasBoostedEvents = boostedEvents && boostedEvents.length > 0;
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
      {hasBoostedEvents && (
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boostedEvents.map((event) => (
              <div
                key={event.id}
                className="relative overflow-visible"
              >
                <UnifiedEventCard 
                  language={language} 
                  event={event}
                  isBoosted={true}
                  size="full"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Regular Events List */}
      <section>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularEvents && regularEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.3 }}
              >
                <UnifiedEventCard 
                  language={language} 
                  event={event}
                  size="full"
                />
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Ekdiloseis;
