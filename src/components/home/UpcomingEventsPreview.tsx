import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isEventPaused } from "@/lib/eventVisibility";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import UnifiedEventCard from "@/components/feed/UnifiedEventCard";

interface UpcomingEventsPreviewProps {
  language: "en" | "el";
}

interface Event {
  id: string;
  title: string;
  location: string;
  start_at: string;
  end_at: string;
  cover_image_url: string | null;
  category: string[];
  business_id: string;
  appearance_start_at?: string | null;
  appearance_end_at?: string | null;
  businesses: {
    id: string;
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
          id, title, location, start_at, end_at, cover_image_url, category, business_id,
          appearance_start_at, appearance_end_at,
          businesses!inner(id, name, logo_url)
        `)
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(20);

      if (!error && data) {
        const visible = (data as unknown as Event[]).filter((e) => !isEventPaused(e)).slice(0, 6);
        setEvents(visible);
      }
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const content = {
    en: {
      title: "Upcoming Events",
      subtitle: "Stay tuned with all events in Cyprus",
      viewAll: "View All Events",
    },
    el: {
      title: "Επερχόμενες Εκδηλώσεις",
      subtitle: "Συντονίσου με όλα τα events της Κύπρου",
      viewAll: "Δες Όλες τις Εκδηλώσεις",
    },
  };

  if (loading) {
    return (
      <section className="relative py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-64 mx-auto mb-4 bg-white/10" />
            <Skeleton className="h-6 w-96 mx-auto bg-white/10" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-72 rounded-2xl bg-white/10" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (events.length === 0) return null;

  return (
    <section className="relative py-16 sm:py-20 md:py-28 overflow-hidden bg-background">
      {/* Subtle glow */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-seafoam/5 rounded-full blur-[150px]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-14"
        >
          <h2 className="font-cinzel text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4 tracking-tight">
            {content[language].title}
          </h2>
          <p className="text-white/50 text-sm sm:text-base md:text-lg">
            {content[language].subtitle}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto mb-10 sm:mb-12">
          {events.slice(0, 3).map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={index <= 1 ? (index === 1 ? "md:block" : "") : "hidden lg:block"}
            >
              <UnifiedEventCard event={event} language={language} size={index === 0 ? "mobileFixed" : "full"} className="md:!size-auto" />
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
            className="bg-seafoam/15 border border-seafoam/30 hover:bg-seafoam/25 text-seafoam rounded-full px-6 sm:px-8 text-sm sm:text-base backdrop-blur-sm"
          >
            <Link to="/feed">
              {content[language].viewAll}
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default UpcomingEventsPreview;
