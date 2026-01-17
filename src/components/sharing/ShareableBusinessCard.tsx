import { forwardRef } from 'react';
import { MapPin } from 'lucide-react';

interface ShareableBusinessCardProps {
  business: {
    id: string;
    name: string;
    city?: string;
    address?: string;
    logoUrl?: string;
    coverUrl?: string;
  };
  variant: 'story' | 'post';
  language: 'el' | 'en';
}

export const ShareableBusinessCard = forwardRef<HTMLDivElement, ShareableBusinessCardProps>(
  ({ business, variant, language }, ref) => {
    const location = [business.city, business.address].filter(Boolean).join(' • ');

    if (variant === 'story') {
      return (
        <div
          ref={ref}
          className="relative w-[360px] h-[640px] overflow-hidden rounded-xl"
          style={{
            background: 'linear-gradient(180deg, hsl(207 72% 22%) 0%, hsl(174 62% 56%) 100%)',
          }}
        >
          {business.coverUrl && (
            <div className="absolute inset-0">
              <img
                src={business.coverUrl}
                alt=""
                className="w-full h-full object-cover opacity-30 blur-sm"
                crossOrigin="anonymous"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[hsl(207,72%,22%)]/80 via-transparent to-[hsl(174,62%,56%)]/80" />
            </div>
          )}

          <div className="relative z-10 flex flex-col h-full p-6 text-white">
            <div className="text-center mb-4">
              <span
                className="text-2xl font-bold tracking-wider"
                style={{ fontFamily: "'Cinzel Decorative', serif" }}
              >
                ΦΟΜΟ
              </span>
            </div>

            <div className="flex-1 flex items-center justify-center">
              {business.logoUrl ? (
                <div className="w-full aspect-square max-w-[300px] rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
                  <img
                    src={business.logoUrl}
                    alt={business.name}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                </div>
              ) : (
                <div className="w-full aspect-square max-w-[300px] rounded-2xl bg-white/10 flex items-center justify-center">
                  <span className="text-6xl">🏷️</span>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-3">
              <h2 className="text-2xl font-bold text-center leading-tight">{business.name}</h2>

              {location ? (
                <div className="flex items-center justify-center gap-2 text-white/90">
                  <MapPin className="h-5 w-5" />
                  <span className="font-medium">{location}</span>
                </div>
              ) : null}

              <p className="text-center text-white/70 text-sm">
                {language === 'el' ? 'Δες περισσότερα στο ΦΟΜΟ' : 'See more on ΦΟΜΟ'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className="relative w-[600px] h-[315px] overflow-hidden rounded-xl"
        style={{
          background: 'linear-gradient(135deg, hsl(207 72% 22%) 0%, hsl(174 62% 56%) 100%)',
        }}
      >
        <div className="absolute inset-0 flex">
          <div className="w-1/2 h-full relative">
            {business.coverUrl ? (
              <img
                src={business.coverUrl}
                alt={business.name}
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            ) : business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[hsl(207,72%,22%)] to-[hsl(174,62%,56%)] flex items-center justify-center">
                <span className="text-6xl">🏷️</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[hsl(207,72%,22%)]" />
          </div>
          <div className="w-1/2 h-full bg-[hsl(207,72%,22%)]" />
        </div>

        <div className="relative z-10 flex h-full">
          <div className="w-1/2" />

          <div className="w-1/2 flex flex-col justify-center p-6 text-white">
            <span
              className="text-lg font-bold tracking-wider text-[hsl(174,62%,56%)] mb-2"
              style={{ fontFamily: "'Cinzel Decorative', serif" }}
            >
              ΦΟΜΟ
            </span>

            <h2 className="text-xl font-bold leading-tight mb-3 line-clamp-2">{business.name}</h2>

            {location ? (
              <div className="flex items-center gap-2 text-white/90 text-sm">
                <MapPin className="h-4 w-4 text-[hsl(174,62%,56%)]" />
                <span className="truncate">{location}</span>
              </div>
            ) : null}

            <p className="text-white/60 text-xs mt-3">
              {language === 'el' ? 'Άνοιξε το προφίλ για εκδηλώσεις & προσφορές' : 'Open the profile for events & offers'}
            </p>
          </div>
        </div>
      </div>
    );
  }
);

ShareableBusinessCard.displayName = 'ShareableBusinessCard';
