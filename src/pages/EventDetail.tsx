import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { trackEventView, trackEngagement } from '@/lib/analyticsTracking';
import { isEventPaused } from '@/lib/eventVisibility';
import { ReservationDialog } from '@/components/business/ReservationDialog';
import { ReservationEventCheckout } from '@/components/user/ReservationEventCheckout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RippleButton } from '@/components/ui/ripple-button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
// Tabs removed from Event Detail (Details/Live Feed section removed)
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Share2,
  Building2,
  ArrowLeft,
  Heart,
  CheckCircle,
  Ticket,
  PartyPopper,
} from 'lucide-react';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { EventAttendees } from '@/components/EventAttendees';
import { ShareDialog } from '@/components/sharing/ShareDialog';
import { TicketPurchaseCard } from '@/components/tickets/TicketPurchaseCard';
import { useTicketTiers } from '@/hooks/useTicketTiers';
import { ErrorState } from '@/components/ErrorState';
import { UnifiedEventCard } from '@/components/feed/UnifiedEventCard';
import { translateCity } from '@/lib/cityTranslations';

// Staggered animation variants for similar events
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
    },
  },
};

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const [event, setEvent] = useState<any>(null);
  const [similarEvents, setSimilarEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isInterested, setIsInterested] = useState(false);
  const [isGoing, setIsGoing] = useState(false);
  const [interestedCount, setInterestedCount] = useState(0);
  const [goingCount, setGoingCount] = useState(0);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [showReservationDialog, setShowReservationDialog] = useState(false);
  const [showReservationCheckout, setShowReservationCheckout] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const fromPath = `${location.pathname}${location.search}`;
  
  // Fetch ticket tiers for this event
  const { data: ticketTiers = [], isLoading: ticketsLoading } = useTicketTiers(eventId || '');

  useEffect(() => {
    checkUser();
    if (eventId) {
      fetchEventDetails();
      // Do NOT count views when navigation originated from the user's dashboard sections
      // or when the view was already tracked by the source component (e.g., search)
      const src = new URLSearchParams(location.search).get('src');
      const analyticsTracked = location.state?.analyticsTracked === true;
      console.debug('[EventDetail] view check', { eventId, src, analyticsTracked, pathname: location.pathname, search: location.search });
      if (src !== 'dashboard_user' && !analyticsTracked) {
        console.debug('[EventDetail] tracking view', { eventId });
        trackEventView(eventId, 'direct');
      } else {
        console.debug('[EventDetail] skipped view (dashboard_user or analyticsTracked)', { eventId, analyticsTracked });
      }
    }
  }, [eventId, location.search, location.state?.analyticsTracked]);

  useEffect(() => {
    if (event && user) {
      fetchRSVPStatus();
    }
  }, [event, user]);

  const refreshCounts = async (targetEventId: string) => {
    const { data, error } = await supabase.rpc("get_event_rsvp_counts", {
      p_event_id: targetEventId,
    });

    if (error) {
      console.error("Error fetching RSVP counts:", error);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    setInterestedCount(Number(row?.interested_count ?? 0));
    setGoingCount(Number(row?.going_count ?? 0));
  };

  const fetchRSVPStatus = async () => {
    if (!user || !event) return;

    // Fetch all user RSVPs for this event (may have 0, 1, or 2 rows)
    const { data: rows, error } = await supabase
      .from("rsvps")
      .select("status")
      .eq("event_id", event.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching RSVP status:", error);
      return;
    }

    setIsInterested(!!rows?.some((r) => r.status === "interested"));
    setIsGoing(!!rows?.some((r) => r.status === "going"));
  };

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url, interests, city")
        .eq("id", user.id)
        .single();

      setUserProfile(profile);
    }
  };

  const fetchEventDetails = async () => {
    if (!eventId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch event with business details
      const { data: eventData, error: fetchError } = await supabase
        .from("events")
        .select(
          `
          *,
          businesses!inner(
            id,
            name,
            logo_url,
            verified,
            city,
            category
          )
        `
        )
        .eq("id", eventId)
        .maybeSingle();

      if (fetchError) {
        console.error("Event fetch error:", fetchError);
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (!eventData) {
        setError(language === "el" ? "Η εκδήλωση δεν βρέθηκε" : "Event not found");
        setLoading(false);
        return;
      }

      // If event is paused, it must disappear everywhere EXCEPT for users who already purchased/reserved.
      if (isEventPaused(eventData)) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          setError(language === "el" ? "Η εκδήλωση δεν βρέθηκε" : "Event not found");
          setLoading(false);
          return;
        }

        const [ticketOrderRes, reservationRes] = await Promise.all([
          supabase
            .from('ticket_orders')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', currentUser.id)
            .eq('status', 'completed')
            .limit(1),
          supabase
            .from('reservations')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', currentUser.id)
            .eq('status', 'accepted')
            .limit(1),
        ]);

        const hasAccess =
          (ticketOrderRes.data?.length || 0) > 0 || (reservationRes.data?.length || 0) > 0;

        if (!hasAccess) {
          setError(language === "el" ? "Η εκδήλωση δεν βρέθηκε" : "Event not found");
          setLoading(false);
          return;
        }
      }

      setEvent(eventData);

      // Fetch RSVP counts (global)
      await refreshCounts(eventId);

      // Fetch personalized similar events using the new RPC function
      // Prioritizes: boosted events first, then user interests/city match
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const { data: similar, error: similarError } = await supabase.rpc('get_similar_events', {
        p_event_id: eventId,
        p_user_id: currentUser?.id || null,
        p_limit: 2  // Maximum 2 similar events
      });

      if (similarError) {
        console.error('Error fetching similar events:', similarError);
        setSimilarEvents([]);
      } else {
        // Transform RPC result to match the expected format
        const transformedSimilar = (similar || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          start_at: item.start_at,
          end_at: item.end_at,
          location: item.location,
          cover_image_url: item.cover_image_url,
          category: item.category,
          price_tier: item.price_tier,
          event_type: item.event_type,
          interested_count: item.interested_count,
          going_count: item.going_count,
          boostScore: item.is_boosted ? 100 : 0,
          businesses: {
            id: item.business_id,
            name: item.business_name,
            logo_url: item.business_logo_url,
            verified: item.business_verified,
            city: item.business_city,
          }
        }));

        // Enforce pause visibility: remove paused similar events
        const ids = transformedSimilar.map((e: any) => e.id);
        if (ids.length > 0) {
          const { data: vis } = await supabase
            .from('events')
            .select('id, appearance_start_at')
            .in('id', ids);

          const pausedIds = new Set((vis || []).filter((e: any) => isEventPaused(e)).map((e: any) => e.id));
          setSimilarEvents(transformedSimilar.filter((e: any) => !pausedIds.has(e.id)));
        } else {
          setSimilarEvents([]);
        }
      }
    } catch (err: any) {
      console.error("Event details error:", err);
      setError(err.message || "Failed to load event details");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    setShowShareDialog(true);
  };

  const handleRSVP = async (newStatus: "interested" | "going") => {
    if (!user) {
      toast.error("Please login to RSVP");
      navigate("/login");
      return;
    }

    setRsvpLoading(true);

    try {
      const isCurrentlyActive = newStatus === "interested" ? isInterested : isGoing;

      if (isCurrentlyActive) {
        // Toggle OFF this specific status only
        const { error } = await supabase
          .from("rsvps")
          .delete()
          .eq("event_id", event.id)
          .eq("user_id", user.id)
          .eq("status", newStatus);

        if (error) throw error;

        if (newStatus === "interested") {
          setIsInterested(false);
        } else {
          setIsGoing(false);
        }
      } else {
        // Insert new row for this status (allows both interested AND going)
        const { error } = await supabase.from("rsvps").insert({
          event_id: event.id,
          user_id: user.id,
          status: newStatus,
        });

        if (error) throw error;

        if (newStatus === "interested") {
          setIsInterested(true);
        } else {
          setIsGoing(true);
        }
        toast.success(`Marked as ${newStatus}`);
      }

      await refreshCounts(event.id);

      // Track engagement
      if (event?.businesses?.id) {
        trackEngagement(event.businesses.id, "share", "event", event.id);
      }
    } catch (error) {
      console.error("RSVP error:", error);
      toast.error("Failed to update RSVP");
    } finally {
      setRsvpLoading(false);
    }
  };

  // NOTE: Details/Live Feed section removed; keep RSVP state for buttons/eligibility elsewhere.

  const t = {
    el: {
      backToEvents: 'Επιστροφή στα Events',
      share: 'Κοινοποίηση',
      hostedBy: 'Διοργάνωση από',
      similarEvents: 'Παρόμοια Events',
      interested: 'Ενδιαφέρομαι',
      going: 'Θα πάω',
      makeReservation: 'Κράτηση',
      buyTickets: 'Αγοράστε εισιτήρια',
      ticketEvent: 'Εκδήλωση με Εισιτήρια',
      reservationEvent: 'Εκδήλωση με Κράτηση',
      freeEntry: 'Ελεύθερη Είσοδος',
    },
    en: {
      backToEvents: 'Back to Events',
      share: 'Share',
      hostedBy: 'Hosted by',
      similarEvents: 'Similar Events',
      interested: 'Interested',
      going: 'Going',
      makeReservation: 'Make Reservation',
      buyTickets: 'Buy tickets',
      ticketEvent: 'Ticket Event',
      reservationEvent: 'Reservation Event',
      freeEntry: 'Free Entry',
    },
  };

  const text = t[language];

  // Check if event has native tickets
  const hasNativeTickets = ticketTiers.length > 0;

  // Determine event type
  const eventType = event?.event_type || (hasNativeTickets ? 'ticket' : (event?.accepts_reservations ? 'reservation' : 'free_entry'));
  
  const getEventTypeBadge = () => {
    switch (eventType) {
      case 'ticket':
        return (
          <Badge
            variant="outline"
            className="rounded-full px-3 py-1 text-xs font-medium bg-background border-border"
          >
            {language === 'el' ? 'Με Εισιτήριο (Event)' : 'Ticketed (Event)'}
          </Badge>
        );
      case 'reservation':
        return (
          <Badge
            variant="outline"
            className="rounded-full px-3 py-1 text-xs font-medium bg-background border-border"
          >
            {language === 'el' ? 'Με Κράτηση (Event)' : 'Reservation (Event)'}
          </Badge>
        );
      case 'free_entry':
        return (
          <Badge
            variant="outline"
            className="rounded-full px-3 py-1 text-xs font-medium bg-background border-border"
          >
            {language === 'el' ? 'Ελεύθερη Είσοδος (Event)' : 'Free Entry (Event)'}
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <RippleButton
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {language === 'el' ? 'Επιστροφή' : 'Go Back'}
          </RippleButton>
          
          <ErrorState
            title={language === 'el' ? 'Σφάλμα φόρτωσης' : 'Failed to load event'}
            message={error || (language === 'el' ? 'Η εκδήλωση δεν βρέθηκε' : 'Event not found')}
            onRetry={() => fetchEventDetails()}
            showRetry
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Back Button */}
        <RippleButton
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 gap-2 relative z-20"
        >
          <ArrowLeft className="h-4 w-4" />
          {text.backToEvents}
        </RippleButton>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Image with Event Type Badge (half-overlapping like reference) */}
            <motion.div
              className="relative rounded-xl shadow-lg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="aspect-video rounded-xl overflow-hidden">
                {event.cover_image_url ? (
                  <img
                    src={event.cover_image_url}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <PartyPopper className="h-16 w-16 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              {/* Badge overlaps the bottom edge (like screenshot) */}
              <div className="absolute right-4 bottom-0 translate-y-1/2">
                {getEventTypeBadge()}
              </div>
            </motion.div>

            {/* Title and Description - close to image */}
            <div className="mt-2">
              <h1 className="text-lg font-bold line-clamp-1">{event.title}</h1>
              {event.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0">
                  {event.description}
                </p>
              )}
            </div>

            {/* Mobile/Tablet info section - shown below lg breakpoint */}
            <div className="lg:hidden space-y-3 mt-3">
              {/* RSVP Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <RippleButton
                  variant="outline"
                  size="sm"
                  onClick={() => handleRSVP('interested')}
                  disabled={rsvpLoading || !user}
                  className={`gap-1.5 text-xs h-9 transition-all ${
                    isInterested
                      ? 'border-ocean text-ocean bg-ocean/5'
                      : 'border-border text-muted-foreground hover:border-ocean/50'
                  }`}
                >
                  <Heart className="h-3.5 w-3.5" />
                  {text.interested}
                </RippleButton>
                <RippleButton
                  size="sm"
                  onClick={() => handleRSVP('going')}
                  disabled={rsvpLoading || !user}
                  className={`gap-1.5 text-xs h-9 transition-all ${
                    isGoing
                      ? 'bg-ocean hover:bg-ocean/90 text-white'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  {text.going}
                </RippleButton>
              </div>
              
              {/* RSVP Counts */}
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  <span>{interestedCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{goingCount}</span>
                </div>
              </div>

              {/* Tickets/Reservations - DIRECTLY after RSVP buttons (before date) */}
              {hasNativeTickets && (
                <TicketPurchaseCard
                  eventId={event.id}
                  eventTitle={event.title}
                  tiers={ticketTiers}
                  onSuccess={(orderId, isFree) => {
                    if (isFree) {
                      toast.success(language === 'el' 
                        ? 'Τα εισιτήριά σας είναι έτοιμα!' 
                        : 'Your tickets are ready!'
                      );
                    }
                  }}
                />
              )}

              {eventType === 'reservation' && event.event_type === 'reservation' && user && (
                <RippleButton
                  className="w-full gap-2 h-9 text-sm"
                  onClick={() => setShowReservationCheckout(true)}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {text.makeReservation}
                </RippleButton>
              )}

              {user && event.accepts_reservations && event.event_type !== 'reservation' && (
                <RippleButton
                  className="w-full gap-2 h-9 text-sm"
                  onClick={() => setShowReservationDialog(true)}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {text.makeReservation}
                </RippleButton>
              )}

              {/* Event Details Card - Date & Location (AFTER tickets) */}
              <Card variant="glass" className="backdrop-blur-md">
                <CardContent className="py-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">
                        {format(new Date(event.start_at), 'EEEE, d MMMM yyyy', { locale: language === 'el' ? el : enUS })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.start_at), 'HH:mm')} -{' '}
                        {format(new Date(event.end_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <button
                    onClick={() => {
                      // Open Google Maps with the EVENT's location (not business address)
                      // NO analytics tracking for this action
                      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`;
                      window.open(mapsUrl, '_blank');
                    }}
                    className="flex items-start gap-2 w-full text-left hover:bg-accent/50 -mx-1 px-1 py-0.5 rounded-md transition-colors cursor-pointer group"
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground group-hover:text-primary mt-0.5 shrink-0 transition-colors" />
                    <p className="font-medium text-sm group-hover:text-primary transition-colors">{event.location}</p>
                  </button>
                </CardContent>
              </Card>

              {/* Business Card */}
              <Card variant="glass" className="backdrop-blur-md">
                <CardContent className="py-3">
                  <p className="text-[10px] text-muted-foreground mb-1">{text.hostedBy}</p>
                  <Link
                    to={`/business/${event.businesses.id}`}
                    state={{
                      analyticsTracked: true,
                      analyticsSource: 'event',
                      from: fromPath,
                    }}
                    onClick={() => {
                      // Profile interaction: clicking the host business counts as profile_click
                      trackEngagement(event.businesses.id, 'profile_click', 'business', event.businesses.id, {
                        source: 'event_host_link',
                      });
                    }}
                    className="flex items-center gap-2 hover:bg-accent p-1.5 -mx-1.5 rounded-lg transition-colors"
                  >
                    <Avatar className="h-8 w-8 border">
                      <AvatarImage src={event.businesses.logo_url || ''} />
                      <AvatarFallback>
                        <Building2 className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm truncate">{event.businesses.name}</p>
                        {event.businesses.verified && (
                          <CheckCircle className="h-3 w-3 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {translateCity(event.businesses.city, language)}
                      </p>
                    </div>
                  </Link>
                </CardContent>
              </Card>

              {/* Share Button */}
              <RippleButton
                variant="outline"
                className="w-full gap-2 h-8 text-sm"
                onClick={handleShare}
              >
                <Share2 className="h-3.5 w-3.5" />
                {text.share}
              </RippleButton>
              
              {/* Terms & Conditions (mobile/tablet) - below share button */}
              {event.terms_and_conditions && (
                <p className="text-[10px] sm:text-xs text-muted-foreground/70 leading-tight">
                  <span className="font-medium">{language === 'el' ? 'Όροι:' : 'Terms:'}</span> {event.terms_and_conditions}
                </p>
              )}
            </div>

            {/* Similar Events - Always show section, use personalized RPC */}
            <div className="mt-4">
              <h2 className="text-lg sm:text-xl font-bold mb-3">{text.similarEvents}</h2>
              {similarEvents.length > 0 ? (
                <>
                  {/* Mobile only: single column */}
                  <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {similarEvents.map((similar) => (
                      <motion.div key={similar.id} variants={itemVariants}>
                        <UnifiedEventCard event={similar} language={language} size="mobileFixed" />
                      </motion.div>
                    ))}
                  </motion.div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {language === 'el' ? 'Δεν βρέθηκαν παρόμοια events' : 'No similar events found'}
                </p>
              )}
            </div>
          </div>

          {/* Sidebar - hidden on mobile/tablet, shown on desktop (lg+) */}
          <motion.div 
            className="hidden lg:block space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* RSVP Buttons - Tablet optimized: larger buttons, smaller text */}
            <Card variant="glass" className="backdrop-blur-md">
              <CardContent className="pt-4 md:pt-5 lg:pt-6">
                <div className="grid grid-cols-2 gap-2">
                  <RippleButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleRSVP('interested')}
                    disabled={rsvpLoading || !user}
                    className={`gap-1.5 md:gap-2 text-[11px] md:text-xs lg:text-sm h-10 md:h-11 lg:h-10 transition-all ${
                      isInterested
                        ? 'border-ocean text-ocean bg-ocean/5'
                        : 'border-border text-muted-foreground hover:border-ocean/50'
                    }`}
                  >
                    <Heart className="h-4 w-4 md:h-4 md:w-4 lg:h-4 lg:w-4 shrink-0" />
                    <span className="truncate">{text.interested}</span>
                  </RippleButton>
                  <RippleButton
                    size="sm"
                    onClick={() => handleRSVP('going')}
                    disabled={rsvpLoading || !user}
                    className={`gap-1.5 md:gap-2 text-[11px] md:text-xs lg:text-sm h-10 md:h-11 lg:h-10 transition-all ${
                      isGoing
                        ? 'bg-ocean hover:bg-ocean/90 text-white'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    <Users className="h-4 w-4 md:h-4 md:w-4 lg:h-4 lg:w-4 shrink-0" />
                    <span className="truncate">{text.going}</span>
                  </RippleButton>
                </div>
                
                {/* RSVP Counts */}
                <div className="flex items-center justify-center gap-4 mt-3 md:mt-4 text-xs md:text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span>{interestedCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span>{goingCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tickets/Reservations - DIRECTLY after RSVP buttons */}
            {hasNativeTickets && (
              <TicketPurchaseCard
                eventId={event.id}
                eventTitle={event.title}
                tiers={ticketTiers}
                onSuccess={(orderId, isFree) => {
                  if (isFree) {
                    toast.success(language === 'el' 
                      ? 'Τα εισιτήριά σας είναι έτοιμα!' 
                      : 'Your tickets are ready!'
                    );
                  }
                }}
              />
            )}

            {eventType === 'reservation' && event.event_type === 'reservation' && user && (
              <RippleButton
                className="w-full gap-2"
                onClick={() => setShowReservationCheckout(true)}
              >
                <Calendar className="h-4 w-4" />
                {text.makeReservation}
              </RippleButton>
            )}

            {user && event.accepts_reservations && event.event_type !== 'reservation' && (
              <RippleButton
                className="w-full gap-2"
                onClick={() => setShowReservationDialog(true)}
              >
                <Calendar className="h-4 w-4" />
                {text.makeReservation}
              </RippleButton>
            )}

            {/* Event Details Card - Date & Location (AFTER tickets) */}
            <Card variant="glass" className="backdrop-blur-md">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {format(new Date(event.start_at), 'EEEE, d MMMM yyyy', { locale: language === 'el' ? el : enUS })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.start_at), 'HH:mm')} -{' '}
                      {format(new Date(event.end_at), 'HH:mm')}
                    </p>
                  </div>
                </div>

                <Separator />

                <button
                  onClick={() => {
                    // Open Google Maps with the EVENT's location (not business address)
                    // NO analytics tracking for this action
                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`;
                    window.open(mapsUrl, '_blank');
                  }}
                  className="flex items-start gap-3 w-full text-left hover:bg-accent/50 -mx-1 px-1 py-0.5 rounded-md transition-colors cursor-pointer group"
                >
                  <MapPin className="h-5 w-5 text-muted-foreground group-hover:text-primary mt-0.5 transition-colors" />
                  <p className="font-medium group-hover:text-primary transition-colors">{event.location}</p>
                </button>
              </CardContent>
            </Card>

            {/* Business Card */}
            <Card variant="glass" className="backdrop-blur-md hover:shadow-hover transition-all duration-300">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-3">{text.hostedBy}</p>
                <Link
                  to={`/business/${event.businesses.id}`}
                  state={{
                    analyticsTracked: true,
                    analyticsSource: 'event',
                    from: fromPath,
                  }}
                  onClick={() => {
                    // Profile interaction: clicking the host business counts as profile_click
                    trackEngagement(event.businesses.id, 'profile_click', 'business', event.businesses.id, {
                      source: 'event_host_link',
                    });
                  }}
                  className="flex items-center gap-3 hover:bg-accent p-2 rounded-lg transition-colors"
                >
                  <Avatar className="h-12 w-12 border">
                    <AvatarImage src={event.businesses.logo_url || ''} />
                    <AvatarFallback>
                      <Building2 className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{event.businesses.name}</p>
                      {event.businesses.verified && (
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {event.businesses.city}
                    </p>
                  </div>
                </Link>
              </CardContent>
            </Card>

            {/* Share Button */}
            <RippleButton
              variant="outline"
              className="w-full gap-2"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              {text.share}
            </RippleButton>
            
            {/* Terms & Conditions (desktop) - below share button */}
            {event.terms_and_conditions && (
              <p className="text-[10px] sm:text-xs text-muted-foreground/70 leading-tight">
                <span className="font-medium">{language === 'el' ? 'Όροι:' : 'Terms:'}</span> {event.terms_and_conditions}
              </p>
            )}
          </motion.div>
        </div>
      </div>

      <Footer />

      {/* Reservation Dialog */}
      {user && (
        <ReservationDialog
          eventId={event.id}
          eventTitle={event.title}
          eventStartAt={event.start_at}
          seatingOptions={event.seating_options || []}
          language={language}
          userId={user.id}
          open={showReservationDialog}
          onOpenChange={setShowReservationDialog}
          onSuccess={() => {
            setShowReservationDialog(false);
            toast.success(language === 'el' ? 'Η κράτησή σας υποβλήθηκε!' : 'Reservation submitted!');
          }}
        />
      )}

      {/* Reservation Event Checkout Dialog (for new reservation events) */}
      {user && event.event_type === 'reservation' && (
        <ReservationEventCheckout
          open={showReservationCheckout}
          onOpenChange={setShowReservationCheckout}
          eventId={event.id}
          eventTitle={event.title}
          eventDate={event.start_at}
          eventLocation={event.location}
          minPartySize={event.min_party_size || 1}
          maxPartySize={event.max_party_size || 10}
          reservationHoursFrom={event.reservation_hours_from}
          reservationHoursTo={event.reservation_hours_to}
          userId={user.id}
          language={language}
          onSuccess={() => {
            setShowReservationCheckout(false);
            toast.success(language === 'el' ? 'Η κράτησή σας ολοκληρώθηκε!' : 'Reservation completed!');
          }}
        />
      )}

      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        event={event}
        language={language}
      />
    </div>
  );
}