import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";

import EventCard from "@/components/EventCard";
import EventCardSkeleton from "@/components/EventCardSkeleton";
import CategoryFilter from "@/components/CategoryFilter";
import SignupModal from "@/components/SignupModal";
import { Loader2 } from "lucide-react";

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

    // Listen for real-time auth changes (signup, login, logout)
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Instantly unlock full view after signup/login
        setUser(session.user);
      } else {
        // Show limited view if user logs out
        setUser(null);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const text = {
    el: {
      title: "Ανακαλύψτε Εκδηλώσεις",
      subtitle: "Η καρδιά της κοινωνικής ζωής στην Κύπρο",
      loginRequired: "Συνδεθείτε ή εγγραφείτε για να δείτε όλες τις εκδηλώσεις!",
      loginSubtitle: "Γίνετε μέλος της κοινότητας ΦΟΜΟ και μην χάσετε τίποτα στην Κύπρο.",
      joinButton: "Εγγραφή στο ΦΟΜΟ",
    },
    en: {
      title: "Discover Events",
      subtitle: "The heart of social life in Cyprus",
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
      {/* Hero Section */}
      <div className="relative py-16 overflow-hidden bg-gradient-to-br from-primary via-primary to-accent">
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
          /* Visitors see blurred limited view */
          <LimitedExploreView 
            language={language} 
            navigate={navigate} 
            t={t}
            onSignupClick={() => setShowSignupModal(true)}
          />
        ) : (
          /* Logged-in users see full view with fade-in animation */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
          >
            <FullExploreView language={language} />
          </motion.div>
        )}
      </div>

      
      
      {/* Signup Modal */}
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
        // Fetch all events from verified businesses
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
        .order('start_at', { ascending: true });

        if (error) throw error;

        if (eventsData) {
          // Fetch RSVP counts for each event
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
      transition={{ duration: 1, ease: "easeOut" }}
      className="relative"
    >
      {/* Preview Events - First 4 visible, rest blurred */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 relative">
        {loading ? (
          // Show skeletons while loading
          [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <EventCardSkeleton key={i} />
          ))
        ) : events.length > 0 ? (
          // Show real events
          events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className={`rounded-2xl overflow-hidden shadow-card bg-card transition-all duration-300 ${
                index > 3 ? 'blur-md opacity-60 pointer-events-none scale-95' : ''
              }`}
              style={{
                filter: index > 3 ? 'blur(4px)' : 'none',
              }}
            >
              <EventCard 
                language={language} 
                event={event}
                user={null}
              />
            </motion.div>
          ))
        ) : (
          // Show message if no events
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground text-lg">
              {language === "el" ? "Δεν υπάρχουν διαθέσιμες εκδηλώσεις αυτή τη στιγμή" : "No events available at the moment"}
            </p>
          </div>
        )}
        
        {/* Gradient overlay on blurred cards */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-background/80" />
      </div>

      {/* Signup CTA Overlay */}
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
            animate={{ 
              opacity: [0.85, 1, 0.85]
            }}
            transition={{
              opacity: {
                repeat: Infinity,
                duration: 2.5,
                ease: "easeInOut"
              },
              scale: {
                duration: 0.3
              }
            }}
          >
            {t.joinButton}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Full View for Logged-in Users
const FullExploreView = ({ language }: { language: "el" | "en" }) => {
  const EVENTS_PER_PAGE = 12;
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [personalizedEvents, setPersonalizedEvents] = useState<any[]>([]);
  const [otherEvents, setOtherEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  const text = {
    el: {
      allEvents: "Όλες οι Εκδηλώσεις",
      forYou: "Προτεινόμενα για Εσένα",
      moreEvents: "Περισσότερες Εκδηλώσεις",
      loadingMore: "Φόρτωση περισσότερων...",
      endOfResults: "Αυτές είναι όλες οι εκδηλώσεις",
    },
    en: {
      allEvents: "All Events",
      forYou: "Recommended for You",
      moreEvents: "More Events",
      loadingMore: "Loading more...",
      endOfResults: "You've seen all events",
    },
  };

  const t = text[language];

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchEvents(0, false);
  }, [selectedCategories, user]);

  // Load more when page changes
  useEffect(() => {
    if (page > 0) {
      fetchEvents(page, true);
    }
  }, [page]);

  const fetchEvents = async (pageNum: number = 0, append: boolean = false) => {
    if (pageNum === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const from = pageNum * EVENTS_PER_PAGE;
      const to = from + EVENTS_PER_PAGE - 1;
      
      let query = supabase
        .from('events')
        .select('*', { count: 'exact' })
        .gte('end_at', new Date().toISOString())
        .order('start_at', { ascending: true })
        .range(from, to);

      if (selectedCategories.length > 0) {
        query = query.overlaps('category', selectedCategories);
      }

      const { data: eventsData, error, count } = await query;

      if (error) throw error;

      if (eventsData) {
        // Check if there are more events to load
        const totalLoaded = (pageNum + 1) * EVENTS_PER_PAGE;
        setHasMore(count ? totalLoaded < count : false);
        
        // Fetch RSVP counts and user status for each event
        const eventsWithStats = await Promise.all(
          eventsData.map(async (event) => {
            const { data: rsvps } = await supabase
              .from('rsvps')
              .select('status, user_id')
              .eq('event_id', event.id);

            const interested_count = rsvps?.filter(r => r.status === 'interested').length || 0;
            const going_count = rsvps?.filter(r => r.status === 'going').length || 0;
            const user_status = rsvps?.find(r => r.user_id === user?.id)?.status || null;

            return {
              ...event,
              interested_count,
              going_count,
              user_status,
            };
          })
        );

        // Get user preferences and personalize
        const userPreferences = user?.user_metadata?.preferences || [];
        
        if (userPreferences.length > 0) {
          // Split events into personalized and others
          const personalized = eventsWithStats.filter(event =>
            event.category?.some((cat: string) => userPreferences.includes(cat.toLowerCase()))
          );
          const others = eventsWithStats.filter(event =>
            !event.category?.some((cat: string) => userPreferences.includes(cat.toLowerCase()))
          );
          
          if (append) {
            // When scrolling, only append to "others" section
            setOtherEvents(prev => [...prev, ...others]);
            // Personalized section doesn't paginate
          } else {
            // Fresh load
            setPersonalizedEvents(personalized);
            setOtherEvents(others);
          }
        } else {
          // No preferences, show all as regular events
          if (append) {
            setOtherEvents(prev => [...prev, ...eventsWithStats]);
          } else {
            setPersonalizedEvents([]);
            setOtherEvents(eventsWithStats);
          }
        }

        if (!append) {
          setEvents(eventsWithStats);
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      if (pageNum === 0) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  const lastEventRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    }, { threshold: 0.1 });
    
    if (node) observerRef.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Filters */}
      <div className="mb-8">
        <CategoryFilter
          language={language}
          selectedCategories={selectedCategories}
          onCategoryChange={setSelectedCategories}
        />
      </div>

      {/* Events Grid */}
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-foreground font-cinzel">
          {t.allEvents}
        </h2>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {/* Personalized Events Section */}
          {personalizedEvents.length > 0 && (
            <div className="mb-12">
              <motion.div 
                className="mb-6 flex items-center gap-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="h-8 w-1 bg-gradient-brand rounded-full" />
                <h2 className="text-2xl font-bold text-foreground font-cinzel">
                  {t.forYou}
                </h2>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {personalizedEvents.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.6 }}
                    whileHover={{ scale: 1.03, y: -4 }}
                    className="rounded-2xl shadow-card hover:shadow-hover transition-all bg-card"
                  >
                    <EventCard language={language} event={event} user={user} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Other Events Section */}
          {otherEvents.length > 0 && (
            <div>
              <motion.div 
                className="mb-6"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h2 className="text-2xl font-bold text-foreground font-cinzel">
                  {personalizedEvents.length > 0 ? t.moreEvents : t.allEvents}
                </h2>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherEvents.map((event, i) => (
                  <motion.div
                    key={event.id}
                    ref={i === otherEvents.length - 1 ? lastEventRef : null}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.6 }}
                    whileHover={{ scale: 1.03, y: -4 }}
                    className="rounded-2xl shadow-card hover:shadow-hover transition-all bg-card"
                  >
                    <EventCard language={language} event={event} user={user} />
                  </motion.div>
                ))}
              </div>

              {/* Loading more indicator */}
              {loadingMore && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}

              {/* End of results message */}
              {!hasMore && otherEvents.length > 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {t.endOfResults}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* No events message */}
          {events.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                {language === "el" ? "Δεν βρέθηκαν εκδηλώσεις" : "No events found"}
              </p>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default Ekdiloseis;
