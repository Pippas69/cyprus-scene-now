import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  GlassWater, TableIcon, Crown, Sofa, Users, Shirt, 
  Clock, Phone, User, MessageSquare, CreditCard, 
  CheckCircle, ArrowRight, ArrowLeft, Loader2, Euro,
  AlertCircle, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
  userId: string;
  language: 'el' | 'en';
  onSuccess?: () => void;
}

const translations = {
  el: {
    title: "Κράτηση Θέσης",
    steps: {
      seating: "Επιλογή Θέσης",
      party: "Μέγεθος Παρέας",
      details: "Στοιχεία",
      review: "Επισκόπηση",
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
    creditNote: "Αυτό το ποσό λειτουργεί ως πίστωση στο μαγαζί",
    name: "Όνομα κράτησης",
    phone: "Τηλέφωνο",
    preferredTime: "Προτιμώμενη ώρα",
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
    platformFee: "Προμήθεια πλατφόρμας (12%)",
    total: "Σύνολο",
    pay: "Πληρωμή",
    back: "Πίσω",
    next: "Επόμενο",
    loading: "Φόρτωση...",
    processing: "Επεξεργασία...",
    errorLoading: "Σφάλμα φόρτωσης επιλογών θέσεων",
    errorNoSeating: "Δεν υπάρχουν διαθέσιμες θέσεις",
    errorNoTier: "Δεν βρέθηκε τιμή για αυτό το μέγεθος παρέας",
  },
  en: {
    title: "Book a Seat",
    steps: {
      seating: "Choose Seating",
      party: "Party Size",
      details: "Your Details",
      review: "Review",
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
    creditNote: "This amount counts as credit at the venue",
    name: "Reservation name",
    phone: "Phone number",
    preferredTime: "Preferred time",
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
    platformFee: "Platform fee (12%)",
    total: "Total",
    pay: "Pay",
    back: "Back",
    next: "Next",
    loading: "Loading...",
    processing: "Processing...",
    errorLoading: "Error loading seating options",
    errorNoSeating: "No seating options available",
    errorNoTier: "No price found for this party size",
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
  const t = translations[language];

  // State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [seatingOptions, setSeatingOptions] = useState<SeatingTypeOption[]>([]);

  // Selection state
  const [selectedSeating, setSelectedSeating] = useState<SeatingTypeOption | null>(null);
  const [partySize, setPartySize] = useState(minPartySize);
  const [reservationName, setReservationName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Fetch seating options
  useEffect(() => {
    if (open && eventId) {
      fetchSeatingOptions();
    }
  }, [open, eventId]);

  const fetchSeatingOptions = async () => {
    setLoading(true);
    try {
      const { data: seatingTypes, error: seatingError } = await supabase
        .from('reservation_seating_types')
        .select('*')
        .eq('event_id', eventId);

      if (seatingError) throw seatingError;

      const optionsWithTiers: SeatingTypeOption[] = [];

      for (const st of seatingTypes || []) {
        const { data: tiers } = await supabase
          .from('seating_type_tiers')
          .select('*')
          .eq('seating_type_id', st.id)
          .order('min_people', { ascending: true });

        optionsWithTiers.push({
          ...st,
          tiers: tiers || [],
        });
      }

      setSeatingOptions(optionsWithTiers);
    } catch (error) {
      console.error('Error fetching seating options:', error);
      toast.error(t.errorLoading);
    } finally {
      setLoading(false);
    }
  };

  // Calculate price for current selection
  const getPrice = (): number | null => {
    if (!selectedSeating) return null;
    const tier = selectedSeating.tiers.find(
      t => partySize >= t.min_people && partySize <= t.max_people
    );
    return tier?.prepaid_min_charge_cents || null;
  };

  const price = getPrice();
  const platformFee = price ? Math.round(price * 0.12) : 0;
  const total = price ? price + platformFee : 0;

  // Handle checkout
  const handleCheckout = async () => {
    if (!selectedSeating || !price) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-reservation-event-checkout', {
        body: {
          event_id: eventId,
          seating_type_id: selectedSeating.id,
          party_size: partySize,
          reservation_name: reservationName,
          phone_number: phoneNumber,
          preferred_time: preferredTime || null,
          special_requests: specialRequests || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error(language === 'el' ? 'Σφάλμα δημιουργίας πληρωμής' : 'Error creating checkout');
    } finally {
      setSubmitting(false);
    }
  };

  // Validation
  const canProceedToStep2 = selectedSeating !== null;
  const canProceedToStep3 = price !== null;
  const canProceedToStep4 = reservationName.trim().length >= 2;

  // Format price
  const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

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

    switch (step) {
      case 1: // Choose Seating Type
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {seatingOptions.map(option => {
              const remaining = option.available_slots - option.slots_booked;
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
                  onClick={() => !isSoldOut && setSelectedSeating(option)}
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

                    {option.dress_code && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Shirt className="h-3 w-3" />
                        {t.dressCode}: {t.dressCodeLabels[option.dress_code as keyof typeof t.dressCodeLabels]}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );

      case 2: // Party Size
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                {t.partySize}
              </Label>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPartySize(Math.max(minPartySize, partySize - 1))}
                  disabled={partySize <= minPartySize}
                >
                  -
                </Button>
                <span className="text-3xl font-bold min-w-[3ch] text-center">
                  {partySize}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPartySize(Math.min(maxPartySize, partySize + 1))}
                  disabled={partySize >= maxPartySize}
                >
                  +
                </Button>
                <span className="text-muted-foreground">{t.people}</span>
              </div>
            </div>

            {price ? (
              <Card className="bg-primary/5 border-primary">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t.prepaidAmount}</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatPrice(price)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    {t.creditNote}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-destructive/5 border-destructive">
                <CardContent className="p-4">
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {t.errorNoTier}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 3: // Details
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {t.name} *
              </Label>
              <Input
                id="name"
                value={reservationName}
                onChange={(e) => setReservationName(e.target.value)}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {t.phone}
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+357 99 123456"
              />
            </div>

            {(reservationHoursFrom || reservationHoursTo) && (
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t.preferredTime}
                  {reservationHoursFrom && reservationHoursTo && (
                    <span className="text-xs text-muted-foreground">
                      ({reservationHoursFrom} - {reservationHoursTo})
                    </span>
                  )}
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="requests" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {t.specialRequests}
                <span className="text-xs text-muted-foreground">({t.optional})</span>
              </Label>
              <Textarea
                id="requests"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        );

      case 4: // Review
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

            {selectedSeating && (
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">{t.policies}</p>
                <p>{t.noShowPolicy[selectedSeating.no_show_policy as keyof typeof t.noShowPolicy]}</p>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.prepaidAmount}</span>
                <span>{price ? formatPrice(price) : '-'}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>{t.total}</span>
                <span className="text-primary">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Navigation
  const renderNavigation = () => (
    <div className="flex justify-between pt-4">
      {step > 1 ? (
        <Button variant="outline" onClick={() => setStep(step - 1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t.back}
        </Button>
      ) : (
        <div />
      )}

      {step < 4 ? (
        <Button
          onClick={() => setStep(step + 1)}
          disabled={
            (step === 1 && !canProceedToStep2) ||
            (step === 2 && !canProceedToStep3) ||
            (step === 3 && !canProceedToStep4)
          }
        >
          {t.next}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      ) : (
        <Button
          onClick={handleCheckout}
          disabled={submitting || !price}
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
              {t.pay} {formatPrice(total)}
            </>
          )}
        </Button>
      )}
    </div>
  );

  // Step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 pb-4">
      {[1, 2, 3, 4].map(s => (
        <div
          key={s}
          className={cn(
            "w-2 h-2 rounded-full transition-colors",
            s === step ? "bg-primary w-4" : s < step ? "bg-primary/50" : "bg-muted"
          )}
        />
      ))}
    </div>
  );

  const content = (
    <div className="space-y-4">
      {renderStepIndicator()}
      <div className="text-center mb-4">
        <Badge variant="outline">
          {Object.values(t.steps)[step - 1]}
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
          <div className="px-4 pb-6 overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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