import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  GlassWater, TableIcon, Crown, Sofa, Users, 
  Clock, Phone, User, MessageSquare, CreditCard, Mail,
  CheckCircle, ArrowRight, ArrowLeft, Loader2, Euro,
  AlertCircle, Calendar, Shield, ChevronLeft, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getMinAge } from "@/lib/ageRestrictions";
import { useProfileName } from '@/hooks/useProfileName';
import { SuccessQRCard } from '@/components/ui/SuccessQRCard';
import { InlineAuthGate } from '@/components/tickets/InlineAuthGate';
import { ProfileCompletionGate } from '@/components/tickets/ProfileCompletionGate';
import { useEventPricingProfile } from "@/hooks/useEventPricingProfile";
import { sortSeatingTypes } from "@/lib/seatingTypeOrder";

interface SeatingTypeOption {
  id: string;
  seating_type: string;
  available_slots: number;
  slots_booked: number;
  dress_code: string | null;
  no_show_policy: string;
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

interface ReservationEventCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  minPartySize: number;
  maxPartySize: number;
  reservationHoursFrom?: string;
  reservationHoursTo?: string;
  userId?: string;
  language: 'el' | 'en';
  onSuccess?: () => void;
  businessId?: string;
  eventType?: 'reservation' | 'ticket_and_reservation' | string;
  /** When provided (e.g. from /r/{token} SMS link), prefills and locks the customer-identifying fields. */
  lockedCustomerData?: {
    customerName?: string;
    customerPhone?: string;
    seatingPreference?: string | null;
  } | null;
}

const translations = {
  el: {
    title: "Κράτηση Θέσης",
    steps: {
      seating: "Επιλογή Θέσης",
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
    dressCode: "Ενδυματολογικός κώδικας",
    dressCodeLabels: {
      casual: "Καθημερινό",
      smart_casual: "Έξυπνο Καθημερινό",
      elegant: "Κομψό",
      no_sportswear: "Όχι Αθλητικά",
    },
    partySize: "Μέγεθος παρέας",
    people: "άτομα",
    prepaidAmount: "Ελάχιστη Προπληρωμή",
    name: "Όνομα κράτησης",
    phone: "Τηλέφωνο",
    email: "Email",
    emailPlaceholder: "example@email.com",
    arrivalHours: "Ώρες άφιξης",
    specialRequests: "Ειδικά αιτήματα",
    optional: "προαιρετικό",
    summary: "Σύνοψη Κράτησης",
    event: "Εκδήλωση",
    date: "Ημερομηνία",
    location: "Τοποθεσία",
    seatingType: "Τύπος θέσης",
    policies: "Πολιτικές",
    noShowPolicy: {
      refundable: "Επιστρέψιμο σε περίπτωση μη εμφάνισης",
      partial_refund: "Μερική επιστροφή σε περίπτωση μη εμφάνισης",
      non_refundable: "Μη επιστρέψιμο σε περίπτωση μη εμφάνισης",
    },
    total: "Σύνολο",
    pay: "Πληρωμή",
    back: "Πίσω",
    next: "Επόμενο",
    loading: "Φόρτωση...",
    processing: "Επεξεργασία...",
    errorLoading: "Σφάλμα φόρτωσης επιλογών θέσεων",
    errorNoSeating: "Δεν υπάρχουν διαθέσιμες θέσεις",
    errorNoTier: "Δεν βρέθηκε τιμή για αυτό το μέγεθος παρέας",
    paymentsNotReady: "Οι online πληρωμές δεν είναι ακόμη διαθέσιμες",
    paymentsNotReadyDesc: "Η επιχείρηση δεν έχει ολοκληρώσει τη ρύθμιση πληρωμών. Παρακαλώ επικοινωνήστε απευθείας με την επιχείρηση για κράτηση.",
    guestDetails: "Στοιχεία Καλεσμένων",
    guestName: "Όνομα",
    guestAge: "Ηλικία",
    fillAllGuests: "Συμπληρώστε όνομα και ηλικία για όλους τους καλεσμένους",
    processingFee: "Έξοδα επεξεργασίας",
    serviceFee: "Χρέωση υπηρεσίας",
    termsLabel: "Αποδέχομαι τους",
    termsLink: "Όρους Χρήσης",
    andThe: "και την",
    privacyLink: "Πολιτική Απορρήτου",
    termsRequired: "Πρέπει να αποδεχτείτε τους όρους χρήσης",
  },
  en: {
    title: "Book a Seat",
    steps: {
      seating: "Choose Seating",
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
    dressCode: "Dress code",
    dressCodeLabels: {
      casual: "Casual",
      smart_casual: "Smart Casual",
      elegant: "Elegant",
      no_sportswear: "No Sportswear",
    },
    partySize: "Party size",
    people: "people",
    prepaidAmount: "Prepaid Minimum Charge",
    name: "Reservation name",
    phone: "Phone number",
    email: "Email",
    emailPlaceholder: "example@email.com",
    arrivalHours: "Arrival hours",
    specialRequests: "Special requests",
    optional: "optional",
    summary: "Reservation Summary",
    event: "Event",
    date: "Date",
    location: "Location",
    seatingType: "Seating type",
    policies: "Policies",
    noShowPolicy: {
      refundable: "Refundable if no-show",
      partial_refund: "Partial refund if no-show",
      non_refundable: "Non-refundable if no-show",
    },
    total: "Total",
    pay: "Pay",
    back: "Back",
    next: "Next",
    loading: "Loading...",
    processing: "Processing...",
    errorLoading: "Error loading seating options",
    errorNoSeating: "No seating options available",
    errorNoTier: "No price found for this party size",
    paymentsNotReady: "Online payments not yet available",
    paymentsNotReadyDesc: "The business has not completed payment setup. Please contact the business directly to make a reservation.",
    guestDetails: "Guest Details",
    guestName: "Name",
    guestAge: "Age",
    fillAllGuests: "Please fill in name and age for all guests",
    processingFee: "Processing fee",
    serviceFee: "Service fee",
    termsLabel: "I accept the",
    termsLink: "Terms of Service",
    andThe: "and the",
    privacyLink: "Privacy Policy",
    termsRequired: "You must accept the terms of service",
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

export const ReservationEventCheckout: React.FC<ReservationEventCheckoutProps> = ({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  eventDate,
  eventLocation,
  minPartySize,
  maxPartySize,
  reservationHoursFrom,
  reservationHoursTo,
  userId,
  language,
  onSuccess,
  businessId,
  eventType,
  lockedCustomerData,
}) => {
  const isHybridEvent = eventType === 'ticket_and_reservation';
  const hasLockedCustomer = !!(lockedCustomerData && (lockedCustomerData.customerName || lockedCustomerData.customerPhone));
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const t = translations[language];
  const { data: pricingDisplay } = useEventPricingProfile(businessId);

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(userId);
  const [profileComplete, setProfileComplete] = useState(false);
  const [isFreshSignup, setIsFreshSignup] = useState(false);
  const [wasAuthenticatedOnMount, setWasAuthenticatedOnMount] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsAuthenticated(!!data.user);
      if (data.user) setCurrentUserId(data.user.id);
      setWasAuthenticatedOnMount(!!data.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session?.user);
      if (session?.user) setCurrentUserId(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  // State
  const [step, setStep] = useState(1);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [seatingOptions, setSeatingOptions] = useState<SeatingTypeOption[]>([]);
  const [paymentsReady, setPaymentsReady] = useState<boolean | null>(null);
  const [isDeferredPayment, setIsDeferredPayment] = useState(false);
  const [isPayAtDoor, setIsPayAtDoor] = useState(false);
  const [deferredCancellationFeePercent, setDeferredCancellationFeePercent] = useState(50);
  const [deferredConfirmationHours, setDeferredConfirmationHours] = useState(4);
  const [eventMinimumAge, setEventMinimumAge] = useState<number | null>(null);

  // Success state for showing premium QR card
  const [successData, setSuccessData] = useState<{
    tickets: { guest_name: string; qr_code_token: string }[];
    confirmationCode: string;
    prepaidAmount: number;
  } | null>(null);
  const [successIndex, setSuccessIndex] = useState(0);

  // Selection state
  const [selectedSeating, setSelectedSeating] = useState<SeatingTypeOption | null>(null);
  const [partySize, setPartySize] = useState(minPartySize);
  const [guests, setGuests] = useState<{ name: string; age: string }[]>(
    Array.from({ length: minPartySize }, () => ({ name: '', age: '' }))
  );
  const [reservationName, setReservationName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const profileName = useProfileName(currentUserId);

  // Auto-fill ONLY the first guest name with profile name
  // Reservation name, phone, and email are left empty for the user to fill freely
  useEffect(() => {
    if (profileName) {
      setGuests(prev => {
        const updated = [...prev];
        if (updated.length > 0) updated[0] = { ...updated[0], name: profileName };
        return updated;
      });
    }
  }, [profileName]);

  // Fetch seating options on open and keep availability fresh while dialog is open
  useEffect(() => {
    if (!open || !eventId) return;

    fetchSeatingOptions();
    const refreshTimer = window.setInterval(() => {
      fetchSeatingOptions(true);
    }, 15000);

    return () => window.clearInterval(refreshTimer);
  }, [open, eventId]);

  useEffect(() => {
    if (open) {
      setPhoneNumber('');
      setCustomerEmail('');
    }
  }, [open]);

  // Scroll to top when step changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Sync guests array with partySize
  useEffect(() => {
    setGuests(prev => {
      if (prev.length === partySize) return prev;
      if (prev.length < partySize) {
        return [...prev, ...Array(partySize - prev.length).fill(null).map(() => ({ name: '', age: '' }))];
      }
      return prev.slice(0, partySize);
    });
  }, [partySize]);

  const fetchSeatingOptions = async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      // Check deferred payment status and pay_at_door
      const { data: eventData } = await supabase
        .from('events')
        .select('deferred_payment_enabled, deferred_cancellation_fee_percent, deferred_confirmation_hours, pay_at_door, minimum_age')
        .eq('id', eventId)
        .single();

      if (eventData) {
        setIsDeferredPayment(eventData.deferred_payment_enabled || false);
        setDeferredCancellationFeePercent(eventData.deferred_cancellation_fee_percent || 50);
        setDeferredConfirmationHours(eventData.deferred_confirmation_hours || 4);
        setIsPayAtDoor(eventData.pay_at_door || false);
        setEventMinimumAge(eventData.minimum_age ?? null);
      }

      const { data: seatingTypes, error: seatingError } = await supabase
        .from('reservation_seating_types')
        .select('*')
        .eq('event_id', eventId)
        .eq('paused', false);

      if (seatingError) throw seatingError;

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
      // Don't pre-block the flow; backend handles preview fallback.
      setPaymentsReady(null);
    } catch (error) {
      console.error('Error fetching seating options:', error);
      toast.error(t.errorLoading);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Get min/max party size from selected seating type's tiers
  const getPartySizeLimits = () => {
    if (!selectedSeating || selectedSeating.tiers.length === 0) {
      return { min: minPartySize, max: maxPartySize };
    }
    const allMins = selectedSeating.tiers.map(t => t.min_people);
    const allMaxs = selectedSeating.tiers.map(t => t.max_people);
    return {
      min: Math.min(...allMins),
      max: Math.max(...allMaxs),
    };
  };

  const partySizeLimits = getPartySizeLimits();

  // Find the matching tier for the current party size
  const getMatchedTier = () => {
    if (!selectedSeating) return null;
    return selectedSeating.tiers.find(
      t => partySize >= t.min_people && partySize <= t.max_people
    ) ?? null;
  };

  const matchedTier = getMatchedTier();
  const isBottleTier = !!matchedTier && matchedTier.pricing_mode === 'bottles' && !!matchedTier.bottle_type && (matchedTier.bottle_count ?? 0) >= 1;

  // Customer-facing label: bottles → "2 Premium Bottles", amount → "€100"
  const bottleLabel = (count: number, type: 'bottle' | 'premium_bottle'): string => {
    const isPremium = type === 'premium_bottle';
    if (language === 'el') {
      const word = count === 1
        ? (isPremium ? 'Premium Bottle' : 'Bottle')
        : (isPremium ? 'Premium Bottles' : 'Bottles');
      return `${count} ${word}`;
    }
    const word = count === 1
      ? (isPremium ? 'Premium Bottle' : 'Bottle')
      : (isPremium ? 'Premium Bottles' : 'Bottles');
    return `${count} ${word}`;
  };

  // Calculate online price. For bottle tiers it is always 0 (paid at venue).
  const getPrice = (): number | null => {
    if (!matchedTier) return null;
    if (isBottleTier) return 0;
    return matchedTier.prepaid_min_charge_cents;
  };

  const price = getPrice();
  const subtotal = price || 0;
  const buyerPaysStripe = pricingDisplay?.showProcessingFee !== false;
  const stripeFeesCents = subtotal > 0 && buyerPaysStripe ? Math.ceil(subtotal * 0.029 + 25) : 0;
  // Platform fixed fee for reservation type
  const buyerPaysPlatformFee = pricingDisplay?.showPlatformFee === true;
  const platformFeeCents = buyerPaysPlatformFee ? (pricingDisplay?.fixedFeeReservationCents || 0) : 0;
  const total = subtotal + stripeFeesCents + platformFeeCents;

  // Handle checkout
  const handleCheckout = async () => {
    if (!selectedSeating || price === null) return;

    const trimmedName = reservationName.trim();
    const hasReservationName = trimmedName.length >= 2;
    const isLatinName = LATIN_RESERVATION_NAME_REGEX.test(trimmedName);
    const isPhoneValidNow = isValidPhone(phoneNumber.trim());
    const isEmailValidNow = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim());

    if (!hasReservationName) {
      toast.error(language === 'el' ? 'Συμπληρώστε όνομα κράτησης' : 'Please enter reservation name');
      return;
    }
    if (!isLatinName) {
      toast.error(language === 'el' ? 'Παρακαλώ χρησιμοποιήστε λατινικούς χαρακτήρες (π.χ. John Doe)' : LATIN_RESERVATION_NAME_MESSAGE);
      return;
    }
    if (!allGuestsFilled) {
      toast.error(t.fillAllGuests);
      return;
    }
    if (!isPhoneValidNow) {
      toast.error(language === 'el' ? 'Συμπληρώστε σωστό τηλέφωνο' : 'Please enter a valid phone number');
      return;
    }
    if (!isEmailValidNow) {
      toast.error(language === 'el' ? 'Συμπληρώστε σωστό email' : 'Please enter a valid email');
      return;
    }
    if (!termsAccepted) {
      toast.error(t.termsRequired);
      return;
    }

    setSubmitting(true);
    try {
      // PR Attribution: attach promoter ref if active for this business
      let promoterPayload: { promoter_session_id?: string; promoter_tracking_code?: string } = {};
      try {
        const { getActivePromoterRef } = await import('@/lib/promoterTracking');
        const pref = getActivePromoterRef();
        if (pref) {
          promoterPayload = {
            promoter_session_id: pref.session_id,
            promoter_tracking_code: pref.tracking_code,
          };
        }
      } catch { /* noop */ }

      // Pay at door OR €0 minimum charge: use free reservation flow (no Stripe)
      if (isPayAtDoor || price === 0) {
        const { data, error } = await supabase.functions.invoke('create-free-reservation-event', {
          body: {
            event_id: eventId,
            seating_type_id: selectedSeating.id,
            party_size: partySize,
            reservation_name: reservationName.trim(),
            customer_email: customerEmail.trim(),
            phone_number: phoneNumber.trim(),
            special_requests: specialRequests || null,
            guests: guests.map(g => ({
              name: g.name.trim(),
              age: parseInt(g.age) || 0,
            })),
            ...promoterPayload,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        // Fetch individual guest tickets for QR carousel
        let guestTickets: { guest_name: string; qr_code_token: string }[] = [];
        try {
          const { data: tickets } = await supabase
            .from('tickets')
            .select('guest_name, qr_code_token, order_id, ticket_orders!inner(linked_reservation_id)')
            .eq('ticket_orders.linked_reservation_id', data.reservation_id)
            .order('created_at');
          if (tickets && tickets.length > 0) {
            guestTickets = tickets.map(t => ({
              guest_name: t.guest_name || '',
              qr_code_token: t.qr_code_token,
            }));
          }
        } catch (e) {
          console.error('Failed to fetch guest tickets', e);
        }

        // Fallback: if no individual tickets found, use main reservation QR
        if (guestTickets.length === 0) {
          guestTickets = [{ guest_name: reservationName.trim(), qr_code_token: data.qr_code_token }];
        }

        setSuccessData({
          tickets: guestTickets,
          confirmationCode: data.confirmation_code,
          prepaidAmount: 0,
        });
        setSuccessIndex(0);
        toast.success(language === 'el' ? 'Η κράτησή σας ολοκληρώθηκε!' : 'Reservation completed!');
        return;
      }

      const edgeFunction = isDeferredPayment ? 'create-deferred-checkout' : 'create-reservation-event-checkout';

      const { data, error } = await supabase.functions.invoke(edgeFunction, {
        body: {
          event_id: eventId,
          seating_type_id: selectedSeating.id,
          party_size: partySize,
          reservation_name: reservationName.trim(),
          phone_number: phoneNumber.trim(),
          customer_email: customerEmail.trim(),
          special_requests: specialRequests || null,
          guests: guests.map(g => ({
            name: g.name.trim(),
            age: parseInt(g.age) || 0,
          })),
          ...promoterPayload,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Missing checkout URL');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error(language === 'el' ? 'Σφάλμα δημιουργίας πληρωμής' : 'Error creating checkout');
    } finally {
      setSubmitting(false);
    }
  };

  // REMOVED: handleFreeReservation - all reservations now go through Stripe

  // Guest helpers
  const updateGuest = (index: number, field: 'name' | 'age', value: string) => {
    setGuests(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };
  const minAge = getMinAge(eventId, eventMinimumAge);
  const allGuestsFilled = guests.every(g => g.name.trim() && g.age.trim() && !isNaN(Number(g.age)) && Number(g.age) >= minAge);

  // Validation
  const canProceedToStep2 = selectedSeating !== null;
  const isPhoneValid = isValidPhone(phoneNumber.trim());
  const isEmailValid = customerEmail.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim());
  const isReservationNameLatin = LATIN_RESERVATION_NAME_REGEX.test(reservationName.trim());
  const canProceedToStep3 = allGuestsFilled && reservationName.trim().length >= 2 && isReservationNameLatin && partySize > 0 && price !== null && isPhoneValid && isEmailValid;

  // Format price
  const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  // Dynamic step: after step 1, if not authenticated, show auth gate
  // step values: 1 = seating, 'auth' = auth gate, 'profile' = profile gate, 2 = details, 3 = review
  const getEffectiveStep = (): number | 'auth' | 'profile' => {
    if (step === 2 && !isAuthenticated) return 'auth';
    if (step === 2 && isAuthenticated && !profileComplete) return 'profile';
    return step;
  };
  const effectiveStep = getEffectiveStep();

  // Step content
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
        <InlineAuthGate onAuthSuccess={() => {
          // Auth state listener will update isAuthenticated
        }} />
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
      case 1: // Choose Seating Type
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {seatingOptions.map(option => {
              const remaining = Math.max(option.available_slots - option.slots_booked, 0);
              const isSoldOut = remaining <= 0;
              const isSelected = selectedSeating?.id === option.id;
              const colors = seatingTypeColors[option.seating_type];
              // Determine the cheapest tier label. If ANY tier is bottle-mode, show bottle label for it.
              const sortedTiers = [...option.tiers].sort((a, b) => a.min_people - b.min_people);
              const firstTier = sortedTiers[0];
              const firstTierIsBottles = !!firstTier && firstTier.pricing_mode === 'bottles' && !!firstTier.bottle_type && (firstTier.bottle_count ?? 0) >= 1;
              const minPrice = !firstTierIsBottles && option.tiers.length > 0
                ? Math.min(...option.tiers.filter(t => t.pricing_mode !== 'bottles').map(t => t.prepaid_min_charge_cents))
                : null;

              return (
                <Card
                  key={option.id}
                  className={cn(
                    "cursor-pointer transition-all",
                    isSoldOut && "opacity-50 cursor-not-allowed",
                    isSelected && `${colors.border} border-2 ring-2 ring-offset-2 ring-primary/20`,
                    !isSelected && !isSoldOut && "hover:border-primary/50"
                  )}
                  onClick={() => {
                    if (!isSoldOut) {
                      setSelectedSeating(option);
                      // Reset party size to the min of this seating type's tiers
                      if (option.tiers.length > 0) {
                        const minPeople = Math.min(...option.tiers.map(t => t.min_people));
                        setPartySize(minPeople);
                      }
                    }
                  }}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={cn("p-2 rounded-lg", colors.bg, colors.text)}>
                        {seatingTypeIcons[option.seating_type]}
                      </div>
                      {isSoldOut ? (
                        <Badge variant="destructive">{t.soldOut}</Badge>
                      ) : remaining <= 3 ? (
                        <Badge variant="secondary" className="text-foreground font-medium">
                          {remaining} {t.available}
                        </Badge>
                      ) : null}
                    </div>

                    <div>
                      <h4 className={cn("font-semibold", isSelected && colors.text)}>
                        {t.seatingTypes[option.seating_type as keyof typeof t.seatingTypes]}
                      </h4>
                      {firstTierIsBottles ? (
                        <p className="text-sm text-muted-foreground">
                          {`${t.from} ${bottleLabel(firstTier.bottle_count as number, firstTier.bottle_type as 'bottle' | 'premium_bottle')}`}
                        </p>
                      ) : minPrice !== null && minPrice !== undefined ? (
                        <p className="text-sm text-muted-foreground">
                          {isPayAtDoor
                            ? (language === 'el' ? `${t.from} ${formatPrice(minPrice)} στο κατάστημα` : `${t.from} ${formatPrice(minPrice)} at venue`)
                            : `${t.from} ${formatPrice(minPrice)}`
                          }
                        </p>
                      ) : null}
                    </div>

                  </CardContent>
                </Card>
              );
            })}
          </div>
        );

      case 2: // Details (merged: party size + prepayment + personal details)
        return (
          <div className="space-y-3">
            {/* Reservation Name */}
            <div className="space-y-1">
              <Label htmlFor="reservation_name" className="flex items-center gap-2 text-sm">
                <User className="h-3.5 w-3.5" />
                {t.name} *
              </Label>
              <Input
                id="reservation_name"
                autoComplete="off"
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
                  {language === 'el'
                    ? 'Παρακαλώ χρησιμοποιήστε λατινικούς χαρακτήρες (π.χ. John Doe)'
                    : LATIN_RESERVATION_NAME_MESSAGE}
                </p>
              )}
            </div>

            {/* Phone - show always for existing users, hide for fresh signup */}
            {!isFreshSignup && (
              <div className="space-y-1">
                <Label htmlFor="phone" className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5" />
                  {t.phone}
                </Label>
                <PhoneInput
                  id="phone"
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
                <Label htmlFor="email" className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5" />
                  {t.email}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="h-9 text-sm"
                />
              </div>
            )}

            {/* Party Size */}
            <div className="space-y-1">
              <Label className="flex items-center gap-2 text-sm">
                <Users className="h-3.5 w-3.5" />
                {t.partySize}
              </Label>
              <div className="rounded-lg border border-border bg-card px-2.5 py-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => setPartySize(Math.max(partySizeLimits.min, partySize - 1))}
                    disabled={partySize <= partySizeLimits.min}
                  >
                    -
                  </Button>
                  <span className="text-base font-semibold min-w-[2ch] text-center">
                    {partySize}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => setPartySize(Math.min(partySizeLimits.max, partySize + 1))}
                    disabled={partySize >= partySizeLimits.max}
                  >
                    +
                  </Button>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{t.people}</span>
                </div>
              </div>
            </div>

            {/* Guest Details */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {t.guestDetails} ({partySize} {t.people})
              </Label>
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {guests.map((guest, idx) => {
                  const ageVal = guest.age;
                  const ageNum = Number(ageVal);
                  const showAgeError = ageVal.length > 0 && !isNaN(ageNum) && ageNum < minAge;
                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-muted-foreground shrink-0 w-4 text-right">{idx + 1}.</span>
                        <Input
                          placeholder={t.guestName}
                          value={guest.name}
                          onChange={(e) => {
                            if (idx === 0 && profileName) return;
                            updateGuest(idx, 'name', e.target.value);
                          }}
                          className={`h-9 text-sm flex-1 ${idx === 0 && profileName ? 'bg-muted cursor-not-allowed' : ''}`}
                          readOnly={idx === 0 && !!profileName}
                        />
                        <Input
                          placeholder={t.guestAge}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={guest.age}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                            updateGuest(idx, 'age', val);
                          }}
                          className={cn("h-9 text-sm w-20", showAgeError && "border-destructive")}
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
            {matchedTier ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card">
                <span className="text-sm font-medium">
                  {language === 'el' ? 'Ελάχιστη κατανάλωση' : 'Minimum spend'}
                </span>
                <span className="text-base font-semibold text-foreground ml-3 shrink-0">
                  {isBottleTier
                    ? `${bottleLabel(matchedTier.bottle_count as number, matchedTier.bottle_type as 'bottle' | 'premium_bottle')} ${language === 'el' ? 'στο κατάστημα' : 'at venue'}`
                    : (isPayAtDoor
                        ? (language === 'el' ? `${formatPrice(price as number)} στο κατάστημα` : `${formatPrice(price as number)} at venue`)
                        : formatPrice(price as number))
                  }
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/5 border border-destructive text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {t.errorNoTier}
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

      case 3: // Review
        return (
          <div className="space-y-4">
            <h3 className="font-semibold">{t.summary}</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.event}</span>
                <span className="font-medium">{eventTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.date}</span>
                <span>{format(new Date(eventDate), 'PPP')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.location}</span>
                <span>{eventLocation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.seatingType}</span>
                <span className="flex items-center gap-2">
                  {selectedSeating && seatingTypeIcons[selectedSeating.seating_type]}
                  {selectedSeating && t.seatingTypes[selectedSeating.seating_type as keyof typeof t.seatingTypes]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.partySize}</span>
                <span>{partySize} {t.people}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.name}</span>
                <span>{reservationName}</span>
              </div>
            </div>

            <Separator />

            {isPayAtDoor && (
              <div className="rounded-lg border border-border bg-muted p-3 text-sm space-y-1">
                <p className="font-medium text-foreground flex items-center gap-1.5">
                  💰 {language === 'el' ? 'Πληρωμή στο Κατάστημα' : 'Pay at Venue'}
                </p>
                <p className="text-muted-foreground text-xs">
                  {language === 'el'
                    ? `Δεν απαιτείται online πληρωμή. Θα πληρώσετε ${price ? formatPrice(price) : ''} στο κατάστημα.`
                    : `No online payment required. You will pay ${price ? formatPrice(price) : ''} at the venue.`
                  }
                </p>
              </div>
            )}

            {!isPayAtDoor && isDeferredPayment && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-sm space-y-1">
                <p className="font-medium text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                  <Shield className="h-4 w-4" />
                  {language === 'el' ? 'Αναβαλλόμενη Πληρωμή' : 'Deferred Payment'}
                </p>
                <p className="text-amber-700 dark:text-amber-300 text-xs">
                  {language === 'el'
                    ? `Η κάρτα σας δεν θα χρεωθεί τώρα. Πρέπει να επιβεβαιώσετε την παρουσία σας ${deferredConfirmationHours} ώρες πριν την εκδήλωση. Σε περίπτωση μη επιβεβαίωσης, θα χρεωθεί τέλος ακύρωσης ${deferredCancellationFeePercent}% (${formatPrice(Math.round(total * deferredCancellationFeePercent / 100))}).`
                    : `Your card will not be charged now. You must confirm attendance ${deferredConfirmationHours}h before the event. If you don't confirm, a cancellation fee of ${deferredCancellationFeePercent}% (${formatPrice(Math.round(total * deferredCancellationFeePercent / 100))}) will apply.`
                  }
                </p>
              </div>
            )}

            <Separator />

            {isBottleTier && matchedTier ? (
              <div className="space-y-2">
                {isHybridEvent && (
                  <div className="rounded-lg border border-border bg-muted p-3 text-sm space-y-1">
                    <p className="font-medium text-foreground flex items-center gap-1.5">
                      🍾 {language === 'el' ? 'Πώς λειτουργεί η πληρωμή' : 'How payment works'}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {language === 'el'
                        ? `Η προπληρωμή αφαιρείται αυτόματα από τον τελικό λογαριασμό σας.`
                        : `The prepayment is automatically deducted from your final bill.`
                      }
                    </p>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {language === 'el' ? 'Ελάχιστη κατανάλωση' : 'Minimum consumption'}
                  </span>
                  <span className="font-semibold text-foreground">
                    {bottleLabel(matchedTier.bottle_count as number, matchedTier.bottle_type as 'bottle' | 'premium_bottle')}
                  </span>
                </div>
              </div>
            ) : isPayAtDoor ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {language === 'el' ? 'Ελάχιστη κατανάλωση' : 'Minimum spend'}
                  </span>
                  <span>{price ? formatPrice(subtotal) : '-'}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>{language === 'el' ? 'Online πληρωμή' : 'Online payment'}</span>
                  <span className="text-emerald-600">
                    {language === 'el' ? 'Δωρεάν' : 'Free'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t.prepaidAmount}</span>
                  <span>
                    {price ? formatPrice(subtotal) : '-'}
                  </span>
                </div>
                {!isDeferredPayment && platformFeeCents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.serviceFee}</span>
                    <span>{formatPrice(platformFeeCents)}</span>
                  </div>
                )}
                {!isDeferredPayment && stripeFeesCents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.processingFee}</span>
                    <span>{formatPrice(stripeFeesCents)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg">
                  <span>{t.total}</span>
                  <span className="text-foreground">
                    {isDeferredPayment
                      ? (language === 'el' ? 'Δέσμευση ' : 'Hold ') + formatPrice(total)
                      : formatPrice(total)
                    }
                  </span>
                </div>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {language === 'el'
                ? 'Κάθε άτομο θα λάβει ξεχωριστό QR code.'
                : 'Each person will receive an individual QR code.'}
            </p>

            <div className="flex items-start gap-2.5 pt-1">
              <Checkbox
                id="reservation-terms-accept"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                className="mt-0.5 rounded-[6px]"
              />
              <label htmlFor="reservation-terms-accept" className="text-[10px] sm:text-xs text-foreground/90 leading-relaxed cursor-pointer">
                {t.termsLabel}{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-foreground font-semibold underline underline-offset-2">{t.termsLink}</a>
                {' '}{t.andThe}{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-foreground font-semibold underline underline-offset-2">{t.privacyLink}</a>
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Navigation
  const renderNavigation = () => {
    // Hide navigation on auth/profile gates
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

    return (
      <div className="flex justify-between pt-4 gap-2">
        {step > 1 ? (
          <Button variant="outline" size="sm" className="text-xs px-3 h-9" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            {t.back}
          </Button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <Button
            size="sm"
            className="text-xs px-3 h-9"
            onClick={() => setStep(step + 1)}
            disabled={
              (step === 1 && !canProceedToStep2) ||
              (step === 2 && !canProceedToStep3)
            }
          >
            {t.next}
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        ) : (
          <Button
            size="sm"
            className="text-xs px-3 h-9 gap-1.5"
            onClick={handleCheckout}
            disabled={submitting || !selectedSeating || price === null || price === undefined || !termsAccepted}
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t.processing}
              </>
            ) : isPayAtDoor || isBottleTier ? (
              <>
                <Users className="h-3.5 w-3.5" />
                {language === 'el' ? 'Επιβεβαίωση Κράτησης' : 'Confirm Reservation'}
              </>
            ) : (
              <>
                <CreditCard className="h-3.5 w-3.5" />
                {isDeferredPayment
                  ? (language === 'el' ? `Δέσμευση ${formatPrice(total)}` : `Hold ${formatPrice(total)}`)
                  : `${t.pay} ${formatPrice(total)}`
                }
              </>
            )}
          </Button>
        )}
      </div>
    );
  };

  // Step indicator
  const stepIndicatorValue = effectiveStep === 'auth' || effectiveStep === 'profile' ? 1.5 : step;
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 pb-4">
      {[1, 2, 3].map(s => (
        <div
          key={s}
          className={cn(
            "w-2 h-2 rounded-full transition-colors",
            s === step && effectiveStep !== 'auth' && effectiveStep !== 'profile' ? "bg-primary w-4" : 
            s < step || (s === 1 && (effectiveStep === 'auth' || effectiveStep === 'profile')) ? "bg-primary/50" : 
            (effectiveStep === 'auth' || effectiveStep === 'profile') && s === 2 ? "bg-primary w-4" : "bg-muted"
          )}
        />
      ))}
    </div>
  );

  // Success Screen
  if (successData) {
    const currentTicket = successData.tickets[successIndex];
    const successContent = (
      <div className="space-y-4">
        <SuccessQRCard
          type="event_reservation"
          qrToken={currentTicket?.qr_code_token || ''}
          title={eventTitle}
          businessName=""
          language={language}
          reservationDate={eventDate}
          prepaidAmountCents={successData.prepaidAmount}
          guestName={currentTicket?.guest_name}
          showSuccessMessage={successIndex === 0}
          onViewDashboard={() => { navigate('/dashboard-user?tab=reservations'); onOpenChange(false); }}
          viewDashboardLabel={language === 'el' ? 'Οι Κρατήσεις Μου' : 'My Reservations'}
          onClose={() => { onSuccess?.(); onOpenChange(false); }}
        />
        {successData.tickets.length > 1 && (
          <div className="flex items-center justify-center gap-3 pb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSuccessIndex(Math.max(0, successIndex - 1))}
              disabled={successIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-foreground">
              {currentTicket?.guest_name} ({successIndex + 1}/{successData.tickets.length})
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSuccessIndex(Math.min(successData.tickets.length - 1, successIndex + 1))}
              disabled={successIndex === successData.tickets.length - 1}
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
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide [&_input]:!text-[16px] [&_textarea]:!text-[16px] md:[&_input]:!text-xs md:[&_textarea]:!text-xs">
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

export default ReservationEventCheckout;
