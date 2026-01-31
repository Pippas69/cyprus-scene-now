import type { BusinessLocation } from "@/hooks/useMapBusinesses";
import { getDirectionsUrl } from "@/lib/mapUtils";
import { translateCity } from "@/lib/cityTranslations";

interface BusinessPopupProps {
  business: BusinessLocation;
  onClose: () => void;
  language: "el" | "en";
  onProfileClick: (business: BusinessLocation) => void;
}

const getPlanColorVar = (planSlug: BusinessLocation["planSlug"]): string => {
  switch (planSlug) {
    case "elite":
      return "--plan-elite";
    case "pro":
      return "--plan-pro";
    case "basic":
      return "--plan-basic";
    default:
      return "--ocean";
  }
};

export const BusinessPopup = ({ business, language, onProfileClick }: BusinessPopupProps) => {
  const planVar = getPlanColorVar(business.planSlug);
  const directionsUrl = getDirectionsUrl(business.coordinates[1], business.coordinates[0]);
  // Use profile photo (logo_url) instead of cover photo
  const imageUrl = business.logo_url || business.cover_url;
  const cityLabel = translateCity(business.city, language);

  const handleDirectionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(directionsUrl, '_blank', 'noopener,noreferrer');
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onProfileClick(business);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Small circular profile photo - no background */}
      <button
        type="button"
        onClick={handleProfileClick}
        className="relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={language === "el" ? "Άνοιγμα προφίλ" : "Open profile"}
        style={{
          boxShadow: `0 4px 12px -4px hsl(var(${planVar}) / 0.5)`,
        }}
      >
        <div
          className="relative overflow-hidden rounded-full"
          style={{
            width: 72,
            height: 72,
            border: `2.5px solid hsl(var(${planVar}))`,
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={business.name}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="h-full w-full bg-muted" />
          )}
        </div>
      </button>

      {/* Name and city - compact */}
      <div className="mt-1 text-center">
        <div className="text-[11px] font-semibold leading-tight text-foreground drop-shadow-sm">
          {business.name}
        </div>
        <div className="text-[9px] leading-tight text-muted-foreground">
          {cityLabel}
        </div>
      </div>

      {/* Compact directions badge */}
      <button
        type="button"
        onClick={handleDirectionsClick}
        className="mt-1.5 inline-flex items-center justify-center rounded-full border bg-background/90 px-2.5 py-0.5 text-[9px] font-medium backdrop-blur-sm transition-transform hover:scale-[1.02]"
        style={{
          borderColor: `hsl(var(${planVar}))`,
          boxShadow: `0 2px 6px -2px hsl(var(${planVar}) / 0.3)`,
        }}
        aria-label={language === 'el' ? 'Οδηγίες' : 'Directions'}
      >
        {language === "el" ? "Οδηγίες" : "Directions"}
      </button>
    </div>
  );
};
