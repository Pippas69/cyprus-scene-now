import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, ChevronRight, Navigation } from "lucide-react";
import { translateCity } from "@/lib/cityTranslations";
import { getCategoryLabel } from "@/lib/categoryTranslations";
import { getDirectionsUrl } from "@/lib/mapUtils";
import type { BusinessLocation } from "@/hooks/useMapBusinesses";
import { cn } from "@/lib/utils";

interface BusinessListSheetProps {
  businesses: BusinessLocation[];
  language: "el" | "en";
  onBusinessClick: (business: BusinessLocation) => void;
}

const PLAN_TIER_ORDER = ['elite', 'pro', 'basic', 'free'] as const;

export const BusinessListSheet = ({ businesses, language, onBusinessClick }: BusinessListSheetProps) => {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const text = {
    el: {
      businesses: "επιχειρήσεις",
      business: "επιχείρηση",
      viewMore: "Δείτε περισσότερα",
      directions: "Οδηγίες",
      profile: "Προφίλ",
    },
    en: {
      businesses: "businesses",
      business: "business",
      viewMore: "View more",
      directions: "Directions",
      profile: "Profile",
    },
  };

  const t = text[language];

  // Group businesses by plan tier
  const groupedBusinesses = PLAN_TIER_ORDER.reduce((acc, plan) => {
    acc[plan] = businesses.filter(b => b.planSlug === plan);
    return acc;
  }, {} as Record<string, BusinessLocation[]>);

  // Get premium businesses (Elite + Pro) and other businesses (Basic + Free)
  const premiumBusinesses = [...groupedBusinesses.elite, ...groupedBusinesses.pro];
  const otherBusinesses = [...groupedBusinesses.basic, ...groupedBusinesses.free];

  const displayedBusinesses = showAll ? [...premiumBusinesses, ...otherBusinesses] : premiumBusinesses;

  const handleDirections = (e: React.MouseEvent, business: BusinessLocation) => {
    e.stopPropagation();
    const [lng, lat] = business.coordinates;
    window.open(getDirectionsUrl(lat, lng), "_blank");
  };

  const handleProfile = (e: React.MouseEvent, business: BusinessLocation) => {
    e.stopPropagation();
    setIsOpen(false);
    navigate(`/business/${business.id}`);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 bg-gradient-to-r from-aegean to-seafoam text-white rounded-lg shadow-lg",
            "px-2 py-1 md:px-3 md:py-1.5",
            "text-[10px] md:text-xs font-medium",
            "hover:opacity-90 transition-opacity cursor-pointer"
          )}
        >
          <Building2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
          <span>{businesses.length}</span>
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[320px] sm:w-[400px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            {businesses.length} {businesses.length === 1 ? t.business : t.businesses}
          </SheetTitle>
        </SheetHeader>
        
        <div className="overflow-y-auto h-[calc(100vh-80px)]">
          {displayedBusinesses.length > 0 ? (
            <div className="divide-y">
              {displayedBusinesses.map((business) => (
                <div
                  key={business.id}
                  className="p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    onBusinessClick(business);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Logo */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                      {business.logo_url ? (
                        <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info - tighter spacing */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      {/* Name row */}
                      <h4 className="font-semibold text-sm line-clamp-1">{business.name}</h4>

                      {/* Location row */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="line-clamp-1">{translateCity(business.city, language)}</span>
                      </div>

                      {/* Categories */}
                      {business.category.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {business.category.slice(0, 2).map((cat) => (
                            <Badge
                              key={cat}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20"
                            >
                              {getCategoryLabel(cat, language)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">{language === 'el' ? 'Δεν βρέθηκαν επιχειρήσεις' : 'No businesses found'}</p>
            </div>
          )}

          {/* View More Button */}
          {!showAll && otherBusinesses.length > 0 && (
            <div className="p-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowAll(true)}
              >
                {t.viewMore} ({otherBusinesses.length})
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
