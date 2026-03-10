import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Tag, Store, Clock, AlertCircle, Users, CheckCircle, CalendarDays, ChevronLeft, ChevronRight, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, isBefore, isToday } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { trackDiscountView } from "@/lib/analyticsTracking";
import { expandSlotsForDay, timeToMinutes } from "@/lib/timeSlots";
import { useClosedSlots } from "@/hooks/useClosedSlots";
import { useClosedDates } from "@/hooks/useClosedDates";
import { useSlotAvailability } from "@/hooks/useSlotAvailability";
import { SuccessQRCard } from "@/components/ui/SuccessQRCard";

interface TimeSlot {
  id?: string;
  timeFrom: string;
  timeTo: string;
  capacity: number;
  maxPartySize?: number;
  days: string[];
}

interface Offer {
  id: string;
  title: string;
  description: string | null;
  percent_off: number | null;
  category?: string | null;
  discount_type?: string | null;
  special_deal_text?: string | null;
  offer_type?: string | null;
  bonus_percent?: number | null;
  credit_amount_cents?: number | null;
  bundle_price_cents?: number | null;
  valid_days?: string[] | null;
  valid_start_time?: string | null;
  valid_end_time?: string | null;
  total_people?: number | null;
  people_remaining?: number | null;
  max_people_per_redemption?: number | null;
  one_per_user?: boolean | null;
  show_reservation_cta?: boolean | null;
  start_at?: string;
  end_at: string;
  terms?: string | null;
  business_id?: string;
  original_price_cents?: number | null;
  pricing_type?: string;
  requires_reservation?: boolean;
  businesses: {
    id?: string;
    name: string;
    logo_url: string | null;
    cover_url?: string | null;
    city?: string;
    accepts_direct_reservations?: boolean;
    reservation_time_slots?: TimeSlot[] | null;
    reservation_days?: string[] | null;
  };
}

interface OfferClaimDialogProps {
  offer: Offer | null;
  isOpen: boolean;
  onClose: () => void;
  language: "el" | "en";
}

interface ClaimSuccessData {
  purchaseId: string;
  qrCodeToken: string;
  partySize: number;
  offerTitle: string;
  businessName: string;
  businessLogo: string | null;
  businessId: string;
  hasReservation: boolean;
  reservationDate?: string;
  reservationTime?: string;
  guests?: {guest_name: string;qr_code_token: string;}[];
}

export function OfferPurchaseDialog({ offer: initialOffer, isOpen, onClose, language }: OfferClaimDialogProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [partySize, setPartySize] = useState(1);
  const [guestNames, setGuestNames] = useState<string[]>(['']);
  const [claimSuccess, setClaimSuccess] = useState<ClaimSuccessData | null>(null);
  const [currentGuestIndex, setCurrentGuestIndex] = useState(0);

  // Fresh offer data
  const [freshOffer, setFreshOffer] = useState<Offer | null>(null);
  const offer = freshOffer || initialOffer;

  // Reservation state
  const [wantsReservation, setWantsReservation] = useState(false);
  const [reservationDate, setReservationDate] = useState<Date | undefined>(undefined);
  const [reservationTime, setReservationTime] = useState<string>("");
  const [availableCapacity, setAvailableCapacity] = useState<number | null>(null);
  const [checkingCapacity, setCheckingCapacity] = useState(false);
  const [capacityError, setCapacityError] = useState<string | null>(null);

  const businessId = offer?.business_id || offer?.businesses?.id;
  const { closedSlots } = useClosedSlots(businessId, reservationDate);
  const { closedDates } = useClosedDates(businessId);

  // Fetch fresh offer data when dialog opens
  useEffect(() => {
    if (isOpen && initialOffer?.id) {
      const fetchFreshOffer = async () => {
        const { data, error } = await supabase.
        from('discounts').
        select(`
            id, title, description, percent_off, original_price_cents,
            start_at, end_at, business_id, terms, max_per_user,
            valid_days, valid_start_time, valid_end_time, category, discount_type, special_deal_text,
            total_people, people_remaining, max_people_per_redemption, one_per_user, show_reservation_cta, requires_reservation,
            offer_type, bonus_percent, credit_amount_cents, pricing_type, bundle_price_cents,
            businesses!inner (id, name, logo_url, cover_url, city, accepts_direct_reservations, reservation_time_slots, reservation_days)
          `).
        eq('id', initialOffer.id).
        single();

        if (!error && data) {
          setFreshOffer(data as unknown as Offer);
        }
      };
      fetchFreshOffer();
    }
  }, [isOpen, initialOffer?.id]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
      setAcceptedTerms(false);
      setPartySize(1);
      setGuestNames(['']);
      setClaimSuccess(null);
      setCurrentGuestIndex(0);
      setWantsReservation(false);
      setReservationDate(undefined);
      setReservationTime("");
      setAvailableCapacity(null);
      setCapacityError(null);
      setFreshOffer(null);
    }
  }, [isOpen]);

  // Sync guest names array with party size
  useEffect(() => {
    setGuestNames((prev) => {
      const newNames = [...prev];
      while (newNames.length < partySize) newNames.push('');
      return newNames.slice(0, partySize);
    });
  }, [partySize]);

  // Check capacity when date or time changes
  useEffect(() => {
    if (wantsReservation && reservationDate && reservationTime && offer?.business_id) {
      checkCapacity();
    } else if (wantsReservation && reservationDate && !reservationTime) {
      setAvailableCapacity(null);
      setCapacityError(null);
    }
  }, [wantsReservation, reservationDate, reservationTime, offer?.business_id]);

  const checkCapacity = async () => {
    if (!reservationDate || !reservationTime || !offer?.business_id) return;

    setCheckingCapacity(true);
    setCapacityError(null);

    try {
      const { data, error } = await supabase.rpc('get_slot_available_capacity', {
        p_business_id: offer.business_id,
        p_date: format(reservationDate, 'yyyy-MM-dd'),
        p_slot_time: reservationTime
      });

      if (error) throw error;

      const remaining = typeof data === 'number' ? data : Number(data ?? 0);
      setAvailableCapacity(remaining);
      if (remaining <= 0) {
        setCapacityError(language === "el" ? "Δεν υπάρχουν διαθέσιμες θέσεις" : "No available seats");
      }
    } catch (error) {
      console.error("Capacity check error:", error);
      setCapacityError(language === "el" ? "Σφάλμα ελέγχου διαθεσιμότητας" : "Error checking availability");
    } finally {
      setCheckingCapacity(false);
    }
  };

  const text = {
    title: { el: "Διεκδίκηση Προσφοράς", en: "Claim Offer" },
    successTitle: { el: "Η προσφορά σας είναι έτοιμη!", en: "Your offer is ready!" },
    name: { el: "Όνομα", en: "Name" },
    partySize: { el: "Αριθμός Ατόμων", en: "Number of People" },
    guestName: { el: "Όνομα", en: "Name" },
    validDays: { el: "Ισχύει", en: "Valid on" },
    validHours: { el: "Ώρες", en: "Hours" },
    expiresOn: { el: "Λήγει", en: "Expires" },
    spotsRemaining: { el: "Διαθέσιμες θέσεις", en: "Spots remaining" },
    terms: { el: "Όροι & Προϋποθέσεις", en: "Terms & Conditions" },
    acceptTerms: { el: "Αποδέχομαι τους όρους χρήσης", en: "I accept the terms of use" },
    walkInNote: { el: "Ισχύει για walk-in πελάτες χωρίς να εγγυάται θέση.", en: "Valid for walk-in customers without guaranteeing a seat." },
    claimOffer: { el: "Διεκδίκηση", en: "Claim" },
    cancel: { el: "Άκυρο", en: "Cancel" },
    processing: { el: "Επεξεργασία...", en: "Processing..." },
    errorAuth: { el: "Πρέπει να συνδεθείτε για να διεκδικήσετε", en: "You must be logged in to claim" },
    errorGeneric: { el: "Κάτι πήγε στραβά", en: "Something went wrong" },
    viewMyOffers: { el: "Οι Προσφορές μου", en: "My Offers" },
    validFor: { el: "Ισχύει για", en: "Valid for" },
    people: { el: "άτομα", en: "people" },
    person: { el: "άτομο", en: "person" },
    done: { el: "Τέλος", en: "Done" },
    drink: { el: "Ποτά", en: "Drinks" },
    food: { el: "Φαγητό", en: "Food" },
    account_total: { el: "Σύνολο Λογαριασμού", en: "Account Total" },
    everyDay: { el: "Κάθε μέρα", en: "Every day" },
    allDay: { el: "Όλη μέρα", en: "All day" },
    wantReservation: { el: "Θέλετε να κλείσετε τραπέζι στις ώρες έκπτωσης;", en: "Want to book a table during discount hours?" },
    selectDate: { el: "Επιλέξτε ημερομηνία", en: "Select date" },
    selectTime: { el: "Επιλέξτε ώρα", en: "Select time" },
    noSlotsForDay: { el: "Δεν υπάρχουν διαθέσιμα slots για αυτή την ημέρα", en: "No available slots for this day" }
  };

  const t = (key: keyof typeof text) => text[key][language];

  const dayTranslations: Record<string, Record<string, string>> = {
    monday: { el: "Δευτέρα", en: "Monday" },
    tuesday: { el: "Τρίτη", en: "Tuesday" },
    wednesday: { el: "Τετάρτη", en: "Wednesday" },
    thursday: { el: "Πέμπτη", en: "Thursday" },
    friday: { el: "Παρασκευή", en: "Friday" },
    saturday: { el: "Σάββατο", en: "Saturday" },
    sunday: { el: "Κυριακή", en: "Sunday" }
  };

  const getCategoryLabel = (category: string | null): string => {
    if (!category) return "";
    const key = category as keyof typeof text;
    return text[key]?.[language] || category;
  };

  const getCategoryIcon = (category: string | null): string => {
    const icons: Record<string, string> = {
      drink: "🍹",
      food: "🍽️",
      account_total: "💳"
    };
    return icons[category || ""] || "";
  };

  const formatDays = (days: string[] | null): string => {
    if (!days || days.length === 0 || days.length === 7) return t("everyDay");
    return days.map((d) => dayTranslations[d]?.[language] || d).join(", ");
  };

  const formatTimeRange = (start: string | null, end: string | null): string => {
    if (!start || !end) return t("allDay");
    return `${start.substring(0, 5)} - ${end.substring(0, 5)}`;
  };

  // Generate raw time slots
  const getRawTimeSlots = (): string[] => {
    if (!offer?.valid_start_time || !offer?.valid_end_time || !reservationDate) return [];

    const offerStartMins = timeToMinutes(offer.valid_start_time);
    const offerEndMins = timeToMinutes(offer.valid_end_time);
    const isOvernight = offerEndMins < offerStartMins;

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const selectedDay = dayNames[reservationDate.getDay()];

    const businessSlots = offer.businesses?.reservation_time_slots;
    const candidates = businessSlots && Array.isArray(businessSlots) ?
    expandSlotsForDay(businessSlots, selectedDay, 30) :
    [];

    if (candidates.length === 0) {
      const out: number[] = [];
      const start = offerStartMins;
      let end = offerEndMins;
      if (isOvernight) end += 1440;

      for (let t = start; t <= end; t += 30) {
        out.push((t % 1440 + 1440) % 1440);
      }

      return out.map((m) => {
        const hh = Math.floor(m / 60);
        const mm = m % 60;
        return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
      });
    }

    const valid = candidates.filter((time) => {
      const slotMins = timeToMinutes(time);
      if (isOvernight) return slotMins >= offerStartMins || slotMins < offerEndMins;
      return slotMins >= offerStartMins && slotMins <= offerEndMins;
    });

    return valid;
  };

  const rawTimeSlots = getRawTimeSlots();

  const { fullyBookedSlots, loading: availabilityLoading } = useSlotAvailability(
    businessId,
    reservationDate,
    rawTimeSlots
  );

  const isSlotPassed = (slotTime: string): boolean => {
    if (!reservationDate || !isToday(reservationDate)) return false;
    const now = new Date();
    const [hours, minutes] = slotTime.split(':').map(Number);
    const slotDate = new Date();
    slotDate.setHours(hours, minutes, 0, 0);
    return slotDate <= now;
  };

  const timeSlots = rawTimeSlots.filter((slot) => !fullyBookedSlots.has(slot) && !closedSlots.has(slot));

  // Clear reservationTime if selected slot is no longer available
  useEffect(() => {
    if (reservationTime && (closedSlots.has(reservationTime) || fullyBookedSlots.has(reservationTime) || isSlotPassed(reservationTime))) {
      const firstAvailableSlot = timeSlots.find((slot) => !isSlotPassed(slot));
      setReservationTime(firstAvailableSlot || "");
    }
  }, [closedSlots, fullyBookedSlots, reservationTime, reservationDate]);

  const isDateValidForOffer = (date: Date): boolean => {
    if (!offer) return false;

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endAtFull = new Date(offer.end_at);
    const endAt = new Date(endAtFull.getFullYear(), endAtFull.getMonth(), endAtFull.getDate());
    const startAtFull = offer.start_at ? new Date(offer.start_at) : new Date();
    const startAt = new Date(startAtFull.getFullYear(), startAtFull.getMonth(), startAtFull.getDate());

    if (dateOnly < startAt || dateOnly > endAt) return false;

    const dayIndex = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayIndex];

    if (offer.valid_days && offer.valid_days.length > 0 && offer.valid_days.length < 7) {
      if (!offer.valid_days.includes(dayName)) return false;
    }

    const businessSlots = offer.businesses?.reservation_time_slots;
    const businessDays = offer.businesses?.reservation_days;

    if (businessDays && businessDays.length > 0) {
      if (!businessDays.includes(dayName)) return false;
    }

    if (businessSlots && Array.isArray(businessSlots) && businessSlots.length > 0) {
      const hasSlotForDay = businessSlots.some((slot) => slot.days && slot.days.includes(dayName));
      if (!hasSlotForDay) return false;
    }

    const dateStr = format(date, 'yyyy-MM-dd');
    if (closedDates.has(dateStr)) return false;

    return true;
  };

  const closedDatesModifiers = {
    closed: (date: Date) => closedDates.has(format(date, 'yyyy-MM-dd')),
    unavailable: (date: Date) => !isDateValidForOffer(date)
  };

  const closedDatesModifiersStyles = {
    closed: { opacity: 0.35 },
    unavailable: { opacity: 0.35 }
  };

  if (!offer) return null;

  const maxPerRedemption = offer.max_people_per_redemption ?? null;
  const peopleRemaining = offer.people_remaining ?? offer.total_people ?? null;
  const maxSelectablePartySize = Math.min(maxPerRedemption ?? 10, peopleRemaining ?? 10);
  const discountDisplay = offer.discount_type === "special_deal" && offer.special_deal_text ?
  offer.special_deal_text :
  offer.percent_off ?
  `-${offer.percent_off}%` :
  null;

  const businessAcceptsReservations = offer.businesses?.accepts_direct_reservations === true;
  const showReservationOption = offer.show_reservation_cta === true && businessAcceptsReservations && businessId;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === "el" ? "el-GR" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  const handleClaim = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t("errorAuth"));
        return;
      }

      const requestBody: Record<string, unknown> = {
        discountId: offer.id,
        partySize,
        guestNames: guestNames.map((n) => n.trim()).filter(Boolean)
      };

      if (wantsReservation && reservationDate && reservationTime) {
        requestBody.withReservation = true;
        requestBody.reservationData = {
          preferred_date: format(reservationDate, 'yyyy-MM-dd'),
          preferred_time: reservationTime,
          party_size: partySize
        };
      }

      const { data, error } = await supabase.functions.invoke("claim-offer", {
        body: requestBody
      });

      const serverMsg = (data as any)?.success === false ?
      (data as any)?.error as string | undefined :
      undefined;

      if (error || serverMsg) {
        const rawBody = (error as any)?.context?.body;
        const parsedMsg = (() => {
          if (typeof rawBody === "string") {
            try {return JSON.parse(rawBody)?.error as string | undefined;}
            catch {return undefined;}
          }
          return undefined;
        })();

        const msg = serverMsg || parsedMsg || (error as any)?.message;
        const friendlyMsg =
        msg === "You have already claimed this offer" ?
        language === "el" ?
        "Έχετε ήδη διεκδικήσει αυτή την προσφορά. Δείτε την στις \"Οι Προσφορές μου\"." :
        "You already claimed this offer. Check it in \"My Offers\"." :
        msg || t("errorGeneric");

        toast.error(friendlyMsg);
        return;
      }

      if (data?.success) {
        setClaimSuccess({
          purchaseId: data.purchaseId,
          qrCodeToken: data.qrCodeToken,
          partySize: data.partySize,
          offerTitle: data.offerTitle,
          businessName: data.businessName,
          businessLogo: data.businessLogo,
          businessId: data.businessId,
          hasReservation: data.hasReservation || false,
          reservationDate: wantsReservation && reservationDate ? format(reservationDate, 'dd/MM/yyyy') : undefined,
          reservationTime: wantsReservation ? reservationTime : undefined,
          guests: data.guests || undefined
        });

        const successMsg = wantsReservation ?
        language === "el" ? "Η προσφορά διεκδικήθηκε με κράτηση!" : "Offer claimed with reservation!" :
        language === "el" ? "Η προσφορά διεκδικήθηκε!" : "Offer claimed!";
        toast.success(successMsg);
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewMyOffers = () => {
    onClose();
    navigate("/dashboard-user?tab=offers");
  };

  // Reservation section
  const ReservationSection = () => {
    if (!showReservationOption) return null;

    const canProceedWithReservation = wantsReservation && reservationDate && reservationTime &&
    availableCapacity !== null && availableCapacity >= partySize && !capacityError;

    return (
      <div className="space-y-2 sm:space-y-3">
        {/* Toggle - outside the box */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2 text-primary font-medium">
            <span className="text-xs sm:text-sm">{t("wantReservation")}</span>
          </div>
          <Checkbox
            id="want-reservation"
            checked={wantsReservation}
            onCheckedChange={(checked) => {
              setWantsReservation(checked === true);
              if (!checked) {
                setReservationDate(undefined);
                setReservationTime("");
                setAvailableCapacity(null);
                setCapacityError(null);
              }
            }} />
        </div>

        {/* Description + form fields - inside the box */}
        {wantsReservation &&
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
              {language === "el" ?
            `Κάντε κράτηση για τις ώρες της έκπτωσης (${formatTimeRange(offer.valid_start_time || null, offer.valid_end_time || null)}). ` :
            `Book a table during the discount hours (${formatTimeRange(offer.valid_start_time || null, offer.valid_end_time || null)}). `}
            </p>

            {/* Date Selection */}
            <div className="space-y-1.5">
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal text-xs sm:text-sm h-9">
                    <CalendarDays className="mr-2 h-3.5 w-3.5" />
                    {reservationDate ? format(reservationDate, 'dd/MM/yyyy') : t("selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                  <Calendar
                  mode="single"
                  selected={reservationDate}
                  onSelect={(date) => {
                    setReservationDate(date);
                    setReservationTime("");
                    setAvailableCapacity(null);
                    setCapacityError(null);
                  }}
                  disabled={(date) => {
                    if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;
                    if (!isDateValidForOffer(date)) return true;
                    return false;
                  }}
                  modifiers={closedDatesModifiers}
                  modifiersStyles={closedDatesModifiersStyles}
                  initialFocus />
                
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Selection */}
            {reservationDate &&
          <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">{t("selectTime")}</label>
                {availabilityLoading ?
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>{language === "el" ? "Φόρτωση..." : "Loading..."}</span>
                  </div> :
            timeSlots.length === 0 ?
            <p className="text-xs text-muted-foreground">{t("noSlotsForDay")}</p> :

            <div className="flex flex-wrap gap-1.5">
                    {timeSlots.map((slot) => {
                const isPassed = isSlotPassed(slot);
                return (
                  <Button
                    key={slot}
                    variant={reservationTime === slot ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7 px-2.5"
                    disabled={isPassed}
                    onClick={() => setReservationTime(slot)}>
                    
                          {slot}
                        </Button>);

              })}
                  </div>
            }
              </div>
          }

            {/* Capacity Check */}
            {checkingCapacity &&
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>{language === "el" ? "Έλεγχος διαθεσιμότητας..." : "Checking availability..."}</span>
              </div>
          }
            {capacityError &&
          <p className="text-xs text-destructive">{capacityError}</p>
          }
            {availableCapacity !== null && !capacityError && reservationTime &&
          <p className="text-xs text-green-600">
                {language === "el" ?
            `✓ Διαθέσιμες θέσεις: ${availableCapacity}` :
            `✓ Available seats: ${availableCapacity}`}
              </p>
          }
          </div>
        }
      </div>);

  };

  // === SUCCESS VIEW ===
  if (claimSuccess) {
    const hasGuests = claimSuccess.guests && claimSuccess.guests.length > 1;

    const successContent = hasGuests ?
    <div className="space-y-4">
        <SuccessQRCard
        type="offer"
        qrToken={claimSuccess.guests![currentGuestIndex]?.qr_code_token || claimSuccess.qrCodeToken}
        title={claimSuccess.offerTitle}
        businessName={claimSuccess.businessName}
        businessLogo={claimSuccess.businessLogo}
        language={language}
        guestName={claimSuccess.guests![currentGuestIndex]?.guest_name}
        discountPercent={offer.percent_off || undefined}
        expiryDate={offer.end_at}
        reservationDate={claimSuccess.reservationDate}
        reservationTime={claimSuccess.reservationTime}
        showSuccessMessage={currentGuestIndex === 0}
        onViewDashboard={handleViewMyOffers}
        viewDashboardLabel={t("viewMyOffers")}
        onClose={onClose} />
      
        {claimSuccess.guests!.length > 1 &&
      <div className="flex items-center justify-center gap-3 pb-2">
            <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentGuestIndex(Math.max(0, currentGuestIndex - 1))}
          disabled={currentGuestIndex === 0}>
          
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-foreground">
              {claimSuccess.guests![currentGuestIndex]?.guest_name} ({currentGuestIndex + 1}/{claimSuccess.guests!.length})
            </span>
            <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentGuestIndex(Math.min(claimSuccess.guests!.length - 1, currentGuestIndex + 1))}
          disabled={currentGuestIndex === claimSuccess.guests!.length - 1}>
          
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
      }
      </div> :

    <SuccessQRCard
      type="offer"
      qrToken={claimSuccess.guests?.[0]?.qr_code_token || claimSuccess.qrCodeToken}
      title={claimSuccess.offerTitle}
      businessName={claimSuccess.businessName}
      businessLogo={claimSuccess.businessLogo}
      language={language}
      guestName={claimSuccess.guests?.[0]?.guest_name || guestNames[0]?.trim() || undefined}
      discountPercent={offer.percent_off || undefined}
      purchaseDate={new Date().toISOString()}
      expiryDate={offer.end_at}
      showSuccessMessage={true}
      onViewDashboard={handleViewMyOffers}
      viewDashboardLabel={t("viewMyOffers")}
      onClose={onClose} />;



    if (isMobile) {
      return (
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className="max-h-[95vh] bg-transparent border-0">
            <DrawerHeader className="sr-only">
              <DrawerTitle>{t("successTitle")}</DrawerTitle>
              <DrawerDescription>Your offer has been claimed successfully</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6 overflow-y-auto">{successContent}</div>
          </DrawerContent>
        </Drawer>);

    }

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[85vw] sm:max-w-sm p-0 overflow-hidden border-0 bg-transparent">
          {successContent}
        </DialogContent>
      </Dialog>);

  }

  // === CLAIM FORM ===
  const canClaim = (peopleRemaining === null || peopleRemaining >= partySize) && !isLoading;
  const reservationValid = !wantsReservation || reservationDate && reservationTime && availableCapacity !== null && availableCapacity >= partySize && !capacityError;
  const claimEnabled = canClaim && reservationValid;

  const formContent =
  <div className="space-y-3">
      {/* Description */}
      {offer.description && (
        <p className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed">{offer.description}</p>
      )}

      {/* Row 1: Valid days + Category badge - same line */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 w-fit">
          <CalendarDays className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-[11px] sm:text-xs text-foreground font-medium">
            {formatDays(offer.valid_days || null)}
          </span>
        </div>
        {offer.category && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 w-fit">
            <span className="text-[11px] sm:text-xs">{getCategoryIcon(offer.category)}</span>
            <span className="text-[11px] sm:text-xs text-foreground font-medium">
              {getCategoryLabel(offer.category)}
            </span>
          </div>
        )}
      </div>

      {/* Row 2: Hours + Expiry */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 w-fit">
          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-[11px] sm:text-xs text-foreground font-medium">
            {formatTimeRange(offer.valid_start_time || null, offer.valid_end_time || null)}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 w-fit">
          <AlertCircle className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-[11px] sm:text-xs text-foreground">
            {t("expiresOn")}: {new Date(offer.end_at).toLocaleDateString(language === "el" ? "el-GR" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* Row 3: People available */}
      {peopleRemaining !== null && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 w-fit">
          <Users className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-[11px] sm:text-xs text-foreground font-medium">
            {peopleRemaining} {language === "el" ? "άτομα διαθέσιμα" : "spots left"}
          </span>
        </div>
      )}

      {/* One per user notice */}
      {offer.one_per_user && (
        <p className="text-[10px] sm:text-[11px] text-muted-foreground text-center">
          {language === "el" ? "⚡ Μία εξαργύρωση ανά χρήστη" : "⚡ One redemption per user"}
        </p>
      )}

      <Separator className="!my-1" />

      {/* Name + Party Size */}
      <div className="flex gap-3 items-end">
        <div className="flex-1 space-y-1.5">
          <Label className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-muted-foreground">
            <User className="h-3 w-3" />
            {t("name")}
          </Label>
          <Input
          value={guestNames[0] || ''}
          onChange={(e) => {
            const newNames = [...guestNames];
            newNames[0] = e.target.value;
            setGuestNames(newNames);
          }}
          placeholder={language === "el" ? "Το όνομά σας" : "Your name"}
          className="h-9 sm:h-10 text-xs sm:text-sm" />
        </div>
        <div className="w-[130px] space-y-1.5">
          <Label className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-muted-foreground">
            {t("partySize")}
          </Label>
          <Select value={partySize.toString()} onValueChange={(val) => setPartySize(parseInt(val))}>
            <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: maxSelectablePartySize }, (_, i) => i + 1).map((num) =>
            <SelectItem key={num} value={num.toString()}>
                  {num} {num === 1 ? t("person") : t("people")}
                </SelectItem>
            )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dynamic guest name fields */}
      {partySize > 1 &&
    <div className="space-y-2">
          {guestNames.slice(1).map((name, index) =>
      <Input
        key={index + 1}
        value={name}
        onChange={(e) => {
          const newNames = [...guestNames];
          newNames[index + 1] = e.target.value;
          setGuestNames(newNames);
        }}
        placeholder={`${language === "el" ? "Όνομα ατόμου" : "Guest name"} ${index + 2}`}
        className="h-9 sm:h-10 text-xs sm:text-sm" />
      )}
        </div>
    }

      {/* RESERVATION SECTION */}
      <ReservationSection />

      {/* Walk-in Note */}
      {!wantsReservation && (
        <p className="text-muted-foreground text-[11px] sm:text-xs text-center">
          {t("walkInNote")}
        </p>
      )}

      {/* Terms */}
      {offer.terms && (
        <div className="rounded-lg bg-muted/30 px-3 py-2">
          <p className="text-[10px] sm:text-[11px] text-muted-foreground/80 leading-relaxed">
            {offer.terms}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button variant="outline" onClick={onClose} className="flex-1 h-10 sm:h-11 text-xs sm:text-sm" disabled={isLoading}>
          {t("cancel")}
        </Button>
        <Button onClick={handleClaim} className="flex-1 h-10 sm:h-11 text-xs sm:text-sm font-semibold" disabled={!claimEnabled}>
          {isLoading ?
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("processing")}</> :
        <><Tag className="mr-2 h-4 w-4" />{t("claimOffer")}</>
        }
        </Button>
      </div>
    </div>;


  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="h-[90vh] flex flex-col">
          <DrawerHeader className="flex-shrink-0 border-b border-border/50 pb-3 px-4">
            <div className="flex items-center gap-3">
              {offer.businesses.logo_url ?
              <img src={offer.businesses.logo_url} alt={offer.businesses.name} className="w-11 h-11 rounded-xl object-cover ring-1 ring-border/50" /> :
              <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center ring-1 ring-border/50">
                  <Store className="h-5 w-5 text-muted-foreground" />
                </div>
              }
              <div className="flex-1 min-w-0">
                <DrawerTitle className="text-left text-sm font-bold leading-tight truncate">
                  {offer.title}
                </DrawerTitle>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{offer.businesses.name}</p>
              </div>
              {discountDisplay &&
              <Badge className="bg-primary text-primary-foreground shrink-0 text-sm font-bold h-7 px-2.5 rounded-lg">
                  {discountDisplay}
                </Badge>
              }
            </div>
            <DrawerDescription className="sr-only">Claim this offer</DrawerDescription>
          </DrawerHeader>
          
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {formContent}
          </div>
        </DrawerContent>
      </Drawer>);

  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="flex-shrink-0 p-5 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            {offer.businesses.logo_url ?
            <img src={offer.businesses.logo_url} alt={offer.businesses.name} className="w-12 h-12 rounded-xl object-cover ring-1 ring-border/50" /> :
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center ring-1 ring-border/50">
                <Store className="h-6 w-6 text-muted-foreground" />
              </div>
            }
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-left text-base sm:text-lg font-bold">
                {offer.title}
              </DialogTitle>
              <DialogDescription className="text-left text-sm mt-0.5">{offer.businesses.name}</DialogDescription>
            </div>
            {discountDisplay &&
            <Badge className="bg-primary text-primary-foreground shrink-0 text-base font-bold py-1.5 px-3 rounded-lg">
                {discountDisplay}
              </Badge>
            }
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-5">
          {formContent}
        </div>
      </DialogContent>
    </Dialog>);

}