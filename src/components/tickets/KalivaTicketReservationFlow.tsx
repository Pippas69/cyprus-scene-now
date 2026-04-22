import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { CollapsibleSpecialRequests } from "@/components/ui/CollapsibleSpecialRequests";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isValidPhone } from "@/lib/phoneValidation";
import { LATIN_RESERVATION_NAME_REGEX, LATIN_RESERVATION_NAME_MESSAGE } from '@/lib/reservationValidation';
import {
  GlassWater,
  TableIcon,
  Crown,
  Sofa,
  Users,
  Phone,
  User,
  MessageSquare,
  CreditCard,
  Mail,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Info,
  AlertCircle,
  Ticket,
  ExternalLink,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

import { getMinAge } from "@/lib/ageRestrictions";
import { useProfileName } from '@/hooks/useProfileName';
import { InlineAuthGate } from './InlineAuthGate';
import { ProfileCompletionGate } from './ProfileCompletionGate';
import { useEventPricingProfile } from "@/hooks/useEventPricingProfile";
import { isBottleTier as isBottleTierFn, formatBottleLabel } from "@/lib/bottlePricing";
import { sortSeatingTypes } from "@/lib/seatingTypeOrder";

interface SeatingTypeOption {
  id: string;
  seating_type: string;
  available_slots: number;
  slots_booked: number;
  paused: boolean;
  
  tiers: {
    id: string;
    min_people: number;
    max_people: number;
    prepaid_min_charge_cents: number;
    pricing_mode?: 'amount' | 'bottles' | null;
    bottle_type?: 'bottle' | 'premium_bottle' | null;
    bottle_count?: number | null;
  }[];
}

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

interface GuestInfo {
  name: string;
  age: string;
}

interface KalivaTicketReservationFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  ticketTiers: TicketTier[];
  onSuccess?: (orderId: string, isFree: boolean) => void;
  businessId?: string;
}

const translations = {
  el: {
    title: "Κράτηση Θέσης",
    steps: {
      seating: "Τύπος Θέσης",
      details: "Στοιχεία Παρέας",
      review: "Σύνοψη",
    },
    seatingTypes: {
      bar: "Μπαρ",
      table: "Τραπέζι",
      vip: "VIP",
      sofa: "Καναπές",
    },
    available: "διαθέσιμες",
    soldOut: "Εξαντλήθηκαν",
    from: "από",
    partySize: "Αριθμός ατόμων",
    people: "άτομα",
    guestDetails: "Στοιχεία Καλεσμένων",
    guestN: "Άτομο",
    name: "Όνομα",
    age: "Ηλικία",
    phone: "Τηλέφωνο",
    email: "Email",
    emailPlaceholder: "example@email.com",
    optional: "προαιρετικό",
    minimumCharge: "Ελάχιστη κατανάλωση τραπεζιού",
    paidAtVenue: "Πληρώνεται στο κατάστημα (η τιμή των εισιτηρίων συμπεριλαμβάνεται στο τελικό ποσό)",
    howPaymentWorks: "Πώς λειτουργεί η πληρωμή",
    prepaidOnline: "Προπληρωμή (online)",
    balanceAtVenue: "Υπόλοιπο στο venue",
    prepaidDeductedNote: "Η προπληρωμή αφαιρείται αυτόματα από τον τελικό λογαριασμό σας.",
    entryFeeLine: "Είσοδος",
    tableCreditLine: "Πίστωση τραπεζιού",
    notRefundedNote: "Η είσοδος δεν επιστρέφεται· πιστώνεται στο τραπέζι μόνο η πίστωση τραπεζιού.",
    onlyEntryNote: "Καθαρή χρέωση εισόδου — δεν πιστώνεται στο τραπέζι.",
    onlyCreditNote: "Όλο το ποσό πιστώνεται στον λογαριασμό σας στο venue.",
    ticketCost: "Κόστος εισιτηρίων",
    arrivalHours: "Ώρες άφιξης",
    perPerson: "/ άτομο",
    total: "Σύνολο πληρωμής",
    pay: "Πληρωμή",
    free: "Δωρεάν",
    getTickets: "Λήψη Εισιτηρίων",
    back: "Πίσω",
    next: "Επόμενο",
    loading: "Φόρτωση...",
    processing: "Επεξεργασία...",
    errorNoSeating: "Δεν υπάρχουν διαθέσιμες θέσεις",
    errorNoTier: "Δεν βρέθηκε τιμή για αυτό το μέγεθος παρέας",
    fillAllGuests: "Συμπληρώστε όνομα και ηλικία για όλους",
    loginRequired: "Πρέπει να συνδεθείτε",
    summary: "Σύνοψη",
    seatingType: "Τύπος θέσης",
    eachPersonGetsQR: "Κάθε άτομο θα λάβει ξεχωριστό QR code εισιτηρίου",
    redirecting: "Μεταφορά στην πληρωμή...",
    redirectFallback: "Αν η σελίδα δεν άνοιξε αυτόματα, πατήστε το κουμπί παραπάνω.",
    continuePayment: "Συνέχεια στην Πληρωμή",
    cancel: "Ακύρωση",
    specialRequests: "Ειδικά αιτήματα",
    reservationName: "Όνομα Κράτησης",
    processingFee: "Έξοδα επεξεργασίας",
    serviceFee: "Χρέωση υπηρεσίας",
    termsLabel: "Αποδέχομαι τους",
    termsLink: "Όρους Χρήσης",
    andThe: "και την",
    privacyLink: "Πολιτική Απορρήτου",
    termsRequired: "Πρέπει να αποδεχτείτε τους όρους χρήσης",
    minimumConsumption: "Ελάχιστη κατανάλωση",
    atVenue: "στο κατάστημα",
    confirmReservation: "Επιβεβαίωση Κράτησης",
    ticketCostOnline: "Κόστος εισιτηρίων (online)",
    bottleAtVenue: "Στο venue",
  },
  en: {
    title: "Ticket & Reservation",
    steps: {
      seating: "Seating Type",
      details: "Party Details",
      review: "Summary",
    },
    seatingTypes: {
      bar: "Bar",
      table: "Table",
      vip: "VIP",
      sofa: "Sofa",
    },
    available: "available",
    soldOut: "Sold Out",
    from: "from",
    partySize: "Number of people",
    people: "people",
    guestDetails: "Guest Details",
    guestN: "Person",
    name: "Name",
    age: "Age",
    phone: "Phone number",
    email: "Email",
    emailPlaceholder: "example@email.com",
    optional: "optional",
    minimumCharge: "Table minimum charge",
    paidAtVenue: "Paid at venue (ticket price is included in the final amount)",
    howPaymentWorks: "How payment works",
    prepaidOnline: "Prepaid (online)",
    balanceAtVenue: "Balance at venue",
    prepaidDeductedNote: "The prepayment is automatically deducted from your final bill.",
    entryFeeLine: "Entry fee",
    tableCreditLine: "Table credit",
    notRefundedNote: "Entry is not refunded; only the table credit is added to your bill.",
    onlyEntryNote: "Pure entry charge — not credited to your table.",
    onlyCreditNote: "The full amount is credited to your bill at the venue.",
    ticketCost: "Ticket cost",
    arrivalHours: "Arrival hours",
    perPerson: "/ person",
    total: "Total payment",
    pay: "Pay",
    free: "Free",
    getTickets: "Get Tickets",
    back: "Back",
    next: "Next",
    loading: "Loading...",
    processing: "Processing...",
    errorNoSeating: "No seating options available",
    errorNoTier: "No price found for this party size",
    fillAllGuests: "Please fill in name and age for all guests",
    loginRequired: "You must be logged in",
    summary: "Summary",
    seatingType: "Seating type",
    eachPersonGetsQR: "Each person will receive their own QR code ticket",
    redirecting: "Opening payment...",
    redirectFallback: "If the page didn't open automatically, tap the button above.",
    continuePayment: "Continue to Payment",
    cancel: "Cancel",
    specialRequests: "Special requests",
    reservationName: "Reservation Name",
    processingFee: "Processing fee",
    serviceFee: "Service fee",
    termsLabel: "I accept the",
    termsLink: "Terms of Service",
    andThe: "and the",
    privacyLink: "Privacy Policy",
    termsRequired: "You must accept the terms of service",
    minimumConsumption: "Minimum consumption",
    atVenue: "at venue",
    confirmReservation: "Confirm Reservation",
    ticketCostOnline: "Ticket cost (online)",
    bottleAtVenue: "At venue",
  },
};

const seatingTypeIcons: Record<string, React.ReactNode> = {
  bar: <GlassWater className="h-6 w-6" />,
  table: <TableIcon className="h-6 w-6" />,
  vip: <Crown className="h-6 w-6" />,
  sofa: <Sofa className="h-6 w-6" />,
};

const seatingTypeColors: Record<string, { bg: string; text: string; border: string }> = {
  bar: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500' },
  table: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500' },
  vip: { bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500' },
  sofa: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500' },
};

export const KalivaTicketReservationFlow: React.FC<KalivaTicketReservationFlowProps> = ({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  ticketTiers,
  onSuccess,
  businessId,
}) => {
  const isMobile = useIsMobile();
  const { language } = useLanguage();
  const t = translations[language];
  const { data: pricingDisplay } = useEventPricingProfile(businessId);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [seatingOptions, setSeatingOptions] = useState<SeatingTypeOption[]>([]);

  // Selection state
  const [selectedSeating, setSelectedSeating] = useState<SeatingTypeOption | null>(null);
  const [partySize, setPartySize] = useState(1);
  const [guests, setGuests] = useState<GuestInfo[]>([{ name: '', age: '' }]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [reservationName, setReservationName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Auto-fill booker name (slot 0)
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [isFreshSignup, setIsFreshSignup] = useState(false);
  const [wasAuthenticatedOnMount, setWasAuthenticatedOnMount] = useState<boolean | null>(null);
  const profileName = useProfileName(userId);
  const [eventMinimumAge, setEventMinimumAge] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setIsAuthenticated(!!data.user);
      setWasAuthenticatedOnMount(!!data.user);
    });
    // Fetch minimum_age
    supabase.from('events').select('minimum_age').eq('id', eventId).single().then(({ data }) => {
      setEventMinimumAge(data?.minimum_age ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session?.user);
      if (session?.user) setUserId(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (profileName) {
      setGuests(prev => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        updated[0] = { ...updated[0], name: profileName };
        return updated;
      });
    }
  }, [profileName]);
  const [reservationHoursFrom, setReservationHoursFrom] = useState<string | null>(null);
  const [reservationHoursTo, setReservationHoursTo] = useState<string | null>(null);

  // Checkout state
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  // Min charge + matched tier (with bottle metadata)
  const [minChargeCents, setMinChargeCents] = useState<number | null>(null);
  const [matchedTier, setMatchedTier] = useState<SeatingTypeOption['tiers'][number] | null>(null);

  // Fetch seating options on open and keep availability fresh while dialog is open
  useEffect(() => {
    if (!open || !eventId) return;

    fetchSeatingOptions();
    fetchEventHours();

    const refreshTimer = window.setInterval(() => {
      fetchSeatingOptions(true);
    }, 15000);

    return () => window.clearInterval(refreshTimer);
  }, [open, eventId]);

  // Only reset checkout state on reopen, not form data
  useEffect(() => {
    if (open) {
      setCheckoutUrl(null);
      setRedirectAttempted(false);
      setPhoneNumber('');
      setCustomerEmail('');
    }
  }, [open]);

  // Scroll to top on step change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Update guests array when party size changes
  useEffect(() => {
    setGuests(prev => {
      if (prev.length === partySize) return prev;
      if (prev.length < partySize) {
        return [...prev, ...Array(partySize - prev.length).fill(null).map(() => ({ name: '', age: '' }))];
      }
      return prev.slice(0, partySize);
    });
  }, [partySize]);

  // Update min charge + matched tier when party size or seating changes
  useEffect(() => {
    if (!selectedSeating || selectedSeating.tiers.length === 0) {
      setMinChargeCents(null);
      setMatchedTier(null);
      return;
    }
    const matched = selectedSeating.tiers.find(t => partySize >= t.min_people && partySize <= t.max_people);
    const effective = matched
      ?? (partySize > selectedSeating.tiers[selectedSeating.tiers.length - 1].max_people
            ? selectedSeating.tiers[selectedSeating.tiers.length - 1]
            : null);
    if (effective) {
      setMatchedTier(effective);
      // For bottle tiers, no online min-charge prepayment
      setMinChargeCents(isBottleTierFn(effective) ? 0 : effective.prepaid_min_charge_cents);
    } else {
      setMatchedTier(null);
      setMinChargeCents(null);
    }
  }, [partySize, selectedSeating]);

  const fetchSeatingOptions = async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const { data: seatingTypes, error } = await supabase
        .from('reservation_seating_types')
        .select('*')
        .eq('event_id', eventId);
      if (error) throw error;

      const seatingIds = (seatingTypes || []).map(st => st.id);
      const seatingIdSet = new Set(seatingIds);
      const bookedMap: Record<string, number> = {};

      if (seatingIds.length > 0) {
        const { data: bookedCounts, error: bookedCountsError } = await supabase.rpc(
          'get_event_seating_booked_counts',
          { p_event_id: eventId }
        );
        if (bookedCountsError) throw bookedCountsError;

        for (const row of (bookedCounts || []) as { seating_type_id: string; slots_booked: number | string }[]) {
          if (row.seating_type_id && seatingIdSet.has(row.seating_type_id)) {
            bookedMap[row.seating_type_id] = Number(row.slots_booked) || 0;
          }
        }
      }

      const optionsWithTiers: SeatingTypeOption[] = [];
      for (const st of seatingTypes || []) {
        const { data: tiers } = await supabase
          .from('seating_type_tiers')
          .select('*')
          .eq('seating_type_id', st.id)
          .order('min_people', { ascending: true });
        optionsWithTiers.push({
          ...st,
          slots_booked: bookedMap[st.id] ?? 0,
          tiers: tiers || [],
        });
      }

      const sortedOptions = sortSeatingTypes(optionsWithTiers, (o) => o.seating_type);
      setSeatingOptions(sortedOptions);
      setSelectedSeating(prev => prev ? sortedOptions.find(option => option.id === prev.id) ?? null : prev);
    } catch (error) {
      console.error('Error fetching seating options:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchEventHours = async () => {
    try {
      const { data } = await supabase
        .from('events')
        .select('reservation_hours_from, reservation_hours_to')
        .eq('id', eventId)
        .single();
      if (data) {
        setReservationHoursFrom(data.reservation_hours_from);
        setReservationHoursTo(data.reservation_hours_to);
      }
    } catch (error) {
      console.error('Error fetching event hours:', error);
    }
  };

  const getPartySizeLimits = () => {
    if (!selectedSeating || selectedSeating.tiers.length === 0) return { min: 1, max: 20 };
    const allMins = selectedSeating.tiers.map(t => t.min_people);
    const allMaxs = selectedSeating.tiers.map(t => t.max_people);
    return { min: Math.min(...allMins), max: Math.max(...allMaxs) };
  };

  const partySizeLimits = getPartySizeLimits();

  const updateGuest = (index: number, field: keyof GuestInfo, value: string) => {
    setGuests(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const formatPrice = (cents: number) => cents === 0 ? t.free : `€${(cents / 100).toFixed(2)}`;

  // Bottle helpers
  const isCurrentBottleTier = isBottleTierFn(matchedTier as any);
  const currentBottleLabel = isCurrentBottleTier && matchedTier?.bottle_type && matchedTier?.bottle_count
    ? formatBottleLabel(matchedTier.bottle_type, matchedTier.bottle_count, language)
    : null;

  // Match ticket tier to selected seating type
  // Each seating type (bar, table, vip, sofa) has its own reservation-linked ticket tier
  // with a matching name (e.g., "Bar", "Table", "VIP", "Sofa") or sort_order
  const getTicketTier = (): TicketTier | null => {
    if (ticketTiers.length === 0) return null;
    if (!selectedSeating) return ticketTiers[0] || null;

    const seatingType = selectedSeating.seating_type.toLowerCase();

    // Try matching by tier name (case-insensitive) to seating type
    const matched = ticketTiers.find(t => {
      const tierName = t.name.toLowerCase().trim();
      return tierName === seatingType || 
             tierName === selectedSeating.seating_type;
    });
    if (matched) return matched;

    // Fallback: match by index position (sort_order alignment)
    const seatingIndex = seatingOptions.findIndex(s => s.id === selectedSeating.id);
    if (seatingIndex >= 0 && seatingIndex < ticketTiers.length) {
      return ticketTiers[seatingIndex];
    }

    return ticketTiers[0] || null;
  };

  const ticketTier = getTicketTier();
  const ticketPricePerPerson = ticketTier?.price_cents || 0;
  const ticketTotal = ticketPricePerPerson * partySize;
  const buyerPaysStripe = pricingDisplay?.showProcessingFee !== false;
  const stripeFeesCents = ticketTotal > 0 && buyerPaysStripe ? Math.ceil(ticketTotal * 0.029 + 25) : 0;
  // Platform fixed fee for hybrid: per ticket + per reservation
  const buyerPaysPlatformFee = pricingDisplay?.showPlatformFee === true;
  const platformFeeCents = buyerPaysPlatformFee
    ? ((pricingDisplay?.fixedFeeHybridTicketCents || 0) * partySize) + (pricingDisplay?.fixedFeeHybridReservationCents || 0)
    : 0;
  const total = ticketTotal + stripeFeesCents + platformFeeCents;
  const isFreeOrder = ticketTotal === 0;

  // Validation
  const canProceedToStep2 = selectedSeating !== null;
  const minAge = getMinAge(eventId, eventMinimumAge);
  const allGuestsFilled = guests.every(g => g.name.trim() && g.age.trim() && !isNaN(Number(g.age)) && Number(g.age) >= minAge);
  const hasReservationName = reservationName.trim().length >= 2;
  const isReservationNameLatin = LATIN_RESERVATION_NAME_REGEX.test(reservationName.trim());
  const isPhoneValid = isValidPhone(phoneNumber.trim());
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim());
  const canProceedToStep3 = hasReservationName && isReservationNameLatin && allGuestsFilled && partySize > 0 && isPhoneValid && isEmailValid;

  // Dynamic step: auth/profile gate between step 1 and step 2
  const getEffectiveStep = (): number | 'auth' | 'profile' => {
    if (step === 2 && !isAuthenticated) return 'auth';
    if (step === 2 && isAuthenticated && !profileComplete) return 'profile';
    return step;
  };
  const effectiveStep = getEffectiveStep();

  const handleCheckout = async () => {
    if (!hasReservationName) {
      toast.error(language === 'el' ? 'Συμπληρώστε όνομα κράτησης' : 'Please enter reservation name');
      return;
    }
    if (!isReservationNameLatin) {
      toast.error(language === 'el' ? 'Παρακαλώ χρησιμοποιήστε λατινικούς χαρακτήρες (π.χ. John Doe)' : LATIN_RESERVATION_NAME_MESSAGE);
      return;
    }
    if (!allGuestsFilled) {
      toast.error(t.fillAllGuests);
      return;
    }
    if (!isPhoneValid) {
      toast.error(language === 'el' ? 'Συμπληρώστε σωστό τηλέφωνο' : 'Please enter a valid phone number');
      return;
    }
    if (!isEmailValid) {
      toast.error(language === 'el' ? 'Συμπληρώστε σωστό email' : 'Please enter a valid email');
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

      if (!ticketTier) {
        toast.error(language === 'el' ? 'Δεν βρέθηκαν εισιτήρια' : 'No tickets found');
        setSubmitting(false);
        return;
      }

      // For hybrid events: NO ticket availability check
      // Ticket availability is determined by reservation availability only

      const body: Record<string, unknown> = {
        eventId,
        items: [{ tierId: ticketTier.id, quantity: partySize }],
        customerName: guests[0].name.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: phoneNumber.trim(),
        specialRequests: specialRequests.trim() || null,
        seatingTypeId: selectedSeating?.id || null,
        reservationName: reservationName.trim(),
        guests: guests.map(g => ({
          name: g.name.trim(),
          age: parseInt(g.age) || 0,
        })),
      };

      // PR Attribution: attach promoter ref if active
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
      const msg = error instanceof Error ? error.message : (language === 'el' ? 'Αποτυχία αγοράς' : 'Purchase failed');
      toast.error(msg);
      setSubmitting(false);
    }
  };

  // ========= RENDER STEPS =========

  const renderStep1 = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {seatingOptions.map(option => {
        const remaining = Math.max(option.available_slots - option.slots_booked, 0);
        const isSoldOut = remaining <= 0;
        const isPaused = !!option.paused;
        const isUnavailable = isSoldOut || isPaused;
        const isSelected = selectedSeating?.id === option.id;
        const colors = seatingTypeColors[option.seating_type] || seatingTypeColors.table;

        // Build "από" label: prefer the smallest tier; if it's a bottle tier show bottle label,
        // otherwise show the cheapest amount price across non-bottle tiers.
        const sortedTiers = [...option.tiers].sort((a, b) => a.min_people - b.min_people);
        const firstTier = sortedTiers[0];
        const firstIsBottle = isBottleTierFn(firstTier as any);
        const amountTiers = option.tiers.filter(tt => !isBottleTierFn(tt as any));
        const minAmountCents = amountTiers.length > 0
          ? Math.min(...amountTiers.map(tt => tt.prepaid_min_charge_cents))
          : null;

        let fromLabel: string | null = null;
        if (firstIsBottle && firstTier?.bottle_type && firstTier?.bottle_count) {
          fromLabel = formatBottleLabel(firstTier.bottle_type, firstTier.bottle_count, language);
        } else if (minAmountCents != null) {
          fromLabel = formatPrice(minAmountCents);
        }

        return (
          <Card
            key={option.id}
            className={cn(
              "cursor-pointer transition-all",
              isUnavailable && "opacity-50 cursor-not-allowed grayscale",
              isSelected && !isUnavailable && `${colors.border} border-2 ring-2 ring-offset-2 ring-primary/20`,
              !isSelected && !isUnavailable && "hover:border-primary/50"
            )}
            onClick={() => {
              if (!isUnavailable) {
                setSelectedSeating(option);
                if (option.tiers.length > 0) {
                  const minPeople = Math.min(...option.tiers.map(t => t.min_people));
                  setPartySize(minPeople);
                }
              }
            }}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className={cn("p-2 rounded-lg", colors.bg, colors.text)}>
                  {seatingTypeIcons[option.seating_type] || seatingTypeIcons.table}
                </div>
                {isUnavailable ? (
                  <Badge variant="destructive">{t.soldOut}</Badge>
                ) : remaining <= 3 ? (
                  <Badge variant="secondary" className="text-foreground font-medium">{remaining} {t.available}</Badge>
                ) : null}
              </div>
              <div>
                <h4 className={cn("font-semibold", isSelected && !isUnavailable && colors.text)}>
                  {t.seatingTypes[option.seating_type as keyof typeof t.seatingTypes] || option.seating_type}
                </h4>
                {fromLabel && !isUnavailable && (
                  <p className="text-sm text-muted-foreground">{t.from} {fromLabel}</p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      {/* Reservation Name */}
      <div className="space-y-1">
        <Label className="flex items-center gap-2 text-sm">
          <User className="h-3.5 w-3.5" />
          {t.reservationName}
        </Label>
        <Input
          value={reservationName}
          onChange={(e) => setReservationName(e.target.value)}
          placeholder="John Doe"
          className={cn(
            "h-9 text-sm",
            reservationName.length > 0 && !LATIN_RESERVATION_NAME_REGEX.test(reservationName) && "border-destructive focus-visible:ring-destructive"
          )}
        />
        {reservationName.length > 0 && !LATIN_RESERVATION_NAME_REGEX.test(reservationName) && (
          <p className="text-xs text-destructive">
            {language === 'el' ? 'Παρακαλώ χρησιμοποιήστε λατινικούς χαρακτήρες (π.χ. John Doe)' : LATIN_RESERVATION_NAME_MESSAGE}
          </p>
        )}
      </div>

      {/* Party Size + Ticket Price / Min Consumption - Same Row */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm">
            <Users className="h-3.5 w-3.5" />
            {t.partySize}
          </Label>
          {ticketTier && ticketPricePerPerson > 0 ? (
            <Label className="text-sm text-foreground font-medium">
              {language === 'el' ? 'Τιμή εισιτηρίων' : 'Ticket price'}
            </Label>
          ) : isCurrentBottleTier ? (
            <Label className="text-sm text-foreground font-medium">
              {t.minimumConsumption}
            </Label>
          ) : null}
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-7 w-7 shrink-0"
              onClick={() => setPartySize(Math.max(partySizeLimits.min, partySize - 1))}
              disabled={partySize <= partySizeLimits.min}
            >-</Button>
            <span className="text-base font-semibold min-w-[2ch] text-center">{partySize}</span>
            <Button variant="outline" size="icon" className="h-7 w-7 shrink-0"
              onClick={() => setPartySize(Math.min(partySizeLimits.max, partySize + 1))}
              disabled={partySize >= partySizeLimits.max}
            >+</Button>
            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{t.people}</span>
          </div>
          {ticketTier && ticketPricePerPerson > 0 ? (
            <span className="text-base font-semibold text-foreground">{formatPrice(ticketTotal)}</span>
          ) : isCurrentBottleTier && currentBottleLabel ? (
            <span className="text-base font-semibold text-foreground">{currentBottleLabel}</span>
          ) : ticketTier && ticketPricePerPerson === 0 ? (
            <span className="text-sm font-medium text-foreground">{t.free}</span>
          ) : null}
        </div>
      </div>

      {/* Min Charge Info — amount mode only (bottle min consumption is shown in the row above) */}
      {!isCurrentBottleTier && minChargeCents != null && minChargeCents > 0 && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-card/60">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{t.minimumCharge}: {formatPrice(minChargeCents)}</span>
          </div>
        </div>
      )}

      {/* Bottle info hint */}
      {isCurrentBottleTier && currentBottleLabel && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-card/60">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {t.minimumConsumption}: {currentBottleLabel} ({t.atVenue})
            </span>
          </div>
        </div>
      )}

      {/* Guest Details */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {t.guestDetails} ({partySize} {t.people})
        </Label>
        <div className="space-y-1.5 max-h-52 overflow-y-auto">
          {guests.map((guest, idx) => (
            <React.Fragment key={idx}>
              <div className="flex gap-2 items-center">
                <span className="text-xs text-muted-foreground shrink-0 w-4 text-right">{idx + 1}.</span>
                <Input
                  placeholder={t.name}
                  value={guest.name}
                  readOnly={idx === 0 && !!profileName}
                  onChange={(e) => {
                    if (idx === 0 && profileName) return;
                    updateGuest(idx, 'name', e.target.value);
                  }}
                  className={cn("h-9 text-sm flex-1", idx === 0 && profileName && "bg-muted cursor-not-allowed")}
                />
                <Input
                  placeholder={t.age}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={guest.age}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                    updateGuest(idx, 'age', val);
                  }}
                  className={cn("h-9 text-sm w-20", guest.age && Number(guest.age) < minAge && "border-destructive")}
                />
              </div>
              {guest.age && Number(guest.age) < minAge && (
                <p className="text-[10px] text-destructive text-right pr-1">
                  {language === 'el' ? `Ελάχιστο όριο: ${minAge} ετών` : `Minimum age: ${minAge}`}
                </p>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <Separator />

      {/* Phone - show always for existing users, hide for fresh signup */}
      {!isFreshSignup && (
        <div className="space-y-1">
          <Label className="flex items-center gap-2 text-sm">
            <Phone className="h-3.5 w-3.5" />
            {t.phone}
          </Label>
          <PhoneInput
            value={phoneNumber}
            onChange={setPhoneNumber}
            language={language}
            selectClassName="h-9 text-sm"
            inputClassName="h-9 text-sm"
          />
        </div>
      )}

      {/* Email - show always for existing users, hide for fresh signup */}
      {!isFreshSignup && (
        <div className="space-y-1">
          <Label className="flex items-center gap-2 text-sm">
            <Mail className="h-3.5 w-3.5" />
            {t.email}
          </Label>
          <Input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder={t.emailPlaceholder}
            className="h-9 text-sm"
          />
        </div>
      )}

      {/* Arrival Hours */}
      {(reservationHoursFrom || reservationHoursTo) && (
        <div className="space-y-1">
          <Label className="flex items-center gap-2 text-sm">
            <Clock className="h-3.5 w-3.5" />
            {t.arrivalHours}
          </Label>
          <Input
            readOnly
            value={`${reservationHoursFrom || '—'} - ${reservationHoursTo || '—'}`}
            className="h-9 text-sm"
          />
        </div>
      )}

      {/* Special Requests */}
      <CollapsibleSpecialRequests
        value={specialRequests}
        onChange={setSpecialRequests}
        label={t.specialRequests}
        optionalLabel={t.optional}
      />
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <h3 className="font-semibold">{t.summary}</h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t.seatingType}</span>
          <span className="flex items-center gap-1.5 font-medium">
            {selectedSeating && (seatingTypeIcons[selectedSeating.seating_type] ?
              React.cloneElement(seatingTypeIcons[selectedSeating.seating_type] as React.ReactElement, { className: 'h-4 w-4' }) : null)}
            {selectedSeating && (t.seatingTypes[selectedSeating.seating_type as keyof typeof t.seatingTypes] || selectedSeating.seating_type)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t.partySize}</span>
          <span>{partySize} {t.people}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t.name}</span>
          <span>{guests[0]?.name}</span>
        </div>
        {phoneNumber && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.phone}</span>
              <span>{phoneNumber}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{t.eachPersonGetsQR}</p>
          </>
        )}
      </div>

      {/* Bottle mode: show consumption breakdown — 3 cases mirroring amount mode */}
      {isCurrentBottleTier && currentBottleLabel && (() => {
        const creditPerTicket = ticketTier?.prepaid_amount_cents ?? 0;
        const entryPerTicket = Math.max(0, (ticketTier?.price_cents ?? 0) - creditPerTicket);
        const creditTotal = creditPerTicket * partySize;
        const entryTotal = entryPerTicket * partySize;
        const hasCredit = creditTotal > 0;
        const hasEntry = entryTotal > 0;

        const minConsumptionRow = (
          <>
            <div className="border-t border-border/30 my-1" />
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-foreground">{t.minimumConsumption}:</span>
              <span className="font-bold text-foreground">{currentBottleLabel}</span>
            </div>
          </>
        );

        // Case A: only entry, no credit
        if (hasEntry && !hasCredit) {
          return (
            <>
              <Separator />
              <div className="border border-border/40 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-semibold text-foreground">
                    💡 {t.howPaymentWorks}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {t.entryFeeLine} ({partySize} × {formatPrice(entryPerTicket)}):
                  </span>
                  <span className="font-semibold text-foreground">{formatPrice(entryTotal)}</span>
                </div>
                {minConsumptionRow}
                <p className="text-[9px] text-muted-foreground mt-1">{t.onlyEntryNote}</p>
              </div>
            </>
          );
        }

        // Case B: entry + credit
        if (hasEntry && hasCredit) {
          return (
            <>
              <Separator />
              <div className="border border-border/40 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-semibold text-foreground">
                    💡 {t.howPaymentWorks}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {t.entryFeeLine} ({partySize} × {formatPrice(entryPerTicket)}):
                  </span>
                  <span className="font-semibold text-foreground">{formatPrice(entryTotal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {t.tableCreditLine} ({partySize} × {formatPrice(creditPerTicket)}):
                  </span>
                  <span className="font-semibold text-foreground">{formatPrice(creditTotal)}</span>
                </div>
                {minConsumptionRow}
                <p className="text-[9px] text-muted-foreground mt-1">{t.notRefundedNote}</p>
              </div>
            </>
          );
        }

        // Case C: only credit (or neither — pure bottle ticket)
        return (
          <>
            <Separator />
            <div className="border border-border/40 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs font-semibold text-foreground">
                  💡 {t.howPaymentWorks}
                </span>
              </div>
              {hasCredit && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {t.tableCreditLine} ({partySize} × {formatPrice(creditPerTicket)}):
                  </span>
                  <span className="font-semibold text-foreground">{formatPrice(creditTotal)}</span>
                </div>
              )}
              {minConsumptionRow}
              <p className="text-[9px] text-muted-foreground mt-1">
                {language === 'el'
                  ? 'Η προπληρωμή αφαιρείται αυτόματα από τον τελικό λογαριασμό σας.'
                  : 'The prepayment is automatically deducted from your final bill.'}
              </p>
            </div>
          </>
        );
      })()}

      {/* Amount mode: payment breakdown — handles 3 scenarios */}
      {!isCurrentBottleTier && (() => {
        const creditPerTicket = ticketTier?.prepaid_amount_cents ?? 0;
        const entryPerTicket = Math.max(0, (ticketTier?.price_cents ?? 0) - creditPerTicket);
        const creditTotal = creditPerTicket * partySize;
        const entryTotal = entryPerTicket * partySize;
        const hasCredit = creditTotal > 0;
        const hasEntry = entryTotal > 0;
        // Case Α (only entry, no credit): show entry-only breakdown
        if (!hasCredit && hasEntry) {
          return (
            <>
              <Separator />
              <div className="border border-border/40 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-semibold text-foreground">
                    💡 {t.howPaymentWorks}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {t.entryFeeLine} ({partySize} × {formatPrice(entryPerTicket)}):
                  </span>
                  <span className="font-semibold text-foreground">{formatPrice(entryTotal)}</span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-1">{t.onlyEntryNote}</p>
              </div>
            </>
          );
        }
        if (!hasCredit) return null;

        // Case Γ (split: both entry + credit): new transparent breakdown
        if (hasEntry && hasCredit) {
          return (
            <>
              <Separator />
              <div className="border border-border/40 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-semibold text-foreground">
                    💡 {t.howPaymentWorks}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {t.entryFeeLine} ({partySize} × {formatPrice(entryPerTicket)}):
                  </span>
                  <span className="font-semibold text-foreground">{formatPrice(entryTotal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {t.tableCreditLine} ({partySize} × {formatPrice(creditPerTicket)}):
                  </span>
                  <span className="font-semibold text-foreground">{formatPrice(creditTotal)}</span>
                </div>
                {minChargeCents != null && minChargeCents > 0 && (
                  <>
                    <div className="border-t border-border/30 my-1" />
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-foreground">{t.minimumCharge}:</span>
                      <span className="font-bold text-foreground">{formatPrice(minChargeCents)}</span>
                    </div>
                  </>
                )}
                <p className="text-[9px] text-muted-foreground mt-1">{t.notRefundedNote}</p>
              </div>
            </>
          );
        }

        // Case Β (only credit, no entry): keep the classic minimum-spend style
        // Use minChargeCents if configured, otherwise fall back to creditTotal
        const minSpend = (minChargeCents != null && minChargeCents > 0) ? minChargeCents : creditTotal;
        return (
          <>
            <Separator />
            <div className="border border-border/40 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs font-semibold text-foreground">
                  💡 {t.howPaymentWorks}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t.minimumCharge}</span>
                <span className="font-semibold text-foreground">{formatPrice(minSpend)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t.prepaidOnline}:</span>
                <span className="font-semibold text-foreground">-{formatPrice(creditTotal)}</span>
              </div>
              <div className="border-t border-border/30 my-1" />
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-foreground">{t.balanceAtVenue}:</span>
                <span className="font-bold text-foreground">{formatPrice(Math.max(0, minSpend - creditTotal))}</span>
              </div>
              <p className="text-[9px] text-muted-foreground mt-1">{t.prepaidDeductedNote}</p>
            </div>
          </>
        );
      })()}

      <Separator />

      {/* Costs */}
      <div className="space-y-2">
        {ticketTier && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t.ticketCost} ({partySize} × {formatPrice(ticketPricePerPerson)})
            </span>
            <span className="font-medium">{formatPrice(ticketTotal)}</span>
          </div>
        )}

        {!isFreeOrder && platformFeeCents > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.serviceFee}</span>
            <span className="font-medium">{formatPrice(platformFeeCents)}</span>
          </div>
        )}

        {!isFreeOrder && stripeFeesCents > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.processingFee}</span>
            <span className="font-medium">{formatPrice(stripeFeesCents)}</span>
          </div>
        )}

        <Separator />

        <div className="flex justify-between font-bold text-lg">
          <span>{t.total}</span>
          <span className="text-foreground">{isFreeOrder ? t.free : formatPrice(total)}</span>
        </div>
      </div>

      <div className="flex items-start gap-2.5 pt-1">
        <Checkbox
          id="kaliva-terms-accept"
          checked={termsAccepted}
          onCheckedChange={(checked) => setTermsAccepted(checked === true)}
          className="mt-0.5 rounded-[6px]"
        />
        <label htmlFor="kaliva-terms-accept" className="text-[10px] sm:text-xs text-foreground/90 leading-relaxed cursor-pointer">
          {t.termsLabel}{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-foreground font-semibold underline underline-offset-2">{t.termsLink}</a>
          {' '}{t.andThe}{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-foreground font-semibold underline underline-offset-2">{t.privacyLink}</a>
        </label>
      </div>
    </div>
  );

  const renderStepContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">{t.loading}</span>
        </div>
      );
    }
    if (seatingOptions.length === 0) {
      return (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t.errorNoSeating}</p>
        </div>
      );
    }

    if (effectiveStep === 'auth') {
      return (
        <InlineAuthGate onAuthSuccess={() => {}} />
      );
    }

    if (effectiveStep === 'profile') {
      return (
        <ProfileCompletionGate onComplete={async (profile) => {
          setProfileComplete(true);
          // Auto-fill first guest name from profile
          setGuests(prev => {
            const updated = [...prev];
            if (updated.length > 0) updated[0] = { ...updated[0], name: `${profile.firstName} ${profile.lastName}` };
            return updated;
          });
          // Fresh sign-up: auto-fill phone and email from profile data
          if (wasAuthenticatedOnMount === false) {
            setIsFreshSignup(true);
            setPhoneNumber(profile.phone || '');
            setCustomerEmail(profile.email || '');
          }
        }} />
      );
    }

    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      default: return null;
    }
  };

  const renderNavigation = () => {
    // Auth/profile gate: show back button only
    if (effectiveStep === 'auth' || effectiveStep === 'profile') {
      return (
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setStep(1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.back}
          </Button>
          <div />
        </div>
      );
    }

    // If we're on step 3 and checkout URL is active
    if (step === 3 && checkoutUrl) {
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

    return (
      <div className="flex justify-between pt-4">
        {step > 1 ? (
          <Button variant="outline" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.back}
          </Button>
        ) : <div />}

        {step < 3 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={(step === 1 && !canProceedToStep2) || (step === 2 && !canProceedToStep3)}
          >
            {t.next}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleCheckout} disabled={submitting || !termsAccepted} className="gap-2">
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{t.processing}</>
            ) : isCurrentBottleTier && isFreeOrder ? (
              <><Ticket className="h-4 w-4" />{t.confirmReservation}</>
            ) : isFreeOrder ? (
              <><Ticket className="h-4 w-4" />{t.getTickets}</>
            ) : (
              <><CreditCard className="h-4 w-4" />{t.pay} {formatPrice(total)}</>
            )}
          </Button>
        )}
      </div>
    );
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 pb-4">
      {[1, 2, 3].map(s => (
        <div key={s} className={cn(
          "w-2 h-2 rounded-full transition-colors",
          s === step ? "bg-primary w-4" : s < step ? "bg-primary/50" : "bg-muted"
        )} />
      ))}
    </div>
  );

  const content = (
    <div className="space-y-4">
      {renderStepIndicator()}
      {renderStepContent()}
      {!loading && seatingOptions.length > 0 && renderNavigation()}
    </div>
  );

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[92vw] max-h-[85vh] flex flex-col p-0 gap-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="flex-shrink-0 border-b border-border/50 pb-3 px-4 pt-4">
            <DialogTitle className="text-sm font-bold">{t.title}</DialogTitle>
            <DialogDescription className="text-xs">{eventTitle}</DialogDescription>
          </DialogHeader>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide [&_input]:!text-xs [&_textarea]:!text-xs">
            {content}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={scrollRef} className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{eventTitle}</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default KalivaTicketReservationFlow;
