import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { format, differenceInDays, differenceInHours, Locale } from "date-fns";
import { el, enUS } from "date-fns/locale";

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
}

interface BoostedOffer {
  id: string;
  title: string;
  description: string | null;
  percent_off: number | null;
  original_price_cents: number | null;
  end_at: string;
  start_at?: string;
  business_id: string;
  businesses: {
    name: string;
    logo_url: string | null;
    city: string;
    verified: boolean;
  };
}

interface BoostedContentSectionProps {
  events: BoostedEvent[];
  offers: BoostedOffer[];
  language: "el" | "en";
  userCity?: string | null;
}

const translations = {
  el: {
    endsSoon: "Λήγει σύντομα",
    daysLeft: "ημέρες",
    hoursLeft: "ώρες",
    today: "Σήμερα",
    tomorrow: "Αύριο",
  },
  en: {
    endsSoon: "Ends soon",
    daysLeft: "days left",
    hoursLeft: "hours left",
    today: "Today",
    tomorrow: "Tomorrow",
  },
};

// City proximity map for Cyprus (rough distances)
const CITY_DISTANCES: Record<string, Record<string, number>> = {
  "Λευκωσία": { "Λευκωσία": 0, "Λάρνακα": 50, "Λεμεσός": 85, "Πάφος": 150, "Αμμόχωστος": 70, "Παραλίμνι": 60, "Αγία Νάπα": 75 },
  "Λάρνακα": { "Λευκωσία": 50, "Λάρνακα": 0, "Λεμεσός": 70, "Πάφος": 130, "Αμμόχωστος": 45, "Παραλίμνι": 35, "Αγία Νάπα": 40 },
  "Λεμεσός": { "Λευκωσία": 85, "Λάρνακα": 70, "Λεμεσός": 0, "Πάφος": 70, "Αμμόχωστος": 110, "Παραλίμνι": 100, "Αγία Νάπα": 110 },
  "Πάφος": { "Λευκωσία": 150, "Λάρνακα": 130, "Λεμεσός": 70, "Πάφος": 0, "Αμμόχωστος": 180, "Παραλίμνι": 170, "Αγία Νάπα": 175 },
  "Αμμόχωστος": { "Λευκωσία": 70, "Λάρνακα": 45, "Λεμεσός": 110, "Πάφος": 180, "Αμμόχωστος": 0, "Παραλίμνι": 10, "Αγία Νάπα": 15 },
  "Παραλίμνι": { "Λευκωσία": 60, "Λάρνακα": 35, "Λεμεσός": 100, "Πάφος": 170, "Αμμόχωστος": 10, "Παραλίμνι": 0, "Αγία Νάπα": 10 },
  "Αγία Νάπα": { "Λευκωσία": 75, "Λάρνακα": 40, "Λεμεσός": 110, "Πάφος": 175, "Αμμόχωστος": 15, "Παραλίμνι": 10, "Αγία Νάπα": 0 },
};

// Get distance between two cities
const getCityDistance = (cityA: string | null | undefined, cityB: string | null | undefined): number => {
  if (!cityA || !cityB) return 1000; // Unknown = max distance
  const normalizedA = cityA.trim();
  const normalizedB = cityB.trim();
  
  // Check direct lookup
  if (CITY_DISTANCES[normalizedA]?.[normalizedB] !== undefined) {
    return CITY_DISTANCES[normalizedA][normalizedB];
  }
  
  // Fallback: same city = 0, different = 100
  return normalizedA === normalizedB ? 0 : 100;
};

type ContentItem = 
  | { type: 'event'; data: BoostedEvent; sortTime: Date; distance: number }
  | { type: 'offer'; data: BoostedOffer; sortTime: Date; distance: number };

export const BoostedContentSection = ({ 
  events, 
  offers, 
  language,
  userCity,
}: BoostedContentSectionProps) => {
  const t = translations[language];
  const dateLocale = language === "el" ? el : enUS;

  // Combine all boosted content with distance scoring
  const allContent: ContentItem[] = [
    ...events.map(e => ({ 
      type: 'event' as const, 
      data: e, 
      sortTime: new Date(e.start_at),
      distance: getCityDistance(userCity, e.businesses?.city),
    })),
    ...offers.map(o => ({ 
      type: 'offer' as const, 
      data: o, 
      sortTime: new Date(o.end_at), // Use end_at for offers (soonest expiry first)
      distance: getCityDistance(userCity, o.businesses?.city),
    }))
  ];

  // Sort: First by distance (closest first), then by time (earliest first)
  allContent.sort((a, b) => {
    // Primary: Geographic proximity
    if (a.distance !== b.distance) {
      return a.distance - b.distance;
    }
    // Secondary: Chronological (earliest first)
    return a.sortTime.getTime() - b.sortTime.getTime();
  });

  // Always render the container even if empty - prevents mobile layout issues
  if (allContent.length === 0) {
    return <div className="w-full min-h-[1px]" />;
  }

  // Shared card dimensions for consistency
  const CARD_WIDTH = "w-[240px]";
  const CARD_HEIGHT = "h-[180px]";

  return (
    <div className="w-full">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pt-3 pr-3 pb-2">
          {allContent.map((item, index) => (
            <motion.div
              key={`${item.type}-${item.data.id}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              {item.type === 'event' ? (
                <EventCard 
                  event={item.data} 
                  language={language}
                  dateLocale={dateLocale}
                  cardWidth={CARD_WIDTH}
                  cardHeight={CARD_HEIGHT}
                />
              ) : (
                <OfferCard 
                  offer={item.data} 
                  t={t} 
                  language={language}
                  cardWidth={CARD_WIDTH}
                  cardHeight={CARD_HEIGHT}
                />
              )}
            </motion.div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

interface EventCardProps {
  event: BoostedEvent;
  language: "el" | "en";
  dateLocale: Locale;
  cardWidth: string;
  cardHeight: string;
}

const EventCard = ({ event, language, dateLocale, cardWidth, cardHeight }: EventCardProps) => {
  const eventDate = new Date(event.start_at);
  const now = new Date();
  const isToday = eventDate.toDateString() === now.toDateString();
  const isTomorrow = eventDate.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  
  const t = translations[language];
  
  let dateLabel: string;
  if (isToday) {
    dateLabel = `${t.today} • ${format(eventDate, "HH:mm")}`;
  } else if (isTomorrow) {
    dateLabel = `${t.tomorrow} • ${format(eventDate, "HH:mm")}`;
  } else {
    dateLabel = format(eventDate, "EEE, d MMM • HH:mm", { locale: dateLocale });
  }

  return (
    <Link
      to={`/ekdiloseis/${event.id}`}
      className={`flex flex-col rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-200 min-${cardWidth} max-${cardWidth} ${cardHeight} group`}
      style={{ minWidth: '240px', maxWidth: '240px', height: '180px' }}
    >
      {/* Event Image with Badge */}
      <div className="relative h-24 w-full overflow-visible flex-shrink-0">
        {/* Keep the image itself clipped, but allow the badge to protrude */}
        <div className="absolute inset-0 overflow-hidden">
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
        </div>

        {/* EVENT BADGE - Premium, Top Right - Protruding */}
        <div className="absolute -top-2 -right-2 z-10">
          <PremiumBadge type="event" />
        </div>
      </div>

      {/* Event Details */}
      <div className="p-3 flex-1 flex flex-col justify-between min-h-0">
        <h4 className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">
          {event.title}
        </h4>
        
        <div className="space-y-1 mt-auto">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span className="text-xs truncate">{dateLabel}</span>
          </div>
          
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="text-xs truncate">{event.businesses?.city || event.location}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

interface OfferCardProps {
  offer: BoostedOffer;
  t: { endsSoon: string; daysLeft: string; hoursLeft: string };
  language: "el" | "en";
  cardWidth: string;
  cardHeight: string;
}

const OfferCard = ({ offer, t, language, cardWidth, cardHeight }: OfferCardProps) => {
  const endDate = new Date(offer.end_at);
  const now = new Date();
  const hoursLeft = differenceInHours(endDate, now);
  const daysLeft = differenceInDays(endDate, now);
  const isEndingSoon = hoursLeft <= 48;

  let expiryLabel: string;
  if (hoursLeft < 24) {
    expiryLabel = `${hoursLeft} ${t.hoursLeft}`;
  } else {
    expiryLabel = `${daysLeft} ${t.daysLeft}`;
  }

  return (
    <Link
      to={`/offers?highlight=${offer.id}`}
      className="flex flex-col rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-200 group"
      style={{ minWidth: '240px', maxWidth: '240px', height: '180px' }}
    >
      {/* Visual header with gradient and badge (same height as event image) */}
      <div className="relative h-24 w-full overflow-visible flex-shrink-0">
        {/* Keep the header visuals clipped, but allow the badge to protrude */}
        <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-emerald-500/20 via-primary/10 to-secondary/20 flex items-center justify-center">
          <Avatar className="h-14 w-14 border-2 border-white shadow-lg">
            <AvatarImage 
              src={offer.businesses?.logo_url || undefined} 
              alt={offer.businesses?.name} 
            />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
              {offer.businesses?.name?.substring(0, 2)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>

          {/* Discount overlay badge */}
          {offer.percent_off && (
            <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground font-bold text-sm px-2 py-0.5 rounded-full shadow">
              -{offer.percent_off}%
            </div>
          )}
        </div>

        {/* OFFER BADGE - Premium, Top Right - Protruding */}
        <div className="absolute -top-2 -right-2 z-10">
          <PremiumBadge type="offer" />
        </div>
      </div>

      {/* Offer Details (same structure as event) */}
      <div className="p-3 flex-1 flex flex-col justify-between min-h-0">
        <h4 className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">
          {offer.title}
        </h4>
        
        <div className="space-y-1 mt-auto">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3 flex-shrink-0" />
            {isEndingSoon ? (
              <span className="text-xs text-destructive font-medium">{t.endsSoon}</span>
            ) : (
              <span className="text-xs truncate">{expiryLabel}</span>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="text-xs truncate">{offer.businesses?.city}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default BoostedContentSection;
