import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, MapPin } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { UnifiedEventCard } from "@/components/feed/UnifiedEventCard";
import { differenceInDays, differenceInHours } from "date-fns";

interface BoostedEvent {
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

  return (
    <div className="w-full">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pt-4 pr-4 pb-2">
          {allContent.map((item, index) => (
            <motion.div
              key={`${item.type}-${item.data.id}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              {item.type === 'event' ? (
                <UnifiedEventCard
                  event={item.data}
                  language={language}
                  isBoosted={true}
                  size="boosted"
                  layout="twoThirds"
                />
              ) : (
                <OfferCard 
                  offer={item.data} 
                  t={t} 
                  language={language}
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

interface OfferCardProps {
  offer: BoostedOffer;
  t: { endsSoon: string; daysLeft: string; hoursLeft: string };
  language: "el" | "en";
}

const OfferCard = ({ offer, t, language }: OfferCardProps) => {
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
      className="flex flex-col rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-200 group aspect-square min-w-[240px] max-w-[240px]"
    >
      {/* TOP HALF - Visual header with gradient and badge */}
      <div className="relative flex-1 overflow-visible">
        {/* Keep the header visuals clipped, but allow the badge to protrude */}
        <div className="absolute inset-0 overflow-hidden rounded-t-xl bg-gradient-to-br from-emerald-500/20 via-primary/10 to-secondary/20 flex items-center justify-center">
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

      {/* BOTTOM HALF - Offer Details */}
      <div className="flex-1 p-3 flex flex-col justify-between min-h-0">
        <h4 className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">
          {offer.title}
        </h4>
        
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

        {/* Business name */}
        <p className="text-[11px] text-muted-foreground/70 truncate">
          {offer.businesses?.name}
        </p>
      </div>
    </Link>
  );
};

export default BoostedContentSection;
