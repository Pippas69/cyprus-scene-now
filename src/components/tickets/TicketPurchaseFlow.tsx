import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from "@tanstack/react-query";
import { format } from 'date-fns';
import { el as elLocale, enUS } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { CollapsibleSpecialRequests } from "@/components/ui/CollapsibleSpecialRequests";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Ticket, Minus, Plus, Loader2, CreditCard,
  ArrowRight, ArrowLeft, ExternalLink, Users, Calendar, MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { SeatSelectionStep } from "@/components/theatre/SeatSelectionStep";
import { FullscreenSeatSelector } from "@/components/theatre/FullscreenSeatSelector";
import type { SelectedSeat } from "@/components/theatre/SeatMapViewer";
import { InlineAuthGate } from "./InlineAuthGate";
import { ProfileCompletionGate } from "./ProfileCompletionGate";
import { isValidPhone } from "@/lib/phoneValidation";
import { useProfileName } from "@/hooks/useProfileName";

import { getMinAge } from "@/lib/ageRestrictions";
import { useEventPricingProfile } from "@/hooks/useEventPricingProfile";
import { SuccessQRCard } from "@/components/ui/SuccessQRCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TicketTier {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  prepaid_amount_cents?: number | null;
  currency: string;
  quantity_total: number;
  quantity_sold: number;
  max_per_order: number;
}

interface ShowInstanceOption {
  id: string;
  start_at: string;
  end_at: string;
  venue_id: string;
  doors_open_at?: string | null;
  notes?: string | null;
  status: string;
}

interface ZonePricing {
  venue_zone_id: string;
  zone_name: string;
  price_cents: number;
  ticket_tier_id: string | null;
}

interface TicketPurchaseFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  ticketTiers: TicketTier[];
  onSuccess?: (orderId: string, isFree: boolean) => void;
  venueId?: string;
  showInstanceId?: string;
  eventDate?: string;
  showInstances?: ShowInstanceOption[];
  businessId?: string;
  /** Φάση 4 — when present, server overrides customerName/customerPhone from DB. */
  pendingBookingToken?: string | null;
  /** Φάση 4 — locked customer data from SMS link: name + phone are read-only,
   *  ticket count is pre-filled but editable. Allows guest checkout (no auth). */
  lockedCustomerData?: {
    customerName: string;
    customerPhone: string;
    partySize: number | null;
  } | null;
}

const translations = {
  el: {
    title: "Εισιτήρια",
    steps: {
      showSelect: "Επιλογή Παράστασης",
      seats: "Επιλογή Θέσεων",
      tickets: "Επιλογή Εισιτηρίων",
      auth: "Σύνδεση",
      profile: "Στοιχεία Προφίλ",
      guests: "Ονόματα Καλεσμένων",
      checkout: "Σύνοψη",
    },
    available: "διαθέσιμα",
    soldOut: "Εξαντλήθηκαν",
    free: "Δωρεάν",
    guestDetails: "Ονόματα Καλεσμένων",
    guestN: "Άτομο",
    name: "Όνομα",
    age: "Ηλικία",
    email: "Email",
    phone: "Τηλέφωνο",
    people: "άτομα",
    total: "Σύνολο",
    pay: "Πληρωμή",
    getTickets: "Λήψη Εισιτηρίων",
    back: "Πίσω",
    next: "Επόμενο",
    processing: "Επεξεργασία...",
    noTicketsSelected: "Επιλέξτε τουλάχιστον ένα εισιτήριο",
    loginRequired: "Πρέπει να συνδεθείτε",
    fillAllNames: "Συμπληρώστε όνομα και ηλικία για όλους τους καλεσμένους",
    fillPhone: "Συμπληρώστε τηλέφωνο",
    fillEmail: "Συμπληρώστε email",
    eachPersonGetsQR: "Κάθε άτομο θα λάβει ξεχωριστό QR code εισιτηρίου",
    redirecting: "Μεταφορά στην πληρωμή...",
    redirectFallback: "Αν η σελίδα δεν άνοιξε αυτόματα, πατήστε το κουμπί παραπάνω.",
    continuePayment: "Συνέχεια στην Πληρωμή",
    cancel: "Ακύρωση",
    summary: "Σύνοψη",
    ticketCost: "Κόστος εισιτηρίων",
    ticketEntryFee: "Τιμή εισόδου",
    ticketTableCredit: "Πίστωση τραπεζιού",
    processingFee: "Έξοδα επεξεργασίας",
    serviceFee: "Χρέωση υπηρεσίας",
    accountContact: "Στοιχεία λογαριασμού",
    autoFromAccount: "Αυτόματα από τον λογαριασμό σας",
    selectedSeats: "Επιλεγμένες θέσεις",
    row: "Σειρά",
    seat: "Θέση",
    zone: "Ζώνη",
    specialRequests: "Ειδικά αιτήματα",
    optional: "προαιρετικό",
    termsLabel: "Αποδέχομαι τους",
    termsLink: "Όρους Χρήσης",
    andThe: "και την",
    privacyLink: "Πολιτική Απορρήτου",
    termsRequired: "Πρέπει να αποδεχτείτε τους όρους χρήσης",
  },
  en: {
    title: "Tickets",
    steps: {
      showSelect: "Select Show",
      seats: "Select Seats",
      tickets: "Select Tickets",
      auth: "Sign In",
      profile: "Profile Details",
      guests: "Guest Names",
      checkout: "Summary",
    },
    available: "available",
    soldOut: "Sold Out",
    free: "Free",
    guestDetails: "Guest Names",
    guestN: "Person",
    name: "Name",
    age: "Age",
    email: "Email",
    phone: "Phone",
    people: "people",
    total: "Total",
    pay: "Pay",
    getTickets: "Get Tickets",
    back: "Back",
    next: "Next",
    processing: "Processing...",
    noTicketsSelected: "Please select at least one ticket",
    loginRequired: "You must be logged in",
    fillAllNames: "Please fill in name and age for all guests",
    fillPhone: "Please fill in phone number",
    fillEmail: "Please fill in email",
    eachPersonGetsQR: "Each person will receive their own QR code ticket",
    redirecting: "Opening payment...",
    redirectFallback: "If the page didn't open automatically, tap the button above.",
    continuePayment: "Continue to Payment",
    cancel: "Cancel",
    summary: "Summary",
    ticketCost: "Ticket cost",
    ticketEntryFee: "Entry fee",
    ticketTableCredit: "Table credit",
    processingFee: "Processing fee",
    serviceFee: "Service fee",
    accountContact: "Account details",
    autoFromAccount: "Auto-filled from your account",
    selectedSeats: "Selected seats",
    row: "Row",
    seat: "Seat",
    zone: "Zone",
    specialRequests: "Special requests",
    optional: "optional",
    termsLabel: "I accept the",
    termsLink: "Terms of Service",
    andThe: "and the",
    privacyLink: "Privacy Policy",
    termsRequired: "You must accept the terms of service",
  },
};

export const TicketPurchaseFlow: React.FC<TicketPurchaseFlowProps> = ({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  ticketTiers,
  onSuccess,
  venueId: propVenueId,
  showInstanceId: propShowInstanceId,
  eventDate,
  showInstances,
  businessId,
  pendingBookingToken,
  lockedCustomerData,
}) => {
  const hasLockedCustomer = !!(
    lockedCustomerData && (lockedCustomerData.customerName || lockedCustomerData.customerPhone)
  );
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const { data: pricingDisplay } = useEventPricingProfile(businessId);
  const t = translations[language];
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Show selection state (for multi-show performance events)
  const hasMultipleShows = !!(showInstances && showInstances.length > 0);
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);

  // Derive venueId/showInstanceId from selected show or props
  const selectedShow = hasMultipleShows ? showInstances?.find(s => s.id === selectedShowId) : null;
  const venueId = selectedShow?.venue_id || propVenueId;
  const showInstanceId = selectedShow?.id || propShowInstanceId;

  // Whether this is a seated performance event
  const hasSeating = !!(venueId && showInstanceId);

  // Zone pricing for seated events
  const [zonePricing, setZonePricing] = useState<ZonePricing[]>([]);
  const [zonePricingLoaded, setZonePricingLoaded] = useState(false);

  // Seat selection state
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);

  // State
  const [submitting, setSubmitting] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [guestAges, setGuestAges] = useState<string[]>([]);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [buyerProfile, setBuyerProfile] = useState<{ firstName: string; lastName: string; phone: string; city: string } | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [buyerFullName, setBuyerFullName] = useState('');
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [isFreshSignup, setIsFreshSignup] = useState(false);
  const [wasAuthenticatedOnMount, setWasAuthenticatedOnMount] = useState(false);
  const [isPayAtDoor, setIsPayAtDoor] = useState(false);
  const [ticketSuccessData, setTicketSuccessData] = useState<{
    orderId: string;
    tickets: { guest_name: string; qr_code_token: string }[];
  } | null>(null);
  const [ticketSuccessIndex, setTicketSuccessIndex] = useState(0);
  const [eventMinimumAge, setEventMinimumAge] = useState<number | null>(null);

  // Fetch event minimum_age
  useEffect(() => {
    supabase.from('events').select('minimum_age').eq('id', eventId).single().then(({ data }) => {
      setEventMinimumAge(data?.minimum_age ?? null);
    });
  }, [eventId]);

  // Fallback: for returning users who skip profile step
  const profileName = useProfileName(authUserId);

  // Check auth on mount and listen for changes
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsAuthenticated(!!data.user);
      setAuthUserId(data.user?.id ?? null);
      setWasAuthenticatedOnMount(!!data.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session?.user);
      setAuthUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch pay_at_door flag
  useEffect(() => {
    if (!eventId) return;
    supabase
      .from('events')
      .select('pay_at_door')
      .eq('id', eventId)
      .single()
      .then(({ data }) => {
        if (data) setIsPayAtDoor(data.pay_at_door === true);
      });
  }, [eventId]);

  // Apply profileName as fallback for returning users
  useEffect(() => {
    if (profileName && !buyerFullName) {
      setBuyerFullName(profileName);
    }
  }, [profileName, buyerFullName]);
  

  // Checkout state
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  // Fetch zone pricing when show instance is selected
  useEffect(() => {
    if (!showInstanceId || !hasSeating) {
      setZonePricing([]);
      setZonePricingLoaded(false);
      return;
    }
    const fetchPricing = async () => {
      const { data } = await supabase
        .from('show_zone_pricing')
        .select('venue_zone_id, price_cents, ticket_tier_id')
        .eq('show_instance_id', showInstanceId);

      if (data && data.length > 0) {
        // Also fetch zone names
        const zoneIds = [...new Set(data.map(d => d.venue_zone_id))];
        const { data: zones } = await supabase
          .from('venue_zones')
          .select('id, name')
          .in('id', zoneIds);

        const zoneNameMap = new Map((zones || []).map(z => [z.id, z.name]));
        setZonePricing(data.map(d => ({
          venue_zone_id: d.venue_zone_id,
          zone_name: zoneNameMap.get(d.venue_zone_id) || '',
          price_cents: d.price_cents,
          ticket_tier_id: d.ticket_tier_id,
        })));
      } else {
        setZonePricing([]);
      }
      setZonePricingLoaded(true);
    };
    fetchPricing();
  }, [showInstanceId, hasSeating]);

  // For seated events with zone pricing, we skip the ticket tier step
  const isSeatedWithPricing = hasSeating && zonePricingLoaded && zonePricing.length > 0;

  // Steps differ based on event type
  // Seated with pricing: showSelect? → seats → guests → checkout
  // Seated without pricing: showSelect? → seats → tickets → checkout
  // Non-seated: tickets → checkout

  const getSteps = useCallback(() => {
    const steps: string[] = [];
    if (hasMultipleShows) steps.push('showSelect');
    if (hasSeating) steps.push('seats');
    // Auth-first for ticket-only (non-seated) events — skip when SMS-locked (guest checkout)
    if (!hasSeating && !isAuthenticated && !hasLockedCustomer) steps.push('auth');
    if (!hasSeating && isAuthenticated && !profileComplete && !hasLockedCustomer) steps.push('profile');
    if (!isSeatedWithPricing) steps.push('tickets');
    // Auth after seat selection for seated events
    if (hasSeating && !isAuthenticated && !hasLockedCustomer) steps.push('auth');
    if (hasSeating && isAuthenticated && !profileComplete && !hasLockedCustomer) steps.push('profile');
    // Skip separate guests step for fresh signup non-seated (merged into tickets)
    if (!(isFreshSignup && !hasSeating)) {
      steps.push('guests');
    }
    steps.push('checkout');
    return steps;
  }, [hasMultipleShows, hasSeating, isSeatedWithPricing, isAuthenticated, profileComplete, isFreshSignup, hasLockedCustomer]);

  const steps = getSteps();
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const currentStep = steps[currentStepIdx] || steps[0];

  // Reset step when opening + prefill SMS-locked customer fields
  useEffect(() => {
    if (open) {
      setCurrentStepIdx(0);
      setCheckoutUrl(null);
      setRedirectAttempted(false);
      // SMS link: prefill phone + buyer name. Otherwise reset to empty.
      setCustomerPhone(lockedCustomerData?.customerPhone || '');
      setCustomerEmail('');
      if (lockedCustomerData?.customerName) {
        setBuyerFullName(lockedCustomerData.customerName);
      }
    }
  }, [open, lockedCustomerData?.customerPhone, lockedCustomerData?.customerName]);

  // Scroll to top on step change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStepIdx]);

  // Compute total tickets for seated vs non-seated
  const seatCount = selectedSeats.length;
  const tierTotalTickets = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  const totalTickets = isSeatedWithPricing ? seatCount : tierTotalTickets;

  const isValidCheckoutPhone = (raw: string) => isValidPhone(raw.trim());

  const isValidCheckoutEmail = (raw: string) => /\S+@\S+\.\S+/.test(raw.trim());

  // Sync guest name fields & apply buyer name to slot 0
  useEffect(() => {
    setGuestNames(prev => {
      let updated = [...prev];
      if (updated.length < totalTickets) {
        updated = [...updated, ...Array(totalTickets - updated.length).fill('')];
      } else if (updated.length > totalTickets) {
        updated = updated.slice(0, totalTickets);
      }
      // Apply buyer name to slot 0 if available and empty
      if (updated.length > 0 && !updated[0] && buyerFullName) {
        updated[0] = buyerFullName;
      }
      return updated;
    });
    setGuestAges(prev => {
      if (prev.length === totalTickets) return prev;
      if (prev.length < totalTickets) {
        return [...prev, ...Array(totalTickets - prev.length).fill('')];
      }
      return prev.slice(0, totalTickets);
    });
  }, [totalTickets, buyerFullName]);

  const updateQuantity = (tierId: string, delta: number) => {
    const tier = ticketTiers.find(t => t.id === tierId);
    if (!tier) return;
    const current = quantities[tierId] || 0;
    const newQty = Math.max(0, Math.min(tier.max_per_order, current + delta));
    const available = tier.quantity_total - tier.quantity_sold;
    if (newQty > available) {
      toast.error(language === 'el' ? `Μόνο ${available} διαθέσιμα` : `Only ${available} available`);
      return;
    }
    setQuantities({ ...quantities, [tierId]: newQty });
  };

  const formatPrice = (cents: number) => cents === 0 ? t.free : `€${(cents / 100).toFixed(2)}`;

  // Calculate total based on seat zone pricing or tier pricing
  const calculateTotal = () => {
    if (isSeatedWithPricing) {
      return selectedSeats.reduce((sum, seat) => {
        const zp = zonePricing.find(z => z.venue_zone_id === seat.zoneId);
        return sum + (zp?.price_cents || 0);
      }, 0);
    }
    return ticketTiers.reduce((sum, tier) => {
      const qty = quantities[tier.id] || 0;
      return sum + (tier.price_cents * qty);
    }, 0);
  };

  const subtotal = calculateTotal();
  // Stripe fees: only shown/added to customer total if buyer pays
  const buyerPaysStripe = pricingDisplay?.showProcessingFee !== false;
  const stripeFeesCents = subtotal > 0 && buyerPaysStripe && !isPayAtDoor ? Math.ceil(subtotal * 0.029 + 25) : 0;
  // Platform fixed fee: only shown/added if buyer pays fixed fee (ticket type)
  const buyerPaysPlatformFee = pricingDisplay?.showPlatformFee === true;
  const platformFeeCents = buyerPaysPlatformFee && !isPayAtDoor ? (pricingDisplay?.fixedFeeTicketCents || 0) * totalTickets : 0;
  const total = subtotal + stripeFeesCents + platformFeeCents;
  const isFreeOrder = (subtotal === 0 && totalTickets > 0) || isPayAtDoor;
  const allNamesFilled = guestNames.length > 0 && guestNames.every(n => n.trim().length > 0);
  const minAge = getMinAge(eventId, eventMinimumAge);
  const allAgesFilled = guestAges.length > 0 && guestAges.every(a => a.trim().length > 0 && !isNaN(Number(a)) && Number(a) >= minAge);
  const isContactValid = isValidCheckoutPhone(customerPhone) && isValidCheckoutEmail(customerEmail);
  const allGuestDetailsFilled = allNamesFilled && allAgesFilled && isContactValid;
  const lockFirstGuestName = isAuthenticated && profileComplete && (guestNames[0]?.trim().length ?? 0) > 0;

  // Phone and email are left empty for the user to fill freely

  // Seat toggle handler
  const handleSeatToggle = (seat: SelectedSeat) => {
    setSelectedSeats(prev => {
      const exists = prev.find(s => s.seatId === seat.seatId);
      if (exists) return prev.filter(s => s.seatId !== seat.seatId);
      return [...prev, seat];
    });
  };

  const handleCheckout = async () => {
    if (totalTickets === 0) {
      toast.error(t.noTicketsSelected);
      return;
    }
    if (!allNamesFilled || !allAgesFilled) {
      toast.error(t.fillAllNames);
      return;
    }
    if (!isValidCheckoutPhone(customerPhone)) {
      toast.error(t.fillPhone);
      return;
    }
    if (!isValidCheckoutEmail(customerEmail)) {
      toast.error(t.fillEmail);
      return;
    }
    if (!termsAccepted) {
      toast.error(t.termsRequired);
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t.loginRequired);
        setSubmitting(false);
        return;
      }

      // For seated events with zone pricing, build items from the first matching tier
      let items: { tierId: string; quantity: number }[];
      if (isSeatedWithPricing) {
        // Group seats by zone, use corresponding ticket_tier_id
        const zoneGroups = new Map<string, { tierId: string; count: number; priceCents: number }>();
        for (const seat of selectedSeats) {
          const zp = zonePricing.find(z => z.venue_zone_id === seat.zoneId);
          if (!zp) continue;
          const key = seat.zoneId;
          const existing = zoneGroups.get(key);
          if (existing) {
            existing.count++;
          } else {
            zoneGroups.set(key, {
              tierId: zp.ticket_tier_id || ticketTiers[0]?.id || '',
              count: 1,
              priceCents: zp.price_cents,
            });
          }
        }
        items = Array.from(zoneGroups.values()).map(g => ({
          tierId: g.tierId,
          quantity: g.count,
        }));
      } else {
        items = Object.entries(quantities)
          .filter(([_, qty]) => qty > 0)
          .map(([tierId, quantity]) => ({ tierId, quantity }));
      }

      const body: Record<string, unknown> = {
        eventId,
        items,
        customerName: guestNames[0].trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        specialRequests: specialRequests.trim() || null,
        guests: guestNames.map((name, idx) => ({
          name: name.trim(),
          age: parseInt(guestAges[idx]) || 0,
        })),
      };

      if (pendingBookingToken) {
        body.pendingBookingToken = pendingBookingToken;
      }

      // Include selected seat IDs for seated events so backend can mark them sold
      if (hasSeating && selectedSeats.length > 0) {
        body.seatIds = selectedSeats.map(s => s.seatId);
        body.showInstanceId = showInstanceId;
      }

      // PR Attribution: attach promoter ref if active for this business
      try {
        const { getActivePromoterRef } = await import('@/lib/promoterTracking');
        const pref = getActivePromoterRef();
        if (pref) {
          body.promoterSessionId = pref.session_id;
          body.promoterTrackingCode = pref.tracking_code;
        }
      } catch { /* noop */ }

      const { data, error } = await supabase.functions.invoke('create-ticket-checkout', { body });
      if (error) throw error;

      if (data.isFree) {
        setSubmitting(false);
        toast.success(language === 'el' ? 'Εισιτήρια επιβεβαιώθηκαν!' : 'Tickets confirmed!');
        queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
        queryClient.invalidateQueries({ queryKey: ["my-tickets-events"] });

        // For pay-at-door: show QR codes inline instead of redirecting
        if (isPayAtDoor) {
          try {
            const { data: tickets } = await supabase
              .from('tickets')
              .select('guest_name, qr_code_token')
              .eq('order_id', data.orderId)
              .order('created_at');
            if (tickets && tickets.length > 0) {
              setTicketSuccessData({
                orderId: data.orderId,
                tickets: tickets.map(t2 => ({
                  guest_name: t2.guest_name || '',
                  qr_code_token: t2.qr_code_token,
                })),
              });
              setTicketSuccessIndex(0);
              return;
            }
          } catch (e) {
            console.error('Failed to fetch tickets for success screen', e);
          }
        }

        onSuccess?.(data.orderId, true);
        window.location.href = `/dashboard-user/tickets?success=true&order_id=${data.orderId}`;
      } else {
        setCheckoutUrl(data.url);
        setSubmitting(false);
        window.location.assign(data.url);
        setTimeout(() => setRedirectAttempted(true), 900);
      }
    } catch (error: unknown) {
      console.error('Checkout error:', error);
      let msg = error instanceof Error ? error.message : (language === 'el' ? 'Αποτυχία αγοράς' : 'Purchase failed');
      // Try to extract structured error body from Supabase FunctionsHttpError
      try {
        const ctx = (error as { context?: Response })?.context;
        if (ctx && typeof ctx.json === 'function') {
          const body = await ctx.json();
          if (body?.error === 'MINIMUM_CHARGE_NOT_MET') {
            msg = language === 'el' ? body.message : (body.message_en || body.message);
          } else if (body?.message) {
            msg = language === 'el' ? body.message : (body.message_en || body.message);
          }
        }
      } catch { /* keep default msg */ }
      toast.error(msg);
      setSubmitting(false);
    }
  };

  // ========= RENDER STEPS =========

  const renderTicketsStep = () => {
    const showMergedGuests = isFreshSignup && !hasSeating && tierTotalTickets > 0;
    return (
      <div className="space-y-4">
        {ticketTiers.map((tier) => {
          const available = tier.quantity_total - tier.quantity_sold;
          const isSoldOut = available <= 0;
          const qty = quantities[tier.id] || 0;

          return (
            <div key={tier.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm truncate">{tier.name}</span>
                  {isSoldOut && (
                    <Badge variant="destructive" className="text-[10px] shrink-0">{t.soldOut}</Badge>
                  )}
                </div>
                {tier.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{tier.description}</p>
                )}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-semibold text-primary text-sm">{formatPrice(tier.price_cents)}</span>
                  {isSoldOut ? null : available <= 10 ? (
                    <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                      ({available} {t.available})
                    </span>
                  ) : null}
                </div>
              </div>

              {!isSoldOut && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7"
                    onClick={() => updateQuantity(tier.id, -1)} disabled={qty === 0}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-6 text-center font-medium text-sm">{qty}</span>
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7"
                    onClick={() => updateQuantity(tier.id, 1)} disabled={qty >= tier.max_per_order || qty >= available}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {/* Merged guest names for fresh signup */}
        {showMergedGuests && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {t.guestDetails} ({tierTotalTickets} {t.people})
              </Label>
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {guestNames.map((name, idx) => {
                  const ageVal = guestAges[idx] || '';
                  const ageNum = Number(ageVal);
                  const showAgeError = ageVal.length > 0 && !isNaN(ageNum) && ageNum < minAge;
                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-muted-foreground shrink-0 w-4 text-right">{idx + 1}.</span>
                        <Input
                          placeholder={`${t.guestN} ${idx + 1}`}
                          value={name}
                          readOnly={idx === 0 && lockFirstGuestName}
                          onChange={(e) => {
                            if (idx === 0 && lockFirstGuestName) return;
                            setGuestNames(prev => {
                              const updated = [...prev];
                              updated[idx] = e.target.value;
                              return updated;
                            });
                          }}
                          className={cn("h-8 sm:h-9 text-xs sm:text-sm flex-1", idx === 0 && lockFirstGuestName && "bg-muted cursor-not-allowed")}
                        />
                        <Input
                          placeholder={t.age}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={ageVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d{0,3}$/.test(val)) {
                              setGuestAges(prev => {
                                const updated = [...prev];
                                updated[idx] = val;
                                return updated;
                              });
                            }
                          }}
                          className={cn("h-8 sm:h-9 text-xs sm:text-sm w-16 sm:w-20", showAgeError && "border-destructive focus-visible:ring-destructive")}
                        />
                      </div>
                      {showAgeError && (
                        <p className="text-[10px] text-destructive text-right pr-1">
                          {language === 'el' ? `Ελάχιστο όριο: ${minAge} ετών` : `Minimum age: ${minAge}`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <CollapsibleSpecialRequests
              value={specialRequests}
              onChange={setSpecialRequests}
              label={t.specialRequests}
              optionalLabel={t.optional}
            />
          </>
        )}
      </div>
    );
  };

  const renderGuestsStep = () => {
    // For seated events, also show selected seats summary
    return (
      <div className="space-y-4">
        {/* Seat summary for seated events */}
        {isSeatedWithPricing && selectedSeats.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t.selectedSeats}</Label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {selectedSeats.map((seat) => {
                const zp = zonePricing.find(z => z.venue_zone_id === seat.zoneId);
                return (
                  <div key={seat.seatId} className="flex justify-between text-sm p-2 rounded bg-muted/30 border">
                    <span className="text-muted-foreground">
                      {seat.zoneName} · {t.row} {seat.rowLabel} · {t.seat} {seat.seatNumber}
                    </span>
                    <span className="font-medium">{formatPrice(zp?.price_cents || 0)}</span>
                  </div>
                );
              })}
            </div>
            <Separator />
          </div>
        )}

        {/* Guest names & ages */}
        {totalTickets > 0 && (
          <div className="space-y-2">
          <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {t.guestDetails} ({totalTickets} {t.people})
            </Label>
            
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {guestNames.map((name, idx) => {
                const ageVal = guestAges[idx] || '';
                const ageNum = Number(ageVal);
                const showAgeError = ageVal.length > 0 && !isNaN(ageNum) && ageNum < minAge;
                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-muted-foreground shrink-0 w-4 text-right">{idx + 1}.</span>
                      <Input
                        placeholder={`${t.guestN} ${idx + 1}`}
                        value={name}
                        readOnly={idx === 0 && lockFirstGuestName}
                        onChange={(e) => {
                          if (idx === 0 && lockFirstGuestName) return;
                          setGuestNames(prev => {
                            const updated = [...prev];
                            updated[idx] = e.target.value;
                            return updated;
                          });
                        }}
                        className={cn("h-8 sm:h-9 text-xs sm:text-sm flex-1", idx === 0 && lockFirstGuestName && "bg-muted cursor-not-allowed")}
                      />
                      <Input
                        placeholder={t.age}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={ageVal}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d{0,3}$/.test(val)) {
                            setGuestAges(prev => {
                              const updated = [...prev];
                              updated[idx] = val;
                              return updated;
                            });
                          }
                        }}
                        className={cn("h-8 sm:h-9 text-xs sm:text-sm w-16 sm:w-20", showAgeError && "border-destructive focus-visible:ring-destructive")}
                      />
                    </div>
                    {showAgeError && (
                      <p className="text-[10px] text-destructive text-right pr-1">
                        {language === 'el' ? `Ελάχιστο όριο: ${minAge} ετών` : `Minimum age: ${minAge}`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Phone & Email — show for existing users, hide for fresh signup */}
        {totalTickets > 0 && !isFreshSignup && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <Label htmlFor="ticket-checkout-phone" className="text-xs sm:text-sm">{t.phone}</Label>
              <PhoneInput
                id="ticket-checkout-phone"
                value={customerPhone}
                onChange={setCustomerPhone}
                language={language}
                selectClassName="h-8 sm:h-9 text-xs sm:text-sm"
                inputClassName="h-8 sm:h-9 text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ticket-checkout-email" className="text-xs sm:text-sm">{t.email}</Label>
              <Input
                id="ticket-checkout-email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="example@email.com"
                className="h-8 sm:h-9 text-xs sm:text-sm"
              />
            </div>
            {/* Special Requests */}
            <CollapsibleSpecialRequests
              value={specialRequests}
              onChange={setSpecialRequests}
              label={t.specialRequests}
              optionalLabel={t.optional}
            />
          </>
        )}
        {/* Special Requests when fresh signup (contact auto-filled) */}
        {totalTickets > 0 && isFreshSignup && (
          <CollapsibleSpecialRequests
            value={specialRequests}
            onChange={setSpecialRequests}
            label={t.specialRequests}
            optionalLabel={t.optional}
          />
        )}
      </div>
    );
  };

  const renderCheckoutStep = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm sm:text-base">{t.summary}</h3>

      {/* Ticket/seat summary */}
      <div className="space-y-2 text-sm">
        {isSeatedWithPricing ? (
          (() => {
            const groups = new Map<string, { zoneName: string; count: number; priceCents: number }>();
            selectedSeats.forEach(seat => {
              const zp = zonePricing.find(z => z.venue_zone_id === seat.zoneId);
              const key = seat.zoneId;
              const existing = groups.get(key);
              if (existing) {
                existing.count++;
              } else {
                groups.set(key, { zoneName: seat.zoneName, count: 1, priceCents: zp?.price_cents || 0 });
              }
            });
            return Array.from(groups.values()).map((g, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-muted-foreground">{g.zoneName} × {g.count}</span>
                <span className="font-medium">{formatPrice(g.priceCents * g.count)}</span>
              </div>
            ));
          })()
        ) : (
          ticketTiers.map(tier => {
            const qty = quantities[tier.id] || 0;
            if (qty === 0) return null;
            // Hybrid split: αν το tier έχει prepaid_amount_cents, δείχνουμε breakdown
            const tierPrepaid = tier.prepaid_amount_cents ?? null;
            const hasSplit =
              tierPrepaid != null &&
              tierPrepaid > 0 &&
              tierPrepaid < tier.price_cents;
            const entryPerTicket = hasSplit ? tier.price_cents - (tierPrepaid as number) : 0;
            const creditPerTicket = hasSplit ? (tierPrepaid as number) : 0;
            return (
              <div key={tier.id} className="space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tier.name} × {qty}</span>
                  <span className="font-medium">{formatPrice(tier.price_cents * qty)}</span>
                </div>
                {hasSplit && (
                  <div className="ml-3 space-y-0.5 border-l border-border/60 pl-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">↳ {t.ticketEntryFee} (×{qty})</span>
                      <span className="text-foreground">{formatPrice(entryPerTicket * qty)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">↳ {t.ticketTableCredit} (×{qty})</span>
                      <span className="text-foreground">{formatPrice(creditPerTicket * qty)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Separator />

      {/* Guest list */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{t.guestDetails}</p>
        {guestNames.map((name, i) => (
          <div key={i} className="text-sm flex justify-between">
            <span>{i + 1}. {name}</span>
            <span className="text-muted-foreground">{guestAges[i] || '-'}</span>
          </div>
        ))}
      </div>

      {/* Fee breakdown */}
      {!isPayAtDoor && !isFreeOrder && (stripeFeesCents > 0 || platformFeeCents > 0) && (
        <>
          <Separator />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.ticketCost}</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {platformFeeCents > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.serviceFee}</span>
                <span>{formatPrice(platformFeeCents)}</span>
              </div>
            )}
            {stripeFeesCents > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.processingFee}</span>
                <span>{formatPrice(stripeFeesCents)}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Pay at door banner */}
      {isPayAtDoor && subtotal > 0 && (
        <>
          <Separator />
          <div className="bg-muted border border-border rounded-lg p-3 text-center">
            <p className="text-sm font-medium text-foreground">
              💰 {language === 'el' ? 'Πληρωμή στην Είσοδο' : 'Pay at Door'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'el'
                ? `Θα πληρώσετε ${formatPrice(subtotal)} στην είσοδο του χώρου`
                : `You will pay ${formatPrice(subtotal)} at the venue entrance`}
            </p>
          </div>
        </>
      )}

      <Separator />

      {/* Total */}
      <div className="flex justify-between font-bold text-base sm:text-lg">
        <span>{t.total}</span>
        <span className="text-foreground">
          {isPayAtDoor
            ? (language === 'el' ? 'Δωρεάν online' : 'Free online')
            : isFreeOrder ? t.free : formatPrice(total)}
        </span>
      </div>

      {/* QR info */}
      <div className="flex items-start gap-2">
        <Ticket className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">{t.eachPersonGetsQR}</p>
      </div>

      {/* Terms checkbox */}
      <div className="flex items-start gap-2.5 pt-1">
        <Checkbox
          id="terms-accept"
          checked={termsAccepted}
          onCheckedChange={(checked) => setTermsAccepted(checked === true)}
          className="mt-0.5 rounded-[6px]"
        />
        <label htmlFor="terms-accept" className="text-[10px] sm:text-xs text-foreground/90 leading-relaxed cursor-pointer">
          {t.termsLabel}{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-foreground font-semibold underline underline-offset-2">{t.termsLink}</a>
          {' '}{t.andThe}{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-foreground font-semibold underline underline-offset-2">{t.privacyLink}</a>
        </label>
      </div>
    </div>
  );

  const [mobileSeatsOpen, setMobileSeatsOpen] = useState(false);

  const renderSeatStep = () => {
    if (!hasSeating || !venueId || !showInstanceId) return null;

    if (isMobile) {
      return (
        <div className="space-y-3 py-4">
          <p className="text-sm text-center text-muted-foreground">
            {language === 'el' ? 'Πατήστε για να επιλέξετε θέσεις' : 'Tap to select your seats'}
          </p>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setMobileSeatsOpen(true)}
          >
            <Ticket className="h-4 w-4" />
            {selectedSeats.length > 0
              ? `${selectedSeats.length} ${language === 'el' ? 'θέσεις επιλεγμένες' : 'seats selected'}`
              : (language === 'el' ? 'Επιλογή Θέσεων' : 'Select Seats')
            }
          </Button>
          {selectedSeats.length > 0 && (
            <div className="flex flex-wrap gap-1 px-1">
              {selectedSeats.map((s) => (
                <span
                  key={s.seatId}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                >
                  {s.label}
                </span>
              ))}
            </div>
          )}
          {mobileSeatsOpen && (
            <FullscreenSeatSelector
              venueId={venueId}
              showInstanceId={showInstanceId}
              maxSeats={10}
              selectedSeats={selectedSeats}
              onSeatToggle={handleSeatToggle}
              eventTitle={eventTitle}
              eventDate={eventDate || ''}
              onClose={() => setMobileSeatsOpen(false)}
              onDone={() => setMobileSeatsOpen(false)}
            />
          )}
        </div>
      );
    }

    return (
      <SeatSelectionStep
        venueId={venueId}
        showInstanceId={showInstanceId}
        maxSeats={10}
        selectedSeats={selectedSeats}
        onSeatToggle={handleSeatToggle}
        eventTitle={eventTitle}
        eventDate={eventDate || ''}
      />
    );
  };

  const renderShowSelectStep = () => {
    if (!hasMultipleShows || !showInstances) return null;
    const locale = language === 'el' ? elLocale : enUS;
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground text-center">
          {language === 'el' ? 'Επιλέξτε ημερομηνία παράστασης' : 'Select a show date'}
        </p>
        {showInstances.map((show) => {
          const isSelected = selectedShowId === show.id;
          const showDate = new Date(show.start_at);
          return (
            <button
              key={show.id}
              type="button"
              onClick={() => {
                setSelectedShowId(show.id);
                setSelectedSeats([]);
              }}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              <Calendar className={cn("h-5 w-5 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  {format(showDate, 'EEEE, d MMMM yyyy', { locale })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(showDate, 'HH:mm')}
                  {show.doors_open_at && ` · ${language === 'el' ? 'Πόρτες' : 'Doors'}: ${format(new Date(show.doors_open_at), 'HH:mm')}`}
                </p>
              </div>
              {isSelected && (
                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const renderAuthStep = () => (
    <InlineAuthGate onAuthSuccess={() => {
      setCurrentStepIdx(prev => prev);
    }} />
  );

  const renderProfileStep = () => (
    <ProfileCompletionGate onComplete={async (profile) => {
      setBuyerProfile(profile);
      setProfileComplete(true);

      const fullName = `${profile.firstName} ${profile.lastName}`.trim();
      setBuyerFullName(fullName);

      // Auto-fill phone & email for fresh signups
      if (!wasAuthenticatedOnMount) {
        setIsFreshSignup(true);
        setCustomerPhone(profile.phone);
        // Get email from auth user
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) setCustomerEmail(user.email);
      }
    }} />
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'showSelect': return renderShowSelectStep();
      case 'seats': return renderSeatStep();
      case 'tickets': return renderTicketsStep();
      case 'auth': return renderAuthStep();
      case 'profile': return renderProfileStep();
      case 'guests': return renderGuestsStep();
      case 'checkout': return renderCheckoutStep();
      default: return null;
    }
  };

  const canProceedFromCurrentStep = () => {
    switch (currentStep) {
      case 'showSelect': return !!selectedShowId;
      case 'seats': return selectedSeats.length > 0;
      case 'tickets': {
        if (isFreshSignup && !hasSeating) {
          // Merged step: need tickets + all guest details filled
          return tierTotalTickets > 0 && allNamesFilled && allAgesFilled;
        }
        return tierTotalTickets > 0;
      }
      case 'auth': return isAuthenticated;
      case 'profile': return profileComplete;
      case 'guests': return allGuestDetailsFilled && totalTickets > 0;
      case 'checkout': return termsAccepted;
      default: return true;
    }
  };

  const renderNavigation = () => {
    if (currentStep === 'checkout' && checkoutUrl) {
      return (
        <div className="w-full space-y-3 pt-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{t.redirecting}</span>
          </div>
          {redirectAttempted && (
            <>
              <a href={checkoutUrl}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                <ExternalLink className="h-4 w-4" />
                {t.continuePayment}
              </a>
              <p className="text-xs text-muted-foreground text-center">{t.redirectFallback}</p>
              <Button variant="ghost" size="sm" onClick={() => { setCheckoutUrl(null); setRedirectAttempted(false); }}
                className="w-full">{t.cancel}</Button>
            </>
          )}
        </div>
      );
    }

    const isFirstStep = currentStepIdx === 0;
    const isLastStep = currentStep === 'checkout';

    return (
      <div className="flex justify-between pt-3 sm:pt-4">
        {!isFirstStep ? (
          <Button variant="outline" size={isMobile ? "sm" : "default"} onClick={() => setCurrentStepIdx(currentStepIdx - 1)}>
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            {t.back}
          </Button>
        ) : <div />}

        {!isLastStep ? (
          <Button
            size={isMobile ? "sm" : "default"}
            onClick={() => setCurrentStepIdx(currentStepIdx + 1)}
            disabled={!canProceedFromCurrentStep()}
          >
            {t.next}
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1.5 sm:ml-2" />
          </Button>
        ) : (
          <Button size={isMobile ? "sm" : "default"} onClick={handleCheckout} disabled={submitting || !termsAccepted} className="gap-1.5 sm:gap-2">
            {submitting ? (
              <><Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />{t.processing}</>
            ) : isFreeOrder ? (
              <><Ticket className="h-3.5 w-3.5 sm:h-4 sm:w-4" />{isPayAtDoor ? (language === 'el' ? 'Ολοκλήρωση' : 'Complete') : t.getTickets}</>
            ) : (
              <><CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />{t.pay} {formatPrice(total)}</>
            )}
          </Button>
        )}
      </div>
    );
  };


  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 pb-4">
      {steps.map((s, i) => (
        <div key={s} className={cn(
          "w-2 h-2 rounded-full transition-colors",
          i === currentStepIdx ? "bg-primary w-4" : i < currentStepIdx ? "bg-primary/50" : "bg-muted"
        )} />
      ))}
    </div>
  );

  const content = (
    <div className="space-y-4">
      {renderStepIndicator()}
      {renderStepContent()}
      {renderNavigation()}
    </div>
  );

  // Success Screen for pay-at-door tickets
  if (ticketSuccessData) {
    const currentTicket = ticketSuccessData.tickets[ticketSuccessIndex];
    const successContent = (
      <div className="space-y-4">
        <SuccessQRCard
          type="ticket"
          qrToken={currentTicket?.qr_code_token || ''}
          title={eventTitle}
          businessName=""
          language={language}
          reservationDate={eventDate}
          guestName={currentTicket?.guest_name}
          showSuccessMessage={ticketSuccessIndex === 0}
          onViewDashboard={() => { navigate('/dashboard-user?tab=events'); onOpenChange(false); }}
          viewDashboardLabel={language === 'el' ? 'Τα Εισιτήριά Μου' : 'My Tickets'}
          onClose={() => { onSuccess?.(ticketSuccessData.orderId, true); onOpenChange(false); }}
        />
        {ticketSuccessData.tickets.length > 1 && (
          <div className="flex items-center justify-center gap-3 pb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTicketSuccessIndex(Math.max(0, ticketSuccessIndex - 1))}
              disabled={ticketSuccessIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-foreground">
              {currentTicket?.guest_name} ({ticketSuccessIndex + 1}/{ticketSuccessData.tickets.length})
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTicketSuccessIndex(Math.min(ticketSuccessData.tickets.length - 1, ticketSuccessIndex + 1))}
              disabled={ticketSuccessIndex === ticketSuccessData.tickets.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    );

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[92vw] max-w-sm p-0 overflow-hidden border-0 bg-transparent [&>button]:hidden max-h-[90vh] overflow-y-auto overflow-x-hidden">
          {successContent}
        </DialogContent>
      </Dialog>
    );
  }

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[92vw] max-h-[85vh] flex flex-col p-0 gap-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="flex-shrink-0 border-b border-border/50 pb-3 px-4 pt-4">
            <DialogTitle className="text-sm font-bold">{t.title}</DialogTitle>
            <DialogDescription className="text-xs">{eventTitle}</DialogDescription>
          </DialogHeader>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
            {content}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={scrollRef} className={cn("max-h-[92vh] overflow-y-auto", hasSeating && currentStep === 'seats' ? "max-w-5xl" : "max-w-md")}>
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{eventTitle}</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default TicketPurchaseFlow;
