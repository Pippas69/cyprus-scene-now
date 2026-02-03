import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, MapPin, Share2 } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UnifiedEventCard } from "@/components/feed/UnifiedEventCard";
import { differenceInDays } from "date-fns";
import { useCallback, useRef, useState } from "react";
import { OfferPurchaseDialog } from "@/components/user/OfferPurchaseDialog";
import { ShareOfferDialog } from "@/components/sharing/ShareOfferDialog";
import { trackDiscountView, trackOfferRedeemClick, useViewTracking } from "@/lib/analyticsTracking";
import { getCityDistance } from "@/lib/businessRanking";
import { translateCity } from "@/lib/cityTranslations";

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

interface TimeSlot {
  id?: string;
  timeFrom: string;
  timeTo: string;
  capacity: number;
  days: string[];
}

interface BoostedOffer {
  id: string;
  title: string;
  description: string | null;
  percent_off: number | null;
  original_price_cents: number | null;
  offer_image_url?: string | null;
  discount_type?: string | null;
  special_deal_text?: string | null;
  end_at: string;
  start_at?: string;
  business_id: string;
  max_per_user?: number | null;
  total_people?: number | null;
  people_remaining?: number | null;
  max_people_per_redemption?: number | null;
  one_per_user?: boolean | null;
  show_reservation_cta?: boolean | null;
  requires_reservation?: boolean | null;
  offer_type?: string | null;
  bonus_percent?: number | null;
  credit_amount_cents?: number | null;
  pricing_type?: string | null;
  bundle_price_cents?: number | null;
  valid_days?: string[] | null;
  valid_start_time?: string | null;
  valid_end_time?: string | null;
  terms?: string | null;
  businesses: {
    name: string;
    logo_url: string | null;
    cover_url?: string | null;
    city: string;
    verified: boolean;
    accepts_direct_reservations?: boolean;
    // Comes from the backend as Json; OfferPurchaseDialog will handle it as an array.
    reservation_time_slots?: unknown;
    reservation_days?: string[] | null;
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

// getCityDistance imported from @/lib/businessRanking

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
        <div className="flex gap-3 pt-2 pr-2 pb-1">
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
  const [isShareOpen, setIsShareOpen] = useState(false);

  // View = card became visible to the user (NOT a click)
  const cardRef = useRef<HTMLDivElement | null>(null);
  const handleView = useCallback(() => {
    if (!offer?.id) return;
    trackDiscountView(offer.id, 'feed');
  }, [offer?.id]);
  useViewTracking(cardRef as any, handleView, { threshold: 0.5 });
  
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

  // Handle map navigation - NO tracking for location clicks on offers
  const handleMapClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/xartis?business=${offer.business_id}&src=offer_location`);
  };

  const handleRedeemClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    trackOfferRedeemClick(offer.business_id, offer.id, 'boosted_section');
    setIsPurchaseOpen(true);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsShareOpen(true);
  };

  // CRITICAL: Boosted offers must show the exact custom image chosen by the business (offer_image_url)
  // to match the business/user dashboards and the general offers page.
  const coverImage = offer.offer_image_url || offer.businesses?.cover_url || offer.businesses?.logo_url;

  return (
    <>
      {/* Matching UnifiedEventCard boosted size - responsive, slightly larger than business cards on mobile */}
      <div
        ref={cardRef as any}
        className="flex flex-col rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-200 group min-w-[220px] max-w-[220px] sm:min-w-[240px] sm:max-w-[240px] overflow-visible"
      >
        {/* TOP - Image section - responsive height, larger on mobile */}
        <div className="relative h-36 sm:h-40 overflow-visible">
          {/* Image container - clipped, clickable to business profile */}
          <Link
            to={`/business/${offer.business_id}`}
            className="absolute inset-0 overflow-hidden rounded-t-xl"
          >
            {coverImage ? (
              <img
                src={coverImage}
                alt={offer.businesses?.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-500/20 via-primary/10 to-secondary/20" />
            )}
            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </Link>

          {/* BADGE - Top Right - Premium only for boosted */}
          <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 z-10">
            <PremiumBadge type="offer" />
          </div>
        </div>

        {/* BOTTOM HALF - Offer Details - responsive */}
        <div className="flex-1 px-2 sm:px-3 pt-2 sm:pt-3 pb-1.5 sm:pb-2 flex flex-col justify-between min-h-0 gap-0.5">
          {/* LINE 1: Title - aligned with event title */}
          <h4 className="text-xs sm:text-sm font-semibold truncate group-hover:text-primary transition-colors">
            {offer.title}
          </h4>
          
          {/* LINE 2: Expiry with calendar icon */}
          <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
            <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs truncate">{getExpiryLabel()}</span>
          </div>

          {/* LINE 3: Location + Business */}
          <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
            <button 
              onClick={handleMapClick}
              className="flex items-center text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
              title={language === "el" ? "Δες στο χάρτη" : "View on map"}
            >
              <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
            <span className="text-[10px] sm:text-xs truncate">
              {translateCity(offer.businesses?.city, language)} · {offer.businesses?.name}
            </span>
          </div>

          {/* LINE 4: Discount badge + Share + Redeem button */}
          <div className="flex items-center justify-between mt-0.5">
            {/* Discount badge on left */}
             <div className="flex items-center gap-1">
               {offer.percent_off && offer.percent_off > 0 && offer.discount_type !== "special_deal" && (
                 <Badge variant="default" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0 h-5 sm:h-6">
                   -{offer.percent_off}%
                 </Badge>
               )}

               {offer.discount_type === "special_deal" && offer.special_deal_text && (
                 <Popover>
                   <PopoverTrigger asChild>
                     <button type="button" className="inline-flex">
                       <Badge variant="default" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0 h-5 sm:h-6">
                         Offer
                       </Badge>
                     </button>
                   </PopoverTrigger>
                   <PopoverContent className="w-64 p-3" side="top" align="start">
                     <p className="text-sm font-medium">{offer.special_deal_text}</p>
                   </PopoverContent>
                 </Popover>
               )}
             </div>
            {/* Share + Redeem buttons on right */}
            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 sm:h-6 sm:w-6"
                onClick={handleShareClick}
                title={language === "el" ? "Κοινοποίηση" : "Share"}
              >
                <Share2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
              <Button 
                onClick={handleRedeemClick}
                size="sm" 
                variant="default"
                className="text-[10px] sm:text-xs h-5 sm:h-6 px-2 sm:px-2.5"
              >
                {t.redeem}
              </Button>
            </div>
          </div>

           {/* Terms & Conditions (if provided) - below Share/Redeem row */}
           {offer.terms && (
             <p className="text-[9px] text-muted-foreground/70 leading-tight line-clamp-2">
               <span className="font-medium">{language === "el" ? "Όροι:" : "Terms:"}</span> {offer.terms}
             </p>
           )}
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
          percent_off: offer.percent_off,
          discount_type: offer.discount_type,
          special_deal_text: offer.special_deal_text,
          end_at: offer.end_at,
          start_at: offer.start_at,
          business_id: offer.business_id,
          total_people: offer.total_people,
          people_remaining: offer.people_remaining,
          max_people_per_redemption: offer.max_people_per_redemption,
          one_per_user: offer.one_per_user,
          show_reservation_cta: offer.show_reservation_cta,
          requires_reservation: offer.requires_reservation,
          offer_type: offer.offer_type,
          bonus_percent: offer.bonus_percent,
          credit_amount_cents: offer.credit_amount_cents,
          pricing_type: offer.pricing_type,
          bundle_price_cents: offer.bundle_price_cents,
          valid_days: offer.valid_days,
          valid_start_time: offer.valid_start_time,
          valid_end_time: offer.valid_end_time,
          terms: offer.terms,
          businesses: {
            name: offer.businesses?.name || "",
            logo_url: offer.businesses?.logo_url,
            cover_url: offer.businesses?.cover_url,
            city: offer.businesses?.city || "",
            accepts_direct_reservations: offer.businesses?.accepts_direct_reservations,
            reservation_days: offer.businesses?.reservation_days || null,
            reservation_time_slots: (offer.businesses?.reservation_time_slots as any) || null,
          },
        }}
        language={language}
      />

      {/* Share Dialog */}
      <ShareOfferDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        offer={{
          id: offer.id,
          title: offer.title,
          description: offer.description,
          percent_off: offer.percent_off,
          special_deal_text: offer.special_deal_text ?? null,
          end_at: offer.end_at,
          offer_image_url: offer.offer_image_url ?? null,
          businesses: {
            id: offer.business_id,
            name: offer.businesses?.name || "",
            cover_url: offer.businesses?.cover_url,
            logo_url: offer.businesses?.logo_url,
          },
        }}
        language={language}
      />
    </>
  );
};

export default BoostedContentSection;
