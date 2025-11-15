import { Heart, Users, Clock, MapPin, CalendarCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useFavorites } from "@/hooks/useFavorites";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ReservationDialog } from "@/components/business/ReservationDialog";

interface Event {
  id: string;
  title: string;
  location: string;
  start_at: string;
  end_at: string;
  category: string[];
  price_tier: string;
  business_id?: string;
  interested_count?: number;
  going_count?: number;
  user_status?: string | null;
  accepts_reservations?: boolean;
  seating_options?: string[];
  requires_approval?: boolean;
  businesses?: {
    name: string;
    logo_url: string | null;
    city?: string;
  };
}

interface EventCardProps {
  language: "el" | "en";
  event: Event;
  user: any;
}

const EventCard = ({ language, event, user }: EventCardProps) => {
  const [status, setStatus] = useState<string | null>(event.user_status || null);
  const [interestedCount, setInterestedCount] = useState(event.interested_count || 0);
  const [goingCount, setGoingCount] = useState(event.going_count || 0);
  const [loading, setLoading] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [rsvpNotes, setRsvpNotes] = useState("");
  const [showReservationDialog, setShowReservationDialog] = useState(false);
  const [reservationStatus, setReservationStatus] = useState<string | null>(null);
  const { isFavorited, toggleFavorite, loading: favoriteLoading } = useFavorites(user?.id || null);

  // Check if user has a reservation for this event
  useEffect(() => {
    if (user && event.accepts_reservations) {
      checkReservationStatus();
    }
  }, [user, event.id, event.accepts_reservations]);

  const checkReservationStatus = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('reservations')
      .select('status')
      .eq('event_id', event.id)
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setReservationStatus(data.status);
    }
  };

  const translations = {
    el: {
      interested: "Ενδιαφέρομαι",
      going: "Έννα Πάω",
      makeReservation: "Κάντε Κράτηση",
      ageRange: "Ηλικιακό Εύρος",
      free: "Δωρεάν",
      interestedCount: "Ενδιαφέρονται",
      goingCount: "Έννα Πάσιν",
      reservationPending: "Κράτηση Εκκρεμεί",
      reservationAccepted: "Κράτηση Εγκρίθηκε",
      reservationDeclined: "Κράτηση Απορρίφθηκε",
    },
    en: {
      interested: "Interested",
      going: "I'm Going",
      makeReservation: "Make Reservation",
      ageRange: "Age Range",
      free: "Free",
      interestedCount: "Interested",
      goingCount: "Going",
      reservationPending: "Reservation Pending",
      reservationAccepted: "Reservation Accepted",
      reservationDeclined: "Reservation Declined",
    },
  };

  const t = translations[language];

  useEffect(() => {
    if (!user || !event.id) return;

    // Subscribe to realtime updates for this event's RSVPs
    const channel = supabase
      .channel(`rsvps:${event.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rsvps',
          filter: `event_id=eq.${event.id}`
        },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event.id, user]);

  const fetchCounts = async () => {
    const { data, error } = await supabase
      .from('rsvps')
      .select('status')
      .eq('event_id', event.id);

    if (!error && data) {
      const interested = data.filter(r => r.status === 'interested').length;
      const going = data.filter(r => r.status === 'going').length;
      setInterestedCount(interested);
      setGoingCount(going);
    }
  };

  const handleStatusClick = async (newStatus: string) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to RSVP to events",
        variant: "destructive",
      });
      return;
    }

    // Show notes dialog for "going" status
    if (newStatus === 'going' && status !== 'going') {
      setShowNotesDialog(true);
      return;
    }

    await updateRSVP(newStatus, "");
  };

  const updateRSVP = async (newStatus: string, notes: string) => {
    setLoading(true);

    if (status === newStatus) {
      const { error } = await supabase
        .from('rsvps')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', event.id);

      if (!error) {
        setStatus(null);
        toast({
          title: "RSVP Removed",
          description: "Your RSVP has been removed",
        });
      }
    } else {
      const { error } = await supabase
        .from('rsvps')
        .upsert({
          user_id: user.id,
          event_id: event.id,
          status: newStatus as 'interested' | 'going',
          notes: notes || null,
        });

      if (!error) {
        setStatus(newStatus);
        toast({
          title: "RSVP Updated",
          description: `You're ${newStatus === 'going' ? 'going' : 'interested'}!`,
        });
      }
    }

    setLoading(false);
    setShowNotesDialog(false);
    setRsvpNotes("");
    fetchCounts();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(language === "el" ? "el-GR" : "en-US", {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-hover transition-all duration-300 group relative">
        {/* Favorite Button */}
        {user && (
          <FavoriteButton
            isFavorited={isFavorited(event.id)}
            onClick={() => toggleFavorite(event.id)}
            loading={favoriteLoading}
            className="absolute top-3 right-3 z-10 bg-background/80 hover:bg-background backdrop-blur-sm shadow-lg"
            size="sm"
          />
        )}
        
        {/* Image */}
        <div className="relative h-48 bg-gradient-ocean overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center text-white/20 text-6xl">
            🌊
          </div>
          <Badge className="absolute top-3 left-3 bg-card/90 text-card-foreground">
            {event.category[0] || "Event"}
          </Badge>
          <Badge className="absolute top-14 right-3 bg-accent text-accent-foreground">
            {event.price_tier === 'free' ? t.free : event.price_tier}
          </Badge>
        </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Business Info - Clickable */}
        {event.businesses && (
          <Link 
            to={`/business/${event.business_id}`}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={event.businesses.logo_url || undefined} alt={event.businesses.name} />
              <AvatarFallback className="text-xs bg-muted">
                {event.businesses.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              {event.businesses.name}
            </span>
          </Link>
        )}

        {/* Title & Location */}
        <div>
          <h3 className="font-bold text-lg group-hover:text-ocean transition-colors">
            {event.title}
          </h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <MapPin className="h-3 w-3" />
            <span>{event.location}</span>
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{formatTime(event.start_at)} - {formatTime(event.end_at)}</span>
        </div>

        {/* Live Stats */}
        <div className="flex gap-4 py-2 text-sm">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-coral" />
            <span className="font-semibold">{interestedCount}</span>
            <span className="text-muted-foreground">{t.interestedCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-ocean" />
            <span className="font-semibold">{goingCount}</span>
            <span className="text-muted-foreground">{t.goingCount}</span>
          </div>
        </div>

        {/* Action Buttons */}
        {user && (
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusClick('interested')}
              disabled={loading}
              className={`gap-2 transition-all ${
                status === 'interested'
                  ? 'border-ocean text-ocean bg-ocean/5'
                  : 'border-border text-muted-foreground hover:border-ocean/50'
              }`}
            >
              <Heart className="h-4 w-4" />
              {t.interested}
            </Button>
            <Button
              size="sm"
              onClick={() => handleStatusClick('going')}
              disabled={loading}
              className={`gap-2 transition-all ${
                status === 'going'
                  ? 'bg-ocean hover:bg-ocean/90 text-white'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              <Users className="h-4 w-4" />
              {t.going}
            </Button>
          </div>
        )}
      </div>
    </Card>
    <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Your Attendance</DialogTitle>
          <DialogDescription>
            Add any special requests or notes (optional)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Coming with 2 friends, dietary restrictions, etc."
              value={rsvpNotes}
              onChange={(e) => setRsvpNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => updateRSVP('going', rsvpNotes)} disabled={loading}>
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default EventCard;
