import { useState, useEffect } from "react";
import { MapPin, Calendar, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EventCard from "@/components/EventCard";
import EventCardSkeleton from "@/components/EventCardSkeleton";
import OfferCard from "@/components/OfferCard";
import CategoryFilter from "@/components/CategoryFilter";
import LanguageToggle from "@/components/LanguageToggle";
import MapWrapper from "@/components/map/MapWrapper";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

const Feed = () => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("trending");
  const [language, setLanguage] = useState<"el" | "en">("el");
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const translations = {
    el: {
      title: "Ανακαλύψτε το ΦΟΜΟ",
      subtitle: "Δείτε τι συμβαίνει τώρα στην Κύπρο",
      trending: "Δημοφιλή",
      upcoming: "Επερχόμενα",
      offers: "Προσφορές",
      map: "Χάρτης",
      noEvents: "Δεν υπάρχουν events αυτή τη στιγμή",
      noUpcoming: "Δεν υπάρχουν επερχόμενα events",
      noOffers: "Δεν υπάρχουν ενεργές προσφορές",
    },
    en: {
      title: "Discover ΦΟΜΟ",
      subtitle: "See what's happening now in Cyprus",
      trending: "Trending",
      upcoming: "Upcoming",
      offers: "Offers",
      map: "Map",
      noEvents: "No events right now",
      noUpcoming: "No upcoming events",
      noOffers: "No active offers",
    },
  };

  const t = translations[language];

  // Fetch user authentication
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch events based on active tab and filters
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', selectedCategories, activeTab],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select(`
          *,
          businesses!inner (
            name,
            logo_url,
            verified,
            city
          ),
          realtime_stats (
            interested_count,
            going_count
          )
        `)
        .eq('businesses.verified', true);

      // Apply category filter
      if (selectedCategories.length > 0) {
        query = query.overlaps('category', selectedCategories);
      }

      // Apply tab-specific filters
      if (activeTab === 'trending') {
        query = query.order('created_at', { ascending: false }).limit(20);
      } else if (activeTab === 'upcoming') {
        query = query
          .gte('start_at', new Date().toISOString())
          .order('start_at', { ascending: true })
          .limit(20);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Sort trending by engagement
      if (activeTab === 'trending' && data) {
        return data.sort((a, b) => {
          const aScore = (a.realtime_stats?.[0]?.interested_count || 0) + 
                        (a.realtime_stats?.[0]?.going_count || 0) * 2;
          const bScore = (b.realtime_stats?.[0]?.interested_count || 0) + 
                        (b.realtime_stats?.[0]?.going_count || 0) * 2;
          return bScore - aScore;
        });
      }

      return data || [];
    },
    enabled: activeTab !== 'offers' && activeTab !== 'map',
  });

  // Fetch offers
  const { data: offers, isLoading: offersLoading } = useQuery({
    queryKey: ['offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discounts')
        .select(`
          *,
          businesses!inner (
            name,
            logo_url,
            city,
            verified
          )
        `)
        .eq('active', true)
        .eq('businesses.verified', true)
        .gte('end_at', new Date().toISOString())
        .order('percent_off', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: activeTab === 'offers',
  });

  // Real-time subscriptions
  useEffect(() => {
    const eventsChannel = supabase
      .channel('events-feed')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['events'] });
        }
      )
      .subscribe();

    const offersChannel = supabase
      .channel('offers-feed')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discounts'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['offers'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(offersChannel);
    };
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b shadow-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-ocean bg-clip-text text-transparent">
                ΦΟΜΟ
              </h1>
              <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            </div>
            <LanguageToggle language={language} onToggle={setLanguage} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Filters */}
        {activeTab !== 'map' && (
          <div className="mb-6">
            <CategoryFilter
              selectedCategories={selectedCategories}
              onCategoryChange={setSelectedCategories}
              language={language}
            />
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="trending" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              {t.trending}
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-2">
              <Calendar className="h-4 w-4" />
              {t.upcoming}
            </TabsTrigger>
            <TabsTrigger value="offers" className="gap-2">
              <span className="text-lg">🎟️</span>
              {t.offers}
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-2">
              <MapPin className="h-4 w-4" />
              {t.map}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trending" className="space-y-4">
            {eventsLoading ? (
              <>
                <EventCardSkeleton />
                <EventCardSkeleton />
                <EventCardSkeleton />
              </>
            ) : events && events.length > 0 ? (
              events.map((event) => (
                <EventCard
                  key={event.id}
                  language={language}
                  event={{
                    ...event,
                    interested_count: event.realtime_stats?.[0]?.interested_count || 0,
                    going_count: event.realtime_stats?.[0]?.going_count || 0,
                  }}
                  user={user}
                />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">{t.noEvents}</p>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            {eventsLoading ? (
              <>
                <EventCardSkeleton />
                <EventCardSkeleton />
                <EventCardSkeleton />
              </>
            ) : events && events.length > 0 ? (
              events.map((event) => (
                <EventCard
                  key={event.id}
                  language={language}
                  event={{
                    ...event,
                    interested_count: event.realtime_stats?.[0]?.interested_count || 0,
                    going_count: event.realtime_stats?.[0]?.going_count || 0,
                  }}
                  user={user}
                />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">{t.noUpcoming}</p>
            )}
          </TabsContent>

          <TabsContent value="offers" className="space-y-4">
            {offersLoading ? (
              <>
                <EventCardSkeleton />
                <EventCardSkeleton />
              </>
            ) : offers && offers.length > 0 ? (
              offers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} language={language} />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">{t.noOffers}</p>
            )}
          </TabsContent>

          <TabsContent value="map" className="space-y-4">
            <div className="h-[70vh]">
              <MapWrapper
                city=""
                neighborhood=""
                selectedCategories={selectedCategories}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Feed;
