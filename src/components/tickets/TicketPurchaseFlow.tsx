import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Ticket, Minus, Plus, Loader2, CreditCard,
  ArrowRight, ArrowLeft, ExternalLink, Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { SeatSelectionStep } from "@/components/theatre/SeatSelectionStep";
import type { SelectedSeat } from "@/components/theatre/SeatMapViewer";

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

interface ShowInstanceOption {
  id: string;
  start_at: string;
  end_at: string;
  venue_id: string;
  doors_open_at?: string | null;
  notes?: string | null;
  status: string;
}

interface TicketPurchaseFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  ticketTiers: TicketTier[];
  onSuccess?: (orderId: string, isFree: boolean) => void;
  // Theatre/Performance seat selection props
  venueId?: string;
  showInstanceId?: string;
  eventDate?: string;
  // Multiple show instances (performance events)
  showInstances?: ShowInstanceOption[];
}

const translations = {
  el: {
    title: "Εισιτήρια",
    steps: {
      showSelect: "Επιλογή Παράστασης",
      seats: "Επιλογή Θέσεων",
      tickets: "Επιλογή Εισιτηρίων",
      checkout: "Ολοκλήρωση",
    },
    available: "διαθέσιμα",
    soldOut: "Εξαντλήθηκαν",
    free: "Δωρεάν",
    guestDetails: "Ονόματα Καλεσμένων",
    guestN: "Άτομο",
    name: "Όνομα",
    email: "Email",
    people: "άτομα",
    total: "Σύνολο",
    pay: "Πληρωμή",
    getTickets: "Λήψη Εισιτηρίων",
    back: "Πίσω",
    next: "Επόμενο",
    processing: "Επεξεργασία...",
    noTicketsSelected: "Επιλέξτε τουλάχιστον ένα εισιτήριο",
    loginRequired: "Πρέπει να συνδεθείτε",
    fillAllNames: "Συμπληρώστε όνομα για όλους τους καλεσμένους",
    eachPersonGetsQR: "Κάθε άτομο θα λάβει ξεχωριστό QR code εισιτηρίου",
    redirecting: "Μεταφορά στην πληρωμή...",
    redirectFallback: "Αν η σελίδα δεν άνοιξε αυτόματα, πατήστε το κουμπί παραπάνω.",
    continuePayment: "Συνέχεια στην Πληρωμή",
    cancel: "Ακύρωση",
    summary: "Σύνοψη",
    ticketCost: "Κόστος εισιτηρίων",
  },
  en: {
    title: "Tickets",
    steps: {
      showSelect: "Select Show",
      seats: "Select Seats",
      tickets: "Select Tickets",
      checkout: "Checkout",
    },
    available: "available",
    soldOut: "Sold Out",
    free: "Free",
    guestDetails: "Guest Names",
    guestN: "Person",
    name: "Name",
    email: "Email",
    people: "people",
    total: "Total",
    pay: "Pay",
    getTickets: "Get Tickets",
    back: "Back",
    next: "Next",
    processing: "Processing...",
    noTicketsSelected: "Please select at least one ticket",
    loginRequired: "You must be logged in",
    fillAllNames: "Please fill in name for all guests",
    eachPersonGetsQR: "Each person will receive their own QR code ticket",
    redirecting: "Opening payment...",
    redirectFallback: "If the page didn't open automatically, tap the button above.",
    continuePayment: "Continue to Payment",
    cancel: "Cancel",
    summary: "Summary",
    ticketCost: "Ticket cost",
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
}) => {
  const isMobile = useIsMobile();
  const { language } = useLanguage();
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
  
  // Steps: showSelect (if multi-show) -> seats (if seated) -> tickets -> checkout
  const STEP_SHOW_SELECT = hasMultipleShows ? 1 : -1;
  const STEP_SEATS = hasMultipleShows ? 2 : (hasSeating ? 1 : -1);
  const STEP_TICKETS = hasMultipleShows ? 3 : (hasSeating ? 2 : 1);
  const STEP_CHECKOUT = hasMultipleShows ? 4 : (hasSeating ? 3 : 2);
  const TOTAL_STEPS = hasMultipleShows ? 4 : (hasSeating ? 3 : 2);

  // Seat selection state
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);

  // State
  const [step, setStep] = useState(hasMultipleShows ? STEP_SHOW_SELECT : (hasSeating ? 1 : 1));
  const [submitting, setSubmitting] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [customerEmail, setCustomerEmail] = useState('');

  // Checkout state
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  // Reset checkout state on reopen, preserve form data
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

  // Sync guest name fields with total ticket count
  const totalTickets = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);

  useEffect(() => {
    setGuestNames(prev => {
      if (prev.length === totalTickets) return prev;
      if (prev.length < totalTickets) {
        return [...prev, ...Array(totalTickets - prev.length).fill('')];
      }
      return prev.slice(0, totalTickets);
    });
  }, [totalTickets]);

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

  const calculateTotal = () => {
    return ticketTiers.reduce((sum, tier) => {
      const qty = quantities[tier.id] || 0;
      return sum + (tier.price_cents * qty);
    }, 0);
  };

  const total = calculateTotal();
  const isFreeOrder = total === 0 && totalTickets > 0;
  const allNamesFilled = guestNames.every(n => n.trim().length > 0);
  const canProceedFromSeats = !hasSeating || selectedSeats.length > 0;
  const canProceedToCheckout = totalTickets > 0 && allNamesFilled;

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
    if (!allNamesFilled) {
      toast.error(t.fillAllNames);
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

      const items = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([tierId, quantity]) => ({ tierId, quantity }));

      const body: Record<string, unknown> = {
        eventId,
        items,
        customerName: guestNames[0].trim(),
        customerEmail: customerEmail.trim() || user.email,
        guests: guestNames.map(name => ({
          name: name.trim(),
          age: 0,
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
    <div className="space-y-4">
      {/* Tier selection */}
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
                {!isSoldOut && (
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    ({available} {t.available})
                  </span>
                )}
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

      {/* Guest names */}
      {totalTickets > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {t.guestDetails} ({totalTickets} {t.people})
            </Label>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {guestNames.map((name, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="text-xs text-muted-foreground shrink-0 w-4 text-right">{idx + 1}.</span>
                  <Input
                    placeholder={`${t.guestN} ${idx + 1}`}
                    value={name}
                    onChange={(e) => {
                      setGuestNames(prev => {
                        const updated = [...prev];
                        updated[idx] = e.target.value;
                        return updated;
                      });
                    }}
                    className="h-9 text-sm flex-1"
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="font-semibold">{t.summary}</h3>

      {/* Ticket summary */}
      <div className="space-y-2 text-sm">
        {ticketTiers.map(tier => {
          const qty = quantities[tier.id] || 0;
          if (qty === 0) return null;
          return (
            <div key={tier.id} className="flex justify-between">
              <span className="text-muted-foreground">{tier.name} × {qty}</span>
              <span className="font-medium">{formatPrice(tier.price_cents * qty)}</span>
            </div>
          );
        })}
      </div>

      <Separator />

      {/* Guest list */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{t.guestDetails}</p>
        {guestNames.map((name, i) => (
          <div key={i} className="text-sm">
            {i + 1}. {name}
          </div>
        ))}
      </div>

      <Separator />

      {/* Email */}
      <div className="space-y-1">
        <Label htmlFor="ticket-email" className="text-sm">{t.email}</Label>
        <Input
          id="ticket-email"
          type="email"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          placeholder="email@example.com"
          className="h-9 text-sm"
        />
      </div>

      <Separator />

      {/* Total */}
      <div className="flex justify-between font-bold text-lg">
        <span>{t.total}</span>
        <span className="text-primary">{isFreeOrder ? t.free : formatPrice(total)}</span>
      </div>

      {/* QR info */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
        <Ticket className="h-4 w-4 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">{t.eachPersonGetsQR}</p>
      </div>
    </div>
  );

  const renderSeatStep = () => {
    if (!hasSeating || !venueId || !showInstanceId) return null;
    return (
      <SeatSelectionStep
        venueId={venueId}
        showInstanceId={showInstanceId}
        maxSeats={Math.max(totalTickets, 10)}
        selectedSeats={selectedSeats}
        onSeatToggle={handleSeatToggle}
        eventTitle={eventTitle}
        eventDate={eventDate || ''}
      />
    );
  };

  const renderStepContent = () => {
    if (step === STEP_SEATS && hasSeating) return renderSeatStep();
    if (step === STEP_TICKETS) return renderStep1();
    if (step === STEP_CHECKOUT) return renderStep2();
    return null;
  };

  const renderNavigation = () => {
    if (step === STEP_CHECKOUT && checkoutUrl) {
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

    const isFirstStep = step === (hasSeating ? STEP_SEATS : STEP_TICKETS);
    const isLastStep = step === STEP_CHECKOUT;
    const canProceed = step === STEP_SEATS ? canProceedFromSeats
      : step === STEP_TICKETS ? canProceedToCheckout
      : true;

    return (
      <div className="flex justify-between pt-4">
        {!isFirstStep ? (
          <Button variant="outline" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.back}
          </Button>
        ) : <div />}

        {!isLastStep ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed}
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
              <><CreditCard className="h-4 w-4" />{t.pay} {formatPrice(total)}</>
            )}
          </Button>
        )}
      </div>
    );
  };

  const stepLabels = hasSeating
    ? [t.steps.seats, t.steps.tickets, t.steps.checkout]
    : [t.steps.tickets, t.steps.checkout];
  const firstStep = hasSeating ? STEP_SEATS : STEP_TICKETS;

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 pb-4">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
        const s = firstStep + i;
        return (
          <div key={s} className={cn(
            "w-2 h-2 rounded-full transition-colors",
            s === step ? "bg-primary w-4" : s < step ? "bg-primary/50" : "bg-muted"
          )} />
        );
      })}
    </div>
  );

  const content = (
    <div className="space-y-4">
      {renderStepIndicator()}
      <div className="text-center mb-4">
        <Badge variant="outline">{stepLabels[step - firstStep]}</Badge>
      </div>
      {renderStepContent()}
      {renderNavigation()}
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
      <DialogContent ref={scrollRef} className={cn("max-h-[90vh] overflow-y-auto", hasSeating && step === STEP_SEATS ? "max-w-2xl" : "max-w-md")}>
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
