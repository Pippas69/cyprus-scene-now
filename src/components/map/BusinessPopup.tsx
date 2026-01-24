import { useRef } from "react";
import { MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
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
      verified: "Επαληθευμένο",
    },
    en: {
      verified: "Verified",
    },
  };

  const t = text[language];

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
    // Compact pin label: must sit clearly above the pin (directions button is rendered as a separate marker).
    <button
      type="button"
      onClick={handleViewProfile}
      className="max-w-[240px] bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-xl px-3 py-2 text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm leading-tight line-clamp-1">{business.name}</h3>
            {business.verified && (
              <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] px-1.5 py-0">
                {t.verified}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
            <MapPin className="h-3 w-3" />
            <span className="line-clamp-1">
              {translateCity(business.city, language)}
              {business.address ? ` · ${business.address}` : ""}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="shrink-0 rounded-full border border-border bg-background/80 hover:bg-accent transition-colors h-6 w-6 flex items-center justify-center text-muted-foreground"
          aria-label={language === "el" ? "Κλείσιμο" : "Close"}
        >
          <span className="text-sm leading-none">×</span>
        </button>
      </div>
    </button>
  );
};
