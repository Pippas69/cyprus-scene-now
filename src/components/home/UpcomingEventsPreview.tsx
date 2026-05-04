import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Card3D, Reveal3D } from "@/components/ui/scroll-3d";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

const fetchUpcomingEvents = async (): Promise<Event[]> => {
  // Server-side pause filter: paused events have appearance_start_at in year 1970.
  // Exclude them by requiring appearance_start_at to be NULL or >= 2000-01-01.
  const { data, error } = await supabase
    .from("events")
    .select(`
      id, title, location, start_at, end_at, cover_image_url, category, business_id,
      appearance_start_at, appearance_end_at,
      businesses!inner(id, name, logo_url)
    `)
    .gte("start_at", new Date().toISOString())
    .or("appearance_start_at.is.null,appearance_start_at.gte.2000-01-01")
    .order("start_at", { ascending: true })
    .limit(6);

  if (error || !data) return [];
  return data as unknown as Event[];
};

const UpcomingEventsPreview = ({ language }: UpcomingEventsPreviewProps) => {
  const { data: events = [], isLoading: loading } = useQuery({
    queryKey: ["home", "upcoming-events"],
    queryFn: fetchUpcomingEvents,
    staleTime: 2 * 60 * 1000, // 2 min cache
    gcTime: 15 * 60 * 1000,
  });


  const content = {
    en: {
      title: "What's Coming Up",
      subtitle: "The hottest events across Cyprus — don't miss out",
      viewAll: "Explore All Events",
    },
    el: {
      title: "Τι Έρχεται",
      subtitle: "Τα πιο hot events σε όλη την Κύπρο — μη χάσεις κανένα",
      viewAll: "Εξερεύνησε Όλα τα Events",
    },
  };

  if (loading) {
    return (
      <section className="relative py-14 sm:py-20 bg-background">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-10">
            <Skeleton className="h-8 w-48 mx-auto mb-3 bg-white/10" />
            <Skeleton className="h-5 w-72 mx-auto bg-white/10" />
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
    <section className="relative py-20 sm:py-28 overflow-hidden bg-background">
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-seafoam/4 rounded-full blur-[140px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 max-w-5xl mx-auto mb-10 sm:mb-12"
        >
          <div>
            <p className="text-seafoam text-xs font-semibold tracking-widest uppercase mb-2">Live in Cyprus</p>
            <h2 className="font-urbanist font-black text-3xl sm:text-4xl text-white leading-tight">
              {content[language].title}
            </h2>
            <p className="text-white/40 text-sm mt-2">{content[language].subtitle}</p>
          </div>
          <Link
            to="/feed"
            className="hidden sm:flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors shrink-0 group"
          >
            {content[language].viewAll}
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto mb-10 sm:mb-12">
          {events.slice(0, 3).map((event, index) => (
            <motion.div
              key={event.id}
              style={{ perspective: 1000 }}
              initial={{ opacity: 0, y: 50, rotateX: 14, scale: 0.93 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: index * 0.12, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
              className={index <= 1 ? (index === 1 ? "md:block" : "") : "hidden lg:block"}
            >
              <Card3D>
                <UnifiedEventCard event={event} language={language} size={index === 0 ? "mobileFixed" : "full"} className="md:!size-auto" />
              </Card3D>
            </motion.div>
          ))}
        </div>

        {/* Mobile "view all" */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center sm:hidden"
        >
          <Button
            asChild
            className="bg-background border border-white/10 hover:border-white/20 text-foreground rounded-full px-8"
          >
            <Link to="/feed">
              {content[language].viewAll}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default UpcomingEventsPreview;
