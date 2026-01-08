import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, MapPin, ChevronRight, Sparkles, Clock } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface FeaturedEvent {
  id: string;
  title: string;
  start_at: string;
  location: string;
  cover_image_url: string | null;
  category: string[];
  businesses: {
    name: string;
    logo_url: string | null;
    verified: boolean;
    city: string;
  };
  boostScore?: number;
}

interface FeaturedEventsScrollerProps {
  events: FeaturedEvent[];
  language: "el" | "en";
}

const translations = {
  el: {
    featuredEvents: "Προβεβλημένες Εκδηλώσεις",
    viewDetails: "Δείτε",
  },
  en: {
    featuredEvents: "Featured Events",
    viewDetails: "View",
  },
};

export const FeaturedEventsScroller = ({ 
  events, 
  language 
}: FeaturedEventsScrollerProps) => {
  const t = translations[language];

  if (!events || events.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Sparkles className="h-4 w-4 text-primary fill-primary/20" />
        <h3 className="text-sm font-semibold text-foreground">{t.featuredEvents}</h3>
      </div>
      
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-2">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/ekdiloseis/${event.id}`}
                className="flex flex-col rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-200 min-w-[220px] max-w-[220px] overflow-hidden group"
              >
                {/* Event Image */}
                <div className="relative h-28 w-full overflow-hidden">
                  {event.cover_image_url ? (
                    <img 
                      src={event.cover_image_url} 
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <Calendar className="h-8 w-8 text-primary/50" />
                    </div>
                  )}
                  {/* Category badge overlay */}
                  {event.category?.[0] && (
                    <Badge 
                      variant="secondary" 
                      className="absolute top-2 left-2 text-[10px] px-1.5 py-0 h-5 bg-background/90 backdrop-blur-sm"
                    >
                      {event.category[0]}
                    </Badge>
                  )}
                </div>

                {/* Event Details */}
                <div className="p-3 space-y-2">
                  <h4 className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                    {event.title}
                  </h4>
                  
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span className="text-xs truncate">
                      {format(new Date(event.start_at), "EEE, MMM d • HH:mm")}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="text-xs truncate">{event.location}</span>
                  </div>

                  {/* Business name */}
                  <p className="text-[10px] text-muted-foreground truncate">
                    {event.businesses.name}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
          
          {/* View all arrow */}
          <Link 
            to="/ekdiloseis"
            className="flex items-center justify-center min-w-[50px] text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </Link>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default FeaturedEventsScroller;
