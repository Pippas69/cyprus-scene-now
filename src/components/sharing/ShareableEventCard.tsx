import { forwardRef } from 'react';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';

interface ShareableEventCardProps {
  event: {
    id: string;
    title: string;
    description?: string;
    location: string;
    startAt: string;
    coverImageUrl?: string;
    businessName?: string;
  };
  variant: 'story' | 'post';
  language: 'el' | 'en';
}

export const ShareableEventCard = forwardRef<HTMLDivElement, ShareableEventCardProps>(
  ({ event, variant, language }, ref) => {
    const locale = language === 'el' ? el : enUS;
    const startDate = new Date(event.startAt);
    
    const dateStr = format(startDate, 'EEE, d MMM', { locale });
    const timeStr = format(startDate, 'HH:mm', { locale });

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
          {event.coverImageUrl && (
            <div className="absolute inset-0">
              <img
                src={event.coverImageUrl}
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

            {/* Main Event Image */}
            <div className="flex-1 flex items-center justify-center">
              {event.coverImageUrl ? (
                <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
                  <img
                    src={event.coverImageUrl}
                    alt={event.title}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                </div>
              ) : (
                <div className="w-full aspect-square rounded-2xl bg-white/10 flex items-center justify-center">
                  <span className="text-6xl">🌊</span>
                </div>
              )}
            </div>

            {/* Event Details */}
            <div className="mt-6 space-y-4 text-white">
              <h2 className="text-2xl font-bold text-center leading-tight">
                {event.title}
              </h2>

              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-white/90">
                  <Calendar className="h-5 w-5" />
                  <span className="font-medium">{dateStr}</span>
                  <Clock className="h-5 w-5 ml-2" />
                  <span className="font-medium">{timeStr}</span>
                </div>

                <div className="flex items-center justify-center gap-2 text-white/90">
                  <MapPin className="h-5 w-5" />
                  <span className="font-medium">{event.location}</span>
                </div>

                {event.businessName && (
                  <p className="text-center text-white/70 text-sm">
                    {language === 'el' ? 'Από' : 'By'} {event.businessName}
                  </p>
                )}
              </div>
            </div>

            {/* QR Code Placeholder - Call to Action */}
            <div className="mt-6 text-center">
              <div className="inline-block px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full">
                <span className="text-white font-medium">
                  {language === 'el' ? 'Δες περισσότερα στο ΦΟΜΟ' : 'See more on ΦΟΜΟ'}
                </span>
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
            {event.coverImageUrl ? (
              <img
                src={event.coverImageUrl}
                alt={event.title}
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[hsl(207,72%,22%)] to-[hsl(174,62%,56%)] flex items-center justify-center">
                <span className="text-6xl">🌊</span>
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

            {/* Title */}
            <h2 className="text-xl font-bold leading-tight mb-3 line-clamp-2">
              {event.title}
            </h2>

            {/* Details */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-white/90">
                <Calendar className="h-4 w-4 text-[hsl(174,62%,56%)]" />
                <span>{dateStr}</span>
                <Clock className="h-4 w-4 ml-2 text-[hsl(174,62%,56%)]" />
                <span>{timeStr}</span>
              </div>

              <div className="flex items-center gap-2 text-white/90">
                <MapPin className="h-4 w-4 text-[hsl(174,62%,56%)]" />
                <span className="truncate">{event.location}</span>
              </div>

              {event.businessName && (
                <p className="text-white/60 text-xs mt-2">
                  {language === 'el' ? 'Από' : 'By'} {event.businessName}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ShareableEventCard.displayName = 'ShareableEventCard';
