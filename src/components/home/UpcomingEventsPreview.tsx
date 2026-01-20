import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface UpcomingEventsPreviewProps {
  language: "en" | "el";
}

interface Event {
  id: string;
  title: string;
  location: string;
  start_at: string;
  cover_image_url: string | null;
  category: string[];
  business: {
    name: string;
    logo_url: string | null;
  } | null;
}

const UpcomingEventsPreview = ({ language }: UpcomingEventsPreviewProps) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          id,
          title,
          location,
          start_at,
          cover_image_url,
          category,
          business:businesses!inner(name, logo_url)
        `)
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(6);

      if (!error && data) {
        setEvents(data as unknown as Event[]);
      }
      setLoading(false);
    };

    fetchEvents();
  }, []);

  const content = {
    en: {
      title: "Upcoming Events",
      subtitle: "Don't miss what's happening next",
      viewAll: "View All Events",
      noEvents: "No upcoming events",
    },
    el: {
      title: "Επερχόμενες Εκδηλώσεις",
      subtitle: "Μη χάσεις τι γίνεται στη συνέχεια",
      viewAll: "Δες Όλες τις Εκδηλώσεις",
      noEvents: "Δεν υπάρχουν επερχόμενες εκδηλώσεις",
    },
  };

  if (loading) {
    return (
      <section className="relative py-16 md:py-20 overflow-hidden">
        {/* Gradient from seafoam to white at the title */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#4dd4c4] via-[#9fede0] to-background" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden">
      {/* Title area with gradient from seafoam to white */}
      <div className="relative py-12 md:py-16">
        <div className="absolute inset-0 bg-gradient-to-b from-[#4dd4c4] via-[#7de4d4] to-background" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="font-cinzel text-3xl md:text-5xl font-bold text-aegean mb-4 tracking-tight">
              {content[language].title}
            </h2>
            <p className="text-aegean/70 text-lg">
              {content[language].subtitle}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Events cards on white background */}
      <div className="bg-background py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={`/events/${event.id}`}
                  className="group block bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border/30"
                >
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={event.cover_image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=200&fit=crop"}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    
                    {event.category?.[0] && (
                      <span className="absolute top-3 left-3 px-3 py-1 bg-seafoam text-white text-xs font-medium rounded-full">
                        {event.category[0]}
                      </span>
                    )}
                  </div>

                  <div className="p-5">
                    <h3 className="font-semibold text-foreground mb-2 line-clamp-1 group-hover:text-seafoam transition-colors">
                      {event.title}
                    </h3>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-seafoam" />
                        <span>{format(new Date(event.start_at), "EEE, MMM d")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-seafoam" />
                        <span>{format(new Date(event.start_at), "h:mm a")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-aegean" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    </div>

                    {event.business && (
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
                        {event.business.logo_url ? (
                          <img
                            src={event.business.logo_url}
                            alt={event.business.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-seafoam/20 flex items-center justify-center">
                            <span className="text-xs text-seafoam font-medium">
                              {event.business.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {event.business.name}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <Button
              asChild
              variant="outline"
              size="lg"
              className="bg-white border-aegean/30 hover:bg-white/80 hover:border-aegean text-aegean group rounded-full px-8"
            >
              <Link to="/feed">
                {content[language].viewAll}
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default UpcomingEventsPreview;
