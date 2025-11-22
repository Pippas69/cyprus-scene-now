import { Heart, Users, MapPin, Calendar, Building2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FavoriteButton } from "@/components/FavoriteButton";
import type { User } from "@supabase/supabase-js";
import { getCategoryLabel } from "@/lib/categoryTranslations";

interface EventListItemProps {
  event: any;
  interestedCount: number;
  goingCount: number;
  userRSVP: { status: string } | null;
  onRSVPChange: (eventId: string, newStatus: string | null, currentStatus: string | null) => void;
  user: User | null;
  language: "el" | "en";
}

const EventListItem = ({
  event,
  interestedCount,
  goingCount,
  userRSVP,
  onRSVPChange,
  user,
  language
}: EventListItemProps) => {
  const translations = {
    el: {
      interested: "Ενδιαφέρομαι",
      going: "Θα Πάω",
      free: "Δωρεάν"
    },
    en: {
      interested: "Interested",
      going: "Going",
      free: "Free"
    }
  };

  const t = translations[language];

  return (
    <div className="group relative bg-card rounded-lg border border-border hover:border-primary/50 transition-all overflow-hidden">
      <div className="flex gap-4 p-3">
        {/* Thumbnail Image */}
        <div className="relative flex-shrink-0 w-32 h-24 rounded-md overflow-hidden">
          <Link to={`/event/${event.id}`}>
            <img
              src={event.cover_image_url || "/placeholder.svg"}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </Link>
        </div>

        {/* Event Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            {/* Business Info */}
            {event.businesses && (
              <Link
                to={`/business/${event.businesses.id}`}
                className="flex items-center gap-2 mb-1 hover:opacity-80 transition-opacity"
              >
                <Avatar className="h-5 w-5 border">
                  <AvatarImage src={event.businesses.logo_url || ""} alt={`${event.businesses.name} logo`} />
                  <AvatarFallback className="text-xs">
                    <Building2 className="h-3 w-3" aria-hidden="true" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium truncate">
                  {event.businesses.name}
                </span>
              </Link>
            )}

            {/* Event Title */}
            <Link to={`/event/${event.id}`}>
              <h3 className="font-semibold text-sm line-clamp-1 hover:text-primary transition-colors">
                {event.title}
              </h3>
            </Link>

            {/* Location & Date */}
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(event.start_at), "MMM d, HH:mm")}
              </span>
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </span>
            </div>

            {/* Category & Price */}
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className="text-xs py-0 h-5">
                {getCategoryLabel(event.category[0], language)}
              </Badge>
              <Badge variant="outline" className="text-xs py-0 h-5">
                {event.price_tier === 'free' ? t.free : event.price_tier}
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex-shrink-0 flex flex-col items-end justify-between gap-2">
          {/* Stats */}
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {interestedCount}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {goingCount}
            </span>
          </div>

          {/* RSVP Buttons */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={userRSVP?.status === "interested" ? "default" : "outline"}
              onClick={() => {
                if (!user) {
                  window.location.href = "/login";
                  return;
                }
                const newStatus = userRSVP?.status === "interested" ? null : "interested";
                onRSVPChange(event.id, newStatus, userRSVP?.status || null);
              }}
              className="h-7 px-2 text-xs"
            >
              <Heart className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant={userRSVP?.status === "going" ? "default" : "outline"}
              onClick={() => {
                if (!user) {
                  window.location.href = "/login";
                  return;
                }
                const newStatus = userRSVP?.status === "going" ? null : "going";
                onRSVPChange(event.id, newStatus, userRSVP?.status || null);
              }}
              className="h-7 px-2 text-xs"
            >
              <Users className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventListItem;
