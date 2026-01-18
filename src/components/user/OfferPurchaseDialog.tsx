import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Tag, Store, Clock, AlertCircle, Users, CheckCircle, QrCode, CalendarCheck, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import QRCodeLib from "qrcode";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, addDays, isAfter, isBefore, parse } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { trackDiscountView } from "@/lib/analyticsTracking";

interface TimeSlot {
  id?: string;
  timeFrom: string;
  timeTo: string;
  capacity: number;
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
}

export function OfferPurchaseDialog({ offer, isOpen, onClose, language }: OfferClaimDialogProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [partySize, setPartySize] = useState(1);
  const [claimSuccess, setClaimSuccess] = useState<ClaimSuccessData | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  
  // Reservation state - BEFORE claim
  const [wantsReservation, setWantsReservation] = useState(false);
  const [reservationDate, setReservationDate] = useState<Date | undefined>(undefined);
  const [reservationTime, setReservationTime] = useState<string>("");
  const [availableCapacity, setAvailableCapacity] = useState<number | null>(null);
  const [checkingCapacity, setCheckingCapacity] = useState(false);
  const [capacityError, setCapacityError] = useState<string | null>(null);

  // Track when offer dialog is opened (this is when a "view" occurs)
  const hasTrackedView = useRef(false);
  
  // Track offer view when dialog opens
  useEffect(() => {
    if (isOpen && offer?.id && !hasTrackedView.current) {
      hasTrackedView.current = true;
      // Track the offer view - this is when the user actually sees the offer details
      trackDiscountView(offer.id, 'direct');
    }
    
    if (!isOpen) {
      hasTrackedView.current = false;
    }
  }, [isOpen, offer?.id]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
      setAcceptedTerms(false);
      setPartySize(1);
      setClaimSuccess(null);
      setQrCodeDataUrl(null);
      setWantsReservation(false);
      setReservationDate(undefined);
      setReservationTime("");
      setAvailableCapacity(null);
      setCapacityError(null);
    }
  }, [isOpen]);

  // Generate QR code when claim succeeds
  useEffect(() => {
    if (claimSuccess?.qrCodeToken) {
      QRCodeLib.toDataURL(claimSuccess.qrCodeToken, {
        width: 200,
        margin: 2,
        color: { dark: "#0d3b66", light: "#ffffff" },
      }).then(setQrCodeDataUrl);
    }
  }, [claimSuccess?.qrCodeToken]);

  // Check capacity when date changes and user wants reservation
  useEffect(() => {
    if (wantsReservation && reservationDate && offer?.business_id) {
      checkCapacity();
    }
  }, [wantsReservation, reservationDate, offer?.business_id]);

  const checkCapacity = async () => {
    if (!reservationDate || !offer?.business_id) return;
    
    setCheckingCapacity(true);
    setCapacityError(null);
    
    try {
      const { data, error } = await supabase.rpc('get_business_available_capacity', {
        p_business_id: offer.business_id,
        p_date: format(reservationDate, 'yyyy-MM-dd'),
      });

      if (error) throw error;

      const capacityData = data as { available?: boolean; remaining_capacity?: number; reason?: string } | null;
      
      if (!capacityData?.available) {
        setCapacityError(capacityData?.reason || (language === "el" ? "Δεν υπάρχει διαθεσιμότητα" : "No availability"));
        setAvailableCapacity(0);
      } else {
        setAvailableCapacity(capacityData.remaining_capacity ?? 999);
        if (capacityData.remaining_capacity === 0) {
          setCapacityError(language === "el" ? "Δεν υπάρχουν διαθέσιμες κρατήσεις" : "No available reservations");
        }
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
    partySize: { el: "Αριθμός Ατόμων", en: "Number of People" },
    validDays: { el: "Ισχύει", en: "Valid on" },
    validHours: { el: "Ώρες", en: "Hours" },
    expiresOn: { el: "Λήγει", en: "Expires" },
    spotsRemaining: { el: "Διαθέσιμες θέσεις", en: "Spots remaining" },
    terms: { el: "Όροι & Προϋποθέσεις", en: "Terms & Conditions" },
    acceptTerms: { el: "Αποδέχομαι τους όρους χρήσης", en: "I accept the terms of use" },
    walkInNote: { el: "Ισχύει για walk-in πελάτες. Δεν εγγυάται θέση.", en: "Valid for walk-in customers. Does not guarantee a seat." },
    claimOffer: { el: "Διεκδίκηση", en: "Claim" },
    cancel: { el: "Άκυρο", en: "Cancel" },
    processing: { el: "Επεξεργασία...", en: "Processing..." },
    errorAuth: { el: "Πρέπει να συνδεθείτε για να διεκδικήσετε", en: "You must be logged in to claim" },
    errorGeneric: { el: "Κάτι πήγε στραβά", en: "Something went wrong" },
    showQrCode: { el: "Δείξτε αυτόν τον κωδικό QR στο κατάστημα", en: "Show this QR code at the venue" },
    emailSent: { el: "Email στάλθηκε με τον κωδικό QR", en: "Email sent with QR code" },
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
    wantReservation: { el: "Θέλετε να κλείσετε τραπέζι;", en: "Want to book a table?" },
    reservationNote: { el: "Κάντε κράτηση για τις ώρες της έκπτωσης για να εξασφαλίσετε θέση.", en: "Make a reservation for discount hours to secure a seat." },
    makeReservation: { el: "Κάνε Κράτηση για Έκπτωση", en: "Book for Discount Hours" },
    selectDate: { el: "Επιλέξτε ημερομηνία", en: "Select date" },
    selectTime: { el: "Επιλέξτε ώρα", en: "Select time" },
    noAvailability: { el: "Δεν υπάρχουν διαθέσιμες κρατήσεις", en: "No available reservations" },
    reservationConfirmed: { el: "Κράτηση επιβεβαιωμένη", en: "Reservation confirmed" },
    walkInOnly: { el: "Μόνο walk-in", en: "Walk-in only" },
    withReservation: { el: "Με κράτηση", en: "With reservation" },
    noSlotsForDay: { el: "Δεν υπάρχουν διαθέσιμα slots για αυτή την ημέρα", en: "No available slots for this day" },
    policyTitle: { el: "Πολιτική Κρατήσεων", en: "Reservation Policy" },
    noShowPolicy: { el: "15 λεπτά περιθώριο - αυτόματη ακύρωση αν δεν γίνει check-in", en: "15 min grace period - auto-cancelled if no check-in" },
    cancellationPolicy: { el: "Δωρεάν ακύρωση μέχρι 1 ώρα πριν", en: "Free cancellation up to 1 hour before" },
    instantConfirmation: { el: "Άμεση επιβεβαίωση κράτησης", en: "Instant reservation confirmation" },
  };

  const t = (key: keyof typeof text) => text[key][language];

  const dayTranslations: Record<string, Record<string, string>> = {
    monday: { el: "Δευτέρα", en: "Monday" },
    tuesday: { el: "Τρίτη", en: "Tuesday" },
    wednesday: { el: "Τετάρτη", en: "Wednesday" },
    thursday: { el: "Πέμπτη", en: "Thursday" },
    friday: { el: "Παρασκευή", en: "Friday" },
    saturday: { el: "Σάββατο", en: "Saturday" },
    sunday: { el: "Κυριακή", en: "Sunday" },
  };

  const dayToEnglish: Record<string, string> = {
    monday: "monday",
    tuesday: "tuesday",
    wednesday: "wednesday",
    thursday: "thursday",
    friday: "friday",
    saturday: "saturday",
    sunday: "sunday",
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
      account_total: "💳",
    };
    return icons[category || ""] || "";
  };

  const formatDays = (days: string[] | null): string => {
    if (!days || days.length === 0 || days.length === 7) return t("everyDay");
    return days.map(d => dayTranslations[d]?.[language] || d).join(", ");
  };

  const formatTimeRange = (start: string | null, end: string | null): string => {
    if (!start || !end) return t("allDay");
    return `${start.substring(0, 5)} - ${end.substring(0, 5)}`;
  };

  // Generate available time slots - intersect offer hours with business reservation slots
  const getAvailableTimeSlots = (): string[] => {
    if (!offer?.valid_start_time || !offer?.valid_end_time) return [];
    
    const offerStartHour = parseInt(offer.valid_start_time.substring(0, 2));
    const offerStartMin = parseInt(offer.valid_start_time.substring(3, 5)) || 0;
    const offerEndHour = parseInt(offer.valid_end_time.substring(0, 2));
    const offerEndMin = parseInt(offer.valid_end_time.substring(3, 5)) || 0;
    
    // Convert offer times to minutes for easier comparison
    const offerStartMins = offerStartHour * 60 + offerStartMin;
    const offerEndMins = offerEndHour * 60 + offerEndMin;
    
    // If business has configured reservation slots, use them
    const businessSlots = offer.businesses?.reservation_time_slots;
    
    if (businessSlots && Array.isArray(businessSlots) && businessSlots.length > 0 && reservationDate) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const selectedDay = dayNames[reservationDate.getDay()];
      
      // Filter slots that are active for the selected day AND overlap with offer hours
      const validSlots: string[] = [];
      
      for (const slot of businessSlots) {
        // Check if slot is active for this day
        if (!slot.days || !slot.days.includes(selectedDay)) continue;
        
        const slotTime = slot.timeFrom;
        const slotHour = parseInt(slotTime.substring(0, 2));
        const slotMin = parseInt(slotTime.substring(3, 5)) || 0;
        const slotMins = slotHour * 60 + slotMin;
        
        // Handle overnight offers (e.g., 22:00 - 04:00)
        const isOvernight = offerEndMins < offerStartMins;
        
        let isWithinOfferHours = false;
        if (isOvernight) {
          // Slot is valid if it's after start OR before end
          isWithinOfferHours = slotMins >= offerStartMins || slotMins <= offerEndMins;
        } else {
          // Normal case: slot must be between start and end
          isWithinOfferHours = slotMins >= offerStartMins && slotMins <= offerEndMins;
        }
        
        if (isWithinOfferHours) {
          validSlots.push(slotTime.substring(0, 5));
        }
      }
      
      return [...new Set(validSlots)].sort();
    }
    
    // Fallback: Generate hourly slots based on offer hours only
    const slots: string[] = [];
    
    // Handle overnight offers (e.g., 22:00 - 04:00)
    if (offerEndHour < offerStartHour) {
      // From start to midnight
      for (let h = offerStartHour; h < 24; h++) {
        slots.push(`${h.toString().padStart(2, '0')}:00`);
      }
      // From midnight to end
      for (let h = 0; h <= offerEndHour; h++) {
        slots.push(`${h.toString().padStart(2, '0')}:00`);
      }
    } else {
      for (let h = offerStartHour; h <= offerEndHour; h++) {
        slots.push(`${h.toString().padStart(2, '0')}:00`);
      }
    }
    
    return slots;
  };

  // Check if a date is valid for this offer (within valid_days and date range)
  // AND has business reservation slots available for that day
  const isDateValidForOffer = (date: Date): boolean => {
    if (!offer) return false;
    
    // Check if within offer date range
    const endAt = new Date(offer.end_at);
    const startAt = offer.start_at ? new Date(offer.start_at) : new Date();
    if (isBefore(date, startAt) || isAfter(date, endAt)) return false;
    
    // Check if day is in offer's valid_days
    const dayIndex = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayIndex];
    
    if (offer.valid_days && offer.valid_days.length > 0 && offer.valid_days.length < 7) {
      if (!offer.valid_days.includes(dayName)) return false;
    }
    
    // Check if business has reservation slots for this day
    const businessSlots = offer.businesses?.reservation_time_slots;
    const businessDays = offer.businesses?.reservation_days;
    
    if (businessDays && businessDays.length > 0) {
      if (!businessDays.includes(dayName)) return false;
    }
    
    // If business has specific slots, check if any are active for this day
    if (businessSlots && Array.isArray(businessSlots) && businessSlots.length > 0) {
      const hasSlotForDay = businessSlots.some(slot => slot.days && slot.days.includes(dayName));
      if (!hasSlotForDay) return false;
    }
    
    return true;
  };

  if (!offer) return null;

  const maxPerRedemption = offer.max_people_per_redemption || 5;
  const peopleRemaining = offer.people_remaining ?? offer.total_people ?? 999;
  const discountDisplay = offer.discount_type === "special_deal" && offer.special_deal_text
    ? offer.special_deal_text
    : offer.percent_off
      ? `-${offer.percent_off}%`
      : null;

  const businessId = offer.business_id || offer.businesses?.id;
  const businessAcceptsReservations = offer.businesses?.accepts_direct_reservations === true;
  // Show reservation option on ALL offers if business accepts reservations
  const showReservationOption = businessAcceptsReservations && businessId;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === "el" ? "el-GR" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
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

      // Build request body
      const requestBody: any = { 
        discountId: offer.id, 
        partySize,
      };

      // If user wants reservation, include reservation data
      if (wantsReservation && reservationDate && reservationTime) {
        requestBody.withReservation = true;
        requestBody.reservationData = {
          preferred_date: format(reservationDate, 'yyyy-MM-dd'),
          preferred_time: reservationTime,
          party_size: partySize,
        };
      }

      const { data, error } = await supabase.functions.invoke("claim-offer", {
        body: requestBody,
      });

      const serverMsg = (data as any)?.success === false
        ? ((data as any)?.error as string | undefined)
        : undefined;

      if (error || serverMsg) {
        const rawBody = (error as any)?.context?.body;
        const parsedMsg = (() => {
          if (typeof rawBody === "string") {
            try { return JSON.parse(rawBody)?.error as string | undefined; }
            catch { return undefined; }
          }
          return undefined;
        })();

        const msg = serverMsg || parsedMsg || (error as any)?.message;
        const friendlyMsg =
          msg === "You have already claimed this offer"
            ? language === "el"
              ? "Έχετε ήδη διεκδικήσει αυτή την προσφορά. Δείτε την στις \"Οι Προσφορές μου\"."
              : "You already claimed this offer. Check it in \"My Offers\"."
            : msg || t("errorGeneric");

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
        });
        
        const successMsg = wantsReservation 
          ? (language === "el" ? "Η προσφορά διεκδικήθηκε με κράτηση!" : "Offer claimed with reservation!")
          : (language === "el" ? "Η προσφορά διεκδικήθηκε!" : "Offer claimed!");
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

  // Reservation section that appears BEFORE claiming
  const ReservationSection = () => {
    if (!showReservationOption) return null;

    const timeSlots = getAvailableTimeSlots();
    const canProceedWithReservation = wantsReservation && reservationDate && reservationTime && 
      availableCapacity !== null && availableCapacity >= partySize && !capacityError;

    return (
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-medium">
            <CalendarCheck className="h-5 w-5" />
            <span>{t("wantReservation")}</span>
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
            }}
          />
        </div>
        
        <p className="text-sm text-muted-foreground">
          {language === "el"
            ? `Κάντε κράτηση για τις ώρες που ισχύει η έκπτωση (${offer?.valid_start_time?.substring(0, 5) || ""} - ${offer?.valid_end_time?.substring(0, 5) || ""}) για να εξασφαλίσετε θέση.`
            : `Make a reservation for the discount hours (${offer?.valid_start_time?.substring(0, 5) || ""} - ${offer?.valid_end_time?.substring(0, 5) || ""}) to secure a seat.`}
        </p>

        {wantsReservation && (
          <div className="space-y-3 pt-2">
            {/* Policy Info */}
            <div className="bg-background/80 border rounded-lg p-2.5 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{t("policyTitle")}</p>
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <span>{t("instantConfirmation")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span>{t("noShowPolicy")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span>{t("cancellationPolicy")}</span>
                </div>
              </div>
            </div>

            {/* Date Picker */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {t("selectDate")}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {reservationDate 
                      ? format(reservationDate, "PPP", { locale: language === "el" ? el : enUS })
                      : t("selectDate")
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={reservationDate}
                    onSelect={setReservationDate}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return isBefore(date, today) || !isDateValidForOffer(date);
                    }}
                    initialFocus
                    locale={language === "el" ? el : enUS}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Selector */}
            {reservationDate && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t("selectTime")}
                </Label>
                {timeSlots.length === 0 ? (
                  <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground text-center">
                    {t("noSlotsForDay")}
                  </div>
                ) : (
                  <Select value={reservationTime} onValueChange={setReservationTime}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectTime")} />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Capacity Status */}
            {reservationDate && (
              <div className="text-sm">
                {checkingCapacity ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{language === "el" ? "Έλεγχος διαθεσιμότητας..." : "Checking availability..."}</span>
                  </div>
                ) : capacityError ? (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{capacityError}</span>
                  </div>
                ) : availableCapacity !== null && availableCapacity > 0 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      {language === "el" 
                        ? `${availableCapacity} διαθέσιμες θέσεις` 
                        : `${availableCapacity} available slots`}
                    </span>
                  </div>
                ) : null}
              </div>
            )}

            {/* Warning if party size exceeds capacity */}
            {availableCapacity !== null && availableCapacity > 0 && availableCapacity < partySize && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>
                  {language === "el"
                    ? `Μόνο ${availableCapacity} θέσεις διαθέσιμες. Μειώστε τον αριθμό ατόμων.`
                    : `Only ${availableCapacity} slots available. Reduce party size.`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Success View
  if (claimSuccess) {
    const content = (
      <>
        <div className="space-y-4">
          {/* Offer Info */}
          <div className="flex items-center gap-3">
            {claimSuccess.businessLogo ? (
              <img
                src={claimSuccess.businessLogo}
                alt={claimSuccess.businessName}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <Store className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <h3 className="font-semibold">{claimSuccess.offerTitle}</h3>
              <p className="text-sm text-muted-foreground">{claimSuccess.businessName}</p>
            </div>
          </div>

          <Separator />

          {/* QR Code */}
          <div className="flex flex-col items-center py-4">
            <div className="bg-white p-4 rounded-xl border-2 border-primary/20 shadow-sm">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
              <QrCode className="h-4 w-4" />
              <span>{t("showQrCode")}</span>
            </div>
          </div>

          {/* Party Size Badge */}
          <div className="flex justify-center">
            <Badge variant="secondary" className="text-sm py-1 px-3">
              <Users className="h-4 w-4 mr-2" />
              {t("validFor")} {claimSuccess.partySize}{" "}
              {claimSuccess.partySize === 1 ? t("person") : t("people")}
            </Badge>
          </div>

          {/* Reservation Confirmation */}
          {claimSuccess.hasReservation && claimSuccess.reservationDate && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg justify-center">
              <CalendarCheck className="h-4 w-4" />
              <span>
                {language === "el" 
                  ? `Κράτηση: ${claimSuccess.reservationDate} στις ${claimSuccess.reservationTime}`
                  : `Reservation: ${claimSuccess.reservationDate} at ${claimSuccess.reservationTime}`}
              </span>
            </div>
          )}

          {/* Email Confirmation */}
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg justify-center">
            <CheckCircle className="h-4 w-4" />
            <span>{t("emailSent")}</span>
          </div>

          {/* Walk-in Note - only show if NO reservation */}
          {!claimSuccess.hasReservation && (
            <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{t("walkInNote")}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button onClick={handleViewMyOffers} variant="outline" className="w-full">
              <Tag className="mr-2 h-4 w-4" />
              {t("viewMyOffers")}
            </Button>

            <Button onClick={onClose} variant="ghost" className="w-full">
              {t("done")}
            </Button>
          </div>
        </div>
      </>
    );

    if (isMobile) {
      return (
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className="max-h-[95vh]">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                {t("successTitle")}
              </DrawerTitle>
              <DrawerDescription className="sr-only">Your offer has been claimed successfully</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6 overflow-y-auto">{content}</div>
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              {t("successTitle")}
            </DialogTitle>
            <DialogDescription className="sr-only">Your offer has been claimed successfully</DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  // Check if claim button should be enabled
  const canClaim = acceptedTerms && peopleRemaining >= partySize && !isLoading;
  const reservationValid = !wantsReservation || (reservationDate && reservationTime && availableCapacity !== null && availableCapacity >= partySize && !capacityError);
  const claimEnabled = canClaim && reservationValid;

  // Claim Form View
  const formContent = (
    <div className="space-y-4">
      {/* Description if exists */}
      {offer.description && (
        <p className="text-sm text-muted-foreground">{offer.description}</p>
      )}

      {/* Category badge */}
      {offer.category && (
        <Badge variant="outline" className="text-xs w-fit">
          {getCategoryIcon(offer.category)} {getCategoryLabel(offer.category)}
        </Badge>
      )}

      <Separator />

      {/* Party Size Selector */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          {t("partySize")}
        </Label>
        <Select value={partySize.toString()} onValueChange={(val) => setPartySize(parseInt(val))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: Math.min(maxPerRedemption, peopleRemaining) }, (_, i) => i + 1).map((num) => (
              <SelectItem key={num} value={num.toString()}>
                {num} {num === 1 ? t("person") : t("people")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Availability Info */}
      <div className="bg-muted/30 rounded-lg p-3 space-y-2">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <Users className="h-4 w-4" />
          {language === "el" ? "Διαθεσιμότητα" : "Availability"}
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">{language === "el" ? "Διαθέσιμα" : "Available"}</span>
            <span className="font-medium">
              {peopleRemaining} {language === "el" ? "άτομα" : "people"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">{language === "el" ? "Μέγ. ανά εξαργύρωση" : "Max per redemption"}</span>
            <span className="font-medium">
              {maxPerRedemption} {language === "el" ? "άτομα" : "people"}
            </span>
          </div>
        </div>
        {offer.one_per_user && (
          <Badge variant="secondary" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            {language === "el" ? "Μία εξαργύρωση ανά χρήστη" : "One redemption per user"}
          </Badge>
        )}
      </div>

      {/* Validity Info */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {t("validDays")}: {formatDays(offer.valid_days || null)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {t("validHours")}: {formatTimeRange(offer.valid_start_time || null, offer.valid_end_time || null)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {t("expiresOn")}: {formatDate(offer.end_at)}
          </span>
        </div>
      </div>

      {/* Terms */}
      {offer.terms && (
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p className="font-medium mb-1">{t("terms")}</p>
          <p className="text-muted-foreground">{offer.terms}</p>
        </div>
      )}

      {/* Walk-in Note */}
      <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>{t("walkInNote")}</span>
      </div>

      {/* RESERVATION SECTION - BEFORE CLAIM */}
      <ReservationSection />

      {/* Accept Terms */}
      <div className="flex items-center space-x-2">
        <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={(checked) => setAcceptedTerms(checked === true)} />
        <label
          htmlFor="terms"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {language === "el" ? (
            <>
              Αποδέχομαι τους{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                όρους χρήσης
              </a>
            </>
          ) : (
            <>
              I accept the{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                terms of use
              </a>
            </>
          )}
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1" disabled={isLoading}>
          {t("cancel")}
        </Button>
        <Button onClick={handleClaim} className="flex-1" disabled={!claimEnabled}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("processing")}
            </>
          ) : (
            <>
              <Tag className="mr-2 h-4 w-4" />
              {t("claimOffer")}
            </>
          )}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="h-[90vh] flex flex-col">
          {/* Header */}
          <DrawerHeader className="flex-shrink-0 border-b pb-3">
            <div className="flex items-center gap-3">
              {offer.businesses.logo_url ? (
                <img
                  src={offer.businesses.logo_url}
                  alt={offer.businesses.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Store className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <DrawerTitle className="text-left truncate">{offer.title}</DrawerTitle>
                <p className="text-sm text-muted-foreground truncate">{offer.businesses.name}</p>
              </div>
              {discountDisplay && (
                <Badge className="bg-primary text-primary-foreground shrink-0">
                  {discountDisplay}
                </Badge>
              )}
            </div>
            <DrawerDescription className="sr-only">Claim this offer</DrawerDescription>
          </DrawerHeader>
          
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {/* Category badge */}
            {offer.category && (
              <Badge variant="outline" className="text-xs mb-4">
                {getCategoryIcon(offer.category)} {getCategoryLabel(offer.category)}
              </Badge>
            )}
            
            {/* Description */}
            {offer.description && (
              <p className="text-sm text-muted-foreground mb-4">{offer.description}</p>
            )}
            
            <Separator className="my-4" />
            
            {/* Party Size Selector */}
            <div className="space-y-2 mb-4">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t("partySize")}
              </Label>
              <Select value={partySize.toString()} onValueChange={(val) => setPartySize(parseInt(val))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: Math.min(maxPerRedemption, peopleRemaining) }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? t("person") : t("people")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Availability Info */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-2 mb-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                {language === "el" ? "Διαθεσιμότητα" : "Availability"}
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs">{language === "el" ? "Διαθέσιμα" : "Available"}</span>
                  <span className="font-medium">{peopleRemaining} {language === "el" ? "άτομα" : "people"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs">{language === "el" ? "Μέγ. ανά εξαργύρωση" : "Max per redemption"}</span>
                  <span className="font-medium">{maxPerRedemption} {language === "el" ? "άτομα" : "people"}</span>
                </div>
              </div>
            </div>

            {/* Validity Info */}
            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{t("validDays")}: {formatDays(offer.valid_days || null)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{t("validHours")}: {formatTimeRange(offer.valid_start_time || null, offer.valid_end_time || null)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{t("expiresOn")}: {formatDate(offer.end_at)}</span>
              </div>
            </div>

            {/* Terms */}
            {offer.terms && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm mb-4">
                <p className="font-medium mb-1">{t("terms")}</p>
                <p className="text-muted-foreground">{offer.terms}</p>
              </div>
            )}

            {/* Walk-in Note */}
            <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg mb-4">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{t("walkInNote")}</span>
            </div>

            {/* RESERVATION SECTION - BEFORE CLAIM */}
            <div className="mb-4">
              <ReservationSection />
            </div>
          </div>

          {/* Fixed bottom section */}
          <div className="flex-shrink-0 border-t p-4 bg-background space-y-3">
            {/* Accept Terms */}
            <div className="flex items-center space-x-2">
              <Checkbox id="terms-mobile" checked={acceptedTerms} onCheckedChange={(checked) => setAcceptedTerms(checked === true)} />
              <label htmlFor="terms-mobile" className="text-sm font-medium leading-none">
                {language === "el" ? (
                  <>Αποδέχομαι τους <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">όρους χρήσης</a></>
                ) : (
                  <>I accept the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">terms of use</a></>
                )}
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1" disabled={isLoading}>
                {t("cancel")}
              </Button>
              <Button onClick={handleClaim} className="flex-1" disabled={!claimEnabled}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("processing")}</>
                ) : (
                  <><Tag className="mr-2 h-4 w-4" />{t("claimOffer")}</>
                )}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            {offer.businesses.logo_url ? (
              <img
                src={offer.businesses.logo_url}
                alt={offer.businesses.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <Store className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-left">{offer.title}</DialogTitle>
              <DialogDescription className="text-left">{offer.businesses.name}</DialogDescription>
            </div>
            {discountDisplay && (
              <Badge className="text-lg py-2 px-4 bg-primary text-primary-foreground shrink-0">
                {discountDisplay}
              </Badge>
            )}
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6">
          {formContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}
