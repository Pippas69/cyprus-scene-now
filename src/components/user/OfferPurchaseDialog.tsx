import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CreditCard, Tag, Store, Clock, AlertCircle, ExternalLink, Package, CalendarIcon, Users, Phone, User, CalendarCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OfferItemsDisplay } from "@/components/business/offers/OfferItemsDisplay";
import { format, isBefore, startOfDay, parse } from "date-fns";

interface OfferItem {
  id: string;
  name: string;
  description?: string | null;
}

interface Offer {
  id: string;
  title: string;
  description: string | null;
  percent_off: number | null;
  original_price_cents: number;
  pricing_type?: 'single' | 'bundle';
  start_at?: string;
  end_at: string;
  terms?: string | null;
  max_per_user?: number | null;
  business_id?: string;
  requires_reservation?: boolean;
  businesses: {
    name: string;
    logo_url: string | null;
    stripe_payouts_enabled?: boolean;
  };
}

interface BusinessSettings {
  reservation_capacity_type: 'daily' | 'time_slots';
  daily_reservation_limit: number | null;
  reservation_time_slots: { time: string; capacity: number }[] | null;
  reservation_days: string[];
  reservation_opens_at: string | null;
  reservation_closes_at: string | null;
  reservation_seating_options: string[];
  reservation_requires_approval: boolean;
}

interface OfferPurchaseDialogProps {
  offer: Offer | null;
  isOpen: boolean;
  onClose: () => void;
  language: "el" | "en";
  discountItems?: OfferItem[];
}

export function OfferPurchaseDialog({ offer, isOpen, onClose, language, discountItems }: OfferPurchaseDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  
  // Reservation form state
  const [reservationData, setReservationData] = useState({
    reservation_name: '',
    party_size: 2,
    seating_preference: 'none',
    preferred_date: new Date(),
    preferred_time: '19:00',
    phone_number: '',
    special_requests: '',
  });
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [availableCapacity, setAvailableCapacity] = useState<number | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCheckoutUrl(null);
      setShowFallback(false);
      setIsLoading(false);
      setAcceptedTerms(false);
      setReservationData({
        reservation_name: '',
        party_size: 2,
        seating_preference: 'none',
        preferred_date: new Date(),
        preferred_time: '19:00',
        phone_number: '',
        special_requests: '',
      });
      setBusinessSettings(null);
    }
  }, [isOpen]);

  // Fetch business settings for reservation-required offers
  useEffect(() => {
    if (isOpen && offer?.requires_reservation && offer?.business_id) {
      fetchBusinessSettings();
    }
  }, [isOpen, offer?.requires_reservation, offer?.business_id]);

  // Fetch capacity when date changes
  useEffect(() => {
    if (businessSettings && reservationData.preferred_date && offer?.requires_reservation && offer?.business_id) {
      fetchCapacity();
    }
  }, [businessSettings, reservationData.preferred_date, offer?.requires_reservation, offer?.business_id]);

  const fetchBusinessSettings = async () => {
    if (!offer?.business_id) return;
    setSettingsLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select(`
          reservation_capacity_type,
          daily_reservation_limit,
          reservation_time_slots,
          reservation_days,
          reservation_opens_at,
          reservation_closes_at,
          reservation_seating_options,
          reservation_requires_approval
        `)
        .eq('id', offer.business_id)
        .single();

      if (error) throw error;
      setBusinessSettings(data as BusinessSettings);

      if (data.reservation_opens_at) {
        const normalizedTime = data.reservation_opens_at.substring(0, 5);
        setReservationData(prev => ({ ...prev, preferred_time: normalizedTime }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchCapacity = async () => {
    if (!offer?.business_id) return;
    try {
      const { data, error } = await supabase.rpc('get_business_available_capacity', {
        p_business_id: offer.business_id,
        p_date: format(reservationData.preferred_date, 'yyyy-MM-dd'),
      });

      if (error) throw error;

      const capacityData = data as { available?: boolean; capacity_type?: string; remaining_capacity?: number } | null;
      
      if (capacityData?.available && capacityData?.capacity_type === 'daily') {
        setAvailableCapacity(capacityData.remaining_capacity ?? null);
      } else {
        setAvailableCapacity(null);
      }
    } catch (error) {
      console.error('Error fetching capacity:', error);
    }
  };

  // Show fallback button after delay if redirect didn't work
  useEffect(() => {
    if (checkoutUrl) {
      const timer = setTimeout(() => setShowFallback(true), 900);
      return () => clearTimeout(timer);
    }
  }, [checkoutUrl]);

  const text = {
    title: { el: "Αγορά Προσφοράς", en: "Purchase Offer" },
    titleWithReservation: { el: "Αγορά Προσφοράς & Κράτηση", en: "Purchase Offer & Reserve" },
    originalPrice: { el: "Αρχική τιμή", en: "Original price" },
    discount: { el: "Έκπτωση", en: "Discount" },
    youPay: { el: "Πληρώνετε", en: "You pay" },
    youSave: { el: "Εξοικονομείτε", en: "You save" },
    validUntil: { el: "Ισχύει μέχρι", en: "Valid until" },
    terms: { el: "Όροι & Προϋποθέσεις", en: "Terms & Conditions" },
    acceptTerms: { el: "Αποδέχομαι τους όρους χρήσης", en: "I accept the terms of use" },
    noRefund: { el: "Σημείωση: Δεν γίνονται επιστροφές χρημάτων", en: "Note: No refunds available" },
    refundOnDecline: { el: "Εάν η κράτηση απορριφθεί, θα επιστραφούν τα χρήματα", en: "If reservation is declined, you will be refunded" },
    payWithCard: { el: "Πληρωμή με Κάρτα", en: "Pay with Card" },
    payAndReserve: { el: "Πληρωμή & Κράτηση", en: "Pay & Reserve" },
    cancel: { el: "Άκυρο", en: "Cancel" },
    processing: { el: "Επεξεργασία...", en: "Processing..." },
    redirecting: { el: "Μετάβαση στην πληρωμή...", en: "Redirecting to payment..." },
    continueToPayment: { el: "Συνέχεια στην Πληρωμή", en: "Continue to Payment" },
    errorAuth: { el: "Πρέπει να συνδεθείτε για να αγοράσετε", en: "You must be logged in to purchase" },
    errorGeneric: { el: "Κάτι πήγε στραβά", en: "Something went wrong" },
    paymentNotSetup: { el: "Αυτή η επιχείρηση δεν έχει ολοκληρώσει τη ρύθμιση πληρωμών", en: "This business hasn't completed payment setup yet" },
    reservationRequired: { el: "Απαιτείται Κράτηση", en: "Reservation Required" },
    reservationName: { el: "Όνομα Κράτησης", en: "Reservation Name" },
    partySize: { el: "Αριθμός Ατόμων", en: "Party Size" },
    preferredDate: { el: "Ημερομηνία", en: "Date" },
    preferredTime: { el: "Ώρα", en: "Time" },
    phoneNumber: { el: "Τηλέφωνο", en: "Phone Number" },
    seatingPreference: { el: "Προτίμηση Θέσης", en: "Seating Preference" },
    specialRequests: { el: "Ειδικές Απαιτήσεις", en: "Special Requests" },
    noPreference: { el: "Χωρίς Προτίμηση", en: "No Preference" },
    indoor: { el: "Εσωτερικός Χώρος", en: "Indoor" },
    outdoor: { el: "Εξωτερικός Χώρος", en: "Outdoor" },
    availableSlots: { el: "Διαθέσιμες θέσεις", en: "Available slots" },
    fullyBooked: { el: "Πλήρως κατειλημμένο", en: "Fully booked" },
    selectTime: { el: "Επιλέξτε ώρα", en: "Select time" },
  };

  const t = (key: keyof typeof text) => text[key][language];

  // Check if business can receive payments
  const canReceivePayments = offer?.businesses?.stripe_payouts_enabled !== false;
  const isBundle = offer?.pricing_type === "bundle";
  const requiresReservation = offer?.requires_reservation === true;

  if (!offer) return null;

  const originalPriceEuros = (offer.original_price_cents / 100).toFixed(2);
  const discountPercent = offer.percent_off || 0;
  const finalPriceCents = Math.round(offer.original_price_cents * (100 - discountPercent) / 100);
  const finalPriceEuros = (finalPriceCents / 100).toFixed(2);
  const savingsEuros = ((offer.original_price_cents - finalPriceCents) / 100).toFixed(2);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === "el" ? "el-GR" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const isDateDisabled = (date: Date) => {
    if (!businessSettings?.reservation_days?.length) return false;
    
    const dayName = format(date, 'EEEE').toLowerCase();
    const isBeforeToday = isBefore(startOfDay(date), startOfDay(new Date()));
    
    // Also check against offer end date
    const offerEndDate = offer.end_at ? new Date(offer.end_at) : null;
    const isAfterOfferEnd = offerEndDate ? date > offerEndDate : false;
    
    return isBeforeToday || isAfterOfferEnd || !businessSettings.reservation_days.includes(dayName);
  };

  const normalizeTime = (time: string | null): string => {
    if (!time) return '12:00';
    return time.substring(0, 5);
  };

  const getAvailableTimeSlots = () => {
    if (!businessSettings) return [];

    if (businessSettings.reservation_capacity_type === 'time_slots' && businessSettings.reservation_time_slots) {
      return businessSettings.reservation_time_slots.map((slot) => normalizeTime(slot.time));
    }

    const slots: string[] = [];
    const opens = normalizeTime(businessSettings.reservation_opens_at);
    const closes = normalizeTime(businessSettings.reservation_closes_at) || '22:00';

    let current = parse(opens, 'HH:mm', new Date());
    const end = parse(closes, 'HH:mm', new Date());

    if (isNaN(current.getTime()) || isNaN(end.getTime())) {
      return ['12:00', '12:30', '13:00', '13:30', '14:00'];
    }

    while (isBefore(current, end) || format(current, 'HH:mm') === format(end, 'HH:mm')) {
      slots.push(format(current, 'HH:mm'));
      current = new Date(current.getTime() + 30 * 60 * 1000);
    }

    return slots;
  };

  const timeSlots = getAvailableTimeSlots();

  const validateReservationForm = () => {
    if (!reservationData.reservation_name.trim()) {
      toast.error(language === 'el' ? 'Παρακαλώ εισάγετε όνομα' : 'Please enter a name');
      return false;
    }
    if (!reservationData.phone_number.trim()) {
      toast.error(language === 'el' ? 'Παρακαλώ εισάγετε τηλέφωνο' : 'Please enter a phone number');
      return false;
    }
    if (availableCapacity === 0) {
      toast.error(t('fullyBooked'));
      return false;
    }
    return true;
  };

  const handlePurchase = async () => {
    // Validate reservation form if required
    if (requiresReservation && !validateReservationForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t("errorAuth"));
        setIsLoading(false);
        return;
      }

      let data;
      let error;

      if (requiresReservation) {
        // Use the reservation checkout flow
        const result = await supabase.functions.invoke("create-offer-checkout-with-reservation", {
          body: { 
            discountId: offer.id,
            reservationData: {
              reservation_name: reservationData.reservation_name,
              party_size: reservationData.party_size,
              preferred_date: format(reservationData.preferred_date, 'yyyy-MM-dd'),
              preferred_time: reservationData.preferred_time,
              phone_number: reservationData.phone_number,
              seating_preference: reservationData.seating_preference,
              special_requests: reservationData.special_requests,
            }
          },
        });
        data = result.data;
        error = result.error;
      } else {
        // Use the regular checkout flow
        const result = await supabase.functions.invoke("create-offer-checkout", {
          body: { discountId: offer.id },
        });
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      if (data?.url) {
        setCheckoutUrl(data.url);
        window.location.assign(data.url);
      }
    } catch (error: any) {
      console.error("Purchase error:", error);
      toast.error(error.message || t("errorGeneric"));
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={requiresReservation ? "sm:max-w-lg max-h-[90vh] overflow-y-auto" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {requiresReservation ? <CalendarCheck className="h-5 w-5" /> : <Tag className="h-5 w-5" />}
            {requiresReservation ? t("titleWithReservation") : t("title")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Purchase details for {offer.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Offer Info */}
          <div className="space-y-2">
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
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{offer.title}</h3>
                  {isBundle && (
                    <Badge variant="outline" className="text-xs">
                      <Package className="h-3 w-3 mr-1" />
                      {language === "el" ? "Πακέτο" : "Bundle"}
                    </Badge>
                  )}
                  {requiresReservation && (
                    <Badge variant="secondary" className="text-xs">
                      <CalendarCheck className="h-3 w-3 mr-1" />
                      {t("reservationRequired")}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{offer.businesses.name}</p>
              </div>
            </div>
            {offer.description && (
              <p className="text-sm text-muted-foreground">{offer.description}</p>
            )}
          </div>

          <Separator />

          {/* Bundle Items Display */}
          {isBundle && discountItems && discountItems.length > 0 && (
            <>
              <OfferItemsDisplay items={discountItems} language={language} />
              <Separator />
            </>
          )}

          {/* Reservation Form - Only show if requires_reservation */}
          {requiresReservation && (
            <>
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 text-primary">
                  <CalendarCheck className="h-4 w-4" />
                  <span className="font-medium text-sm">{t("reservationRequired")}</span>
                </div>

                {settingsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Capacity indicator */}
                    {availableCapacity !== null && (
                      <div
                        className={`p-2 rounded-lg text-sm ${
                          availableCapacity === 0
                            ? 'bg-destructive/10 text-destructive'
                            : availableCapacity < 5
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span className="font-medium">
                            {availableCapacity === 0
                              ? t('fullyBooked')
                              : `${availableCapacity} ${t('availableSlots')}`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="reservation_name" className="flex items-center gap-1.5 text-xs">
                        <User className="w-3 h-3" />
                        {t("reservationName")} *
                      </Label>
                      <Input
                        id="reservation_name"
                        value={reservationData.reservation_name}
                        onChange={(e) => setReservationData(prev => ({ ...prev, reservation_name: e.target.value }))}
                        placeholder={language === 'el' ? 'π.χ. Γιάννης Παπαδόπουλος' : 'e.g. John Doe'}
                        className="h-9"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Party Size */}
                      <div className="space-y-1.5">
                        <Label htmlFor="party_size" className="flex items-center gap-1.5 text-xs">
                          <Users className="w-3 h-3" />
                          {t("partySize")} *
                        </Label>
                        <Input
                          id="party_size"
                          type="number"
                          min="1"
                          max="50"
                          value={reservationData.party_size}
                          onChange={(e) => setReservationData(prev => ({ ...prev, party_size: parseInt(e.target.value) || 1 }))}
                          disabled={availableCapacity === 0}
                          className="h-9"
                        />
                      </div>

                      {/* Phone */}
                      <div className="space-y-1.5">
                        <Label htmlFor="phone_number" className="flex items-center gap-1.5 text-xs">
                          <Phone className="w-3 h-3" />
                          {t("phoneNumber")} *
                        </Label>
                        <Input
                          id="phone_number"
                          type="tel"
                          value={reservationData.phone_number}
                          onChange={(e) => setReservationData(prev => ({ ...prev, phone_number: e.target.value }))}
                          placeholder="+30..."
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Date */}
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs">
                          <CalendarIcon className="w-3 h-3" />
                          {t("preferredDate")} *
                        </Label>
                        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left h-9 text-sm">
                              <CalendarIcon className="mr-2 h-3 w-3" />
                              {format(reservationData.preferred_date, 'dd MMM')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={reservationData.preferred_date}
                              onSelect={(date) => {
                                if (date) {
                                  setReservationData(prev => ({ ...prev, preferred_date: date }));
                                  setShowCalendar(false);
                                }
                              }}
                              disabled={isDateDisabled}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Time */}
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs">
                          <Clock className="w-3 h-3" />
                          {t("preferredTime")} *
                        </Label>
                        <Select
                          value={reservationData.preferred_time}
                          onValueChange={(value) => setReservationData(prev => ({ ...prev, preferred_time: value }))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={t("selectTime")} />
                          </SelectTrigger>
                          <SelectContent>
                            {timeSlots.filter(time => time && time.trim() !== '').map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Seating Preference (if available) */}
                    {businessSettings?.reservation_seating_options && businessSettings.reservation_seating_options.length > 0 && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("seatingPreference")}</Label>
                        <Select
                          value={reservationData.seating_preference}
                          onValueChange={(value) => setReservationData(prev => ({ ...prev, seating_preference: value }))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={t("noPreference")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t("noPreference")}</SelectItem>
                            {businessSettings.reservation_seating_options.includes('indoor') && (
                              <SelectItem value="indoor">{t("indoor")}</SelectItem>
                            )}
                            {businessSettings.reservation_seating_options.includes('outdoor') && (
                              <SelectItem value="outdoor">{t("outdoor")}</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Special Requests */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t("specialRequests")}</Label>
                      <Textarea
                        value={reservationData.special_requests}
                        onChange={(e) => setReservationData(prev => ({ ...prev, special_requests: e.target.value }))}
                        placeholder={language === 'el' ? 'Οποιεσδήποτε ειδικές απαιτήσεις...' : 'Any special requirements...'}
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Price Breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("originalPrice")}</span>
              <span className="line-through text-muted-foreground">€{originalPriceEuros}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("discount")}</span>
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                -{discountPercent}%
              </Badge>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>{t("youPay")}</span>
              <span className="text-primary">€{finalPriceEuros}</span>
            </div>
            <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
              <span>{t("youSave")}</span>
              <span>€{savingsEuros}</span>
            </div>
          </div>

          <Separator />

          {/* Valid Until */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{t("validUntil")}: {formatDate(offer.end_at)}</span>
          </div>

          {/* Terms */}
          {offer.terms && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium mb-1">{t("terms")}</p>
              <p className="text-muted-foreground">{offer.terms}</p>
            </div>
          )}

          {/* Payment Not Setup Warning */}
          {!canReceivePayments && (
            <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{t("paymentNotSetup")}</span>
            </div>
          )}

          {/* Refund Policy - Different messaging for reservation offers */}
          {requiresReservation ? (
            <div className="flex items-start gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{t("refundOnDecline")}</span>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{t("noRefund")}</span>
            </div>
          )}

          {/* Accept Terms */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
            />
            <label
              htmlFor="terms"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {language === "el" ? (
                <>Αποδέχομαι τους <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">όρους χρήσης</a></>
              ) : (
                <>I accept the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">terms of use</a></>
              )}
            </label>
          </div>

          {/* Actions */}
          {checkoutUrl ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t("redirecting")}</span>
              </div>
              {showFallback && (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md font-medium transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t("continueToPayment")}
                </a>
              )}
            </div>
          ) : (
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1" disabled={isLoading}>
                {t("cancel")}
              </Button>
              <Button
                onClick={handlePurchase}
                className="flex-1"
                disabled={isLoading || !acceptedTerms || !canReceivePayments || (requiresReservation && availableCapacity === 0)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("processing")}
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    {requiresReservation ? t("payAndReserve") : t("payWithCard")}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
