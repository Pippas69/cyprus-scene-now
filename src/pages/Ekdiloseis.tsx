import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";

import EventCard from "@/components/EventCard";
import EventCardSkeleton from "@/components/EventCardSkeleton";
import SignupModal from "@/components/SignupModal";
import { Loader2, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Ekdiloseis = () => {
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
      loginRequired: "Συνδεθείτε ή εγγραφείτε για να δείτε όλες τις εκδηλώσεις!",
      loginSubtitle: "Γίνετε μέλος της κοινότητας ΦΟΜΟ και μην χάσετε τίποτα στην Κύπρο.",
      joinButton: "Εγγραφή στο ΦΟΜΟ",
    },
    en: {
      loginRequired: "Log in or sign up to see all events!",
      loginSubtitle: "Join the ΦΟΜΟ community and don't miss anything in Cyprus.",
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
          <LimitedExploreView 
            language={language} 
            navigate={navigate} 
            t={t}
            onSignupClick={() => setShowSignupModal(true)}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <FullExploreView language={language} user={user} />
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
const LimitedExploreView = ({ language, navigate, t, onSignupClick }: any) => {
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
          const eventsWithStats = await Promise.all(
            eventsData.map(async (event) => {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 relative">
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
              <EventCard 
                language={language} 
                event={event}
                user={null}
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
const FullExploreView = ({ language, user }: { language: "el" | "en"; user: any }) => {
  // null = no filter (show all), otherwise filter by time
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | null>(null);

  const text = {
    el: {
      boosted: "Προτεινόμενες",
      today: "Σήμερα",
      week: "Επόμενες 7 Μέρες",
      month: "Επόμενες 30 Μέρες",
      allEvents: "Όλες οι Εκδηλώσεις",
    },
    en: {
      boosted: "Featured",
      today: "Today",
      week: "Next 7 Days",
      month: "Next 30 Days",
      allEvents: "All Events",
    },
  };

  const t = text[language];

  // Calculate time boundaries
  const getTimeBoundaries = (filter: 'today' | 'week' | 'month' | null) => {
    if (!filter) return null; // No filter = show all
    
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

  // Fetch active event boosts
  const { data: activeBoosts } = useQuery({
    queryKey: ["active-event-boosts-ekdiloseis"],
    queryFn: async () => {
      const now = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("event_boosts")
        .select("event_id, targeting_quality, boost_tier, business_id")
        .eq("status", "active")
        .lte("start_date", now)
        .gte("end_date", now);

      if (error) throw error;
      return data || [];
    },
  });

  const boostedEventIds = new Set(activeBoosts?.map(b => b.event_id) || []);

  // Fetch BOOSTED events (always shown at top, sorted by start_at chronologically)
  const { data: boostedEvents, isLoading: loadingBoosted } = useQuery({
    queryKey: ["boosted-events-ekdiloseis", Array.from(boostedEventIds)],
    queryFn: async () => {
      if (boostedEventIds.size === 0) return [];

      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          businesses!inner (name, logo_url, city, verified)
        `)
        .in('id', Array.from(boostedEventIds))
        .eq('businesses.verified', true)
        .gte('end_at', new Date().toISOString())
        .order('start_at', { ascending: true }); // Chronological: soonest event first

      if (error) throw error;
      
      // Fetch RSVP counts
      const eventsWithStats = await Promise.all(
        (data || []).map(async (event) => {
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

  const timeBoundaries = getTimeBoundaries(timeFilter);

  // Fetch NON-BOOSTED events (filtered by time if selected, otherwise all)
  const { data: regularEvents, isLoading: loadingRegular } = useQuery({
    queryKey: ["regular-events", timeFilter, Array.from(boostedEventIds)],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select(`
          *,
          businesses!inner (name, logo_url, city, verified)
        `)
        .eq('businesses.verified', true)
        .gte('end_at', new Date().toISOString())
        .order('start_at', { ascending: true });

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

      // Fetch RSVP counts
      const eventsWithStats = await Promise.all(
        (data || []).map(async (event) => {
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
    <div className="space-y-8">
      {/* BOOSTED ZONE - Always at top, not filtered */}
      {hasBoostedEvents && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-semibold">{t.boosted}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boostedEvents.map((event, index) => (
              <motion.div
                key={event.id}
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
                <EventCard 
                  language={language} 
                  event={event}
                  user={user}
                />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* TIME FILTER ZONE - Optional filters like Feed categories */}
      <section className="space-y-4">
        {/* Time Filter Chips - None selected by default */}
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

        {/* Events List - Always shows events */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularEvents && regularEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.3 }}
              >
                <EventCard 
                  language={language} 
                  event={event}
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

export default Ekdiloseis;
