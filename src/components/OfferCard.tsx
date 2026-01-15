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
      ref={cardRef}
      variant="glass"
      interactive
      className={cn("overflow-hidden transition-all duration-300", className)}
      style={style}
    >
      {/* Square layout: top 50% image, bottom 50% details */}
      <CardContent className="p-0">
        <div className="relative aspect-square overflow-hidden">
          {/* Top half: business cover (preferred) or logo */}
          <Link to={`/business/${offerData.business_id}`} className="absolute inset-0">
            {offerData.businesses.cover_url || offerData.businesses.logo_url ? (
              <img
                src={(offerData.businesses.cover_url || offerData.businesses.logo_url) as string}
                alt={offerData.businesses.name}
                className="absolute inset-0 h-1/2 w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 h-1/2 w-full bg-muted" />
            )}
            <div className="absolute inset-0 h-1/2 w-full bg-gradient-to-b from-black/10 via-black/10 to-background/70" />
          </Link>

          {/* Top-left: small logo chip */}
          <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-xl bg-background/85 px-2.5 py-2 backdrop-blur">
            {offerData.businesses.logo_url ? (
              <img
                src={offerData.businesses.logo_url}
                alt={offerData.businesses.name}
                className="h-7 w-7 rounded-lg object-cover"
                loading="lazy"
              />
            ) : (
              <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                <Percent className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium leading-none line-clamp-1">{offerData.businesses.name}</p>
              <p className="text-[11px] text-muted-foreground leading-none mt-1">{offerData.businesses.city}</p>
            </div>
          </div>

          {/* Top-right: discount/credit badge (keeps existing semantics) */}
          <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-1">
            {isCredit ? (
              <Badge variant="default" className="flex-shrink-0 bg-emerald-600">
                <Wallet className="h-3 w-3 mr-1" />
                {bonusPercent > 0 ? `+${bonusPercent}%` : language === "el" ? "Πίστωση" : "Credit"}
              </Badge>
            ) : offerData.percent_off ? (
              <Badge variant="default" className="flex-shrink-0">
                {offerData.percent_off}% OFF
              </Badge>
            ) : null}
            {isBundle && (
              <Badge variant="outline" className="text-xs flex-shrink-0 bg-background/80">
                <Package className="h-3 w-3 mr-1" />
                {language === "el" ? "Πακέτο" : "Bundle"}
              </Badge>
            )}
            {offerData.requires_reservation && (
              <Badge variant="secondary" className="text-xs flex-shrink-0 bg-background/80">
                <CalendarCheck className="h-3 w-3 mr-1" />
                {language === "el" ? "Κράτηση" : "Reservation"}
              </Badge>
            )}
          </div>

          {/* Bottom half content */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-background p-4">
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-base leading-tight line-clamp-2">{offerData.title}</h3>
                  {offerData.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{offerData.description}</p>
                  )}
                </div>
              </div>

              {/* Bundle Items Preview */}
              {isBundle && discountItems && itemCount > 0 && (
                <div className="mt-2">
                  <OfferItemsDisplay items={discountItems} language={language} />
                </div>
              )}

              <div className="mt-auto">
                {/* Price row */}
                {hasPricing && (
                  <div className="flex items-center gap-2 mb-3">
                    {isCredit ? (
                      <>
                        <span className="text-sm text-muted-foreground">
                          {language === "el" ? "Πληρώνεις" : "Pay"} €{originalPrice.toFixed(2)}
                        </span>
                        <span className="text-lg font-bold text-primary">→ €{creditValue.toFixed(2)} {language === "el" ? "αξία" : "value"}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm line-through text-muted-foreground">€{originalPrice.toFixed(2)}</span>
                        <span className="text-lg font-bold text-primary">€{finalPrice.toFixed(2)}</span>
                      </>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatOfferDates(offerData.start_at, offerData.end_at)}</span>
                  </div>
                </div>

                {/* CTA aligned bottom-right (matches request) */}
                <div className="flex justify-end">
                  <Button onClick={() => setIsPurchaseOpen(true)} size="sm" className="w-auto">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    {hasPricing
                      ? language === "el"
                        ? "Αγορά Τώρα"
                        : "Buy Now"
                      : language === "el"
                        ? "Κλείσε Τώρα"
                        : "Claim Now"}
                  </Button>
                </div>
              </div>
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
    </Card>
  );
};

export default OfferCard;
