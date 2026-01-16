import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { UnifiedEventCard } from "@/components/feed/UnifiedEventCard";

interface FeaturedEvent {
  id: string;
  title: string;
  start_at: string;
  end_at?: string;
  location: string;
  cover_image_url: string | null;
  category: string[];
  price_tier?: string;
  interested_count?: number;
  going_count?: number;
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
  hideTitle?: boolean;
}

export const FeaturedEventsScroller = ({ 
  events, 
  language,
  hideTitle = false
}: FeaturedEventsScrollerProps) => {

  if (!events || events.length === 0) return null;

  return (
    <div className="w-full">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pt-3 pr-3 pb-2">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <UnifiedEventCard
                event={event}
                language={language}
                size="default"
              />
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
