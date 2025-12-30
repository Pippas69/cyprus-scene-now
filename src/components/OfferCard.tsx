import { MapPin, Percent, Calendar, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useViewTracking, trackDiscountView } from "@/lib/analyticsTracking";
import { useRef, useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";
import { OfferPurchaseDialog } from "@/components/user/OfferPurchaseDialog";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  percent_off: number | null;
  original_price_cents?: number | null;
  start_at: string;
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

  // Calculate prices
  const originalPriceCents = offerData?.original_price_cents || 0;
  const percentOff = offerData?.percent_off || 0;
  const originalPrice = originalPriceCents / 100;
  const finalPrice = originalPrice * (1 - percentOff / 100);
  const hasPricing = originalPriceCents > 0;
  
  // Track discount view when card is 50% visible
  useViewTracking(cardRef, () => {
    if (offerData?.id) {
      const source = window.location.pathname.includes('/profile') ? 'profile' : 
                     window.location.pathname.includes('/feed') ? 'feed' : 'direct';
      trackDiscountView(offerData.id, source as 'feed' | 'event' | 'profile' | 'direct');
    }
  }, { threshold: 0.5 });
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return language === "el"
      ? date.toLocaleDateString("el-GR", { day: "numeric", month: "short" })
      : date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
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
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Business Logo - Clickable */}
          <Link 
            to={`/business/${offerData.business_id}`}
            className="flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            {offerData.businesses.logo_url ? (
              <img
                src={offerData.businesses.logo_url}
                alt={offerData.businesses.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                <Percent className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              </div>
            )}
          </Link>

          {/* Offer Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-lg line-clamp-1">{offerData.title}</h3>
                <Link 
                  to={`/business/${offerData.business_id}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {offerData.businesses.name}
                </Link>
              </div>
              {offerData.percent_off && (
                <Badge variant="default" className="flex-shrink-0">
                  {offerData.percent_off}% OFF
                </Badge>
              )}
            </div>

            {offerData.description && (
              <p className="text-sm text-foreground/80 mb-3 line-clamp-2">
                {offerData.description}
              </p>
            )}

            {/* Pricing Display */}
            {hasPricing && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm line-through text-muted-foreground">
                  €{originalPrice.toFixed(2)}
                </span>
                <span className="text-lg font-bold text-primary">
                  €{finalPrice.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{offerData.businesses.city}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>
                  {language === "el" ? "Έως" : "Until"} {formatDate(offerData.end_at)}
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
          end_at: offerData.end_at,
          business_id: offerData.business_id,
          businesses: {
            name: offerData.businesses.name,
            logo_url: offerData.businesses.logo_url,
            stripe_payouts_enabled: offerData.businesses.stripe_payouts_enabled,
          },
        }}
        language={language}
      />
    )}
    </Card>
  );
};

export default OfferCard;
