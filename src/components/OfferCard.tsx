import { MapPin, Percent, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useViewTracking, trackDiscountView } from "@/lib/analyticsTracking";
import { useRef } from "react";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  percent_off: number | null;
  start_at: string;
  end_at: string;
  business_id: string;
  businesses: {
    name: string;
    logo_url: string | null;
    city: string;
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
  const offerData = offer || discount;
  
  // Track discount view when card is 50% visible
  useViewTracking(cardRef, () => {
    if (offerData?.id) {
      trackDiscountView(offerData.id, 'feed');
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
    <Card ref={cardRef} className={`overflow-hidden hover:shadow-lg transition-shadow ${className || ''}`} style={style}>
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
                <Percent className="h-8 w-8 text-muted-foreground" />
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

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OfferCard;
