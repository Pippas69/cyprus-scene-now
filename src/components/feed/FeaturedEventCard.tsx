import { Link } from "react-router-dom";
import { Calendar, MapPin, Users, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatEventTime } from "@/lib/mapUtils";
import { getCategoryLabel } from "@/lib/categoryTranslations";

interface FeaturedEventCardProps {
  event: any;
  language: "el" | "en";
  user: any;
}

const FeaturedEventCard = ({ event, language, user }: FeaturedEventCardProps) => {
  const translations = {
    el: {
      viewDetails: "Δείτε Λεπτομέρειες",
      interested: "Ενδιαφέρονται",
      going: "Έννα Πάσιν",
    },
    en: {
      viewDetails: "View Details",
      interested: "Interested",
      going: "Going",
    },
  };

  const t = translations[language];

  const interestedCount = event.realtime_stats?.[0]?.interested_count || 0;
  const goingCount = event.realtime_stats?.[0]?.going_count || 0;

  return (
    <Link to={`/ekdiloseis/${event.id}`} className="block">
      <div className="relative w-full h-[350px] md:h-[500px] rounded-2xl overflow-hidden group">
        {/* Background Image */}
        <div className="absolute inset-0">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
          )}
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
        </div>

        {/* Content */}
        <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
          {/* Category Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {event.category?.slice(0, 3).map((cat: string) => (
              <Badge key={cat} variant="secondary" className="bg-background/20 backdrop-blur-sm text-white border-white/20">
                {getCategoryLabel(cat, language)}
              </Badge>
            ))}
          </div>

          {/* Business Info */}
          {event.businesses && (
            <div className="flex items-center gap-2 mb-3">
              <Avatar className="h-8 w-8 border-2 border-white/20">
                <AvatarImage src={event.businesses.logo_url || ""} alt={event.businesses.name} />
                <AvatarFallback className="text-xs">{event.businesses.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-white/90 font-medium">{event.businesses.name}</span>
            </div>
          )}

          {/* Title */}
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-3 line-clamp-2">
            {event.title}
          </h3>

          {/* Event Details */}
          <div className="flex flex-wrap gap-4 text-white/90 text-sm mb-4">
            <div className="flex items-center gap-1.5">
              <Calendar size={16} />
              <span>{formatEventTime(event.start_at, event.end_at, language)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin size={16} />
              <span>{event.location}</span>
            </div>
          </div>

          {/* Stats & CTA */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-4 text-white/90 text-sm">
              <div className="flex items-center gap-1.5">
                <Heart size={16} className="fill-white/20" />
                <span>{interestedCount} {t.interested}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={16} />
                <span>{goingCount} {t.going}</span>
              </div>
            </div>
            <Button 
              size="lg" 
              className="bg-background text-primary hover:bg-background/90 font-semibold"
            >
              {t.viewDetails}
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default FeaturedEventCard;
