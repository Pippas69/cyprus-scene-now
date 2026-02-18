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
      const { data, error } = await supabase.
      from("events").
      select(
        `
          id,
          title,
          location,
          start_at,
          end_at,
          cover_image_url,
          category,
          business_id,
          appearance_start_at,
          appearance_end_at,
          businesses!inner(id, name, logo_url)
        `
      ).
      gte("start_at", new Date().toISOString()).
      order("start_at", { ascending: true }).
      limit(6);

      if (!error && data) {
        const visible = (data as unknown as Event[]).filter((e) => !isEventPaused(e));
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
      noEvents: "No upcoming events"
    },
    el: {
      title: "Επερχόμενες Εκδηλώσεις",
      subtitle: "Συντονίσου με όλα τα events της Κύπρου",
      viewAll: "Δες Όλες τις Εκδηλώσεις",
      noEvents: "Δεν υπάρχουν επερχόμενες εκδηλώσεις"
    }
  };

  if (loading) {
    return (
      <section className="relative py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#4dd4c4] via-[#9fede0] to-background" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[1, 2].map((i) =>
            <Skeleton key={i} className="h-72 rounded-2xl" />
            )}
          </div>
        </div>
      </section>);

  }

  if (events.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden">
      {/* Title area with gradient from seafoam to white */}
      <div className="relative py-3 sm:py-4 md:py-6">
        <div className="absolute inset-0 bg-[#4dd4c4]" />
        
        <div className="container mx-auto px-3 sm:px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center">

            


            <p className="text-aegean/70 text-sm sm:text-base md:text-lg px-2">
              {content[language].subtitle}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Events cards on seafoam background with soft fade-to-white at bottom */}
      <div className="relative py-4 sm:py-6 md:py-8 pb-16 sm:pb-20 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-[#4dd4c4]" />
        {/* Soft, subtle gradient fade at bottom - matches reference image */}
        <div className="absolute inset-x-0 bottom-0 h-24 sm:h-32 md:h-40 bg-gradient-to-b from-transparent via-[#4dd4c4]/30 to-white" />

        <div className="container mx-auto px-3 sm:px-4 relative z-10">
          {/* Mobile: show only 1 event, Tablet/Desktop: show 2 - same grid as MyEvents */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-8 sm:mb-10 md:mb-12 max-w-4xl mx-auto">
            {events.slice(0, 2).map((event, index) =>
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={index > 0 ? "hidden md:block" : ""}>

                <div className="md:hidden [&_.event-card]:bg-white [&_.event-card]:text-gray-900">
                  <UnifiedEventCard event={event} language={language} size="mobileFixed" className="!bg-white !border-gray-200 [&_*]:!text-gray-800 [&_.text-muted-foreground]:!text-gray-500" />
                </div>
                <div className="hidden md:block">
                  <UnifiedEventCard event={event} language={language} size="full" className="!bg-white !border-gray-200 [&_*]:!text-gray-800 [&_.text-muted-foreground]:!text-gray-500" />
                </div>
              </motion.div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center">

            <Button
              asChild
              variant="outline"
              size="default"
              className="bg-white border-aegean/30 hover:bg-white/80 hover:border-aegean text-aegean group rounded-full px-5 sm:px-6 md:px-8 text-sm sm:text-base">

              <Link to="/feed">
                {content[language].viewAll}
                <ArrowRight className="ml-1.5 sm:ml-2 w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>);

};

export default UpcomingEventsPreview;