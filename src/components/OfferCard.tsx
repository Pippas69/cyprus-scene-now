import { MapPin, Percent, Calendar, ShoppingBag, Package, Wallet, CalendarCheck, Sparkles, Share2, Gift } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trackDiscountView, trackOfferRedeemClick, useViewTracking } from "@/lib/analyticsTracking";
import { useCallback, useRef, useState } from "react";
import { PremiumBadge } from "@/components/ui/premium-badge";

import { cn } from "@/lib/utils";
import { OfferPurchaseDialog } from "@/components/user/OfferPurchaseDialog";
import { ShareOfferDialog } from "@/components/sharing/ShareOfferDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OfferItemsDisplay } from "@/components/business/offers/OfferItemsDisplay";
import { translateCity } from "@/lib/cityTranslations";

interface OfferItem {
  id: string;
  name: string;
  description: string | null;
}

interface Offer {
  id: string;
  title: string;
  description: string | null;
  percent_off: number | null;
  offer_image_url?: string | null;
  original_price_cents?: number | null;
  pricing_type?: 'single' | 'bundle';
  bundle_price_cents?: number | null;
  offer_type?: 'regular' | 'credit' | null;
  bonus_percent?: number | null;
  credit_amount_cents?: number | null;
  requires_reservation?: boolean;
  start_at?: string;
  end_at: string;
  business_id: string;
  terms?: string | null;
  max_per_user?: number | null;
  // Fields needed for OfferPurchaseDialog
  category?: string | null;
  discount_type?: string | null;
  special_deal_text?: string | null;
  valid_days?: string[] | null;
  valid_start_time?: string | null;
  valid_end_time?: string | null;
  total_people?: number | null;
  people_remaining?: number | null;
  max_people_per_redemption?: number | null;
  one_per_user?: boolean | null;
  show_reservation_cta?: boolean | null;
  businesses: {
    name: string;
    logo_url: string | null;
    cover_url?: string | null;
    city: string;
    accepts_direct_reservations?: boolean;
  };
  discount_items?: OfferItem[];
}

interface OfferCardProps {
  offer: Offer;
  language: "el" | "en";
  user?: any;
  discount?: Offer;
  style?: React.CSSProperties;
  className?: string;
}

const OfferCard = ({ offer, discount, language, style, className }: OfferCardProps) => {
  const navigate = useNavigate();
  // Removed scroll reveal for stable layout
  const offerData = offer || discount;
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const imageUrl =
    (offerData?.offer_image_url as string | null | undefined) ||
    (offerData?.businesses?.cover_url as string | null | undefined) ||
    (offerData?.businesses?.logo_url as string | null | undefined) ||
    null;

  // Fetch items for bundle offers
  const { data: discountItems } = useQuery({
    queryKey: ["discount-items", offerData?.id],
    queryFn: async () => {
      if (!offerData?.id) return [];
      const { data, error } = await supabase
        .from("discount_items")
        .select("id, name, description, sort_order")
        .eq("discount_id", offerData.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!offerData?.id && offerData?.pricing_type === "bundle",
  });

  // Calculate prices
  const isCredit = offerData?.offer_type === 'credit';
  const creditAmountCents = offerData?.credit_amount_cents || 0;
  const bonusPercent = offerData?.bonus_percent || 0;
  const originalPriceCents = isCredit ? creditAmountCents : (offerData?.original_price_cents || 0);
  const percentOff = offerData?.percent_off || 0;
  const originalPrice = originalPriceCents / 100;
  const finalPrice = isCredit ? originalPrice : originalPrice * (1 - percentOff / 100);
  const creditValue = isCredit ? (creditAmountCents / 100) * (1 + bonusPercent / 100) : 0;
  const hasPricing = originalPriceCents > 0;
  const isBundle = offerData?.pricing_type === "bundle";
  const itemCount = discountItems?.length || 0;
  
  // View = card became visible to the user (NOT a click)
  // Note: trackDiscountView now handles source validation internally
  const cardRef = useRef<HTMLDivElement | null>(null);
  const handleView = useCallback(() => {
    if (!offerData?.id) return;
    // Source detection - the actual filtering is done inside trackDiscountView
    const path = window.location.pathname;
    const source = path.startsWith('/business/') ? 'profile' :
                   path.includes('/offers') ? 'direct' :
                   path.includes('/feed') || path === '/' || path === '/dashboard-business' || path === '/dashboard-business/'
                     ? 'feed'
                     : 'direct';
    trackDiscountView(offerData.id, source as 'feed' | 'event' | 'profile' | 'direct');
  }, [offerData?.id]);
  useViewTracking(cardRef as any, handleView, { threshold: 0.5 });

  // Format expiry for chip display - improved wording
  const formatExpiryChip = (endAt: string) => {
    const end = new Date(endAt);
    const now = new Date();
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Today
    if (daysLeft <= 0) {
      return language === "el" ? "Λήγει σήμερα" : "Expires today";
    }
    // Tomorrow
    if (daysLeft === 1) {
      return language === "el" ? "Λήγει αύριο" : "Expires tomorrow";
    }
    // Show specific date
    const day = end.getDate();
    const month = end.toLocaleDateString(language === "el" ? "el-GR" : "en-GB", { month: "long" });
    return language === "el"
      ? `Λήγει στις ${day} ${month}`
      : `Expires ${month} ${day}`;
  };
  
  // Handle map navigation - NO tracking for location clicks on offers
  const handleMapClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/xartis?business=${offerData?.business_id}&src=offer_location`);
  };

  // Generate benefit text - what the user gets (1 line, bold)
  const getBenefitText = () => {
    if (isCredit) {
      return language === "el" 
        ? `€${creditValue.toFixed(0)} πίστωση` 
        : `€${creditValue.toFixed(0)} credit`;
    }
    if (offerData?.discount_type === "special_deal" && offerData?.special_deal_text) {
      return offerData.special_deal_text;
    }
    if (percentOff > 0) {
      // Use category context
      const category = offerData?.category;
      if (category === "drink") {
        return language === "el" ? `-${percentOff}% στα ποτά` : `-${percentOff}% on drinks`;
      }
      if (category === "food") {
        return language === "el" ? `-${percentOff}% στο φαγητό` : `-${percentOff}% on food`;
      }
      if (category === "account_total") {
        return language === "el" ? `-${percentOff}% στον λογαριασμό` : `-${percentOff}% on total`;
      }
      return `-${percentOff}%`;
    }
    return offerData?.title || "";
  };

  if (!offerData) return null;

  return (
    <Card
      ref={cardRef as any}
      variant="glass"
      interactive
      className={cn("overflow-visible transition-all duration-300", className)}
      style={style}
    >
      <CardContent className="p-0">
        {/* Image section - consistent height across all devices to match mobile design */}
        <Link
          to={`/business/${offerData.business_id}`}
          className="block relative h-48 overflow-hidden rounded-t-xl"
          aria-label={offerData.businesses.name}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={offerData.businesses.name}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 bg-muted" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/0 to-black/35" />
          
          {/* Premium badge for boosted */}
          {/* Reservation badge */}
          {offerData.requires_reservation && (
            <div className="absolute left-3 top-3 z-10">
              <Badge variant="secondary" className="bg-background/85 backdrop-blur text-xs">
                <CalendarCheck className="h-3 w-3 mr-1" />
                {language === "el" ? "Κράτηση" : "Reservation"}
              </Badge>
            </div>
          )}
          
          {/* Bundle badge */}
          {isBundle && (
            <div className="absolute left-3 bottom-3 z-10">
              <Badge variant="outline" className="text-xs bg-background/85 backdrop-blur">
                <Package className="h-3 w-3 mr-1" />
                {language === "el" ? "Πακέτο" : "Bundle"}
              </Badge>
            </div>
          )}
        </Link>

        {/* Content section - compact spacing */}
        <div className="p-3 space-y-1">
          {/* Title */}
          <h3 className="font-bold text-sm leading-tight truncate">
            {offerData.title}
          </h3>

          {/* Expiry date */}
          <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs truncate">{formatExpiryChip(offerData.end_at)}</span>
          </div>

          {/* Location - fully clickable */}
          <button 
            onClick={handleMapClick}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors w-full text-left"
            title={language === "el" ? "Δες στο χάρτη" : "View on map"}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs truncate">
              {translateCity(offerData.businesses.city, language)} · {offerData.businesses.name}
            </span>
          </button>

          {/* Bottom row: Discount badge + Share + Redeem button */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              {/* Percentage discount badge */}
              {offerData.percent_off && offerData.percent_off > 0 && offerData.discount_type !== "special_deal" && (
                <Badge variant="outline" className="text-xs px-2 py-0.5 h-6 font-semibold">
                  -{offerData.percent_off}%
                </Badge>
              )}
              {/* Special Offer badge - clickable with popover showing special_deal_text */}
              {offerData.discount_type === "special_deal" && offerData.special_deal_text && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className="text-xs px-2 py-0.5 h-6 font-semibold cursor-pointer hover:bg-accent transition-colors"
                    >
                      <Gift className="h-3 w-3 mr-1" />
                      Special Offer
                    </Badge>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" side="top" align="start">
                    <p className="text-sm font-medium">{offerData.special_deal_text}</p>
                  </PopoverContent>
                </Popover>
              )}
              {isCredit && (
                <Badge variant="outline" className="text-xs px-2 py-0.5 h-6">
                  <Wallet className="h-3 w-3 mr-0.5" />
                  {bonusPercent > 0 ? `+${bonusPercent}%` : ""}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsShareOpen(true);
                }}
                title={language === "el" ? "Κοινοποίηση" : "Share"}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  trackOfferRedeemClick(offerData.business_id, offerData.id, 'offer_card');
                  setIsPurchaseOpen(true);
                }} 
                size="sm" 
                variant="default"
                className="text-xs h-7 px-3"
              >
                {language === "el" ? "Εξαργύρωσε" : "Redeem"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Purchase Dialog */}
      {offerData && (
        <OfferPurchaseDialog
          isOpen={isPurchaseOpen}
          onClose={() => setIsPurchaseOpen(false)}
          offer={{
            id: offerData.id,
            title: offerData.title,
            description: offerData.description,
            percent_off: percentOff,
            end_at: offerData.end_at,
            start_at: offerData.start_at,
            business_id: offerData.business_id,
            terms: offerData.terms,
            category: offerData.category,
            discount_type: offerData.discount_type,
            special_deal_text: offerData.special_deal_text,
            valid_days: offerData.valid_days,
            valid_start_time: offerData.valid_start_time,
            valid_end_time: offerData.valid_end_time,
            total_people: offerData.total_people,
            people_remaining: offerData.people_remaining,
            max_people_per_redemption: offerData.max_people_per_redemption,
            one_per_user: offerData.one_per_user,
            show_reservation_cta: offerData.show_reservation_cta,
            businesses: {
              name: offerData.businesses.name,
              logo_url: offerData.businesses.logo_url,
              cover_url: offerData.businesses.cover_url,
              city: offerData.businesses.city,
              accepts_direct_reservations: offerData.businesses.accepts_direct_reservations,
            },
          }}
          language={language}
        />
      )}

      {/* Share Dialog */}
      {offerData && (
        <ShareOfferDialog
          open={isShareOpen}
          onOpenChange={setIsShareOpen}
          offer={{
            id: offerData.id,
            title: offerData.title,
            description: offerData.description,
            percent_off: offerData.percent_off,
            special_deal_text: offerData.special_deal_text,
            end_at: offerData.end_at,
            offer_image_url: offerData.offer_image_url ?? null,
            businesses: {
              id: offerData.business_id,
              name: offerData.businesses.name,
              cover_url: offerData.businesses.cover_url,
              logo_url: offerData.businesses.logo_url,
            },
          }}
          language={language}
        />
      )}
    </Card>
  );
};

export default OfferCard;
