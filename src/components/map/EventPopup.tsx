import { X, MapPin, Calendar, ExternalLink, Share2, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatEventTime, getDirectionsUrl, shareEvent } from "@/lib/mapUtils";
import { toast } from "sonner";

interface EventPopupProps {
  event: {
    id: string;
    title: string;
    description: string;
    start_at: string;
    end_at: string;
    location: string;
    category: string[];
    cover_image_url?: string;
    coordinates: [number, number];
    business?: {
      name: string;
      logo_url?: string;
    };
  };
  onClose: () => void;
}

export const EventPopup = ({ event, onClose }: EventPopupProps) => {
  const handleShare = async () => {
    const success = await shareEvent(event.id, event.title);
    if (success) {
      toast.success("Ο σύνδεσμος αντιγράφηκε!");
    } else {
      toast.error("Αποτυχία κοινοποίησης");
    }
  };

  const handleDirections = () => {
    const [lng, lat] = event.coordinates;
    window.open(getDirectionsUrl(lat, lng), "_blank");
  };

  return (
    <div className="w-[320px] bg-background rounded-xl shadow-2xl overflow-hidden animate-scale-in">
      {/* Cover Image */}
      <div className="relative h-40 bg-muted">
        {event.cover_image_url ? (
          <>
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
        )}

        {/* Business Logo Badge */}
        {event.business?.logo_url && (
          <Avatar className="absolute top-3 right-3 w-12 h-12 border-2 border-background shadow-lg">
            <AvatarImage src={event.business.logo_url} alt={event.business.name} />
            <AvatarFallback>{event.business.name[0]}</AvatarFallback>
          </Avatar>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 left-3 p-1.5 bg-background/90 hover:bg-background rounded-full shadow-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title & Business */}
        <div>
          <h3 className="font-semibold text-lg leading-tight mb-1">{event.title}</h3>
          {event.business?.name && (
            <p className="text-sm text-muted-foreground">{event.business.name}</p>
          )}
        </div>

        {/* Info */}
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2 text-muted-foreground">
            <Calendar size={16} className="mt-0.5 flex-shrink-0" />
            <span>{formatEventTime(event.start_at, event.end_at)}</span>
          </div>
          <div className="flex items-start gap-2 text-muted-foreground">
            <MapPin size={16} className="mt-0.5 flex-shrink-0" />
            <span>{event.location}</span>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-1.5">
          {event.category.map((cat) => (
            <Badge key={cat} variant="secondary" className="text-xs">
              {cat}
            </Badge>
          ))}
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button size="sm" className="flex-1" onClick={() => window.location.href = `/ekdiloseis?event=${event.id}`}>
            <ExternalLink size={14} className="mr-1.5" />
            Λεπτομέρειες
          </Button>
          <Button size="sm" variant="outline" onClick={handleDirections}>
            <Navigation size={14} />
          </Button>
          <Button size="sm" variant="outline" onClick={handleShare}>
            <Share2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};
