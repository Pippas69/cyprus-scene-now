import { Link, useNavigate } from "react-router-dom";
import { MapPin, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, differenceInMinutes } from "date-fns";
import { enUS, el } from "date-fns/locale";
import { CardActionBar } from "./CardActionBar";
import { useCallback, useRef } from "react";
import { trackEngagement, trackEventView, useViewTracking } from "@/lib/analyticsTracking";
import { translateCity } from "@/lib/cityTranslations";

interface UnifiedEventCardProps {
  event: {
    id: string;
    title: string;
    location: string;
    start_at: string;
    end_at?: string;
    category?: string[];
    cover_image_url?: string | null;
    price_tier?: string;
    interested_count?: number;
    going_count?: number;
    business_id?: string;
    // Event type fields for badge logic
    event_type?: string | null;
    accepts_reservations?: boolean;
    external_ticket_url?: string | null;
    businesses?: {
      id?: string;
      name: string;
      logo_url?: string | null;
      city?: string;
    };
  };
  language: "el" | "en";
  isBoosted?: boolean;
  isFree?: boolean;
  size?: "compact" | "default" | "boosted" | "full" | "mobileFixed";
  className?: string;
  /**
   * When true, this card will NOT record a view impression.
   * Useful for user-dashboard sections (My Events/My Reservations/etc.) that must never count as views.
   */
  disableViewTracking?: boolean;
  /** Optional query string appended to navigation links (e.g. "?src=dashboard_user"). */
  linkSearch?: string;
}

const translations = {
  el: {
    today: "Σήμερα",
    tomorrow: "Αύριο",
    free: "Δωρεάν",
    reservation: "Κράτηση",
    ticket: "Εισιτήριο",
    startsIn: "ξεκινά σε περίπου",
    minutes: "λεπτά"
  },
  en: {
    today: "Today",
    tomorrow: "Tomorrow",
    free: "Free",
    reservation: "Reservation",
    ticket: "Ticket",
    startsIn: "starts in about",
    minutes: "minutes"
  }
};

// Greek day abbreviations
const greekDays: Record<string, string> = {
  Mon: "Δευ",
  Tue: "Τρί",
  Wed: "Τετ",
  Thu: "Πέμ",
  Fri: "Παρ",
  Sat: "Σάβ",
  Sun: "Κυρ"
};

export const UnifiedEventCard = ({
  event,
  language,
  isBoosted = false,
  isFree = false,
  size = "default",
  className,
  disableViewTracking = false,
  linkSearch
}: UnifiedEventCardProps) => {
  const navigate = useNavigate();
  const t = translations[language];
  const eventDate = new Date(event.start_at);
  const now = new Date();

  const computedLinkSearch = (() => {
    if (linkSearch) return linkSearch;
    try {
      return window.location.pathname.startsWith('/dashboard-business') ? '?src=dashboard_business' : '';
    } catch {
      return '';
    }
  })();

  // View tracking - trackEventView now handles source validation internally
  const cardRef = useRef<HTMLDivElement | null>(null);
  const handleView = useCallback(() => {
    if (disableViewTracking) return;
    // Source detection - the actual filtering is done inside trackEventView
    const path = window.location.pathname;
    const source = path.startsWith('/business/') ? 'profile' :
                   path.startsWith('/event/') ? 'profile' :  // Similar events on event detail page
                   path.includes('/ekdiloseis') ? 'direct' :
                   path.includes('/feed') || path === '/' || path === '/dashboard-business' || path === '/dashboard-business/'
                     ? 'feed'
                     : 'direct';
    trackEventView(event.id, source as 'feed' | 'map' | 'search' | 'profile' | 'direct');
  }, [disableViewTracking, event.id]);
  useViewTracking(cardRef as any, handleView, { threshold: 0.5 });

  // Interaction = click to open event
  const handleCardClick = useCallback(() => {
    if (!event.business_id) return;
    trackEngagement(event.business_id, 'click', 'event', event.id, { source: 'feed' });
  }, [event.business_id, event.id]);

  // Date/Time formatting
  const dateLocale = language === "el" ? el : enUS;
  const isToday = eventDate.toDateString() === now.toDateString();
  const isTomorrow = eventDate.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  let dateLabel: string;
  if (isToday) {
    dateLabel = `${t.today} · ${format(eventDate, "HH:mm")}`;
  } else if (isTomorrow) {
    dateLabel = `${t.tomorrow} · ${format(eventDate, "HH:mm")}`;
  } else {
    dateLabel = `${format(eventDate, "EEEE, d MMMM", { locale: dateLocale })} · ${format(eventDate, "HH:mm")}`;
  }

  // Location line - translate city name
  const locationParts: string[] = [];
  if (event.location) locationParts.push(event.location);
  if (event.businesses?.city && event.businesses.city !== event.location) {
    locationParts.push(translateCity(event.businesses.city, language));
  }
  if (event.businesses?.name) locationParts.push(event.businesses.name);
  const locationLine = locationParts.join(" · ");

  // Counters
  const interestedCount = event.interested_count || 0;
  const goingCount = event.going_count || 0;

  // Determine entry type badge: Free (Δωρεάν), Reservation (Κράτηση), or Ticket (Εισιτήριο)
  const getEntryType = (): 'free' | 'reservation' | 'ticket' | null => {
    // If event_type is explicitly set, use it
    if (event.event_type === 'ticket') return 'ticket';
    if (event.event_type === 'reservation') return 'reservation';
    if (event.event_type === 'free_entry') return 'free';
    
    // Fallback logic based on fields
    if (event.external_ticket_url) return 'ticket';
    if (event.accepts_reservations) return 'reservation';
    if (isFree || event.price_tier === 'free') return 'free';
    
    return null;
  };
  
  const entryType = getEntryType();
  
  const getEntryBadgeLabel = () => {
    if (entryType === 'free') return t.free;
    if (entryType === 'reservation') return t.reservation;
    if (entryType === 'ticket') return t.ticket;
    return null;
  };
  
  const entryBadgeLabel = getEntryBadgeLabel();

  // Handle map click
  const handleMapClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If this card is rendered in user-dashboard context, we pass src so map pin clicks won't count as views.
    const src = (() => {
      if (!linkSearch) return null;
      try {
        const raw = linkSearch.startsWith('?') ? linkSearch.slice(1) : linkSearch;
        return new URLSearchParams(raw).get('src');
      } catch {
        return null;
      }
    })();

    navigate(`/xartis?business=${event.business_id}${src ? `&src=${encodeURIComponent(src)}` : ''}`);
  };

  // For Feed cards (compact, default, boosted) - keep horizontal scroller style
  if (size === "compact" || size === "default" || size === "boosted") {
    // Boosted cards are slightly larger on mobile than business cards
    const sizeClasses = {
      compact: "min-w-[160px] max-w-[160px] sm:min-w-[200px] sm:max-w-[200px]",
      default: "min-w-[180px] max-w-[180px] sm:min-w-[220px] sm:max-w-[220px]",
      boosted: "min-w-[220px] max-w-[220px] sm:min-w-[240px] sm:max-w-[240px]"
    };

    return (
      <Link
        ref={cardRef as any}
        to={`/event/${event.id}${computedLinkSearch || ""}`}
        onClick={handleCardClick}
        className={cn(
          "flex flex-col rounded-xl bg-card border border-border",
          "hover:border-primary/50 hover:shadow-lg transition-all duration-200",
          "overflow-visible group",
          sizeClasses[size],
          className
        )}
      >
        {/* Image section - larger on mobile for boosted */}
          <div className={cn("relative overflow-visible", size === "boosted" ? "h-36 sm:h-40" : "h-32 sm:h-40")}>
          <div className="absolute inset-0 overflow-hidden rounded-t-xl">
            {event.cover_image_url ? (
              <img
                src={event.cover_image_url}
                alt={event.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-primary/50" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>

          {isBoosted && (
            <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 z-10">
              <PremiumBadge type="event" />
            </div>
          )}

          {entryBadgeLabel && (
            <Badge className={cn(
              "absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 text-white text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-4 sm:h-5 border-0 z-10",
              isBoosted 
                ? "bg-gradient-to-r from-amber-500 to-orange-500" 
                : "bg-gradient-to-r from-accent to-seafoam"
            )}>
              {entryBadgeLabel}
            </Badge>
          )}
        </div>

        {/* Content section */}
        <div className="flex-1 p-2 sm:p-3 flex flex-col justify-between min-h-0 gap-0.5">
          <h4 className="text-xs sm:text-sm font-semibold truncate group-hover:text-primary transition-colors">
            {event.title}
          </h4>
          <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground min-w-0">
            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs truncate">{dateLabel}</span>
          </div>
          <button 
            onClick={handleMapClick}
            className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground hover:text-primary transition-colors w-full text-left"
          >
            <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs truncate">{locationLine || event.location}</span>
          </button>
          <CardActionBar
            entityId={event.id}
            entityType="event"
            interestedCount={interestedCount}
            goingCount={goingCount}
            language={language}
            shareData={{
              title: event.title,
              location: event.location,
              start_at: event.start_at,
              cover_image_url: event.cover_image_url || undefined,
              businesses: event.businesses ? {
                id: event.business_id || event.businesses.id || event.businesses.name,
                name: event.businesses.name,
              } : undefined,
            }}
          />
        </div>
      </Link>
    );
  }

  // For mobileFixed and full - use Card style matching reference image exactly
  return (
    <Card
      ref={cardRef as any}
      variant="glass"
      interactive
      className={cn(
        "overflow-visible transition-all duration-300",
        size === "mobileFixed" && "h-[280px] sm:h-[270px]",
        className
      )}
    >
      <CardContent className="p-0 h-full flex flex-col">
        {/* Image section - increased height for mobile (h-48 instead of h-40) */}
              <Link
                to={`/event/${event.id}${computedLinkSearch || ""}`}
          onClick={handleCardClick}
          className="block relative h-48 sm:h-40 overflow-visible rounded-t-xl flex-shrink-0"
        >
          <div className="absolute inset-0 overflow-hidden rounded-t-xl">
            {event.cover_image_url ? (
              <img
                src={event.cover_image_url}
                alt={event.title}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <Calendar className="h-8 w-8 text-primary/50" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/0 to-black/35" />
          </div>

          {/* Boosted badge - protrudes outside card like feed */}
          {isBoosted && (
            <div className="absolute -top-2 -right-2 z-20">
              <PremiumBadge type="event" />
            </div>
          )}

          {/* Entry type badge */}
          {entryBadgeLabel && (
            <Badge className={cn(
              "absolute bottom-2 right-2 text-white text-[10px] px-1.5 py-0 h-5 border-0 z-10",
              isBoosted 
                ? "bg-gradient-to-r from-amber-500 to-orange-500" 
                : "bg-gradient-to-r from-accent to-seafoam"
            )}>
              {entryBadgeLabel}
            </Badge>
          )}
        </Link>

        {/* Content section - matching reference image layout */}
        <div className="p-2.5 sm:p-3 flex-1 flex flex-col gap-0.5">
          {/* Title */}
          <Link to={`/event/${event.id}${computedLinkSearch || ""}`} onClick={handleCardClick}>
            <h3 className="font-semibold text-sm leading-tight truncate hover:text-primary transition-colors">
              {event.title}
            </h3>
          </Link>

          {/* Date/Time with clock icon */}
          <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
            <Clock className="h-3 w-3 shrink-0 text-primary" />
            <span className="text-xs truncate">{dateLabel}</span>
          </div>

          {/* Location with pin icon - fully clickable */}
          <button
            onClick={handleMapClick}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors w-full text-left"
            title={language === "el" ? "Δες στο χάρτη" : "View on map"}
          >
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="text-xs truncate">{locationLine || event.location}</span>
          </button>

          {/* Action Bar - heart, people, share at bottom */}
          <div className="mt-auto pt-0.5">
            <CardActionBar
              entityId={event.id}
              entityType="event"
              interestedCount={interestedCount}
              goingCount={goingCount}
              language={language}
              shareData={{
                title: event.title,
                location: event.location,
                start_at: event.start_at,
                cover_image_url: event.cover_image_url || undefined,
                businesses: event.businesses ? {
                  id: event.business_id || event.businesses.id || event.businesses.name,
                  name: event.businesses.name,
                } : undefined,
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedEventCard;