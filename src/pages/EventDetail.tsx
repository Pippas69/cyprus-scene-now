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
  Users,
  Share2,
  Building2,
  ArrowLeft,
  CheckCircle,
  Ticket,
  PartyPopper,
  Heart } from
'lucide-react';
import { cn } from '@/lib/utils';
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

  // Smart back: if user came from within the app, go back; otherwise go to /ekdiloseis
  const goBack = () => {
    if (window.history.length > 1 && document.referrer && document.referrer.includes(window.location.host)) {
      navigate(-1);
    } else {
      navigate('/ekdiloseis');
    }
  };

  // Open maps URL safely — uses <a> link approach to avoid in-app browser blank page issues
  const openMapsLink = (locationText: string) => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText)}`;
    // Use a temporary <a> element with rel="noopener" for better in-app browser compatibility
    const a = document.createElement('a');
    a.href = mapsUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
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
  const [lowestMinChargeCents, setLowestMinChargeCents] = useState<number | null>(null);

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
    // Run auth check and event fetch IN PARALLEL — they are independent
    const init = async () => {
      const authPromise = checkUser();
      if (eventId) {
        const eventPromise = fetchEventDetails();
        const src = new URLSearchParams(location.search).get('src');
        const analyticsTracked = location.state?.analyticsTracked === true;
        if (src !== 'dashboard_user' && !analyticsTracked) {
          trackEventView(eventId, 'direct');
        }
        await Promise.all([authPromise, eventPromise]);
      } else {
        await authPromise;
      }
    };
    init();
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

  // Fetch lowest min charge for hybrid & reservation-only events (for "Από €X" price badge)
  useEffect(() => {
    if (!eventId || !event || (event.event_type !== 'ticket_and_reservation' && event.event_type !== 'reservation')) return;
    (async () => {
      const { data: seatingTypes } = await supabase
        .from('reservation_seating_types')
        .select('id')
        .eq('event_id', eventId)
        .eq('paused', false);
      if (!seatingTypes || seatingTypes.length === 0) return;
      const { data: tiers } = await supabase
        .from('seating_type_tiers')
        .select('prepaid_min_charge_cents')
        .in('seating_type_id', seatingTypes.map(s => s.id));
      if (!tiers || tiers.length === 0) return;
      const lowest = Math.min(...tiers.map(t => t.prepaid_min_charge_cents).filter(v => v > 0));
      if (isFinite(lowest)) setLowestMinChargeCents(lowest);
    })();
  }, [eventId, event?.event_type]);

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
      // STEP 1: Fetch the event — this is the ONLY blocking query
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
            category,
            ticket_reservation_linked
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
            .limit(1)
        ]);

        const hasAccess =
          (ticketOrderRes.data?.length || 0) > 0 || (reservationRes.data?.length || 0) > 0;

        if (!hasAccess) {
          setError(language === "el" ? "Η εκδήλωση δεν βρέθηκε" : "Event not found");
          setLoading(false);
          return;
        }
      }

      // STEP 2: Show the event IMMEDIATELY — no more waiting
      setEvent(eventData);
      setLoading(false);

      // STEP 3: Load ALL secondary data in PARALLEL (non-blocking)
      const eventDataLinked = !!(eventData as any).businesses?.ticket_reservation_linked || isClubOrEventBusiness((eventData as any).businesses?.category || []);

      const performanceCategories = ['theatre', 'music', 'dance', 'kids', 'θέατρο', 'μουσική', 'χορός', 'παιδικά'];
      const bizCategories = (eventData.businesses?.category || []).map((c: string) => c.toLowerCase());
      const isPerformance = bizCategories.some((c: string) => performanceCategories.includes(c));

      // Fire all secondary queries at once
      const secondaryPromises: Promise<void>[] = [];

      // RSVP counts
      secondaryPromises.push(refreshCounts(eventId));

      // Reservation sold-out check
      secondaryPromises.push(refreshReservationSoldOut(eventId, eventDataLinked, eventData.event_type));

      // Show instances + cast (for performance events)
      if (isPerformance) {
        secondaryPromises.push((async () => {
          const { data: shows } = await supabase
            .from('show_instances')
            .select('id, start_at, end_at, venue_id, doors_open_at, notes, status, production_id')
            .eq('event_id', eventId)
            .eq('status', 'scheduled')
            .order('start_at', { ascending: true });
          setShowInstances(shows || []);

          const productionId = shows?.[0]?.production_id;
          if (productionId) {
            const { data: cast } = await supabase
              .from('production_cast')
              .select('id, person_name, role_type, role_name, bio, photo_url, sort_order')
              .eq('production_id', productionId)
              .order('sort_order', { ascending: true });
            setCastMembers(cast || []);
          }
        })());
      }

      // Similar events
      secondaryPromises.push((async () => {
        // Use the user from checkUser() — avoid redundant auth.getUser() call
        const currentUserId = user?.id || null;

        const { data: similar, error: similarError } = await supabase.rpc('get_similar_events', {
          p_event_id: eventId,
          p_user_id: currentUserId,
          p_limit: 2
        });

        if (similarError) {
          console.error('Error fetching similar events:', similarError);
          setSimilarEvents([]);
          return;
        }

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
          const { data: vis } = await supabase
            .from('events')
            .select('id, appearance_start_at')
            .in('id', ids);

          const pausedIds = new Set((vis || []).filter((e: any) => isEventPaused(e)).map((e: any) => e.id));
          setSimilarEvents(transformedSimilar.filter((e: any) => !pausedIds.has(e.id)));
        } else {
          setSimilarEvents([]);
        }
      })());

      // Wait for all secondary data (UI already visible)
      await Promise.allSettled(secondaryPromises);

    } catch (err: any) {
      console.error("Event details error:", err);
      setError(err.message || "Failed to load event details");
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
        <div className="hidden lg:block"><Navbar /></div>
        <div className="container mx-auto px-4 py-8 pt-4 lg:pt-24">
          <RippleButton
            variant="ghost"
            onClick={goBack}
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
      {/* Navbar hidden on mobile for immersive event view, shown on desktop */}
      <div className="hidden lg:block">
        <Navbar />
      </div>
      
      <div className="container mx-auto px-4 py-4 lg:py-8 pt-2 lg:pt-24">
        {/* Back button — above image on mobile, inline on desktop */}
        <button
          onClick={goBack}
          className="lg:hidden mb-3 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center border border-border/50 hover:bg-card transition-colors relative z-10">
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
        <RippleButton
          variant="ghost"
          onClick={goBack}
          className="mb-4 gap-2 relative z-20 hidden lg:inline-flex">
          <ArrowLeft className="h-4 w-4" />
          {text.backToEvents}
        </RippleButton>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Hero Image — premium style with title + price overlaid */}
            <motion.div
              className="relative rounded-2xl shadow-lg overflow-hidden sm:mx-0 lg:rounded-xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}>
              
              <div className="aspect-[3/2]">
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

              {/* RSVP — top right on image */}
              <div className="absolute top-3 right-3 sm:right-4 flex items-center gap-3 z-10">
                <button
                  onClick={() => handleRSVP('interested')}
                  disabled={rsvpLoading}
                  className="flex items-center gap-1 group transition-colors">
                  <Heart className={cn("h-4 w-4 sm:h-5 sm:w-5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] transition-colors", isInterested ? "fill-white text-white" : "text-white/80 group-hover:text-white")} />
                  <span className="text-white text-xs sm:text-sm font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{interestedCount}</span>
                </button>
                <button
                  onClick={() => handleRSVP('going')}
                  disabled={rsvpLoading}
                  className="flex items-center gap-1 group transition-colors">
                  <Users className={cn("h-4 w-4 sm:h-5 sm:w-5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] transition-colors", isGoing ? "fill-white text-white" : "text-white/80 group-hover:text-white")} />
                  <span className="text-white text-xs sm:text-sm font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{goingCount}</span>
                </button>
              </div>

              {/* Title + Price at bottom of image */}
              <div className="absolute bottom-0 left-0 right-0 p-4 pb-3 sm:p-5 flex items-end justify-between gap-3">
                <h1 className="text-white text-sm sm:text-lg lg:text-xl font-bold leading-tight line-clamp-2 flex-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{event.title}</h1>
                {(isLinkedHybridEvent || eventType === 'reservation') && lowestMinChargeCents ? (
                  <span className="shrink-0 text-white text-sm sm:text-lg lg:text-xl font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    {language === 'el' ? 'Από' : 'From'} {formatPrice(lowestMinChargeCents)}
                  </span>
                ) : eventHasTickets && startingPriceCents !== null && !isLinkedHybridEvent ? (
                  <span className="shrink-0 text-white text-sm sm:text-lg lg:text-xl font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    {formatPrice(startingPriceCents)}
                    {event?.pay_at_door && eventType === 'ticket' && (
                      <span className="font-normal text-[10px] sm:text-sm"> ({language === 'el' ? 'πληρωμή στην είσοδο' : 'pay at door'})</span>
                    )}
                  </span>
                ) : null}
              </div>
            </motion.div>

            {/* Description (if any) */}
            {event.description &&
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">
                {event.description}
              </p>
            }

            {/* Date / Time / Location — premium info card (mobile/tablet only, desktop has sidebar) */}
            <Card variant="glass" className="backdrop-blur-md border-border/50 lg:hidden">
              <CardContent className="py-4 px-4 space-y-3">
                {showInstances.length > 1 ?
                <div className="flex items-start gap-3 font-thin text-sm">
                    <Calendar className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      {showInstances.map((si: any) =>
                    <p key={si.id} className="text-sm text-foreground font-medium">
                          {format(new Date(si.start_at), 'EEE d MMM, HH:mm', { locale: language === 'el' ? el : enUS })}
                        </p>
                    )}
                    </div>
                  </div> :
                <div className="flex items-start gap-3 font-thin text-sm">
                    <Calendar className="h-4 w-4 text-foreground shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {format(new Date(event.start_at), 'EEEE, d MMMM yyyy', { locale: language === 'el' ? el : enUS })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(event.start_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                }

                <Separator className="opacity-30" />

                <button
                  onClick={() => openMapsLink(event.location)}
                  className="flex items-center gap-3 w-full text-left group">
                  <MapPin className="h-4 w-4 text-foreground shrink-0 group-hover:text-foreground/80 transition-colors" />
                  <span className="text-sm font-medium text-foreground group-hover:text-foreground/80 transition-colors">{event.location}</span>
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
              {eventHasTickets && hasNativeTickets && !(isBusinessTicketLinked && event.event_type === 'ticket_and_reservation') &&
              <Card variant="glass" className="backdrop-blur-md border-border/50 cursor-pointer transition-all" onClick={() => setShowTicketFlow(true)}>
                <CardContent className="py-3 px-4 flex items-center justify-start gap-2">
                  <Ticket className="h-4 w-4 text-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground">{text.buyTickets}</span>
                </CardContent>
              </Card>
              }

              {/* Kaliva flow */}
              {hasNativeTickets && isBusinessTicketLinked && event.event_type === 'ticket_and_reservation' &&
              <div className="w-full space-y-1">
                  {kalivaFullySoldOut ?
                <div className="w-full h-9 text-sm rounded-md flex items-center justify-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive cursor-default">
                      <Ticket className="h-3.5 w-3.5" />
                      <span className="font-medium">{language === 'el' ? 'Εξαντλήθηκε' : 'Sold out'}</span>
                    </div> :
                reservationsSoldOut ?
                <>
                      <div className="w-full h-9 text-sm rounded-md flex items-center justify-start gap-2 bg-muted/60 border border-border text-muted-foreground cursor-default">
                        <Ticket className="h-3.5 w-3.5" />
                        <span>{language === 'el' ? 'Κράτηση Θέσης' : 'Book a Seat'}</span>
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
                      <Card variant="glass" className="backdrop-blur-md border-border/50 cursor-pointer transition-all" onClick={() => setShowKalivaFlow(true)}>
                        <CardContent className="py-3 px-4 flex items-center justify-start gap-2">
                          <Ticket className="h-4 w-4 text-foreground shrink-0" />
                          <span className="text-sm font-medium text-foreground">{language === 'el' ? 'Κράτηση Θέσης' : 'Book a Seat'}</span>
                        </CardContent>
                      </Card>
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

              {eventHasReservation && event.event_type === 'reservation' &&
              <>
              <Card variant="glass" className="backdrop-blur-md border-border/50 cursor-pointer transition-all" onClick={() => setShowReservationCheckout(true)}>
                <CardContent className="py-3 px-4 flex items-center justify-start gap-2">
                  <Calendar className="h-4 w-4 text-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground">{text.makeReservation}</span>
                </CardContent>
              </Card>
              {hasNativeTickets && !allTicketsSoldOut &&
                <button
                  type="button"
                  className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                  onClick={() => setShowTicketFlow(true)}>
                  {language === 'el' ? 'Walk in με εισιτήριο' : 'Walk in with ticket'}
                </button>
              }
              </>
              }

              {eventHasReservation && event.event_type === 'ticket_and_reservation' && !isBusinessTicketLinked &&
              <Card variant="glass" className="backdrop-blur-md border-border/50 cursor-pointer transition-all" onClick={() => setShowReservationCheckout(true)}>
                <CardContent className="py-3 px-4 flex items-center justify-start gap-2">
                  <Calendar className="h-4 w-4 text-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground">{text.makeReservation}</span>
                </CardContent>
              </Card>
              }

              {event.accepts_reservations && event.event_type !== 'reservation' && event.event_type !== 'ticket_and_reservation' &&
              <Card variant="glass" className="backdrop-blur-md border-border/50 cursor-pointer transition-all" onClick={() => setShowReservationDialog(true)}>
                <CardContent className="py-3 px-4 flex items-center justify-start gap-2">
                  <Calendar className="h-4 w-4 text-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground">{text.makeReservation}</span>
                </CardContent>
              </Card>
              }

              {/* Business Card — Mobile */}
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
                className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/60 backdrop-blur-md transition-all duration-200 group">
                
                <Avatar className="h-10 w-10 ring-2 ring-primary/20 transition-all">
                  <AvatarImage src={event.businesses.logo_url || ''} />
                  <AvatarFallback className="bg-muted">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] tracking-wider text-muted-foreground/60 font-medium">{text.hostedBy}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="font-semibold text-sm truncate">{event.businesses.name}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {translateCity(event.businesses.city, language)}
                  </p>
                </div>
              </Link>

              {/* Share Button */}
              <Card variant="glass" className="backdrop-blur-md border-border/50 cursor-pointer transition-all" onClick={handleShare}>
                <CardContent className="py-3 px-4 flex items-center justify-start gap-2">
                  <Share2 className="h-4 w-4 text-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground">{text.share}</span>
                </CardContent>
              </Card>
              
              {/* Terms & Conditions */}
              {event.terms_and_conditions &&
              <p className="text-[10px] sm:text-xs text-muted-foreground/70 leading-tight">
                  <span className="font-medium">{language === 'el' ? 'Όροι:' : 'Terms:'}</span> {event.terms_and_conditions}
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

            {/* Event Details Card - Date & Location (FIRST in sidebar) */}
            <Card variant="glass" className="backdrop-blur-md border-border/50">
              <CardContent className="py-4 px-4 space-y-3">
                <div className="flex items-start gap-3 font-thin text-sm">
                  <Calendar className="h-4 w-4 text-foreground shrink-0 mt-1" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {format(new Date(event.start_at), 'EEEE, d MMMM yyyy', { locale: language === 'el' ? el : enUS })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(event.start_at), 'HH:mm')}
                    </p>
                  </div>
                </div>

                <Separator className="opacity-30" />

                <button
                  onClick={() => openMapsLink(event.location)}
                  className="flex items-center gap-3 w-full text-left group">
                  <MapPin className="h-4 w-4 text-foreground shrink-0 group-hover:text-foreground/80 transition-colors" />
                  <p className="text-sm font-medium text-foreground group-hover:text-foreground/80 transition-colors">{event.location}</p>
                </button>
              </CardContent>
            </Card>

            {/* Business Card — Desktop (before tickets) */}
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
              className="flex items-center gap-3.5 p-3 rounded-xl border border-border/50 bg-card/60 backdrop-blur-md transition-all duration-200 group">
              
              <Avatar className="h-11 w-11 ring-2 ring-primary/20 transition-all">
                <AvatarImage src={event.businesses.logo_url || ''} />
                <AvatarFallback className="bg-muted">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] tracking-wider text-muted-foreground/60 font-medium">{text.hostedBy}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="font-semibold text-sm truncate">{event.businesses.name}</p>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                  {translateCity(event.businesses.city, language)}
                </p>
              </div>
            </Link>

            {/* Tickets/Reservations */}
            {eventHasTickets && hasNativeTickets && !(isBusinessTicketLinked && event.event_type === 'ticket_and_reservation') &&
            <Card variant="glass" className="backdrop-blur-md border-border/50 cursor-pointer transition-all" onClick={() => setShowTicketFlow(true)}>
              <CardContent className="py-3 px-4 flex items-center justify-start gap-2">
                <Ticket className="h-4 w-4 text-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground">{text.buyTickets}</span>
              </CardContent>
            </Card>
            }

            {/* Kaliva flow */}
            {hasNativeTickets && isBusinessTicketLinked && event.event_type === 'ticket_and_reservation' &&
            <div className="w-full space-y-1">
                {kalivaFullySoldOut ?
              <div className="w-full h-10 rounded-md flex items-center justify-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive cursor-default">
                    <Ticket className="h-4 w-4" />
                    <span className="font-medium">{language === 'el' ? 'Εξαντλήθηκε' : 'Sold out'}</span>
                  </div> :
              reservationsSoldOut ?
              <>
                    <div className="w-full h-10 rounded-md flex items-center justify-start gap-2 bg-muted/60 border border-border text-muted-foreground cursor-default">
                      <Ticket className="h-4 w-4" />
                      <span>{language === 'el' ? 'Κράτηση Θέσης' : 'Book a Seat'}</span>
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
                    <Card variant="glass" className="backdrop-blur-md border-border/50 cursor-pointer transition-all" onClick={() => setShowKalivaFlow(true)}>
                      <CardContent className="py-3 px-4 flex items-center justify-start gap-2">
                        <Ticket className="h-4 w-4 text-foreground shrink-0" />
                        <span className="text-sm font-medium text-foreground">{language === 'el' ? 'Κράτηση Θέσης' : 'Book a Seat'}</span>
                      </CardContent>
                    </Card>
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

            {eventHasReservation && event.event_type === 'reservation' &&
            <>
            <Card variant="glass" className="backdrop-blur-md border-border/50 cursor-pointer transition-all" onClick={() => setShowReservationCheckout(true)}>
              <CardContent className="py-3 px-4 flex items-center justify-start gap-2">
                <Calendar className="h-4 w-4 text-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground">{text.makeReservation}</span>
              </CardContent>
            </Card>
            {hasNativeTickets && !allTicketsSoldOut &&
              <button
                type="button"
                className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                onClick={() => setShowTicketFlow(true)}>
                {language === 'el' ? 'Walk in με εισιτήριο' : 'Walk in with ticket'}
              </button>
            }
            </>
            }

            {eventHasReservation && event.event_type === 'ticket_and_reservation' && !isBusinessTicketLinked &&
            <Card variant="glass" className="backdrop-blur-md border-border/50 cursor-pointer transition-all" onClick={() => setShowReservationCheckout(true)}>
              <CardContent className="py-3 px-4 flex items-center justify-start gap-2">
                <Calendar className="h-4 w-4 text-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground">{text.makeReservation}</span>
              </CardContent>
            </Card>
            }

            {event.accepts_reservations && event.event_type !== 'reservation' && event.event_type !== 'ticket_and_reservation' &&
            <Card variant="glass" className="backdrop-blur-md border-border/50 cursor-pointer transition-all" onClick={() => setShowReservationDialog(true)}>
              <CardContent className="py-3 px-4 flex items-center justify-start gap-2">
                <Calendar className="h-4 w-4 text-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground">{text.makeReservation}</span>
              </CardContent>
            </Card>
            }

            {/* Share Button */}
            <Card variant="glass" className="backdrop-blur-md border-border/50 cursor-pointer transition-all" onClick={handleShare}>
              <CardContent className="py-3 px-4 flex items-center justify-start gap-2">
                <Share2 className="h-4 w-4 text-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground">{text.share}</span>
              </CardContent>
            </Card>
            
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
      <ReservationDialog
        eventId={event.id}
        eventTitle={event.title}
        eventStartAt={event.start_at}
        seatingOptions={event.seating_options || []}
        language={language}
        userId={user?.id}
        open={showReservationDialog}
        onOpenChange={setShowReservationDialog}
        onSuccess={() => {
          setShowReservationDialog(false);
          toast.success(language === 'el' ? 'Η κράτησή σας υποβλήθηκε!' : 'Reservation submitted!');
        }} />

      {/* Reservation Event Checkout Dialog */}
      {(event.event_type === 'reservation' || event.event_type === 'ticket_and_reservation') &&
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
        userId={user?.id}
        language={language}
        businessId={event.businesses?.id}
        onSuccess={() => {
          setShowReservationCheckout(false);
          toast.success(language === 'el' ? 'Η κράτησή σας ολοκληρώθηκε!' : 'Reservation completed!');
        }} />
      }

      {/* Kaliva Ticket + Reservation Flow */}
      {hasNativeTickets && isBusinessTicketLinked && event.event_type === 'ticket_and_reservation' &&
      <KalivaTicketReservationFlow
        open={showKalivaFlow}
        onOpenChange={setShowKalivaFlow}
        eventId={event.id}
        eventTitle={event.title}
        ticketTiers={reservationFlowTicketTiers}
        businessId={event.businesses?.id}
        onSuccess={(orderId, isFree) => {
          setShowKalivaFlow(false);
          if (isFree) {
            toast.success(language === 'el' ? 'Τα εισιτήριά σας είναι έτοιμα!' : 'Your tickets are ready!');
          }
        }} />
      }

      {/* Ticket Purchase Flow */}
      {hasNativeTickets &&
      <TicketPurchaseFlow
        open={showTicketFlow}
        onOpenChange={setShowTicketFlow}
        eventId={event.id}
        eventTitle={event.title}
        ticketTiers={walkInTicketTiers}
        showInstances={showInstances.length > 0 ? showInstances : undefined}
        businessId={event.businesses?.id}
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