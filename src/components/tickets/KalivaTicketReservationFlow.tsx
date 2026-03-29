import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CollapsibleSpecialRequests } from "@/components/ui/CollapsibleSpecialRequests";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isValidPhone } from "@/lib/phoneValidation";
import {
  GlassWater, TableIcon, Crown, Sofa, Users,
  Phone, User, MessageSquare, CreditCard, Mail,
  ArrowRight, ArrowLeft, Loader2, Info,
  AlertCircle, Ticket, ExternalLink, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { useProfileName } from '@/hooks/useProfileName';
import { InlineAuthGate } from './InlineAuthGate';
import { ProfileCompletionGate } from './ProfileCompletionGate';

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
  }[];
}

interface TicketTier {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
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
}

const translations = {
  el: {
    title: "Εισιτήριο & Κράτηση",
    steps: {
      seating: "Τύπος Θέσης",
      details: "Στοιχεία Παρέας",
      review: "Ανασκόπηση & Πληρωμή",
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
  },
  en: {
    title: "Ticket & Reservation",
    steps: {
      seating: "Seating Type",
      details: "Party Details",
      review: "Review & Pay",
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
}) => {
  const isMobile = useIsMobile();
  const { language } = useLanguage();
  const t = translations[language];
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

  // Auto-fill booker name (slot 0)
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const profileName = useProfileName(userId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setIsAuthenticated(!!data.user);
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

  // Min charge
  const [minChargeCents, setMinChargeCents] = useState<number | null>(null);

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

  // Update min charge when party size or seating changes
  useEffect(() => {
    if (!selectedSeating || selectedSeating.tiers.length === 0) {
      setMinChargeCents(null);
      return;
    }
    const matched = selectedSeating.tiers.find(t => partySize >= t.min_people && partySize <= t.max_people);
    if (matched) {
      setMinChargeCents(matched.prepaid_min_charge_cents);
    } else {
      const last = selectedSeating.tiers[selectedSeating.tiers.length - 1];
      if (partySize > last.max_people) {
        setMinChargeCents(last.prepaid_min_charge_cents);
      } else {
        setMinChargeCents(null);
      }
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

      setSeatingOptions(optionsWithTiers);
      setSelectedSeating(prev => prev ? optionsWithTiers.find(option => option.id === prev.id) ?? null : prev);
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
  const isFreeOrder = ticketTotal === 0;

  // Validation
  const canProceedToStep2 = selectedSeating !== null;
  const allGuestsFilled = guests.every(g => g.name.trim() && g.age.trim());
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim());
  const canProceedToStep3 = allGuestsFilled && partySize > 0 && isValidPhone(phoneNumber) && isEmailValid;

  // Dynamic step: auth/profile gate between step 1 and step 2
  const getEffectiveStep = (): number | 'auth' | 'profile' => {
    if (step === 2 && !isAuthenticated) return 'auth';
    if (step === 2 && isAuthenticated && !profileComplete) return 'profile';
    return step;
  };
  const effectiveStep = getEffectiveStep();

  const handleCheckout = async () => {
    if (!allGuestsFilled) {
      toast.error(t.fillAllGuests);
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
        customerEmail: customerEmail.trim() || user.email,
        customerPhone: phoneNumber.trim() || null,
        specialRequests: specialRequests.trim() || null,
        seatingTypeId: selectedSeating?.id || null,
        reservationName: reservationName.trim() || guests[0].name.trim(),
        guests: guests.map(g => ({
          name: g.name.trim(),
          age: parseInt(g.age) || 0,
        })),
      };

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
        const minPrice = option.tiers.length > 0
          ? Math.min(...option.tiers.map(t => t.prepaid_min_charge_cents))
          : null;

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
                ) : (
                  <Badge variant="secondary">{remaining} {t.available}</Badge>
                )}
              </div>
              <div>
                <h4 className={cn("font-semibold", isSelected && !isUnavailable && colors.text)}>
                  {t.seatingTypes[option.seating_type as keyof typeof t.seatingTypes] || option.seating_type}
                </h4>
                {minPrice != null && !isUnavailable && (
                  <p className="text-sm text-muted-foreground">{t.from} {formatPrice(minPrice)}</p>
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
          placeholder={language === 'el' ? "π.χ. Γιάννης Παπαδόπουλος" : "e.g. John Doe"}
          className="h-9 text-sm"
        />
      </div>

      {/* Party Size + Ticket Price - Same Row */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm">
            <Users className="h-3.5 w-3.5" />
            {t.partySize}
          </Label>
          {ticketTier && ticketPricePerPerson > 0 && (
            <Label className="text-sm text-primary font-medium">
              {language === 'el' ? 'Τιμή εισιτηρίων' : 'Ticket price'}
            </Label>
          )}
        </div>
        <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 p-2.5">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0"
              onClick={() => setPartySize(Math.max(partySizeLimits.min, partySize - 1))}
              disabled={partySize <= partySizeLimits.min}
            >-</Button>
            <span className="text-lg font-bold min-w-[2ch] text-center">{partySize}</span>
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0"
              onClick={() => setPartySize(Math.min(partySizeLimits.max, partySize + 1))}
              disabled={partySize >= partySizeLimits.max}
            >+</Button>
            <span className="text-sm text-muted-foreground whitespace-nowrap shrink-0">{t.people}</span>
          </div>
          {ticketTier && ticketPricePerPerson > 0 && (
            <span className="text-lg font-bold text-primary">{formatPrice(ticketTotal)}</span>
          )}
          {ticketTier && ticketPricePerPerson === 0 && (
            <span className="text-sm font-medium text-primary">{t.free}</span>
          )}
        </div>
      </div>

      {/* Min Charge Info */}
      {minChargeCents != null && minChargeCents > 0 && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted border border-border">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground whitespace-pre-line">
            <span className="font-medium text-foreground">{t.minimumCharge}: {formatPrice(minChargeCents)}</span>
            <br />
            {t.paidAtVenue}
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
            <div key={idx} className="flex gap-2 items-center">
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
                className="h-9 text-sm w-20"
              />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Phone */}
      <div className="space-y-1">
        <Label className="flex items-center gap-2 text-sm">
          <Phone className="h-3.5 w-3.5" />
          {t.phone}
        </Label>
        <Input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+357 99 123456"
          className="h-9 text-sm"
        />
      </div>

      {/* Email */}
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
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.phone}</span>
            <span>{phoneNumber}</span>
          </div>
        )}
      </div>

      <Separator />

      {/* Guest list */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{t.guestDetails}</p>
        {guests.map((g, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span>{i + 1}. {g.name}</span>
            <span className="text-muted-foreground">{t.age}: {g.age}</span>
          </div>
        ))}
      </div>

      <Separator />

      {/* Ticket cost */}
      <div className="space-y-2">
        {ticketTier && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t.ticketCost} ({partySize} × {formatPrice(ticketPricePerPerson)})
            </span>
            <span className="font-medium">{formatPrice(ticketTotal)}</span>
          </div>
        )}

        {minChargeCents != null && minChargeCents > 0 && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 border border-border">
            <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground whitespace-pre-line">
              {t.minimumCharge}: <strong className="text-foreground">{formatPrice(minChargeCents)}</strong>
              <br />{t.paidAtVenue}
            </div>
          </div>
        )}

        <Separator />
        <div className="flex justify-between font-bold text-lg">
          <span>{t.total}</span>
          <span className="text-primary">{isFreeOrder ? t.free : formatPrice(ticketTotal)}</span>
        </div>
      </div>

      {/* QR info */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
        <Ticket className="h-4 w-4 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">{t.eachPersonGetsQR}</p>
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
        <ProfileCompletionGate onComplete={(profile) => {
          setProfileComplete(true);
          // Only auto-fill first guest name from profile
          setGuests(prev => {
            const updated = [...prev];
            if (updated.length > 0) updated[0] = { ...updated[0], name: `${profile.firstName} ${profile.lastName}` };
            return updated;
          });
          // Phone and email are left empty for the user to fill
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
          <Button onClick={handleCheckout} disabled={submitting} className="gap-2">
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{t.processing}</>
            ) : isFreeOrder ? (
              <><Ticket className="h-4 w-4" />{t.getTickets}</>
            ) : (
              <><CreditCard className="h-4 w-4" />{t.pay} {formatPrice(ticketTotal)}</>
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
      <div className="text-center mb-4">
        <Badge variant="outline">
          {effectiveStep === 'auth' 
            ? (language === 'el' ? 'Σύνδεση' : 'Sign In')
            : effectiveStep === 'profile'
            ? (language === 'el' ? 'Στοιχεία Προφίλ' : 'Profile Details')
            : Object.values(t.steps)[step - 1]}
        </Badge>
      </div>
      {renderStepContent()}
      {!loading && seatingOptions.length > 0 && renderNavigation()}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{t.title}</DrawerTitle>
            <DrawerDescription>{eventTitle}</DrawerDescription>
          </DrawerHeader>
          <div ref={scrollRef} className="px-4 pb-6 overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
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
