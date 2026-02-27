import type { BusinessLocation } from "@/hooks/useMapBusinesses";
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
  // Use profile photo (logo_url) instead of cover photo
  const imageUrl = business.logo_url || business.cover_url;
  const cityLabel = translateCity(business.city, language);

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
          className="relative overflow-hidden rounded-full w-[100px] h-[100px] md:w-[110px] md:h-[110px] lg:w-[124px] lg:h-[124px]"
          style={{
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

          {/* Name overlay - no gradient, clean text with plan-colored outline */}
          <div className="absolute inset-x-0 bottom-0 px-1 pb-2.5 text-center">
            <div className="relative">
              <div
                className="text-[9px] md:text-[10px] lg:text-[11px] font-bold leading-tight text-white text-center line-clamp-2 px-1"
                style={{
                  WebkitTextStroke: `0.5px hsl(var(${planVar}))`,
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                }}
              >
                {business.name}
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
};
