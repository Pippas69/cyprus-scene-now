import { MapPin, Percent, Calendar, ShoppingBag, Package, Wallet, CalendarCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useViewTracking, trackDiscountView } from "@/lib/analyticsTracking";
import { useRef, useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
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
  businesses: {
    name: string;
    logo_url: string | null;
    city: string;
    stripe_payouts_enabled?: boolean;
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
  const { ref: revealRef, isInView } = useScrollReveal({ threshold: 0.1 });
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
  
  // Format date with smart display for short offers
  const formatOfferDates = (startAt: string, endAt: string) => {
    const start = new Date(startAt);
    const end = new Date(endAt);
    const now = new Date();
    const durationMs = end.getTime() - start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    const isSameDay = start.toDateString() === end.toDateString();
    
    const timeFormat: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    const locale = language === "el" ? "el-GR" : "en-GB";
    
    // If offer is active and ends soon (within 24 hours)
    if (now >= start && now <= end && durationHours <= 24) {
      const hoursLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60));
      if (hoursLeft <= 1) {
        const minsLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60));
        return language === "el" ? `Λήγει σε ${minsLeft} λεπτά` : `Ends in ${minsLeft} mins`;
      }
      return language === "el" ? `Λήγει σε ${hoursLeft} ώρες` : `Ends in ${hoursLeft} hours`;
    }
    
    // Same day offer - show times
    if (isSameDay) {
      const startTime = start.toLocaleTimeString(locale, timeFormat);
      const endTime = end.toLocaleTimeString(locale, timeFormat);
      const dayStr = start.toLocaleDateString(locale, { day: "numeric", month: "short" });
      return language === "el" 
        ? `${dayStr}, ${startTime} - ${endTime}` 
        : `${dayStr}, ${startTime} - ${endTime}`;
    }
    
    // Multi-day offer - show end date
    return language === "el"
      ? `Έως ${end.toLocaleDateString(locale, { day: "numeric", month: "short" })}`
      : `Until ${end.toLocaleDateString(locale, { day: "numeric", month: "short" })}`;
  };

  if (!offerData) return null;

  return (
    <Card 
      ref={(node) => {
        (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        (revealRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      variant="glass"
      interactive
      className={cn(
        "overflow-hidden transition-all duration-300",
        isInView ? "animate-fade-in" : "opacity-0",
        className
      )} 
      style={style}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex gap-3 sm:gap-4">
          {/* Business Logo - Clickable */}
          <Link 
            to={`/business/${offerData.business_id}`}
            className="flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            {offerData.businesses.logo_url ? (
              <img
                src={offerData.businesses.logo_url}
                alt={offerData.businesses.name}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-muted flex items-center justify-center">
                <Percent className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" aria-hidden="true" />
              </div>
            )}
          </Link>

          {/* Offer Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base sm:text-lg line-clamp-1 break-words">{offerData.title}</h3>
                <Link 
                  to={`/business/${offerData.business_id}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {offerData.businesses.name}
                </Link>
              </div>
              <div className="flex flex-col items-end gap-1">
                {isCredit ? (
                  <Badge variant="default" className="flex-shrink-0 bg-emerald-600">
                    <Wallet className="h-3 w-3 mr-1" />
                    {bonusPercent > 0 ? `+${bonusPercent}%` : (language === "el" ? "Πίστωση" : "Credit")}
                  </Badge>
                ) : offerData.percent_off ? (
                  <Badge variant="default" className="flex-shrink-0">
                    {offerData.percent_off}% OFF
                  </Badge>
                ) : null}
                {isBundle && (
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    <Package className="h-3 w-3 mr-1" />
                    {language === "el" ? "Πακέτο" : "Bundle"}
                  </Badge>
                )}
                {offerData.requires_reservation && (
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    <CalendarCheck className="h-3 w-3 mr-1" />
                    {language === "el" ? "Κράτηση" : "Reservation"}
                  </Badge>
                )}
              </div>
            </div>

            {offerData.description && (
              <p className="text-sm text-foreground/80 mb-3 line-clamp-2">
                {offerData.description}
              </p>
            )}

            {/* Bundle Items Preview */}
            {isBundle && discountItems && itemCount > 0 && (
              <div className="mb-3">
                <OfferItemsDisplay items={discountItems} language={language} />
              </div>
            )}

            {/* Pricing Display */}
            {hasPricing && (
              <div className="flex items-center gap-2 mb-3">
                {isCredit ? (
                  <>
                    <span className="text-sm text-muted-foreground">
                      {language === "el" ? "Πληρώνεις" : "Pay"} €{originalPrice.toFixed(2)}
                    </span>
                    <span className="text-lg font-bold text-primary">
                      → €{creditValue.toFixed(2)} {language === "el" ? "αξία" : "value"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm line-through text-muted-foreground">
                      €{originalPrice.toFixed(2)}
                    </span>
                    <span className="text-lg font-bold text-primary">
                      €{finalPrice.toFixed(2)}
                    </span>
                  </>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{offerData.businesses.city}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatOfferDates(offerData.start_at, offerData.end_at)}
                </span>
              </div>
            </div>

            {/* Buy Button */}
            {hasPricing && (
              <Button 
                onClick={() => setIsPurchaseOpen(true)} 
                className="w-full"
                size="sm"
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                {language === "el" ? "Αγορά Τώρα" : "Buy Now"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      {/* Purchase Dialog */}
      {offerData && hasPricing && (
        <OfferPurchaseDialog
          isOpen={isPurchaseOpen}
          onClose={() => setIsPurchaseOpen(false)}
          offer={{
            id: offerData.id,
            title: offerData.title,
            description: offerData.description,
            original_price_cents: originalPriceCents,
            percent_off: percentOff,
            pricing_type: offerData.pricing_type,
            end_at: offerData.end_at,
            business_id: offerData.business_id,
            requires_reservation: offerData.requires_reservation,
            businesses: {
              name: offerData.businesses.name,
              logo_url: offerData.businesses.logo_url,
              stripe_payouts_enabled: offerData.businesses.stripe_payouts_enabled,
            },
          }}
          discountItems={discountItems}
          language={language}
        />
      )}
    </Card>
  );
};

export default OfferCard;
