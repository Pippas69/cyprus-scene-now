import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, Percent, Tag } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format, differenceInDays } from "date-fns";

interface BoostedEvent {
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

interface BoostedOffer {
  id: string;
  title: string;
  description: string | null;
  percent_off: number | null;
  original_price_cents: number | null;
  end_at: string;
  business_id: string;
  businesses: {
    name: string;
    logo_url: string | null;
    city: string;
    verified: boolean;
  };
  boostScore?: number;
}

interface BoostedContentSectionProps {
  events: BoostedEvent[];
  offers: BoostedOffer[];
  language: "el" | "en";
}

const translations = {
  el: {
    endsSoon: "Λήγει σύντομα",
    daysLeft: "ημέρες",
  },
  en: {
    endsSoon: "Ends soon",
    daysLeft: "days left",
  },
};

type ContentItem = 
  | { type: 'event'; data: BoostedEvent; score: number }
  | { type: 'offer'; data: BoostedOffer; score: number };

export const BoostedContentSection = ({ 
  events, 
  offers, 
  language 
}: BoostedContentSectionProps) => {
  const t = translations[language];

  // Combine and sort all boosted content by score
  const allContent: ContentItem[] = [
    ...events.map(e => ({ type: 'event' as const, data: e, score: e.boostScore || 0 })),
    ...offers.map(o => ({ type: 'offer' as const, data: o, score: o.boostScore || 0 }))
  ].sort((a, b) => b.score - a.score);

  // Always render the container even if empty - prevents mobile layout issues
  if (allContent.length === 0) {
    return <div className="w-full min-h-[1px]" />;
  }

  return (
    <div className="w-full">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-2">
          {allContent.map((item, index) => (
            <motion.div
              key={`${item.type}-${item.type === 'event' ? item.data.id : item.data.id}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              {item.type === 'event' ? (
                <EventCard event={item.data} />
              ) : (
                <OfferCard offer={item.data} t={t} />
              )}
            </motion.div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

const EventCard = ({ event }: { event: BoostedEvent }) => (
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
);

const OfferCard = ({ offer, t }: { offer: BoostedOffer; t: { endsSoon: string; daysLeft: string } }) => {
  const daysLeft = differenceInDays(new Date(offer.end_at), new Date());
  const isEndingSoon = daysLeft <= 3;

  return (
    <Link
      to={`/offers?highlight=${offer.id}`}
      className="flex flex-col rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-200 min-w-[200px] max-w-[200px] overflow-hidden group p-4"
    >
      {/* Header with logo and discount */}
      <div className="flex items-start justify-between mb-3">
        <Avatar className="h-10 w-10 border-2 border-primary/20">
          <AvatarImage 
            src={offer.businesses.logo_url || undefined} 
            alt={offer.businesses.name} 
          />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {offer.businesses.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {offer.percent_off && (
          <Badge className="bg-primary text-primary-foreground font-bold text-sm px-2">
            -{offer.percent_off}%
          </Badge>
        )}
      </div>

      {/* Offer Title */}
      <h4 className="text-sm font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors min-h-[2.5rem]">
        {offer.title}
      </h4>
      
      {/* Business name */}
      <p className="text-xs text-muted-foreground truncate mb-2">
        {offer.businesses.name}
      </p>

      {/* Expiry info */}
      <div className="flex items-center gap-1 mt-auto">
        <Clock className="h-3 w-3 text-muted-foreground" />
        {isEndingSoon ? (
          <span className="text-xs text-destructive font-medium">
            {t.endsSoon}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {daysLeft} {t.daysLeft}
          </span>
        )}
      </div>
    </Link>
  );
};

export default BoostedContentSection;
