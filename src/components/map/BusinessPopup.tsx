import { MapPin } from "lucide-react";
import type { BusinessLocation } from "@/hooks/useMapBusinesses";

interface BusinessPopupProps {
  business: BusinessLocation;
  onClose: () => void;
  language: "el" | "en";
}

export const BusinessPopup = ({ business, onClose, language }: BusinessPopupProps) => {
  return (
    // Simple compact label above the pin - matches the design reference
    <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg px-3 py-2 text-center min-w-max">
      {/* Business Name */}
      <h3 className="font-semibold text-sm leading-tight">{business.name}</h3>
      
      {/* Address with location icon */}
      {business.address && (
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-0.5">
          <MapPin className="h-3 w-3 shrink-0" />
          <span>{business.address}</span>
        </div>
      )}
    </div>
  );
};
