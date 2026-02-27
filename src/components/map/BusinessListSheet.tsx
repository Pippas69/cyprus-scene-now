import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin } from "lucide-react";
import { translateCity } from "@/lib/cityTranslations";
import { getCategoryLabel } from "@/lib/categoryTranslations";
import { getCategoryIcon } from "@/lib/unifiedCategories";
import { getDirectionsUrl } from "@/lib/mapUtils";
import { trackEngagement } from "@/lib/analyticsTracking";
import type { BusinessLocation } from "@/hooks/useMapBusinesses";
import { cn } from "@/lib/utils";

interface BusinessListSheetProps {
  businesses: BusinessLocation[];
  language: "el" | "en";
  onBusinessClick: (business: BusinessLocation) => void;
}

const PLAN_TIER_ORDER = ['elite', 'pro', 'basic', 'free'] as const;

// Map sub-categories to their parent category for icon lookup
const getParentCategoryIcon = (categoryId: string): string => {
  // Nightlife sub-options
  if (['bars', 'pubs', 'events'].includes(categoryId)) {
    return '🍸'; // Nightlife icon
  }
  // Clubs
  if (categoryId === 'clubs') {
    return '🎉';
  }
  // Dining sub-options
  if (['fine-dining', 'casual-dining', 'dining'].includes(categoryId)) {
    return '🍴';
  }
  // Performances sub-options
  if (['theatre', 'music', 'dance', 'kids', 'performances'].includes(categoryId)) {
    return '🎭';
  }
  // Nightlife main category
  if (categoryId === 'nightlife') {
    return '🍸';
  }
  // Fallback to getCategoryIcon
  return getCategoryIcon(categoryId);
};

export const BusinessListSheet = ({ businesses, language, onBusinessClick }: BusinessListSheetProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAll, setShowAll] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const viewedInSessionRef = useRef<Set<string>>(new Set());

  // Track profile views when the sheet opens and businesses become visible
  useEffect(() => {
    if (!isOpen) return;
    
    // Check if we're in dashboard user context - don't track views there
    const src = new URLSearchParams(window.location.search).get('src');
    if (src === 'dashboard_user' || window.location.pathname.startsWith('/dashboard-user')) {
      return;
    }

    // Get the businesses that are currently displayed
    const groupedBusinesses = PLAN_TIER_ORDER.reduce((acc, plan) => {
      acc[plan] = businesses.filter(b => b.planSlug === plan);
      return acc;
    }, {} as Record<string, BusinessLocation[]>);

    const premiumBusinesses = [...groupedBusinesses.elite, ...groupedBusinesses.pro];
    const otherBusinesses = [...groupedBusinesses.basic, ...groupedBusinesses.free];
    const displayedBusinesses = showAll ? [...premiumBusinesses, ...otherBusinesses] : premiumBusinesses;

    // Track view for each business that becomes visible (only once per session)
    displayedBusinesses.forEach((business) => {
      if (!viewedInSessionRef.current.has(business.id)) {
        viewedInSessionRef.current.add(business.id);
        trackEngagement(business.id, 'profile_view', 'business', business.id, { source: 'map_list_visibility' });
      }
    });
  }, [isOpen, showAll, businesses]);

  // Unified badge class for both Profile and Directions - exactly the same
  const actionBadgeClass =
    "text-[10px] px-1.5 py-0.5 h-auto leading-none cursor-pointer hover:bg-muted shrink-0";

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
    // Use business address for directions, fallback to coordinates
    window.open(getDirectionsUrl(business.address, lat, lng), "_blank");
  };

  const handleProfile = (e: React.MouseEvent, business: BusinessLocation) => {
    e.stopPropagation();
    setIsOpen(false);

    // Profile interaction: clicking the "Profile" badge counts as a profile_click.
    trackEngagement(business.id, 'profile_click', 'business', business.id, {
      source: 'map_profile_badge',
    });

    navigate(`/business/${business.id}`, {
      state: {
        analyticsTracked: true,
        analyticsSource: 'map',
        from: `${location.pathname}${location.search}`,
      },
    });
  };

  // Format location as "Address, City"
  const formatLocation = (business: BusinessLocation): string => {
    const city = translateCity(business.city, language);
    if (business.address && business.address.trim()) {
      return `${business.address}, ${city}`;
    }
    return city;
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 bg-[#0D3B66] text-white rounded-lg shadow-lg",
            "px-2 py-1 md:px-2.5 md:py-1.5",
            "text-[10px] md:text-xs font-medium",
            "hover:opacity-90 transition-opacity cursor-pointer"
          )}
        >
          <Building2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
          <span>{businesses.length} Businesses</span>
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
                    <div className="flex-1 min-w-0 space-y-0">
                      {/* Name row with Profile badge on far right */}
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm line-clamp-1">{business.name}</h4>
                        <Badge
                          variant="outline"
                          className={cn(actionBadgeClass, "ml-2")}
                          onClick={(e) => handleProfile(e, business)}
                        >
                          {t.profile}
                        </Badge>
                      </div>

                      {/* Location row with Directions badge on far right */}
                      <div className="flex items-center justify-between -mt-0.5">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="line-clamp-1">{formatLocation(business)}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(actionBadgeClass, "ml-2")}
                          onClick={(e) => handleDirections(e, business)}
                        >
                          {t.directions}
                        </Badge>
                      </div>

                      {/* Categories - stacked vertically with icons */}
                      {business.category.length > 0 && (
                        <div className="flex flex-col -mt-0.5">
                          {business.category.slice(0, 2).map((cat) => (
                            <div key={cat} className="flex items-center gap-1 text-xs text-muted-foreground leading-tight">
                              <span className="h-3 w-3 shrink-0 flex items-center justify-center text-[10px] grayscale opacity-70">
                                {getParentCategoryIcon(cat)}
                              </span>
                              <span>{getCategoryLabel(cat, language)}</span>
                            </div>
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
