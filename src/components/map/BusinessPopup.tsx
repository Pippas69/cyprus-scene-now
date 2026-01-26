import { Navigation } from "lucide-react";
import type { BusinessLocation } from "@/hooks/useMapBusinesses";
import { getDirectionsUrl } from "@/lib/mapUtils";

interface BusinessPopupProps {
  business: BusinessLocation;
  onClose: () => void;
  language: "el" | "en";
}

// Premium popup styling per plan tier - white interior, colored border (no outer background)
const POPUP_STYLES: Record<string, {
  container: string;
  name: string;
  address: string;
  navButton: string;
  navIcon: string;
}> = {
  elite: {
    container:
      "bg-white border-2 border-[hsl(var(--plan-elite))] rounded-[10px] shadow-[0_3px_10px_hsl(var(--plan-elite)/0.18)]",
    name: "text-foreground",
    address: "text-muted-foreground",
    // Small badge like the reference: white fill + colored border, icon in tier color
    navButton:
      "bg-white border border-[hsl(var(--plan-elite))] shadow-[0_2px_6px_hsl(var(--plan-elite)/0.18)]",
    navIcon: "text-[hsl(var(--plan-elite))]",
  },
  pro: {
    container:
      "bg-white border-2 border-[hsl(var(--plan-pro))] rounded-[10px] shadow-[0_3px_10px_hsl(var(--plan-pro)/0.18)]",
    name: "text-foreground",
    address: "text-muted-foreground",
    navButton:
      "bg-white border border-[hsl(var(--plan-pro))] shadow-[0_2px_6px_hsl(var(--plan-pro)/0.18)]",
    navIcon: "text-[hsl(var(--plan-pro))]",
  },
  basic: {
    container:
      "bg-white border-2 border-[hsl(var(--plan-basic))] rounded-[10px] shadow-[0_3px_10px_hsl(var(--plan-basic)/0.18)]",
    name: "text-foreground",
    address: "text-muted-foreground",
    navButton:
      "bg-white border border-[hsl(var(--plan-basic))] shadow-[0_2px_6px_hsl(var(--plan-basic)/0.18)]",
    navIcon: "text-[hsl(var(--plan-basic))]",
  },
  free: {
    container:
      "bg-white border-2 border-[hsl(var(--ocean))] rounded-[10px] shadow-[0_3px_10px_hsl(var(--ocean)/0.16)]",
    name: "text-foreground",
    address: "text-muted-foreground",
    navButton:
      "bg-white border border-[hsl(var(--ocean))] shadow-[0_2px_6px_hsl(var(--ocean)/0.16)]",
    navIcon: "text-[hsl(var(--ocean))]",
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
        relative inline-flex items-start gap-2
        px-3 py-1.5 pr-8
        ${styles.container}
      `}
    >
      {/* Content: Name & Address */}
      <div className="flex flex-col items-start min-w-0">
        <h3 className={`font-semibold text-[12px] leading-tight whitespace-nowrap ${styles.name}`}>
          {business.name}
        </h3>
        {business.address && (
          <div className={`flex items-center gap-1 text-[10px] leading-tight ${styles.address}`}>
            <span className="opacity-70">⊙</span>
            <span className="whitespace-nowrap">{business.address}</span>
          </div>
        )}
      </div>

      {/* Navigation/Directions button - top-right like reference */}
      <button
        onClick={handleDirectionsClick}
        className={`
          absolute -top-2 -right-2
          w-6 h-6
          rounded-md flex items-center justify-center
          transition-all duration-200 hover:scale-105
          ${styles.navButton}
        `}
        title={language === "el" ? "Οδηγίες" : "Directions"}
      >
        <Navigation className={`h-3 w-3 ${styles.navIcon}`} />
      </button>
    </div>
  );
};
