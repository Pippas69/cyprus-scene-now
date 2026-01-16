import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { trackEventView, trackEngagement } from '@/lib/analyticsTracking';
import { ReservationDialog } from '@/components/business/ReservationDialog';
import { ReservationEventCheckout } from '@/components/user/ReservationEventCheckout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RippleButton } from '@/components/ui/ripple-button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  MessageSquare,
  Ticket,
  PartyPopper,
} from 'lucide-react';
import { format } from 'date-fns';
import EventCard from '@/components/EventCard';
import { EventAttendees } from '@/components/EventAttendees';
import { LiveEventFeed } from '@/components/feed/LiveEventFeed';
import { ShareDialog } from '@/components/sharing/ShareDialog';
import { TicketPurchaseCard } from '@/components/tickets/TicketPurchaseCard';
import { useTicketTiers } from '@/hooks/useTicketTiers';
import { ErrorState } from '@/components/ErrorState';

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
  const [activeTab, setActiveTab] = useState('details');
  
  // Fetch ticket tiers for this event
  const { data: ticketTiers = [], isLoading: ticketsLoading } = useTicketTiers(eventId || '');

  useEffect(() => {
    checkUser();
    if (eventId) {
      fetchEventDetails();
      trackEventView(eventId, 'direct');
    }
  }, [eventId]);

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

    const { data: row, error } = await supabase
      .from("rsvps")
      .select("status")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching RSVP status:", error);
      return;
    }

    setIsInterested(row?.status === "interested");
    setIsGoing(row?.status === "going");
  };

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url")
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

      setEvent(eventData);

      // Fetch RSVP counts (global)
      await refreshCounts(eventId);

      // Fetch similar events (same category or location)
      const { data: similar } = await supabase
        .from("events")
        .select(
          `
        *,
        businesses!inner(name, logo_url, verified)
      `
        )
        .neq("id", eventId)
        .gte("end_at", new Date().toISOString())
        .or(
          `location.ilike.%${eventData.location}%,category.cs.{${eventData.category[0] || ""}}`
        )
        .limit(3);

      setSimilarEvents(similar || []);
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
        // Toggle off
        const { error } = await supabase
          .from("rsvps")
          .delete()
          .eq("event_id", event.id)
          .eq("user_id", user.id);

        if (error) throw error;

        setIsInterested(false);
        setIsGoing(false);
      } else {
        // Upsert single RSVP (switch interested <-> going)
        const { error } = await supabase
          .from("rsvps")
          .upsert(
            {
              event_id: event.id,
              user_id: user.id,
              status: newStatus,
            },
            { onConflict: "event_id,user_id" }
          );

        if (error) throw error;

        setIsInterested(newStatus === "interested");
        setIsGoing(newStatus === "going");
        toast.success(`Marked as ${newStatus}`);
      }

      await refreshCounts(event.id);

      // Track engagement - using 'share' as a proxy for engagement tracking
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

  const isAttendee = isInterested || isGoing;

  const t = {
    el: {
      backToEvents: 'Επιστροφή στα Events',
      share: 'Κοινοποίηση',
      hostedBy: 'Διοργάνωση από',
      similarEvents: 'Παρόμοια Events',
      interested: 'Ενδιαφέρομαι',
      going: 'Θα πάω',
      details: 'Λεπτομέρειες',
      liveFeed: 'Live Feed',
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
      details: 'Details',
      liveFeed: 'Live Feed',
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
          <Badge variant="default" className="gap-1">
            <Ticket className="h-3 w-3" />
            {text.ticketEvent}
          </Badge>
        );
      case 'reservation':
        return (
          <Badge variant="secondary" className="gap-1">
            <Calendar className="h-3 w-3" />
            {text.reservationEvent}
          </Badge>
        );
      case 'free_entry':
        return (
          <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
            <PartyPopper className="h-3 w-3" />
            {text.freeEntry}
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
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {text.backToEvents}
        </RippleButton>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Hero Image */}
            {event.cover_image_url && (
              <motion.div 
                className="aspect-video rounded-lg overflow-hidden shadow-lg"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <img
                  src={event.cover_image_url}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            )}

            {/* Title and Categories */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-4xl font-bold mb-4">{event.title}</h1>
              <div className="flex flex-wrap gap-2 items-center">
                {getEventTypeBadge()}
                {event.category?.map((cat: string) => (
                  <Badge key={cat} variant="secondary">
                    {cat}
                  </Badge>
                ))}
              </div>
            </motion.div>

            {/* Tabs for Details and Live Feed */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details" className="gap-2">
                  {text.details}
                </TabsTrigger>
                <TabsTrigger 
                  value="livefeed" 
                  disabled={!isAttendee}
                  className="gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  {text.liveFeed}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6 mt-6">
                {/* Description */}
                {event.description && (
                  <Card variant="glass">
                    <CardContent className="pt-6">
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {event.description}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Similar Events */}
                {similarEvents.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold mb-4">{text.similarEvents}</h2>
                    <motion.div 
                      className="grid gap-4"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {similarEvents.map((similar) => (
                        <motion.div key={similar.id} variants={itemVariants}>
                          <EventCard
                            event={similar}
                            language={language}
                            user={user}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="livefeed" className="mt-6">
                {isAttendee && (
                  <LiveEventFeed
                    eventId={eventId!}
                    userId={user?.id}
                    userAvatar={userProfile?.avatar_url}
                    userName={[userProfile?.first_name, userProfile?.last_name].filter(Boolean).join(' ')}
                    language={language}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* RSVP Buttons */}
            {user && (
              <Card variant="glass" className="backdrop-blur-md">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-2">
                    <RippleButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleRSVP('interested')}
                      disabled={rsvpLoading}
                      className={`gap-2 transition-all ${
                        status === 'interested'
                          ? 'border-ocean text-ocean bg-ocean/5'
                          : 'border-border text-muted-foreground hover:border-ocean/50'
                      }`}
                    >
                      <Heart className="h-4 w-4" />
                      {text.interested}
                    </RippleButton>
                    <RippleButton
                      size="sm"
                      onClick={() => handleRSVP('going')}
                      disabled={rsvpLoading}
                      className={`gap-2 transition-all ${
                        status === 'going'
                          ? 'bg-ocean hover:bg-ocean/90 text-white'
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      {text.going}
                    </RippleButton>
                  </div>
                  
                  {/* RSVP Counts */}
                  <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      <span>{interestedCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{goingCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Native Ticket Purchase */}
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

            {/* Reservation Checkout for Reservation Events with Seating Types */}
            {eventType === 'reservation' && event.event_type === 'reservation' && user && (
              <RippleButton
                className="w-full gap-2"
                onClick={() => setShowReservationCheckout(true)}
              >
                <Calendar className="h-4 w-4" />
                {text.makeReservation}
              </RippleButton>
            )}

            {/* Legacy Reservation Button (for events without new event_type) */}
            {user && event.accepts_reservations && event.event_type !== 'reservation' && (
              <RippleButton
                className="w-full gap-2"
                onClick={() => setShowReservationDialog(true)}
              >
                <Calendar className="h-4 w-4" />
                {text.makeReservation}
              </RippleButton>
            )}

            {/* Share Button */}
            <RippleButton
              variant="outline"
              className="w-full gap-2"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              {text.share}
            </RippleButton>

            {/* Event Details Card */}
            <Card variant="glass" className="backdrop-blur-md">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {format(new Date(event.start_at), 'EEEE, MMMM d, yyyy')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.start_at), 'HH:mm')} -{' '}
                      {format(new Date(event.end_at), 'HH:mm')}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <p className="font-medium">{event.location}</p>
                </div>
              </CardContent>
            </Card>

            {/* Business Card */}
            <Card variant="glass" className="backdrop-blur-md hover:shadow-hover transition-all duration-300">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-3">{text.hostedBy}</p>
                <Link
                  to={`/business/${event.businesses.id}`}
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

            {/* Event Attendees */}
            <EventAttendees eventId={eventId!} />
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