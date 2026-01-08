import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Percent, ChevronRight, Tag, Clock } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format, differenceInDays } from "date-fns";

interface FeaturedOffer {
  id: string;
  title: string;
  description: string | null;
  percent_off: number | null;
  original_price_cents: number | null;
  end_at: string;
  business_id: string;
  businesses: {
    name: string;
    logo_url: string | null;
    city: string;
    verified: boolean;
  };
  boostScore?: number;
}

interface FeaturedOffersScrollerProps {
  offers: FeaturedOffer[];
  language: "el" | "en";
}

const translations = {
  el: {
    featuredOffers: "Προβεβλημένες Προσφορές",
    endsSoon: "Λήγει σύντομα",
    daysLeft: "ημέρες",
  },
  en: {
    featuredOffers: "Featured Offers",
    endsSoon: "Ends soon",
    daysLeft: "days left",
  },
};

export const FeaturedOffersScroller = ({ 
  offers, 
  language 
}: FeaturedOffersScrollerProps) => {
  const t = translations[language];

  if (!offers || offers.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Tag className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{t.featuredOffers}</h3>
      </div>
      
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-2">
          {offers.map((offer, index) => {
            const daysLeft = differenceInDays(new Date(offer.end_at), new Date());
            const isEndingSoon = daysLeft <= 3;
            
            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={`/offers?highlight=${offer.id}`}
                  className="flex flex-col rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-200 min-w-[200px] max-w-[200px] overflow-hidden group p-4"
                >
                  {/* Header with logo and discount */}
                  <div className="flex items-start justify-between mb-3">
                    <Avatar className="h-10 w-10 border-2 border-primary/20">
                      <AvatarImage 
                        src={offer.businesses.logo_url || undefined} 
                        alt={offer.businesses.name} 
                      />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {offer.businesses.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    {offer.percent_off && (
                      <Badge className="bg-primary text-primary-foreground font-bold text-sm px-2">
                        -{offer.percent_off}%
                      </Badge>
                    )}
                  </div>

                  {/* Offer Title */}
                  <h4 className="text-sm font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors min-h-[2.5rem]">
                    {offer.title}
                  </h4>
                  
                  {/* Business name */}
                  <p className="text-xs text-muted-foreground truncate mb-2">
                    {offer.businesses.name}
                  </p>

                  {/* Expiry info */}
                  <div className="flex items-center gap-1 mt-auto">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {isEndingSoon ? (
                      <span className="text-xs text-destructive font-medium">
                        {t.endsSoon}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {daysLeft} {t.daysLeft}
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
          
          {/* View all arrow */}
          <Link 
            to="/offers"
            className="flex items-center justify-center min-w-[50px] text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </Link>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default FeaturedOffersScroller;
