import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, MapPin } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UnifiedEventCard } from "@/components/feed/UnifiedEventCard";
import { differenceInDays } from "date-fns";
import { useState } from "react";
import { OfferPurchaseDialog } from "@/components/user/OfferPurchaseDialog";

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
    cover_url?: string | null;
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
    expiresToday: "Λήγει σήμερα",
    expiresTomorrow: "Λήγει αύριο",
    expiresOn: "Λήγει στις",
    redeem: "Εξαργύρωσε",
  },
  en: {
    endsSoon: "Ends soon",
    expiresToday: "Expires today",
    expiresTomorrow: "Expires tomorrow",
    expiresOn: "Expires",
    redeem: "Redeem",
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
        <div className="flex gap-4 pt-3 pr-3 pb-2">
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
  t: typeof translations.el;
  language: "el" | "en";
}

const OfferCard = ({ offer, t, language }: OfferCardProps) => {
  const navigate = useNavigate();
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  
  const endDate = new Date(offer.end_at);
  const now = new Date();
  const daysLeft = differenceInDays(endDate, now);

  // Improved expiry label
  const getExpiryLabel = () => {
    if (daysLeft <= 0) return t.expiresToday;
    if (daysLeft === 1) return t.expiresTomorrow;
    const day = endDate.getDate();
    const month = endDate.toLocaleDateString(language === "el" ? "el-GR" : "en-GB", { month: "long" });
    return language === "el" 
      ? `${t.expiresOn} ${day} ${month}`
      : `${t.expiresOn} ${month} ${day}`;
  };

  const handleMapClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/xartis?business=${offer.business_id}`);
  };

  const handleRedeemClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPurchaseOpen(true);
  };

  const coverImage = offer.businesses?.cover_url || offer.businesses?.logo_url;

  return (
    <>
      {/* Matching UnifiedEventCard boosted size: 240x240 with exact 50/50 split */}
      <div className="flex flex-col rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-200 group w-[240px] h-[240px] overflow-visible">
        {/* TOP HALF: Image - exactly 50% height (120px) */}
        <div className="relative h-[120px] overflow-visible">
          {/* Image container clipped */}
          <div className="absolute inset-0 overflow-hidden rounded-t-xl">
            {coverImage ? (
              <img
                src={coverImage}
                alt={offer.businesses?.name}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-primary/10 to-secondary/20" />
            )}
            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/0 to-black/35" />
          </div>

          {/* BADGES - Top Right - Protruding, side by side */}
          <div className="absolute -top-2 -right-2 z-10 flex items-center gap-1">
            {/* Discount percentage badge (smaller, left of premium badge) */}
            {offer.percent_off && offer.percent_off > 0 && (
              <Badge variant="default" className="text-xs px-1.5 py-0.5 h-5">
                -{offer.percent_off}%
              </Badge>
            )}
            <PremiumBadge type="offer" />
          </div>
        </div>

        {/* BOTTOM HALF: Offer Details - exactly 50% height (120px) */}
        <div className="h-[120px] p-3 flex flex-col bg-background rounded-b-xl">
          {/* LINE 1: Title - aligned with event title */}
          <h4 className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">
            {offer.title}
          </h4>
          
          {/* LINE 2: Expiry with calendar icon - aligned with event date/time */}
          <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs">{getExpiryLabel()}</span>
          </div>

          {/* LINE 3: Location + Business - aligned with event location */}
          <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
            <button 
              onClick={handleMapClick}
              className="flex items-center text-muted-foreground hover:text-primary transition-colors shrink-0"
              title={language === "el" ? "Δες στο χάρτη" : "View on map"}
            >
              <MapPin className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs truncate">
              {offer.businesses?.city} · {offer.businesses?.name}
            </span>
          </div>

          {/* LINE 4: Redeem button - bottom right, below location */}
          <div className="flex-1 flex items-end justify-end mt-1">
            <Button 
              onClick={handleRedeemClick}
              size="sm" 
              variant="default"
              className="text-xs h-7 px-3"
            >
              {t.redeem}
            </Button>
          </div>
        </div>
      </div>

      {/* Purchase Dialog */}
      <OfferPurchaseDialog
        isOpen={isPurchaseOpen}
        onClose={() => setIsPurchaseOpen(false)}
        offer={{
          id: offer.id,
          title: offer.title,
          description: offer.description,
          percent_off: offer.percent_off || 0,
          end_at: offer.end_at,
          start_at: offer.start_at,
          business_id: offer.business_id,
          businesses: {
            name: offer.businesses?.name || "",
            logo_url: offer.businesses?.logo_url,
            cover_url: offer.businesses?.cover_url,
            city: offer.businesses?.city || "",
          },
        }}
        language={language}
      />
    </>
  );
};

export default BoostedContentSection;
