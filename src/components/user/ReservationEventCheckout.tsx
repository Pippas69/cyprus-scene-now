import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { 
  GlassWater, TableIcon, Crown, Sofa, Users, 
  Clock, Phone, User, MessageSquare, CreditCard, Mail,
  CheckCircle, ArrowRight, ArrowLeft, Loader2, Euro,
  AlertCircle, Calendar, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useProfileName } from '@/hooks/useProfileName';
import { SuccessQRCard } from '@/components/ui/SuccessQRCard';
import { InlineAuthGate } from '@/components/tickets/InlineAuthGate';
import { ProfileCompletionGate } from '@/components/tickets/ProfileCompletionGate';

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
}) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const t = translations[language];

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(userId);
  const [profileComplete, setProfileComplete] = useState(false);
  const [isFreshSignup, setIsFreshSignup] = useState(false);
  const [wasAuthenticatedOnMount, setWasAuthenticatedOnMount] = useState(false);

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
  const [deferredCancellationFeePercent, setDeferredCancellationFeePercent] = useState(50);
  const [deferredConfirmationHours, setDeferredConfirmationHours] = useState(4);

  // Success state for showing premium QR card
  const [successData, setSuccessData] = useState<{
    qrToken: string;
    confirmationCode: string;
    prepaidAmount: number;
  } | null>(null);

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
      // Check deferred payment status
      const { data: eventData } = await supabase
        .from('events')
        .select('deferred_payment_enabled, deferred_cancellation_fee_percent, deferred_confirmation_hours')
        .eq('id', eventId)
        .single();

      if (eventData) {
        setIsDeferredPayment(eventData.deferred_payment_enabled || false);
        setDeferredCancellationFeePercent(eventData.deferred_cancellation_fee_percent || 50);
        setDeferredConfirmationHours(eventData.deferred_confirmation_hours || 4);
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

      setSeatingOptions(optionsWithTiers);
      setSelectedSeating(prev => prev ? optionsWithTiers.find(option => option.id === prev.id) ?? null : prev);
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

  // Calculate price for current selection
  const getPrice = (): number | null => {
    if (!selectedSeating) return null;
    const tier = selectedSeating.tiers.find(
      t => partySize >= t.min_people && partySize <= t.max_people
    );
    return tier?.prepaid_min_charge_cents || null;
  };

  const price = getPrice();
  const subtotal = price || 0;
  const stripeFeesCents = subtotal > 0 ? Math.ceil(subtotal * 0.029 + 25) : 0;
  const total = subtotal + stripeFeesCents;

  // Handle checkout
  const handleCheckout = async () => {
    if (!selectedSeating || !price) return;

    const hasReservationName = reservationName.trim().length >= 2;
    const isPhoneValidNow = isValidPhone(phoneNumber.trim());
    const isEmailValidNow = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim());

    if (!hasReservationName) {
      toast.error(language === 'el' ? 'Συμπληρώστε όνομα κράτησης' : 'Please enter reservation name');
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
  const allGuestsFilled = guests.every(g => g.name.trim() && g.age.trim());

  // Validation
  const canProceedToStep2 = selectedSeating !== null;
  const isPhoneValid = isValidPhone(phoneNumber.trim());
  const isEmailValid = customerEmail.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim());
  const canProceedToStep3 = allGuestsFilled && reservationName.trim().length >= 2 && partySize > 0 && price !== null && isPhoneValid && isEmailValid;

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
          if (!wasAuthenticatedOnMount) {
            setIsFreshSignup(true);
            if (profile.phone) setPhoneNumber(profile.phone);
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) setCustomerEmail(user.email);
          }
          // Auto-fill first guest name from profile
          setGuests(prev => {
            const updated = [...prev];
            if (updated.length > 0) updated[0] = { ...updated[0], name: `${profile.firstName} ${profile.lastName}` };
            return updated;
          });
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
              const minPrice = option.tiers.length > 0 
                ? Math.min(...option.tiers.map(t => t.prepaid_min_charge_cents))
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
                      ) : (
                        <Badge variant="secondary">
                          {remaining} {t.available}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <h4 className={cn("font-semibold", isSelected && colors.text)}>
                        {t.seatingTypes[option.seating_type as keyof typeof t.seatingTypes]}
                      </h4>
                      {minPrice && (
                        <p className="text-sm text-muted-foreground">
                          {t.from} {formatPrice(minPrice)}
                        </p>
                      )}
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
              <Label htmlFor="name" className="flex items-center gap-2 text-sm">
                <User className="h-3.5 w-3.5" />
                {t.name} *
              </Label>
              <Input
                id="name"
                value={reservationName}
                onChange={(e) => setReservationName(e.target.value)}
                placeholder="John Doe"
                className="h-9 text-sm"
              />
            </div>

            {/* Phone - show always for existing users, hide for fresh signup */}
            {!isFreshSignup && (
              <div className="space-y-1">
                <Label htmlFor="phone" className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5" />
                  {t.phone}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+357 99 123456"
                  className="h-9 text-sm"
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
                {guests.map((guest, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
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
                      className="h-9 text-sm w-20"
                    />
                  </div>
                ))}
              </div>
            </div>
            {price ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card">
                <span className="text-sm font-medium">{t.prepaidAmount}</span>
                <span className="text-base font-semibold text-foreground ml-3 shrink-0">
                  {formatPrice(price)}
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

            {isDeferredPayment && (
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

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.prepaidAmount}</span>
                <span>
                  {price ? formatPrice(subtotal) : '-'}
                </span>
              </div>
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
      <div className="flex justify-between pt-4">
        {step > 1 ? (
          <Button variant="outline" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.back}
          </Button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={
              (step === 1 && !canProceedToStep2) ||
              (step === 2 && !canProceedToStep3)
            }
          >
            {t.next}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleCheckout}
            disabled={submitting || !selectedSeating || !price || !termsAccepted}
            className="gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.processing}
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
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
    const successContent = (
      <SuccessQRCard
        type="event_reservation"
        qrToken={successData.qrToken}
        title={eventTitle}
        businessName=""
        language={language}
        reservationDate={eventDate}
        prepaidAmountCents={successData.prepaidAmount}
        showSuccessMessage={true}
        onViewDashboard={() => { navigate('/dashboard-user?tab=reservations'); onOpenChange(false); }}
        viewDashboardLabel={language === 'el' ? 'Οι Κρατήσεις Μου' : 'My Reservations'}
        onClose={() => { onSuccess?.(); onOpenChange(false); }}
      />
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

export default ReservationEventCheckout;