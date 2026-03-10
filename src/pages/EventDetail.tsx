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
  PartyPopper } from
'lucide-react';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { EventAttendees } from '@/components/EventAttendees';
import { ShareDialog } from '@/components/sharing/ShareDialog';
import { TicketPurchaseFlow } from '@/components/tickets/TicketPurchaseFlow';
import { KalivaTicketReservationFlow } from '@/components/tickets/KalivaTicketReservationFlow';
import { useTicketTiers } from '@/hooks/useTicketTiers';
import { ErrorState } from '@/components/ErrorState';
import { UnifiedEventCard } from '@/components/feed/UnifiedEventCard';
import { translateCity } from '@/lib/cityTranslations';
import { isClubOrEventBusiness } from '@/lib/isClubOrEventBusiness';

// Staggered animation variants for similar events
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30
    }
  }
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
  const [showKalivaFlow, setShowKalivaFlow] = useState(false);
  const [showTicketFlow, setShowTicketFlow] = useState(false);
  const [reservationsSoldOut, setReservationsSoldOut] = useState(false);

  // Show instances for performance/theatre events
  const [showInstances, setShowInstances] = useState<any[]>([]);
  // Cast/crew members for performance events
  const [castMembers, setCastMembers] = useState<any[]>([]);

  const fromPath = `${location.pathname}${location.search}`;

  // Determine if this business uses the linked ticket+reservation (Kaliva) flow
  const isBusinessTicketLinked = !!(
  (event as any)?.businesses?.ticket_reservation_linked ||
  isClubOrEventBusiness((event as any)?.businesses?.category || []));


  // Fetch ticket tiers for this event
  const { data: ticketTiers = [], isLoading: ticketsLoading } = useTicketTiers(eventId || '');

  useEffect(() => {
    checkUser();
    if (eventId) {
      fetchEventDetails();
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

  useEffect(() => {
    if (!eventId || !event || !isBusinessTicketLinked || event.event_type !== 'ticket_and_reservation') return;

    refreshReservationSoldOut(eventId, true, event.event_type);
    const refreshTimer = window.setInterval(() => {
      refreshReservationSoldOut(eventId, true, event.event_type);
    }, 15000);

    return () => window.clearInterval(refreshTimer);
  }, [eventId, event?.id, event?.event_type, isBusinessTicketLinked]);

  const refreshCounts = async (targetEventId: string) => {
    const { data, error } = await supabase.rpc("get_event_rsvp_counts", {
      p_event_id: targetEventId
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

    const { data: rows, error } = await supabase.
    from("rsvps").
    select("status").
    eq("event_id", event.id).
    eq("user_id", user.id);

    if (error) {
      console.error("Error fetching RSVP status:", error);
      return;
    }

    setIsInterested(!!rows?.some((r) => r.status === "interested"));
    setIsGoing(!!rows?.some((r) => r.status === "going"));
  };

  const checkUser = async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const { data: profile } = await supabase.
      from("profiles").
      select("first_name, last_name, avatar_url, interests, city").
      eq("id", user.id).
      single();

      setUserProfile(profile);
    }
  };

  const refreshReservationSoldOut = async (
  targetEventId: string,
  isLinkedHybrid: boolean,
  eventType?: string | null) =>
  {
    if (!isLinkedHybrid || eventType !== 'ticket_and_reservation') {
      setReservationsSoldOut(false);
      return;
    }

    const { data: seatingTypes } = await supabase.
    from('reservation_seating_types').
    select('id, available_slots, paused').
    eq('event_id', targetEventId);

    if (!seatingTypes || seatingTypes.length === 0) {
      setReservationsSoldOut(false);
      return;
    }

    const activeTypes = seatingTypes.filter((st) => !st.paused);
    if (activeTypes.length === 0) {
      setReservationsSoldOut(true);
      return;
    }

    const activeIds = activeTypes.map((st) => st.id);
    const activeIdSet = new Set(activeIds);

    const { data: bookedCounts, error: bookedCountsError } = await supabase.rpc(
      'get_event_seating_booked_counts',
      { p_event_id: targetEventId }
    );

    if (bookedCountsError) {
      console.error('Error fetching reservation availability:', bookedCountsError);
      setReservationsSoldOut(false);
      return;
    }

    const counts: Record<string, number> = {};
    for (const row of (bookedCounts || []) as {seating_type_id: string;slots_booked: number | string;}[]) {
      if (row.seating_type_id && activeIdSet.has(row.seating_type_id)) {
        counts[row.seating_type_id] = Number(row.slots_booked) || 0;
      }
    }

    const allFull = activeTypes.every((st) => (counts[st.id] || 0) >= st.available_slots);
    setReservationsSoldOut(allFull);
  };

  const fetchEventDetails = async () => {
    if (!eventId) return;

    setLoading(true);
    setError(null);

    try {
      const { data: eventData, error: fetchError } = await supabase.
      from("events").
      select(
        `
          *,
            businesses!inner(
            id,
            name,
            logo_url,
            verified,
            city,
            category,
            ticket_reservation_linked
          )
        `
      ).
      eq("id", eventId).
      maybeSingle();

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

      if (isEventPaused(eventData)) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          setError(language === "el" ? "Η εκδήλωση δεν βρέθηκε" : "Event not found");
          setLoading(false);
          return;
        }

        const [ticketOrderRes, reservationRes] = await Promise.all([
        supabase.
        from('ticket_orders').
        select('id').
        eq('event_id', eventId).
        eq('user_id', currentUser.id).
        eq('status', 'completed').
        limit(1),
        supabase.
        from('reservations').
        select('id').
        eq('event_id', eventId).
        eq('user_id', currentUser.id).
        eq('status', 'accepted').
        limit(1)]
        );

        const hasAccess =
        (ticketOrderRes.data?.length || 0) > 0 || (reservationRes.data?.length || 0) > 0;

        if (!hasAccess) {
          setError(language === "el" ? "Η εκδήλωση δεν βρέθηκε" : "Event not found");
          setLoading(false);
          return;
        }
      }

      setEvent(eventData);

      const performanceCategories = ['theatre', 'music', 'dance', 'kids', 'θέατρο', 'μουσική', 'χορός', 'παιδικά'];
      const bizCategories = (eventData.businesses?.category || []).map((c: string) => c.toLowerCase());
      const isPerformance = bizCategories.some((c: string) => performanceCategories.includes(c));

      if (isPerformance) {
        const { data: shows } = await supabase.
        from('show_instances').
        select('id, start_at, end_at, venue_id, doors_open_at, notes, status, production_id').
        eq('event_id', eventId).
        eq('status', 'scheduled').
        order('start_at', { ascending: true });
        setShowInstances(shows || []);

        const productionId = shows?.[0]?.production_id;
        if (productionId) {
          const { data: cast } = await supabase.
          from('production_cast').
          select('id, person_name, role_type, role_name, bio, photo_url, sort_order').
          eq('production_id', productionId).
          order('sort_order', { ascending: true });
          setCastMembers(cast || []);
        }
      }

      const eventDataLinked = !!(eventData as any).businesses?.ticket_reservation_linked || isClubOrEventBusiness((eventData as any).businesses?.category || []);
      await refreshReservationSoldOut(eventId, eventDataLinked, eventData.event_type);

      await refreshCounts(eventId);

      const { data: { user: currentUser } } = await supabase.auth.getUser();

      const { data: similar, error: similarError } = await supabase.rpc('get_similar_events', {
        p_event_id: eventId,
        p_user_id: currentUser?.id || null,
        p_limit: 2
      });

      if (similarError) {
        console.error('Error fetching similar events:', similarError);
        setSimilarEvents([]);
      } else {
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
            city: item.business_city
          }
        }));

        const ids = transformedSimilar.map((e: any) => e.id);
        if (ids.length > 0) {
          const { data: vis } = await supabase.
          from('events').
          select('id, appearance_start_at').
          in('id', ids);

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
        const { error } = await supabase.
        from("rsvps").
        delete().
        eq("event_id", event.id).
        eq("user_id", user.id).
        eq("status", newStatus);

        if (error) throw error;

        if (newStatus === "interested") {
          setIsInterested(false);
        } else {
          setIsGoing(false);
        }
      } else {
        const { error } = await supabase.from("rsvps").insert({
          event_id: event.id,
          user_id: user.id,
          status: newStatus
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
      freeEntry: 'Ελεύθερη Είσοδος'
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
      freeEntry: 'Free Entry'
    }
  };

  const text = t[language];

  // Check if event has native tickets (including inactive ones)
  const hasNativeTickets = ticketTiers.length > 0;
  const activeTicketTiers = ticketTiers.filter((t: any) => t.active !== false);
  const isLinkedHybridEvent = isBusinessTicketLinked && event?.event_type === 'ticket_and_reservation';
  const walkInTicketTiers = isLinkedHybridEvent ?
  activeTicketTiers.filter((t: any) => t.quantity_total !== 999999) :
  activeTicketTiers;
  const reservationFlowTicketTiers = isLinkedHybridEvent ?
  (() => {
    const reservationTiers = activeTicketTiers.filter((t: any) => t.quantity_total === 999999);
    return reservationTiers.length > 0 ? reservationTiers : activeTicketTiers;
  })() :
  activeTicketTiers;

  const tiersForSoldOutCheck = isLinkedHybridEvent ? walkInTicketTiers : activeTicketTiers;
  const allTicketsSoldOut = hasNativeTickets && (
  tiersForSoldOutCheck.length === 0 ||
  tiersForSoldOutCheck.every((t: any) => t.quantity_total > 0 && (t.quantity_sold ?? 0) >= t.quantity_total));

  const kalivaFullySoldOut = reservationsSoldOut && allTicketsSoldOut;

  // Determine event type
  const eventType = event?.event_type || (hasNativeTickets ? 'ticket' : event?.accepts_reservations ? 'reservation' : 'free_entry');
  const eventHasTickets = eventType === 'ticket' || eventType === 'ticket_and_reservation';
  const eventHasReservation = eventType === 'reservation' || eventType === 'ticket_and_reservation' || event?.accepts_reservations;

  // Compute the starting ticket price for the price badge
  const startingPriceCents = activeTicketTiers.length > 0 ?
  Math.min(...activeTicketTiers.map((t: any) => t.price_cents ?? 0)) :
  event?.price ? event.price * 100 : null;

  const formatPrice = (cents: number) => {
    if (cents === 0) return language === 'el' ? 'Δωρεάν' : 'Free';
    return `€${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>);

  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <RippleButton
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 gap-2">
            
            <ArrowLeft className="h-4 w-4" />
            {language === 'el' ? 'Επιστροφή' : 'Go Back'}
          </RippleButton>
          
          <ErrorState
            title={language === 'el' ? 'Σφάλμα φόρτωσης' : 'Failed to load event'}
            message={error || (language === 'el' ? 'Η εκδήλωση δεν βρέθηκε' : 'Event not found')}
            onRetry={() => fetchEventDetails()}
            showRetry />
          
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pt-20 lg:pt-24">
        {/* Desktop-only back button */}
        <RippleButton
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 gap-2 relative z-20 hidden lg:inline-flex">
          
          <ArrowLeft className="h-4 w-4" />
          {text.backToEvents}
        </RippleButton>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Hero Image — premium style with title + price overlaid */}
            <motion.div
              className="relative rounded-xl shadow-lg overflow-hidden -mx-4 sm:mx-0"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}>
              
              <div className="aspect-[4/3] sm:aspect-video">
                {event.cover_image_url ?
                <img
                  src={event.cover_image_url}
                  alt={event.title}
                  className="w-full h-full object-cover" /> :


                <div className="w-full h-full bg-muted flex items-center justify-center">
                    <PartyPopper className="h-16 w-16 text-muted-foreground/40" />
                  </div>
                }
              </div>

              {/* Gradient overlay at bottom for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

              {/* Back arrow — overlaid on image (mobile/tablet only) */}
              <button
                onClick={() => navigate(-1)}
                className="lg:hidden absolute top-3 left-3 sm:left-4 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/15 z-10 hover:bg-black/60 transition-colors">
                
                <ArrowLeft className="h-4 w-4 text-white" />
              </button>

              {/* Title + Price badge at bottom of image */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 flex items-end justify-between gap-3">
                <h1 className="text-white text-lg sm:text-xl font-bold leading-tight line-clamp-2 flex-1">{event.title}</h1>
                {eventHasTickets && startingPriceCents !== null &&
                <span className="shrink-0 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-sm font-bold">
                    {formatPrice(startingPriceCents)}
                  </span>
                }
              </div>
            </motion.div>

            {/* Description (if any) */}
            {event.description &&
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">
                {event.description}
              </p>
            }

            {/* Date / Time / Location — premium info card */}
            <Card variant="glass" className="backdrop-blur-md border-border/50">
              <CardContent className="py-4 px-4 space-y-3">
                {showInstances.length > 1 ?
                <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      {showInstances.map((si: any) =>
                    <p key={si.id} className="text-sm text-foreground font-medium">
                          {format(new Date(si.start_at), 'EEE d MMM, HH:mm', { locale: language === 'el' ? el : enUS })}
                        </p>
                    )}
                    </div>
                  </div> :
                <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-primary shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {format(new Date(event.start_at), 'EEEE, d MMMM yyyy', { locale: language === 'el' ? el : enUS })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(event.start_at), 'HH:mm')} – {format(new Date(event.end_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                }

                <Separator className="opacity-30" />

                <button
                  onClick={() => {
                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`;
                    window.open(mapsUrl, '_blank');
                  }}
                  className="flex items-center gap-3 w-full text-left group">
                  <MapPin className="h-4 w-4 text-primary shrink-0 group-hover:text-primary/80 transition-colors" />
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{event.location}</span>
                </button>
              </CardContent>
            </Card>

            {/* Cast & Crew for performance events */}
            {castMembers.length > 0 &&
            <div>
                <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {language === 'el' ? 'Συντελεστές' : 'Cast & Crew'}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {castMembers.map((member: any) =>
                <div key={member.id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {member.photo_url ?
                    <img src={member.photo_url} alt={member.person_name} className="h-full w-full object-cover" /> :

                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    }
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{member.person_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {member.role_name || (language === 'el' ?
                      member.role_type === 'actor' ? 'Ηθοποιός' : member.role_type === 'director' ? 'Σκηνοθέτης' : member.role_type === 'musician' ? 'Μουσικός' : member.role_type :
                      member.role_type.charAt(0).toUpperCase() + member.role_type.slice(1))
                      }
                        </p>
                      </div>
                    </div>
                )}
                </div>
              </div>
            }

            {/* Mobile/Tablet info section - shown below lg breakpoint */}
            <div className="lg:hidden space-y-3">
              {/* Tickets/Reservations */}
              {hasNativeTickets && !(isBusinessTicketLinked && event.event_type === 'ticket_and_reservation') &&
              <div className="flex justify-center">
                <RippleButton
                  className="gap-2 h-10 text-sm px-8"
                  onClick={() => setShowTicketFlow(true)}>
                  <Ticket className="h-3.5 w-3.5" />
                  {text.buyTickets}
                </RippleButton>
              </div>
              }

              {/* Kaliva flow */}
              {hasNativeTickets && isBusinessTicketLinked && event.event_type === 'ticket_and_reservation' &&
              <div className="w-full space-y-1">
                  {kalivaFullySoldOut ?
                <div className="w-full h-9 text-sm rounded-md flex items-center justify-center gap-2 bg-destructive/10 border border-destructive/30 text-destructive cursor-default">
                      <Ticket className="h-3.5 w-3.5" />
                      <span className="font-medium">{language === 'el' ? 'Εξαντλήθηκε' : 'Sold out'}</span>
                    </div> :
                !user ? null : reservationsSoldOut ?
                <>
                      <div className="w-full h-9 text-sm rounded-md flex items-center justify-center gap-2 bg-muted/60 border border-border text-muted-foreground cursor-default">
                        <Ticket className="h-3.5 w-3.5" />
                        <span>{language === 'el' ? 'Κράτηση & Εισιτήριο' : 'Book & Get Ticket'}</span>
                        <span className="text-[10px] font-medium text-destructive/80 ml-1">
                          {language === 'el' ? 'Εξαντλήθηκε' : 'Sold out'}
                        </span>
                      </div>
                      {!allTicketsSoldOut &&
                  <button
                    type="button"
                    className="w-full text-center text-[11px] text-primary hover:text-primary/80 transition-colors underline underline-offset-2 font-medium"
                    onClick={() => setShowTicketFlow(true)}>
                    
                          {language === 'el' ? 'Walk in με εισιτήριο' : 'Walk in with ticket'}
                        </button>
                  }
                    </> :

                <>
                      <RippleButton
                    className="w-full gap-2 h-10 text-sm"
                    onClick={() => setShowKalivaFlow(true)}>
                    
                        <Ticket className="h-3.5 w-3.5" />
                        {language === 'el' ? 'Κράτηση & Εισιτήριο' : 'Book & Get Ticket'}
                      </RippleButton>
                      {!allTicketsSoldOut &&
                  <button
                    type="button"
                    className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                    onClick={() => setShowTicketFlow(true)}>
                    
                          {language === 'el' ? 'Walk in με εισιτήριο' : 'Walk in with ticket'}
                        </button>
                  }
                    </>
                }
                </div>
              }

              {eventHasReservation && event.event_type === 'reservation' && user &&
              <RippleButton
                className="w-full gap-2 h-9 text-sm"
                onClick={() => setShowReservationCheckout(true)}>
                
                  <Calendar className="h-3.5 w-3.5" />
                  {text.makeReservation}
                </RippleButton>
              }

              {eventHasReservation && event.event_type === 'ticket_and_reservation' && user && !isBusinessTicketLinked &&
              <RippleButton
                className="w-full gap-2 h-9 text-sm"
                onClick={() => setShowReservationCheckout(true)}>
                
                  <Calendar className="h-3.5 w-3.5" />
                  {text.makeReservation}
                </RippleButton>
              }

              {user && event.accepts_reservations && event.event_type !== 'reservation' && event.event_type !== 'ticket_and_reservation' &&
              <RippleButton
                className="w-full gap-2 h-9 text-sm"
                onClick={() => setShowReservationDialog(true)}>
                
                  <Calendar className="h-3.5 w-3.5" />
                  {text.makeReservation}
                </RippleButton>
              }

              {/* Business Card */}
              <Card variant="glass" className="backdrop-blur-md border-border/50">
                <CardContent className="py-3 px-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-2 font-medium">{text.hostedBy}</p>
                  <Link
                    to={`/business/${event.businesses.id}`}
                    state={{
                      analyticsTracked: true,
                      analyticsSource: 'event',
                      from: fromPath
                    }}
                    onClick={() => {
                      trackEngagement(event.businesses.id, 'profile_click', 'business', event.businesses.id, {
                        source: 'event_host_link'
                      });
                    }}
                    className="flex items-center gap-3 hover:bg-accent/50 p-2 -mx-2 rounded-xl transition-colors">
                    
                    <Avatar className="h-9 w-9 border border-border/50 ring-1 ring-primary/10">
                      <AvatarImage src={event.businesses.logo_url || ''} />
                      <AvatarFallback>
                        <Building2 className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm truncate">{event.businesses.name}</p>
                        {event.businesses.verified &&
                        <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        }
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
                onClick={handleShare}>
                
                <Share2 className="h-3.5 w-3.5" />
                {text.share}
              </RippleButton>
              
              {/* Terms & Conditions */}
              {event.terms_and_conditions &&
              <p className="text-[10px] sm:text-xs text-muted-foreground/70 leading-tight">
                  <span className="font-medium">{language === 'el' ? 'Όροι:' : 'Terms:'}</span> {event.terms_and_conditions}
                </p>
              }
            </div>

            {/* Similar Events */}
            <div className="mt-4">
              <h2 className="text-lg sm:text-xl font-bold mb-3">{text.similarEvents}</h2>
              {similarEvents.length > 0 ?
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                variants={containerVariants}
                initial="hidden"
                animate="visible">
                
                  {similarEvents.map((similar) =>
                <motion.div key={similar.id} variants={itemVariants}>
                      <UnifiedEventCard event={similar} language={language} size="mobileFixed" />
                    </motion.div>
                )}
                </motion.div> :

              <p className="text-sm text-muted-foreground">
                  {language === 'el' ? 'Δεν βρέθηκαν παρόμοια events' : 'No similar events found'}
                </p>
              }
            </div>
          </div>

          {/* Sidebar - hidden on mobile/tablet, shown on desktop (lg+) */}
          <motion.div
            className="hidden lg:block space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}>
            



            {/* Tickets/Reservations */}
            {hasNativeTickets && !(isBusinessTicketLinked && event.event_type === 'ticket_and_reservation') &&
            <RippleButton
              className="w-full gap-2"
              onClick={() => setShowTicketFlow(true)}>
              
                <Ticket className="h-4 w-4" />
                {text.buyTickets}
              </RippleButton>
            }

            {/* Kaliva flow */}
            {hasNativeTickets && isBusinessTicketLinked && event.event_type === 'ticket_and_reservation' &&
            <div className="w-full space-y-1">
                {kalivaFullySoldOut ?
              <div className="w-full h-10 rounded-md flex items-center justify-center gap-2 bg-destructive/10 border border-destructive/30 text-destructive cursor-default">
                    <Ticket className="h-4 w-4" />
                    <span className="font-medium">{language === 'el' ? 'Εξαντλήθηκε' : 'Sold out'}</span>
                  </div> :
              !user ? null : reservationsSoldOut ?
              <>
                    <div className="w-full h-10 rounded-md flex items-center justify-center gap-2 bg-muted/60 border border-border text-muted-foreground cursor-default">
                      <Ticket className="h-4 w-4" />
                      <span>{language === 'el' ? 'Κράτηση & Εισιτήριο' : 'Book & Get Ticket'}</span>
                      <span className="text-[10px] font-medium text-destructive/80 ml-1">
                        {language === 'el' ? 'Εξαντλήθηκε' : 'Sold out'}
                      </span>
                    </div>
                    {!allTicketsSoldOut &&
                <button
                  type="button"
                  className="w-full text-center text-[11px] text-primary hover:text-primary/80 transition-colors underline underline-offset-2 font-medium"
                  onClick={() => setShowTicketFlow(true)}>
                  
                        {language === 'el' ? 'Walk in με εισιτήριο' : 'Walk in with ticket'}
                      </button>
                }
                  </> :

              <>
                    <RippleButton
                  className="w-full gap-2"
                  onClick={() => setShowKalivaFlow(true)}>
                  
                      <Ticket className="h-4 w-4" />
                      {language === 'el' ? 'Κράτηση & Εισιτήριο' : 'Book & Get Ticket'}
                    </RippleButton>
                    {!allTicketsSoldOut &&
                <button
                  type="button"
                  className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                  onClick={() => setShowTicketFlow(true)}>
                  
                        {language === 'el' ? 'Walk in με εισιτήριο' : 'Walk in with ticket'}
                      </button>
                }
                  </>
              }
              </div>
            }

            {eventHasReservation && event.event_type === 'reservation' && user &&
            <RippleButton
              className="w-full gap-2"
              onClick={() => setShowReservationCheckout(true)}>
              
                <Calendar className="h-4 w-4" />
                {text.makeReservation}
              </RippleButton>
            }

            {eventHasReservation && event.event_type === 'ticket_and_reservation' && user && !isBusinessTicketLinked &&
            <RippleButton
              className="w-full gap-2"
              onClick={() => setShowReservationCheckout(true)}>
              
                <Calendar className="h-4 w-4" />
                {text.makeReservation}
              </RippleButton>
            }

            {user && event.accepts_reservations && event.event_type !== 'reservation' && event.event_type !== 'ticket_and_reservation' &&
            <RippleButton
              className="w-full gap-2"
              onClick={() => setShowReservationDialog(true)}>
              
                <Calendar className="h-4 w-4" />
                {text.makeReservation}
              </RippleButton>
            }

            {/* Event Details Card - Date & Location */}
            <Card variant="glass" className="backdrop-blur-md border-border/50">
              <CardContent className="py-4 px-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-primary shrink-0 mt-1" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {format(new Date(event.start_at), 'EEEE, d MMMM yyyy', { locale: language === 'el' ? el : enUS })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(event.start_at), 'HH:mm')} – {format(new Date(event.end_at), 'HH:mm')}
                    </p>
                  </div>
                </div>

                <Separator className="opacity-30" />

                <button
                  onClick={() => {
                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`;
                    window.open(mapsUrl, '_blank');
                  }}
                  className="flex items-center gap-3 w-full text-left group">
                  <MapPin className="h-4 w-4 text-primary shrink-0 group-hover:text-primary/80 transition-colors" />
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{event.location}</p>
                </button>
              </CardContent>
            </Card>

            {/* Business Card */}
            <Card variant="glass" className="backdrop-blur-md border-border/50 hover:shadow-hover transition-all duration-300">
              <CardContent className="py-4 px-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-2 font-medium">{text.hostedBy}</p>
                <Link
                  to={`/business/${event.businesses.id}`}
                  state={{
                    analyticsTracked: true,
                    analyticsSource: 'event',
                    from: fromPath
                  }}
                  onClick={() => {
                    trackEngagement(event.businesses.id, 'profile_click', 'business', event.businesses.id, {
                      source: 'event_host_link'
                    });
                  }}
                  className="flex items-center gap-3 hover:bg-accent/50 p-2 -mx-2 rounded-xl transition-colors">
                  
                  <Avatar className="h-10 w-10 border border-border/50 ring-1 ring-primary/10">
                    <AvatarImage src={event.businesses.logo_url || ''} />
                    <AvatarFallback>
                      <Building2 className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{event.businesses.name}</p>
                      {event.businesses.verified &&
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      }
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {translateCity(event.businesses.city, language)}
                    </p>
                  </div>
                </Link>
              </CardContent>
            </Card>

            {/* Share Button */}
            <RippleButton
              variant="outline"
              className="w-full gap-2"
              onClick={handleShare}>
              
              <Share2 className="h-4 w-4" />
              {text.share}
            </RippleButton>
            
            {/* Terms & Conditions (desktop) */}
            {event.terms_and_conditions &&
            <p className="text-[10px] sm:text-xs text-muted-foreground/70 leading-tight">
                <span className="font-medium">{language === 'el' ? 'Όροι:' : 'Terms:'}</span> {event.terms_and_conditions}
              </p>
            }
          </motion.div>
        </div>
      </div>

      <Footer />

      {/* Reservation Dialog */}
      {user &&
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
        }} />

      }

      {/* Reservation Event Checkout Dialog */}
      {user && (event.event_type === 'reservation' || event.event_type === 'ticket_and_reservation') &&
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
        }} />

      }

      {/* Kaliva Ticket + Reservation Flow */}
      {user && hasNativeTickets && isBusinessTicketLinked && event.event_type === 'ticket_and_reservation' &&
      <KalivaTicketReservationFlow
        open={showKalivaFlow}
        onOpenChange={setShowKalivaFlow}
        eventId={event.id}
        eventTitle={event.title}
        ticketTiers={reservationFlowTicketTiers}
        onSuccess={(orderId, isFree) => {
          setShowKalivaFlow(false);
          if (isFree) {
            toast.success(language === 'el' ? 'Τα εισιτήριά σας είναι έτοιμα!' : 'Your tickets are ready!');
          }
        }} />

      }

      {/* Ticket Purchase Flow */}
      {user && hasNativeTickets &&
      <TicketPurchaseFlow
        open={showTicketFlow}
        onOpenChange={setShowTicketFlow}
        eventId={event.id}
        eventTitle={event.title}
        ticketTiers={walkInTicketTiers}
        showInstances={showInstances.length > 0 ? showInstances : undefined}
        onSuccess={(orderId, isFree) => {
          setShowTicketFlow(false);
          if (isFree) {
            toast.success(language === 'el' ? 'Τα εισιτήριά σας είναι έτοιμα!' : 'Your tickets are ready!');
          }
        }} />

      }

      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        event={event}
        language={language} />
      
    </div>);

}