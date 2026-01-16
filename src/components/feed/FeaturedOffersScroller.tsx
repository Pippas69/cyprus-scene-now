import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

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
  hideTitle?: boolean;
}

const translations = {
  el: {
    endsSoon: "Λήγει σύντομα",
    today: "Σήμερα",
    until: "Έως",
    redeem: "Εξαργύρωσε",
  },
  en: {
    endsSoon: "Ends soon",
    today: "Today",
    until: "Until",
    redeem: "Redeem",
  },
};

export const FeaturedOffersScroller = ({ 
  offers, 
  language,
  hideTitle = false
}: FeaturedOffersScrollerProps) => {
  const t = translations[language];

  if (!offers || offers.length === 0) return null;

  return (
    <div className="w-full">
      
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-2">
          {offers.map((offer, index) => {
            const daysLeft = differenceInDays(new Date(offer.end_at), new Date());
            const endDate = new Date(offer.end_at);
            const locale = language === "el" ? "el-GR" : "en-GB";
            
            // Expiry chip text
            const getExpiryText = () => {
              if (daysLeft <= 0) return t.today;
              if (daysLeft <= 3) return t.endsSoon;
              return `${t.until} ${endDate.toLocaleDateString(locale, { day: "numeric", month: "short" })}`;
            };
            
            // Benefit text (what user gets)
            const getBenefitText = () => {
              if (offer.percent_off) {
                return language === "el" ? `-${offer.percent_off}% στον λογαριασμό` : `-${offer.percent_off}% on total`;
              }
              return offer.title;
            };
            
            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={`/offers?highlight=${offer.id}`}
                  className="flex flex-col rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-200 min-w-[180px] max-w-[180px] h-[120px] overflow-hidden group p-3"
                >
                  {/* LINE 1: Benefit (bold) + Discount badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-sm font-bold line-clamp-1 flex-1 group-hover:text-primary transition-colors">
                      {getBenefitText()}
                    </h4>
                    {offer.percent_off && (
                      <Badge className="bg-primary text-primary-foreground text-xs px-1.5 shrink-0">
                        -{offer.percent_off}%
                      </Badge>
                    )}
                  </div>
                  
                  {/* LINE 2: Where (business · city) */}
                  <p className="text-xs text-muted-foreground truncate mb-auto">
                    {offer.businesses.name} · {offer.businesses.city}
                  </p>

                  {/* LINE 3: Expiry chip */}
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-[10px] w-fit",
                      daysLeft <= 3 && "bg-destructive/10 text-destructive"
                    )}
                  >
                    {getExpiryText()}
                  </Badge>
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
