import { Link } from "react-router-dom";
import { Heart, Users, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { cn } from "@/lib/utils";
import { format, differenceInHours, differenceInMinutes } from "date-fns";
import { enUS } from "date-fns/locale";
import { toast } from "sonner";

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
  layout?: "half" | "twoThirds";
  className?: string;
}

const translations = {
  el: {
    today: "Σήμερα",
    tomorrow: "Αύριο",
    free: "Δωρεάν",
    startsIn: "ξεκινά σε",
    hours: "ώρες",
    hour: "ώρα",
    minutes: "λεπτά",
  },
  en: {
    today: "Today",
    tomorrow: "Tomorrow",
    free: "Free",
    startsIn: "starts in",
    hours: "hours",
    hour: "hour",
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
  layout = "half",
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
    const dayName = format(eventDate, "EEE", { locale: enUS });
    const dayLabel = language === "el" ? greekDays[dayName] || dayName : dayName;
    dateLabel = `${dayLabel} · ${format(eventDate, "HH:mm")}`;
  }

  // Time proximity (show if event starts within 24 hours)
  const hoursUntilStart = differenceInHours(eventDate, now);
  const minutesUntilStart = differenceInMinutes(eventDate, now);
  const showTimeProximity = minutesUntilStart > 0 && hoursUntilStart < 24;
  
  let timeProximityLabel = "";
  if (showTimeProximity) {
    if (hoursUntilStart >= 1) {
      timeProximityLabel = `${t.startsIn} ${hoursUntilStart} ${hoursUntilStart === 1 ? t.hour : t.hours}`;
    } else {
      timeProximityLabel = `${t.startsIn} ${minutesUntilStart} ${t.minutes}`;
    }
  }

  // Location line: Location · City · Business
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

  // Size variants (Feed wants slightly wider cards)
  const sizeClasses = {
    compact: "w-[188px] aspect-square",
    default: "w-[208px] aspect-square",
    boosted: "w-[240px] aspect-square",
  };

  // Check if event is free
  const showFreeBadge = isFree || event.price_tier === "free";

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const eventUrl = `${window.location.origin}/event/${event.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          url: eventUrl,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(eventUrl);
      toast.success(language === "el" ? "Αντιγράφηκε!" : "Copied!");
    }
  };

  // For feed: 2/3 image, 1/3 details
  const topHeightClass = layout === "twoThirds" ? "h-[66%]" : "h-1/2";
  const bottomHeightClass = layout === "twoThirds" ? "h-[34%]" : "h-1/2";

  return (
    <Link
      to={`/event/${event.id}`}
      className={cn(
        "relative flex-shrink-0 rounded-xl border border-border bg-card",
        "hover:border-primary/50 hover:shadow-lg transition-all duration-200",
        "overflow-visible group",
        sizeClasses[size],
        className
      )}
    >
      {/* Boosted Badge - 50% inside, 50% outside corner */}
      {isBoosted && (
        <div className="absolute -top-3.5 -right-3.5 z-20">
          <PremiumBadge type="event" />
        </div>
      )}

      {/* Inner clipped content */}
      <div className="h-full w-full overflow-hidden rounded-xl flex flex-col">
        {/* TOP - Image (2/3 for feed) */}
        <div className={cn("relative overflow-hidden", topHeightClass)}>
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
          )}

          {/* Share Button - Top Left */}
          <button
            onClick={handleShare}
            className="absolute top-2 left-2 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors z-10"
            aria-label="Share event"
          >
            <Share2 className="h-4 w-4 text-foreground" />
          </button>

          {/* Free/Ticket/Reservation Badge - Bottom Right on image (smaller) */}
          {showFreeBadge && (
            <Badge className="absolute bottom-2 right-2 bg-gradient-to-r from-accent to-seafoam text-white text-[9px] font-medium px-2 py-0.5 h-auto border-0 z-10 rounded-md">
              {t.free}
            </Badge>
          )}
        </div>

        {/* BOTTOM - Details (1/3) */}
        <div className={cn("px-3 py-1.5 flex flex-col justify-between", bottomHeightClass)}>
          {/* Row 1: Title + Counters */}
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-[13px] font-semibold line-clamp-1 leading-tight group-hover:text-primary transition-colors flex-1">
              {event.title}
            </h4>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
              <span className="flex items-center gap-0.5">
                <Heart className="h-3 w-3 text-secondary" />
                {interestedCount}
              </span>
              <span className="flex items-center gap-0.5">
                <Users className="h-3 w-3 text-ocean" />
                {goingCount}
              </span>
            </div>
          </div>

          {/* Row 2: Location · City · Business */}
          <p className="text-[11px] text-muted-foreground leading-tight line-clamp-1">
            {locationLine || event.location}
          </p>

          {/* Row 3: Date · Time + Time Proximity (if < 24h) */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              {dateLabel}
            </span>
            {showTimeProximity && (
              <span className="text-[10px] text-primary font-medium">
                {timeProximityLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default UnifiedEventCard;
