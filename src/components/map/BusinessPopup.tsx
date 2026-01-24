import { MapPin } from "lucide-react";
import type { BusinessLocation } from "@/hooks/useMapBusinesses";

interface BusinessPopupProps {
  business: BusinessLocation;
  onClose: () => void;
  language: "el" | "en";
}

export const BusinessPopup = ({ business, onClose, language }: BusinessPopupProps) => {
  return (
    // Compact responsive label above the pin - smaller on mobile/tablet
    <div className="bg-background/95 backdrop-blur-sm border border-border rounded-md shadow-md px-1.5 py-1 md:px-2 md:py-1.5 lg:px-2.5 lg:py-1.5 text-center min-w-max">
      {/* Business Name - responsive font size */}
      <h3 className="font-semibold text-[10px] md:text-xs lg:text-sm leading-tight">{business.name}</h3>
      
      {/* Address with location icon - responsive */}
      {business.address && (
        <div className="flex items-center justify-center gap-0.5 text-[8px] md:text-[10px] lg:text-xs text-muted-foreground mt-0.5">
          <MapPin className="h-2 w-2 md:h-2.5 md:w-2.5 lg:h-3 lg:w-3 shrink-0" />
          <span>{business.address}</span>
        </div>
      )}
    </div>
  );
};
