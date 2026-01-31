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
  const imageUrl = business.cover_url || business.logo_url;
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
      {/* Circular premium card (exact focus state) */}
      <button
        type="button"
        onClick={handleProfileClick}
        className="relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={language === "el" ? "Άνοιγμα προφίλ" : "Open profile"}
        style={{
          boxShadow: `0 14px 28px -12px hsl(var(${planVar}) / 0.35)`,
        }}
      >
        <div
          className="relative overflow-hidden rounded-full"
          style={{
            width: 200,
            height: 200,
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
          <div className="absolute inset-x-0 bottom-0 px-4 pb-3 pt-8 text-center">
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[hsl(var(--foreground)/0.55)] to-transparent" />
            <div className="relative">
              <div className="text-[16px] font-semibold leading-tight text-[hsl(var(--background))]">
                {business.name}
              </div>
              <div className="mt-0.5 text-[12px] leading-tight text-[hsl(var(--background))] opacity-90">
                {cityLabel}
              </div>
            </div>
          </div>
        </div>
      </button>

      {/* Directions badge - premium (colored border per plan) */}
      <button
        type="button"
        onClick={handleDirectionsClick}
        className="-mt-2 inline-flex items-center justify-center rounded-full border bg-[hsl(var(--background)/0.92)] px-4 py-1.5 text-[12px] font-medium backdrop-blur-sm transition-transform hover:scale-[1.02]"
        style={{
          borderColor: `hsl(var(${planVar}))`,
          boxShadow: `0 10px 22px -14px hsl(var(${planVar}) / 0.45)`,
        }}
        aria-label={language === 'el' ? 'Οδηγίες' : 'Directions'}
      >
        {language === "el" ? "Οδηγίες" : "Directions"}
      </button>
    </div>
  );
};
