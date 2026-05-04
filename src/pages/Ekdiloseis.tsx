/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { X, Heart, Users, Calendar } from "lucide-react";
import { spring, reducedMotion } from "@/lib/motion";
import { DateRange } from "react-day-picker";
import { CompactDateRangeFilter } from "@/components/CompactDateRangeFilter";

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

// Helper: bulk-fetch RSVP counts for a list of events using the existing RPC
async function attachRsvpCounts(events: any[], userId?: string) {
  if (events.length === 0) return events;
  const eventIds = events.map(e => e.id);

  // Fetch counts in bulk
  const { data: counts } = await supabase.rpc("get_event_rsvp_counts_bulk", { p_event_ids: eventIds });
  const countsMap = new Map<string, { interested: number; going: number }>();
  (counts || []).forEach((row: any) => {
    countsMap.set(row.event_id, {
      interested: Number(row.interested_count || 0),
      going: Number(row.going_count || 0),
    });
  });

  // Fetch user's own RSVP statuses in one query if logged in
  const userStatusMap = new Map<string, string>();
  if (userId) {
    const { data: userRsvps } = await supabase
      .from('rsvps')
      .select('event_id, status')
      .eq('user_id', userId)
      .in('event_id', eventIds);
    (userRsvps || []).forEach((r: any) => userStatusMap.set(r.event_id, r.status));
  }

  return events.map(event => ({
    ...event,
    interested_count: countsMap.get(event.id)?.interested || 0,
    going_count: countsMap.get(event.id)?.going || 0,
    user_status: userStatusMap.get(event.id) || null,
  }));
}

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
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient city header */}
      <div className="relative overflow-hidden px-4 pt-5 pb-4 bg-background">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-seafoam/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-48 h-48 bg-aegean/20 rounded-full blur-3xl pointer-events-none" />
        <p className="relative text-white/35 text-[10px] font-semibold tracking-[0.2em] uppercase mb-1.5">
          {language === 'el' ? 'Εκδηλώσεις' : 'Events'}{selectedCity ? ` · ${selectedCity}` : ` · ${language === 'el' ? 'Κύπρος' : 'Cyprus'}`}
        </p>
        <h1 className="relative font-urbanist font-black text-3xl sm:text-4xl text-white leading-none">
          {language === 'el' ? 'Τι γίνεται;' : "What's on?"}
        </h1>
      </div>

      {/* Sticky Filter Bar */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-white/[0.07] px-3 py-2 lg:px-4 lg:py-3">
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
  const { data: events, isLoading: loading } = useQuery({
    queryKey: ['preview-events-limited'],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
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

      const visibleEvents = (eventsData || []).filter((e: any) => !isEventPaused(e));
      return attachRsvpCounts(visibleEvents);
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
        {loading ? (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <EventCardSkeleton key={i} />
          ))
        ) : events && events.length > 0 ? (
          events.map((event: any, index: number) => (
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
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center gap-3">
            <Calendar className="w-10 h-10 text-white/20" />
            <p className="font-urbanist font-black text-lg text-white/60">{language === "el" ? "Δεν υπάρχουν εκδηλώσεις" : "No events found"}</p>
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
        style={{ background: 'linear-gradient(135deg, hsl(207 72% 22% / 0.7) 0%, hsl(207 72% 12% / 0.9) 100%)' }}
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-seafoam/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-golden/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col items-center justify-center text-center relative">
          <p className="text-seafoam text-[10px] font-semibold tracking-[0.25em] uppercase mb-5">ΦΟΜΟ</p>
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
const FullExploreView = ({ language, user, selectedCity, selectedCategories }: { 
  language: "el" | "en"; 
  user: any;
  selectedCity: string | null;
  selectedCategories: string[];
}) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [rsvpFilter, setRsvpFilter] = useState<'interested' | 'going' | null>(null);

  // Fetch user's upcoming RSVPs for the filter
  const { data: userRsvps, refetch: refetchUserRsvps } = useQuery({
    queryKey: ["user-rsvps-ekdiloseis", user?.id],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!user?.id) return [];
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('rsvps')
        .select('event_id, status, events!inner(end_at)')
        .eq('user_id', user.id)
        .gte('events.end_at', now);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`ekdiloseis-rsvps-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rsvps',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refetchUserRsvps();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetchUserRsvps]);

  const rsvpInterestedIds = new Set(userRsvps?.filter(r => r.status === 'interested').map(r => r.event_id) || []);
  const rsvpGoingIds = new Set(userRsvps?.filter(r => r.status === 'going').map(r => r.event_id) || []);

  // Calculate time boundaries from date range
  const getTimeBoundaries = () => {
    if (!dateRange?.from) return null;

    const start = new Date(dateRange.from);
    start.setHours(0, 0, 0, 0);

    const end = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
    end.setHours(23, 59, 59, 999);

    return { start: start.toISOString(), end: end.toISOString() };
  };

  // Fetch active event boosts (with hourly window support)
  const { data: activeBoosts } = useQuery({
    queryKey: ["active-event-boosts-ekdiloseis"],
    staleTime: 60000,
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

  const timeBoundaries = getTimeBoundaries();

  // Fetch BOOSTED events (shown at top, but STILL filtered by selected time window)
  const { data: boostedEvents, isLoading: loadingBoosted } = useQuery({
    queryKey: ["boosted-events-ekdiloseis", dateRange, selectedCity, selectedCategories, Array.from(boostedEventIds)],
    staleTime: 60000,
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

       // Bulk fetch RSVP counts (replaces N+1 queries)
       return attachRsvpCounts(visible, user?.id);
    },
    enabled: boostedEventIds.size > 0,
  });

  // Fetch NON-BOOSTED events (filtered by time and city)
  const { data: regularEvents, isLoading: loadingRegular } = useQuery({
    queryKey: ["regular-events", dateRange, selectedCity, selectedCategories, Array.from(boostedEventIds)],
    staleTime: 60000,
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

      // Bulk fetch RSVP counts (replaces N+1 queries)
      return attachRsvpCounts(visible, user?.id);
    },
  });

  const hasBoostedEvents = boostedEvents && boostedEvents.length > 0;

  // When RSVP filter is active, fetch those specific events
  const rsvpFilterIds = rsvpFilter === 'interested' ? rsvpInterestedIds : rsvpFilter === 'going' ? rsvpGoingIds : new Set<string>();

  const { data: rsvpFilteredEvents, isLoading: loadingRsvpEvents } = useQuery({
    queryKey: ["rsvp-filtered-events", rsvpFilter, Array.from(rsvpFilterIds)],
    staleTime: 60000,
    queryFn: async () => {
      if (rsvpFilterIds.size === 0) return [];
      const { data, error } = await supabase
        .from('events')
        .select(`*, businesses!inner (name, logo_url, city, verified, category)`)
        .in('id', Array.from(rsvpFilterIds))
        .eq('businesses.verified', true)
        .gte('end_at', new Date().toISOString())
        .order('start_at', { ascending: true });
      if (error) throw error;

      // Bulk fetch RSVP counts (replaces N+1 queries)
      return attachRsvpCounts(data || [], user?.id);
    },
    enabled: !!rsvpFilter && rsvpFilterIds.size > 0,
  });

  // When RSVP filter active, show only those events; otherwise show boosted + regular
  const showRsvpMode = !!rsvpFilter;
  const filteredBoosted = showRsvpMode ? [] : (boostedEvents || []);
  const filteredRegular = showRsvpMode ? (rsvpFilteredEvents || []) : (regularEvents || []);
  const hasBoostedFiltered = filteredBoosted.length > 0;
  const isLoading = rsvpFilter ? loadingRsvpEvents : (loadingBoosted || loadingRegular);

  return (
    <div className="space-y-4">
      {/* Filters Row: Date Range + RSVP Icons */}
      <div className="flex items-center gap-2">
        <CompactDateRangeFilter
          value={dateRange}
          onChange={setDateRange}
          language={language}
        />
        
        {/* RSVP filter icons */}
        {user && (
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setRsvpFilter(prev => prev === 'interested' ? null : 'interested')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all border ${
                rsvpFilter === 'interested'
                  ? 'bg-seafoam/15 border-seafoam/40 text-seafoam'
                  : 'bg-white/[0.04] border-white/[0.07] text-white/60 hover:bg-white/[0.07]'
              }`}
              title={language === 'el' ? 'Ενδιαφέρομαι' : 'Interested'}
            >
              <Heart className="h-3 w-3" />
              <span>{rsvpInterestedIds.size}</span>
            </button>
            <button
              onClick={() => setRsvpFilter(prev => prev === 'going' ? null : 'going')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all border ${
                rsvpFilter === 'going'
                  ? 'bg-seafoam/15 border-seafoam/40 text-seafoam'
                  : 'bg-white/[0.04] border-white/[0.07] text-white/60 hover:bg-white/[0.07]'
              }`}
              title={language === 'el' ? 'Θα πάω' : 'Going'}
            >
              <Users className="h-3 w-3" />
              <span>{rsvpGoingIds.size}</span>
            </button>
          </div>
        )}
      </div>

      {/* BOOSTED ZONE — horizontal spotlight row */}
      {hasBoostedFiltered && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-urbanist font-black text-xl text-white flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-seafoam inline-block" />
              {language === 'el' ? 'Προτεινόμενα' : 'Featured'}
            </h2>
            <span className="text-[10px] text-white/30 font-medium tracking-wider">
              {language === 'el' ? 'ΣΥΡΕ →' : 'SWIPE →'}
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory -mx-4 px-4">
            {filteredBoosted.map((event) => (
              <div key={event.id} className="w-[260px] sm:w-[300px] flex-shrink-0 snap-start">
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
      <section className="space-y-3">
        {!showRsvpMode && (
          <h2 className="font-urbanist font-black text-xl text-white flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-white/25 inline-block" />
            {language === 'el' ? 'Όλα τα Events' : 'All Events'}
          </h2>
        )}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredRegular && filteredRegular.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredRegular.map((event, index) => (
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
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Calendar className="w-10 h-10 text-white/20" />
            <p className="font-urbanist font-black text-lg text-white/60">
              {language === 'el' ? 'Δεν βρέθηκαν εκδηλώσεις' : 'No events found'}
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

export default Ekdiloseis;
