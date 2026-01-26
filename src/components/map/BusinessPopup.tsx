import { Navigation } from "lucide-react";
import type { BusinessLocation } from "@/hooks/useMapBusinesses";
import { getDirectionsUrl } from "@/lib/mapUtils";

interface BusinessPopupProps {
  business: BusinessLocation;
  onClose: () => void;
  language: "el" | "en";
}

// Premium popup styling per plan tier - border only, white interior
const POPUP_STYLES: Record<string, {
  container: string;
  name: string;
  address: string;
  navButton: string;
  navIcon: string;
}> = {
  elite: {
    // Golden border, white interior
    container: "bg-white border-2 border-[hsl(45,80%,50%)] rounded-full shadow-sm",
    name: "text-[hsl(35,30%,25%)]",
    address: "text-[hsl(35,20%,40%)]",
    navButton: "bg-[hsl(45,70%,55%)] hover:bg-[hsl(45,75%,50%)]",
    navIcon: "text-white",
  },
  pro: {
    // Coral border, white interior
    container: "bg-white border-2 border-[hsl(var(--plan-pro))] rounded-full shadow-sm",
    name: "text-foreground",
    address: "text-muted-foreground",
    navButton: "bg-[hsl(var(--plan-pro))] hover:bg-[hsl(12,90%,50%)]",
    navIcon: "text-white",
  },
  basic: {
    // Cyan border, white interior
    container: "bg-white border-2 border-[hsl(var(--plan-basic))] rounded-full shadow-sm",
    name: "text-foreground",
    address: "text-muted-foreground",
    navButton: "bg-[hsl(var(--plan-basic))] hover:bg-[hsl(200,90%,40%)]",
    navIcon: "text-white",
  },
  free: {
    // Ocean blue border (matching pin color), white interior
    container: "bg-white border-2 border-[hsl(207,43%,42%)] rounded-full shadow-sm",
    name: "text-foreground",
    address: "text-muted-foreground",
    navButton: "bg-[hsl(207,43%,42%)] hover:bg-[hsl(207,43%,35%)]",
    navIcon: "text-white",
  },
};

export const BusinessPopup = ({ business, onClose, language }: BusinessPopupProps) => {
  const styles = POPUP_STYLES[business.planSlug] || POPUP_STYLES.free;
  const directionsUrl = getDirectionsUrl(business.coordinates[1], business.coordinates[0]);

  const handleDirectionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(directionsUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className={`
        relative inline-flex items-center gap-1.5
        px-2.5 py-1 pr-7
        ${styles.container}
      `}
    >
      {/* Content: Name & Address */}
      <div className="flex flex-col items-start min-w-0">
        <h3 className={`font-medium text-[11px] leading-tight whitespace-nowrap ${styles.name}`}>
          {business.name}
        </h3>
        {business.address && (
          <div className={`flex items-center gap-0.5 text-[9px] leading-tight ${styles.address}`}>
            <span className="opacity-70">⊙</span>
            <span className="whitespace-nowrap">{business.address}</span>
          </div>
        )}
      </div>

      {/* Navigation/Directions button - small, right edge */}
      <button
        onClick={handleDirectionsClick}
        className={`
          absolute -right-1 top-1/2 -translate-y-1/2
          w-5 h-5 
          rounded-full flex items-center justify-center
          transition-all duration-200 hover:scale-110
          ${styles.navButton}
        `}
        title={language === "el" ? "Οδηγίες" : "Directions"}
      >
        <Navigation className={`h-2.5 w-2.5 ${styles.navIcon}`} />
      </button>
    </div>
  );
};
