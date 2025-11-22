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
import { useState, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { toastTranslations } from "@/translations/toastTranslations";
import { useFavorites } from "@/hooks/useFavorites";
import { getCategoryLabel } from "@/lib/categoryTranslations";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ReservationDialog } from "@/components/business/ReservationDialog";
import LiveBadge from "@/components/feed/LiveBadge";
import { formatDistanceToNow } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { useViewTracking, trackEventView } from "@/lib/analyticsTracking";
import { useNavigate } from "react-router-dom";

interface Event {
  id: string;
  title: string;
  location: string;
  start_at: string;
  end_at: string;
  category: string[];
  price_tier: string;
  cover_image_url?: string;
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
  style?: React.CSSProperties;
  className?: string;
}

const EventCard = ({ language, event, user, style, className }: EventCardProps) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string | null>(event.user_status || null);
  const [interestedCount, setInterestedCount] = useState(event.interested_count || 0);
  const [goingCount, setGoingCount] = useState(event.going_count || 0);
  const [loading, setLoading] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [rsvpNotes, setRsvpNotes] = useState("");
  const [showReservationDialog, setShowReservationDialog] = useState(false);

  // Track event view when card is 50% visible
  useViewTracking(cardRef, () => {
    if (event.id) {
      const source = window.location.pathname.includes('/profile') ? 'profile' :
                     window.location.pathname.includes('/xartis') ? 'map' :
                     window.location.pathname.includes('/search') ? 'search' :
                     window.location.pathname.includes('/feed') ? 'feed' : 'direct';
      trackEventView(event.id, source as 'feed' | 'map' | 'search' | 'profile' | 'direct');
    }
  }, { threshold: 0.5 });
  const [reservationStatus, setReservationStatus] = useState<string | null>(null);
  const { isFavorited, toggleFavorite, loading: favoriteLoading } = useFavorites(user?.id || null);
  const [countdown, setCountdown] = useState<string | null>(null);
  const tt = toastTranslations[language];

  // Calculate engagement score for badges
  const engagementScore = (interestedCount || 0) + (goingCount || 0) * 2;
  const now = new Date();
  const startDate = new Date(event.start_at);
  const endDate = new Date(event.end_at);
  const isLive = now >= startDate && now <= endDate;
  const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const hoursUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  // Determine badge type
  const getBadgeType = (): "trending" | "hot" | "live" | "ending-soon" | null => {
    if (isLive) return "live";
    if (isLive && hoursUntilEnd > 0 && hoursUntilEnd < 2) return "ending-soon";
    if (engagementScore > 100) return "hot";
    if (engagementScore > 50) return "trending";
    return null;
  };

  const badgeType = getBadgeType();

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
      reservationPending: "Κράτηση Εκκρεμεί",
      reservationConfirmed: "Κράτηση Εγκρίθηκε",
      reservationDeclined: "Κράτηση Απορρίφθηκε",
      ageRange: "Ηλικιακό Εύρος",
      free: "Δωρεάν",
      interestedCount: "Ενδιαφέρονται",
      goingCount: "Έννα Πάσιν",
    },
    en: {
      interested: "Interested",
      going: "I'm Going",
      makeReservation: "Make Reservation",
      reservationPending: "Reservation Pending",
      reservationConfirmed: "Reservation Confirmed",
      reservationDeclined: "Reservation Declined",
      ageRange: "Age Range",
      free: "Free",
      interestedCount: "Interested",
      goingCount: "Going",
    },
  };

  const t = translations[language];

  // Countdown timer for events starting within 24 hours
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const start = new Date(event.start_at);
      const diff = start.getTime() - now.getTime();
      
      if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        const locale = language === "el" ? el : enUS;
        const timeStr = formatDistanceToNow(start, { locale, addSuffix: false });
        setCountdown(language === "el" ? `Αρχίζει σε ${timeStr}` : `Starts in ${timeStr}`);
      } else {
        setCountdown(null);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [event.start_at, language]);

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
        title: tt.loginRequired,
        description: tt.mustLogin,
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
          title: tt.deleted,
          description: language === 'el' ? 'Το RSVP σας αφαιρέθηκε' : 'Your RSVP has been removed',
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
          title: tt.updated,
          description: language === 'el' 
            ? `${newStatus === 'going' ? 'Έννα πάτε' : 'Ενδιαφέρεστε'}!` 
            : `You're ${newStatus === 'going' ? 'going' : 'interested'}!`,
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
      <Card 
        ref={cardRef}
        className={`overflow-hidden hover:shadow-hover transition-all duration-300 group relative ${className || ''}`} 
        style={style}
        onClick={() => navigate(`/event/${event.id}`)}
      >
        {/* Live Badge */}
        {badgeType && <LiveBadge type={badgeType} language={language} />}
        
        {/* Favorite Button */}
        {user && (
          <FavoriteButton
            isFavorited={isFavorited(event.id)}
            onClick={() => toggleFavorite(event.id)}
            loading={favoriteLoading}
            className="absolute top-3 left-3 z-10 bg-background/80 hover:bg-background backdrop-blur-sm shadow-lg"
            size="sm"
            businessId={event.business_id}
            eventId={event.id}
          />
        )}
        
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          {event.cover_image_url ? (
            <>
              <img 
                src={event.cover_image_url} 
                alt={event.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Dark overlay for better badge readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-ocean flex items-center justify-center">
              <div className="text-white/20 text-6xl" aria-hidden="true" role="img" aria-label="Wave emoji decoration">
                🌊
              </div>
            </div>
          )}
          
          <Badge className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm text-foreground z-10">
            {getCategoryLabel(event.category[0], language)}
          </Badge>
          <Badge className="absolute bottom-3 right-3 bg-accent/90 backdrop-blur-sm text-accent-foreground z-10">
            {event.price_tier === 'free' ? t.free : event.price_tier}
          </Badge>
        </div>

      {/* Content */}
      <div className="p-4 space-y-2">
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
          <Link to={`/event/${event.id}`} className="block hover:opacity-80 transition-opacity">
            <h3 className="font-bold text-lg group-hover:text-ocean transition-colors">
              {event.title}
            </h3>
          </Link>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <MapPin className="h-3 w-3" />
            <span>{event.location}</span>
          </div>
        </div>

        {/* Time & Countdown */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatTime(event.start_at)} - {formatTime(event.end_at)}</span>
          </div>
          {countdown && (
            <div className="text-xs font-semibold text-accent animate-pulse">
              {countdown}
            </div>
          )}
        </div>

        {/* Live Stats */}
        <div className="flex gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="h-4 w-4" />
            {interestedCount}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {goingCount}
          </span>
        </div>

        {/* Action Buttons */}
        {user && (
          <div className="space-y-2 pt-2">
            <div className="grid grid-cols-2 gap-2">
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
            
            {/* Reservation Button */}
            {event.accepts_reservations && (
              <Button 
                variant={reservationStatus ? "default" : "outline"}
                size="sm" 
                className="w-full gap-2"
                onClick={() => setShowReservationDialog(true)}
                disabled={reservationStatus === 'declined'}
              >
                <CalendarCheck className="h-4 w-4" />
                {reservationStatus === 'pending' && t.reservationPending}
                {reservationStatus === 'confirmed' && t.reservationConfirmed}
                {reservationStatus === 'declined' && t.reservationDeclined}
                {!reservationStatus && t.makeReservation}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
    <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{language === 'el' ? 'Επιβεβαιώστε τη Συμμετοχή σας' : 'Confirm Your Attendance'}</DialogTitle>
          <DialogDescription>
            {language === 'el' ? 'Προσθέστε ειδικά αιτήματα ή σημειώσεις (προαιρετικό)' : 'Add any special requests or notes (optional)'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="notes">{language === 'el' ? 'Σημειώσεις' : 'Notes'}</Label>
            <Textarea
              id="notes"
              placeholder={language === 'el' ? 'π.χ. Έρχομαι με 2 φίλους, διατροφικοί περιορισμοί, κλπ.' : 'e.g., Coming with 2 friends, dietary restrictions, etc.'}
              value={rsvpNotes}
              onChange={(e) => setRsvpNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
              {language === 'el' ? 'Ακύρωση' : 'Cancel'}
            </Button>
            <Button onClick={() => updateRSVP('going', rsvpNotes)} disabled={loading}>
              {language === 'el' ? 'Επιβεβαίωση' : 'Confirm'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Reservation Dialog */}
    {event.accepts_reservations && user && (
      <ReservationDialog
        open={showReservationDialog}
        onOpenChange={setShowReservationDialog}
        eventId={event.id}
        eventTitle={event.title}
        eventStartAt={event.start_at}
        seatingOptions={event.seating_options || []}
        language={language}
        userId={user.id}
        onSuccess={() => {
          setShowReservationDialog(false);
          checkReservationStatus();
        }}
      />
    )}
    </>
  );
};

export default EventCard;
