import { MapPin, Percent, Calendar, ShoppingBag, Package, Wallet, CalendarCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useViewTracking, trackDiscountView } from "@/lib/analyticsTracking";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { OfferPurchaseDialog } from "@/components/user/OfferPurchaseDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OfferItemsDisplay } from "@/components/business/offers/OfferItemsDisplay";

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
  const cardRef = useRef<HTMLDivElement>(null);
  // Removed scroll reveal for stable layout
  const offerData = offer || discount;
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);

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
  
  // Track discount view when card is 50% visible
  useViewTracking(cardRef, () => {
    if (offerData?.id) {
      const source = window.location.pathname.includes('/profile') ? 'profile' : 
                     window.location.pathname.includes('/feed') ? 'feed' : 'direct';
      trackDiscountView(offerData.id, source as 'feed' | 'event' | 'profile' | 'direct');
    }
  }, { threshold: 0.5 });
  
  // Format expiry for chip display - always compact
  const formatExpiryChip = (endAt: string) => {
    const end = new Date(endAt);
    const now = new Date();
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const locale = language === "el" ? "el-GR" : "en-GB";
    
    // Today
    if (daysLeft <= 0) {
      return language === "el" ? "Σήμερα" : "Today";
    }
    // Ends soon (within 3 days)
    if (daysLeft <= 3) {
      return language === "el" ? "Λήγει σύντομα" : "Ends soon";
    }
    // Show date
    return language === "el"
      ? `Έως ${end.toLocaleDateString(locale, { day: "numeric", month: "short" })}`
      : `Until ${end.toLocaleDateString(locale, { day: "numeric", month: "short" })}`;
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
      ref={cardRef}
      variant="glass"
      interactive
      className={cn("overflow-hidden transition-all duration-300", className)}
      style={style}
    >
      {/* Square layout: 50% media (top), 50% info (bottom) */}
      <CardContent className="p-0">
        <div className="relative aspect-square overflow-hidden">
          <div className="absolute inset-0 grid grid-rows-2">
            {/* TOP HALF: cover image */}
            <Link
              to={`/business/${offerData.business_id}`}
              className="relative block overflow-hidden"
              aria-label={offerData.businesses.name}
            >
              {offerData.businesses.cover_url || offerData.businesses.logo_url ? (
                <img
                  src={(offerData.businesses.cover_url || offerData.businesses.logo_url) as string}
                  alt={offerData.businesses.name}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 bg-muted" />
              )}
              {/* Subtle premium overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/0 to-black/35" />
            </Link>

            {/* BOTTOM HALF: white info panel - FIXED 3 lines only */}
            <div className="bg-background p-4 flex flex-col justify-between">
              {/* LINE 1: What you get (benefit) - bold */}
              <h3 className="font-bold text-base leading-tight line-clamp-1">
                {getBenefitText()}
              </h3>

              {/* LINE 2: Where - business name · city (muted) */}
              <p className="text-sm text-muted-foreground truncate">
                {offerData.businesses.name} · {offerData.businesses.city}
              </p>

              {/* LINE 3: Expiry chip + CTA */}
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  {formatExpiryChip(offerData.end_at)}
                </Badge>
                <Button onClick={() => setIsPurchaseOpen(true)} size="sm" variant="default">
                  {language === "el" ? "Εξαργύρωσε" : "Redeem"}
                </Button>
              </div>
            </div>
          </div>

          {/* BADGES ON TOP OF IMAGE */}
          {/* Top-left: Reservation badge (ONLY if exists) */}
          {offerData.requires_reservation && (
            <div className="absolute left-3 top-3 z-10">
              <Badge variant="secondary" className="bg-background/85 backdrop-blur">
                <CalendarCheck className="h-3 w-3 mr-1" />
                {language === "el" ? "Κράτηση" : "Reservation"}
              </Badge>
            </div>
          )}

          {/* Top-right: Discount/Credit + Bundle badge */}
          <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-1">
            {isCredit ? (
              <Badge variant="default" className="flex-shrink-0">
                <Wallet className="h-3 w-3 mr-1" />
                {bonusPercent > 0 ? `+${bonusPercent}%` : language === "el" ? "Πίστωση" : "Credit"}
              </Badge>
            ) : offerData.percent_off ? (
              <Badge variant="default" className="flex-shrink-0">
                {offerData.percent_off}% OFF
              </Badge>
            ) : null}

            {isBundle && (
              <Badge variant="outline" className="text-xs flex-shrink-0 bg-background/85 backdrop-blur">
                <Package className="h-3 w-3 mr-1" />
                {language === "el" ? "Πακέτο" : "Bundle"}
              </Badge>
            )}
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
    </Card>
  );
};

export default OfferCard;
