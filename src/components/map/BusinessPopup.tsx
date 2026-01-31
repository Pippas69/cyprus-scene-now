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
      {/* Circular profile photo with in-image text overlay (like the reference) */}
      <button
        type="button"
        onClick={handleProfileClick}
        className="relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={language === "el" ? "Άνοιγμα προφίλ" : "Open profile"}
        style={{
          boxShadow: `0 10px 20px -10px hsl(var(${planVar}) / 0.6)`,
        }}
      >
        <div
          className="relative overflow-hidden rounded-full"
          style={{
            width: 124,
            height: 124,
            border: `3px solid hsl(var(${planVar}))`,
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

          {/* Text overlay */}
          <div className="absolute inset-x-0 bottom-0 px-3 pb-2 pt-6 text-center">
            <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[hsl(var(--foreground)/0.55)] to-transparent" />
            <div className="relative">
              <div className="text-[12px] font-semibold leading-tight text-[hsl(var(--background))]">
                {business.name}
              </div>
              <div className="mt-0.5 text-[10px] leading-tight text-[hsl(var(--background))] opacity-90">
                {cityLabel}
              </div>
            </div>
          </div>
        </div>
      </button>

      {/* Compact directions badge (directly under the pin area) */}
      <button
        type="button"
        onClick={handleDirectionsClick}
        className="-mt-0.5 inline-flex items-center justify-center rounded-full border bg-background/90 px-2 py-0.5 text-[9px] font-medium backdrop-blur-sm transition-transform hover:scale-[1.02]"
        style={{
          borderColor: `hsl(var(${planVar}))`,
          boxShadow: `0 6px 14px -10px hsl(var(${planVar}) / 0.5)`,
        }}
        aria-label={language === 'el' ? 'Οδηγίες' : 'Directions'}
      >
        {language === "el" ? "Οδηγίες" : "Directions"}
      </button>
    </div>
  );
};
