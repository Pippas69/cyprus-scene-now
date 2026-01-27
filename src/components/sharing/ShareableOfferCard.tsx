import { forwardRef } from 'react';
import { Calendar, MapPin, Percent, Flame } from 'lucide-react';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';

interface ShareableOfferCardProps {
  offer: {
    id: string;
    title: string;
    description?: string;
    percent_off?: number | null;
    special_deal_text?: string | null;
    end_at: string;
    offer_image_url?: string | null;
    businessName?: string;
    businessCoverUrl?: string;
    businessLogoUrl?: string;
  };
  variant: 'story' | 'post';
  language: 'el' | 'en';
}

export const ShareableOfferCard = forwardRef<HTMLDivElement, ShareableOfferCardProps>(
  ({ offer, variant, language }, ref) => {
    const locale = language === 'el' ? el : enUS;
    const endDate = new Date(offer.end_at);
    
    const dateStr = format(endDate, 'd MMM', { locale });

    // Get offer display text
    const getOfferText = () => {
      if (offer.special_deal_text) return offer.special_deal_text;
      if (offer.percent_off && offer.percent_off > 0) return `-${offer.percent_off}%`;
      return '';
    };

    const offerText = getOfferText();
    const coverImage = offer.offer_image_url || offer.businessCoverUrl || offer.businessLogoUrl;

    if (variant === 'story') {
      // Story format: 1080x1920 (9:16 aspect ratio)
      return (
        <div
          ref={ref}
          className="relative w-[360px] h-[640px] overflow-hidden rounded-xl"
          style={{
            background: 'linear-gradient(180deg, hsl(207 72% 22%) 0%, hsl(174 62% 56%) 100%)',
          }}
        >
          {/* Background Image with Blur */}
          {coverImage && (
            <div className="absolute inset-0">
              <img
                src={coverImage}
                alt=""
                className="w-full h-full object-cover opacity-30 blur-sm"
                crossOrigin="anonymous"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[hsl(207,72%,22%)]/80 via-transparent to-[hsl(174,62%,56%)]/80" />
            </div>
          )}

          {/* Content */}
          <div className="relative z-10 flex flex-col h-full p-6">
            {/* ΦΟΜΟ Branding */}
            <div className="text-center mb-4">
              <span 
                className="text-2xl font-bold text-white tracking-wider"
                style={{ fontFamily: "'Cinzel Decorative', serif" }}
              >
                ΦΟΜΟ
              </span>
            </div>

            {/* Main Business Image */}
            <div className="flex-1 flex items-center justify-center">
              {coverImage ? (
                <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
                  <img
                    src={coverImage}
                    alt={offer.businessName || 'Business'}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                </div>
              ) : (
                <div className="w-full aspect-square rounded-2xl bg-white/10 flex items-center justify-center">
                  <span className="text-6xl">🔥</span>
                </div>
              )}
            </div>

            {/* Offer Details */}
            <div className="mt-6 space-y-4 text-white">
              {/* Discount Badge */}
              {offerText && (
                <div className="flex items-center justify-center gap-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
                    <Flame className="h-5 w-5 text-orange-400" />
                    <span className="text-xl font-bold">{offerText}</span>
                  </div>
                </div>
              )}

              <h2 className="text-2xl font-bold text-center leading-tight">
                {offer.title}
              </h2>

              <div className="space-y-2">
                {/* Expiry Date */}
                <div className="flex items-center justify-center gap-2 text-white/90">
                  <Calendar className="h-5 w-5 shrink-0" />
                  <span className="font-medium leading-none">
                    {language === 'el' ? `Λήγει ${dateStr}` : `Expires ${dateStr}`}
                  </span>
                </div>

                {/* Business Name */}
                {offer.businessName && (
                  <div className="flex items-center justify-center gap-2 text-white/90">
                    <MapPin className="h-5 w-5 shrink-0" />
                    <span className="font-medium leading-none text-center">{offer.businessName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Call to Action */}
            <div className="mt-6 text-center">
              <div className="flex justify-center">
                <div className="inline-flex items-center justify-center max-w-full px-5 py-2.5 bg-white/20 backdrop-blur-sm rounded-full">
                  <span className="text-white font-semibold text-base text-center leading-none whitespace-nowrap">
                    {language === 'el' ? 'Δες περισσότερα στο ΦΟΜΟ' : 'See more on ΦΟΜΟ'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Post format: 1200x630 (1.91:1 aspect ratio for social cards)
    return (
      <div
        ref={ref}
        className="relative w-[600px] h-[315px] overflow-hidden rounded-xl"
        style={{
          background: 'linear-gradient(135deg, hsl(207 72% 22%) 0%, hsl(174 62% 56%) 100%)',
        }}
      >
        {/* Background */}
        <div className="absolute inset-0 flex">
          {/* Image Side */}
          <div className="w-1/2 h-full relative">
            {coverImage ? (
              <img
                src={coverImage}
                alt={offer.businessName || 'Business'}
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[hsl(207,72%,22%)] to-[hsl(174,62%,56%)] flex items-center justify-center">
                <span className="text-6xl">🔥</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[hsl(207,72%,22%)]" />
          </div>
          
          {/* Content Side */}
          <div className="w-1/2 h-full bg-[hsl(207,72%,22%)]" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex h-full">
          <div className="w-1/2" />
          
          <div className="w-1/2 flex flex-col justify-center p-6 text-white">
            {/* ΦΟΜΟ Branding */}
            <span 
              className="text-lg font-bold tracking-wider text-[hsl(174,62%,56%)] mb-2"
              style={{ fontFamily: "'Cinzel Decorative', serif" }}
            >
              ΦΟΜΟ
            </span>

            {/* Discount Badge */}
            {offerText && (
              <div className="inline-flex items-center gap-1.5 mb-2 text-orange-400">
                <Flame className="h-4 w-4" />
                <span className="text-lg font-bold">{offerText}</span>
              </div>
            )}

            {/* Title */}
            <h2 className="text-xl font-bold leading-tight mb-3 line-clamp-2">
              {offer.title}
            </h2>

            {/* Details */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-white/90">
                <Calendar className="h-4 w-4 text-[hsl(174,62%,56%)]" />
                <span>{language === 'el' ? `Λήγει ${dateStr}` : `Expires ${dateStr}`}</span>
              </div>

              {offer.businessName && (
                <div className="flex items-center gap-2 text-white/90">
                  <MapPin className="h-4 w-4 text-[hsl(174,62%,56%)]" />
                  <span className="truncate">{offer.businessName}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ShareableOfferCard.displayName = 'ShareableOfferCard';
