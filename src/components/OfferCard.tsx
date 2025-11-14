import { MapPin, Percent, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  percent_off: number | null;
  start_at: string;
  end_at: string;
  businesses: {
    name: string;
    logo_url: string | null;
    city: string;
  };
}

interface OfferCardProps {
  offer: Offer;
  language: "el" | "en";
}

const OfferCard = ({ offer, language }: OfferCardProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return language === "el"
      ? date.toLocaleDateString("el-GR", { day: "numeric", month: "short" })
      : date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Business Logo */}
          <div className="flex-shrink-0">
            {offer.businesses.logo_url ? (
              <img
                src={offer.businesses.logo_url}
                alt={offer.businesses.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                <Percent className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Offer Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-lg line-clamp-1">{offer.title}</h3>
                <p className="text-sm text-muted-foreground">{offer.businesses.name}</p>
              </div>
              {offer.percent_off && (
                <Badge variant="default" className="flex-shrink-0">
                  {offer.percent_off}% OFF
                </Badge>
              )}
            </div>

            {offer.description && (
              <p className="text-sm text-foreground/80 mb-3 line-clamp-2">
                {offer.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{offer.businesses.city}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>
                  {language === "el" ? "Έως" : "Until"} {formatDate(offer.end_at)}
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
