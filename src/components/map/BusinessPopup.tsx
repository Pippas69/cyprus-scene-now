import { MapPin, Navigation } from "lucide-react";
import type { BusinessLocation } from "@/hooks/useMapBusinesses";
import { getDirectionsUrl } from "@/lib/mapUtils";

interface BusinessPopupProps {
  business: BusinessLocation;
  onClose: () => void;
  language: "el" | "en";
}

// Premium popup styling per plan tier
const POPUP_STYLES: Record<string, {
  container: string;
  name: string;
  address: string;
  navButton: string;
  navIcon: string;
}> = {
  elite: {
    // Premium golden background with darker gold border
    container: "bg-gradient-to-br from-[hsl(45,95%,65%)] to-[hsl(45,95%,55%)] border-2 border-[hsl(45,90%,40%)] shadow-[0_4px_16px_rgba(234,179,8,0.4)]",
    name: "text-[hsl(35,80%,15%)]",
    address: "text-[hsl(35,60%,25%)]",
    navButton: "bg-[hsl(45,90%,40%)] hover:bg-[hsl(45,90%,35%)] shadow-sm",
    navIcon: "text-white",
  },
  pro: {
    // Light background with coral/orange border
    container: "bg-background/95 border-2 border-[hsl(var(--plan-pro))] shadow-[0_4px_16px_rgba(249,115,22,0.25)]",
    name: "text-foreground",
    address: "text-muted-foreground",
    navButton: "bg-[hsl(var(--plan-pro))] hover:bg-[hsl(12,90%,50%)] shadow-sm",
    navIcon: "text-white",
  },
  basic: {
    // Light background with cyan border
    container: "bg-background/95 border-2 border-[hsl(var(--plan-basic))] shadow-[0_4px_16px_rgba(6,182,212,0.25)]",
    name: "text-foreground",
    address: "text-muted-foreground",
    navButton: "bg-[hsl(var(--plan-basic))] hover:bg-[hsl(200,90%,40%)] shadow-sm",
    navIcon: "text-white",
  },
  free: {
    // Light background with ocean blue border
    container: "bg-background/95 border-2 border-[hsl(var(--ocean))] shadow-[0_4px_16px_rgba(61,107,153,0.2)]",
    name: "text-foreground",
    address: "text-muted-foreground",
    navButton: "bg-[hsl(var(--ocean))] hover:bg-[hsl(207,72%,28%)] shadow-sm",
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
        relative backdrop-blur-sm rounded-xl 
        px-3 py-2 md:px-4 md:py-2.5 
        min-w-[140px] max-w-[220px]
        ${styles.container}
      `}
    >
      {/* Navigation/Directions button - top right corner */}
      <button
        onClick={handleDirectionsClick}
        className={`
          absolute -top-2 -right-2 
          w-7 h-7 md:w-8 md:h-8 
          rounded-full flex items-center justify-center
          transition-all duration-200 hover:scale-110
          ${styles.navButton}
        `}
        title={language === "el" ? "Οδηγίες" : "Directions"}
      >
        <Navigation className={`h-3.5 w-3.5 md:h-4 md:w-4 ${styles.navIcon}`} />
      </button>

      {/* Business Name - centered */}
      <h3 className={`font-semibold text-xs md:text-sm leading-tight text-center pr-4 ${styles.name}`}>
        {business.name}
      </h3>
      
      {/* Address with location icon */}
      {business.address && (
        <div className={`flex items-center justify-center gap-1 text-[10px] md:text-xs mt-1 ${styles.address}`}>
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{business.address}</span>
        </div>
      )}
    </div>
  );
};
