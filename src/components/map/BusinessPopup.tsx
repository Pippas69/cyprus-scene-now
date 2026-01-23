import { useRef } from "react";
import { X, MapPin, Navigation, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDirectionsUrl } from "@/lib/mapUtils";
import { getCategoryLabel } from "@/lib/categoryTranslations";
import { trackEngagement } from "@/lib/analyticsTracking";
import type { BusinessLocation } from "@/hooks/useMapBusinesses";
import { translateCity } from "@/lib/cityTranslations";

interface BusinessPopupProps {
  business: BusinessLocation;
  onClose: () => void;
  language: "el" | "en";
}

export const BusinessPopup = ({ business, onClose, language }: BusinessPopupProps) => {
  const navigate = useNavigate();
  const hasTrackedProfileNavClick = useRef(false);

  const text = {
    el: {
      viewProfile: "Προφίλ",
      verified: "Επαληθευμένο",
      directions: "Οδηγίες",
    },
    en: {
      viewProfile: "Profile",
      verified: "Verified",
      directions: "Directions",
    },
  };

  const t = text[language];

  const handleDirections = () => {
    const [lng, lat] = business.coordinates;
    window.open(getDirectionsUrl(lat, lng), "_blank");
  };

  const handleViewProfile = () => {
    // IMPORTANT:
    // - This is an interaction (click), NOT a view.
    // - Views are tracked separately (e.g. feed visibility / profile page).
    if (!hasTrackedProfileNavClick.current) {
      hasTrackedProfileNavClick.current = true;
      trackEngagement(business.id, "profile_click", "business", business.id, { source: "map" });
    }
    navigate(`/business/${business.id}`);
  };

  return (
    <div className="w-[300px] bg-background rounded-xl shadow-2xl overflow-hidden animate-scale-in">
      {/* Cover Image */}
      <div className="relative h-32 bg-muted">
        {business.cover_url ? (
          <>
            <img
              src={business.cover_url}
              alt={business.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
        )}

        {/* Logo */}
        {business.logo_url && (
          <div className="absolute -bottom-6 left-4 w-14 h-14 rounded-xl overflow-hidden border-2 border-background shadow-lg bg-background">
            <img
              src={business.logo_url}
              alt={business.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 bg-background/90 hover:bg-background rounded-full shadow-lg transition-colors"
        >
          <X size={16} />
        </button>

        {/* Verified badge */}
        {business.verified && (
          <Badge className="absolute top-3 left-3 bg-seafoam text-white text-xs">
            {t.verified}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4 pt-8 space-y-3">
        {/* Name & City */}
        <div>
          <h3 className="font-semibold text-lg leading-tight">{business.name}</h3>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
            <MapPin size={14} />
            <span>{translateCity(business.city, language)}</span>
          </div>
        </div>

        {/* Categories */}
        {business.category.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {business.category.slice(0, 3).map((cat) => (
              <Badge key={cat} variant="secondary" className="text-xs">
                {getCategoryLabel(cat, language)}
              </Badge>
            ))}
          </div>
        )}

        {/* Description */}
        {business.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{business.description}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            className="flex-1" 
            onClick={handleViewProfile}
          >
            <ExternalLink size={14} className="mr-1.5" />
            {t.viewProfile}
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={handleDirections}>
            <Navigation size={14} className="mr-1.5" />
            {t.directions}
          </Button>
        </div>
      </div>
    </div>
  );
};
