import { Link } from "react-router-dom";
import { Heart, Users, MapPin, Clock, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { getCategoryLabel } from "@/lib/categoryTranslations";
import { cn } from "@/lib/utils";
import { format, differenceInMinutes } from "date-fns";
import { enUS } from "date-fns/locale";

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
    businesses?: {
      name: string;
      logo_url?: string | null;
      city?: string;
    };
  };
  language: "el" | "en";
  isBoosted?: boolean;
  isFree?: boolean;
  size?: "compact" | "default" | "boosted";
  className?: string;
}

const translations = {
  el: {
    today: "Σήμερα",
    tomorrow: "Αύριο",
    free: "Δωρεάν",
    startsIn: "ξεκινά σε περίπου",
    minutes: "λεπτά",
  },
  en: {
    today: "Today",
    tomorrow: "Tomorrow",
    free: "Free",
    startsIn: "starts in about",
    minutes: "minutes",
  },
};

// Greek day abbreviations
const greekDays: Record<string, string> = {
  Mon: "Δευ",
  Tue: "Τρί",
  Wed: "Τετ",
  Thu: "Πέμ",
  Fri: "Παρ",
  Sat: "Σάβ",
  Sun: "Κυρ",
};

export const UnifiedEventCard = ({
  event,
  language,
  isBoosted = false,
  isFree = false,
  size = "default",
  className,
}: UnifiedEventCardProps) => {
  const t = translations[language];
  const eventDate = new Date(event.start_at);
  const now = new Date();

  // Date/Time formatting
  const isToday = eventDate.toDateString() === now.toDateString();
  const isTomorrow =
    eventDate.toDateString() ===
    new Date(now.getTime() + 86400000).toDateString();

  let dateLabel: string;
  if (isToday) {
    dateLabel = `${t.today} · ${format(eventDate, "HH:mm")}`;
  } else if (isTomorrow) {
    dateLabel = `${t.tomorrow} · ${format(eventDate, "HH:mm")}`;
  } else {
    // Use Greek day abbreviation for Greek language
    const dayName = format(eventDate, "EEE", { locale: enUS });
    const dayLabel = language === "el" ? greekDays[dayName] || dayName : dayName;
    dateLabel = `${dayLabel} · ${format(eventDate, "HH:mm")}`;
  }

  // Time proximity (only show if event starts in < 1 hour)
  const minutesUntilStart = differenceInMinutes(eventDate, now);
  const showTimeProximity = minutesUntilStart > 0 && minutesUntilStart < 60;

  // Location line: Spot · City · Business
  const locationParts: string[] = [];
  if (event.location) locationParts.push(event.location);
  if (event.businesses?.city && event.businesses.city !== event.location) {
    locationParts.push(event.businesses.city);
  }
  if (event.businesses?.name) locationParts.push(event.businesses.name);
  const locationLine = locationParts.join(" · ");

  // Counters
  const interestedCount = event.interested_count || 0;
  const goingCount = event.going_count || 0;

  // Size variants
  const sizeClasses = {
    compact: "min-w-[200px] max-w-[200px]",
    default: "min-w-[220px] max-w-[220px]",
    boosted: "min-w-[240px] max-w-[240px]",
  };

  // Check if event is free
  const showFreeBadge = isFree || event.price_tier === "free";

  return (
    <Link
      to={`/ekdiloseis/${event.id}`}
      className={cn(
        "flex flex-col rounded-xl bg-card border border-border",
        "hover:border-primary/50 hover:shadow-lg transition-all duration-200",
        "aspect-square overflow-visible group",
        sizeClasses[size],
        className
      )}
    >
      {/* TOP HALF - Image */}
      <div className="relative flex-1 overflow-visible">
        {/* Image container - clipped */}
        <div className="absolute inset-0 overflow-hidden rounded-t-xl">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <Calendar className="h-8 w-8 text-primary/50" />
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>

        {/* Boosted Badge - protruding */}
        {isBoosted && (
          <div className="absolute -top-2 -right-2 z-10">
            <PremiumBadge type="event" />
          </div>
        )}

        {/* Category Badge */}
        {event.category?.[0] && (
          <Badge
            variant="secondary"
            className="absolute bottom-2 left-2 text-[10px] px-1.5 py-0 h-5 bg-background/90 backdrop-blur-sm z-10"
          >
            {getCategoryLabel(event.category[0], language)}
          </Badge>
        )}

        {/* Free Badge */}
        {showFreeBadge && (
          <Badge className="absolute bottom-2 right-2 bg-gradient-to-r from-accent to-seafoam text-white text-[10px] px-1.5 py-0 h-5 border-0 z-10">
            {t.free}
          </Badge>
        )}
      </div>

      {/* BOTTOM HALF - Details */}
      <div className="flex-1 p-3 flex flex-col justify-between min-h-0">
        {/* 1. Title (max 1 line) */}
        <h4 className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">
          {event.title}
        </h4>

        {/* 2. Date · Time */}
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3 flex-shrink-0" />
          <span className="text-xs truncate">{dateLabel}</span>
        </div>

        {/* 3. Location · City · Business */}
        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="text-xs truncate">
            {locationLine || event.location}
          </span>
        </div>

        {/* 4. Time Proximity (only if < 1 hour) */}
        {showTimeProximity && (
          <p className="text-[10px] text-primary font-medium">
            {t.startsIn} {minutesUntilStart} {t.minutes}
          </p>
        )}

        {/* 5. Counters (always at the end) */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3 text-secondary" />
            {interestedCount}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3 text-ocean" />
            {goingCount}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default UnifiedEventCard;
