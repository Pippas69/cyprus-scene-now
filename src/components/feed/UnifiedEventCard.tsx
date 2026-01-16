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

  // Size variants - all square
  const sizeClasses = {
    compact: "w-[180px] h-[180px]",
    default: "w-[200px] h-[200px]",
    boosted: "w-[220px] h-[220px]",
  };

  // Check if event is free
  const showFreeBadge = isFree || event.price_tier === "free";

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const eventUrl = `${window.location.origin}/ekdiloseis/${event.id}`;
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

  return (
    <Link
      to={`/ekdiloseis/${event.id}`}
      className={cn(
        "flex flex-col rounded-xl bg-card border border-border",
        "hover:border-primary/50 hover:shadow-lg transition-all duration-200",
        "overflow-hidden group flex-shrink-0",
        sizeClasses[size],
        className
      )}
    >
      {/* TOP HALF - Image Only (50%) */}
      <div className="relative h-1/2 overflow-hidden">
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
        )}

        {/* Share Button - Top Left */}
        <button
          onClick={handleShare}
          className="absolute top-2 left-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors z-10"
          aria-label="Share event"
        >
          <Share2 className="h-3.5 w-3.5 text-foreground" />
        </button>

        {/* Boosted Badge - Top Right (protruding) */}
        {isBoosted && (
          <div className="absolute -top-1.5 -right-1.5 z-20">
            <PremiumBadge type="event" />
          </div>
        )}

        {/* Free Badge - Bottom Right on image */}
        {showFreeBadge && (
          <Badge className="absolute bottom-1.5 right-1.5 bg-gradient-to-r from-accent to-seafoam text-white text-[9px] px-1.5 py-0 h-4 border-0 z-10">
            {t.free}
          </Badge>
        )}
      </div>

      {/* BOTTOM HALF - Details (50%) */}
      <div className="h-1/2 px-2.5 py-2 flex flex-col">
        {/* 1. Title (max 1 line, bold) */}
        <h4 className="text-xs font-semibold line-clamp-1 leading-tight group-hover:text-primary transition-colors">
          {event.title}
        </h4>

        {/* 2. Date · Time */}
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
          {dateLabel}
        </p>

        {/* 3. Location · City · Business */}
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-1">
          {locationLine || event.location}
        </p>

        {/* 4. Time Proximity (only if < 24 hours) */}
        {showTimeProximity && (
          <p className="text-[9px] text-primary font-medium leading-tight mt-0.5">
            {timeProximityLabel}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* 5. Counters - Bottom Right */}
        <div className="flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Heart className="h-2.5 w-2.5 text-secondary" />
            {interestedCount}
          </span>
          <span className="flex items-center gap-0.5">
            <Users className="h-2.5 w-2.5 text-ocean" />
            {goingCount}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default UnifiedEventCard;
