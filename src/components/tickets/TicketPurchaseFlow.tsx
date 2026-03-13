import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { el as elLocale, enUS } from 'date-fns/locale';
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
  ArrowRight, ArrowLeft, ExternalLink, Users, Calendar
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
}

const translations = {
  el: {
    title: "Εισιτήρια",
    steps: {
      showSelect: "Επιλογή Παράστασης",
      seats: "Επιλογή Θέσεων",
      tickets: "Επιλογή Εισιτηρίων",
      guests: "Στοιχεία Καλεσμένων",
      checkout: "Ολοκλήρωση",
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
    selectedSeats: "Επιλεγμένες θέσεις",
    row: "Σειρά",
    seat: "Θέση",
    zone: "Ζώνη",
    specialRequests: "Ειδικά αιτήματα",
    optional: "προαιρετικό",
  },
  en: {
    title: "Tickets",
    steps: {
      showSelect: "Select Show",
      seats: "Select Seats",
      tickets: "Select Tickets",
      guests: "Guest Details",
      checkout: "Checkout",
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
    selectedSeats: "Selected seats",
    row: "Row",
    seat: "Seat",
    zone: "Zone",
    specialRequests: "Special requests",
    optional: "optional",
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
    if (!isSeatedWithPricing) steps.push('tickets');
    steps.push('guests');
    steps.push('checkout');
    return steps;
  }, [hasMultipleShows, hasSeating, isSeatedWithPricing]);

  const steps = getSteps();
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const currentStep = steps[currentStepIdx] || steps[0];

  // Reset step when opening
  useEffect(() => {
    if (open) {
      setCurrentStepIdx(0);
      setCheckoutUrl(null);
      setRedirectAttempted(false);
    }
  }, [open]);

  // Scroll to top on step change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStepIdx]);

  // Compute total tickets for seated vs non-seated
  const seatCount = selectedSeats.length;
  const tierTotalTickets = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  const totalTickets = isSeatedWithPricing ? seatCount : tierTotalTickets;

  // Sync guest name fields
  useEffect(() => {
    setGuestNames(prev => {
      if (prev.length === totalTickets) return prev;
      if (prev.length < totalTickets) {
        return [...prev, ...Array(totalTickets - prev.length).fill('')];
      }
      return prev.slice(0, totalTickets);
    });
    setGuestAges(prev => {
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

  const total = calculateTotal();
  const isFreeOrder = total === 0 && totalTickets > 0;
  const allNamesFilled = guestNames.length > 0 && guestNames.every(n => n.trim().length > 0);
  const allAgesFilled = guestAges.length > 0 && guestAges.every(a => a.trim().length > 0 && !isNaN(Number(a)));
  const allGuestDetailsFilled = allNamesFilled && allAgesFilled && customerPhone.trim().length >= 8 && customerEmail.trim().length > 0;

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
    if (!allGuestDetailsFilled) {
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
        customerEmail: customerEmail.trim() || user.email,
        customerPhone: customerPhone.trim() || null,
        specialRequests: specialRequests.trim() || null,
        guests: guestNames.map((name, idx) => ({
          name: name.trim(),
          age: parseInt(guestAges[idx]) || 0,
        })),
      };

      // Include selected seat IDs for seated events so backend can mark them sold
      if (hasSeating && selectedSeats.length > 0) {
        body.seatIds = selectedSeats.map(s => s.seatId);
        body.showInstanceId = showInstanceId;
      }

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

  const renderTicketsStep = () => (
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
    </div>
  );

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
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {t.guestDetails} ({totalTickets} {t.people})
            </Label>
            <p className="text-xs text-muted-foreground">{t.eachPersonGetsQR}</p>
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
                  <Input
                    placeholder={t.age}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={guestAges[idx] || ''}
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
                    className="h-9 text-sm w-20"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phone & Email */}
        {totalTickets > 0 && (
          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="ticket-phone" className="text-sm">{t.phone}</Label>
              <Input
                id="ticket-phone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+357..."
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ticket-email-guest" className="text-sm">{t.email}</Label>
              <Input
                id="ticket-email-guest"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="email@example.com"
                className="h-9 text-sm"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCheckoutStep = () => (
    <div className="space-y-4">
      <h3 className="font-semibold">{t.summary}</h3>

      {/* Ticket/seat summary */}
      <div className="space-y-2 text-sm">
        {isSeatedWithPricing ? (
          // Grouped by zone
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
            return (
              <div key={tier.id} className="flex justify-between">
                <span className="text-muted-foreground">{tier.name} × {qty}</span>
                <span className="font-medium">{formatPrice(tier.price_cents * qty)}</span>
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 'showSelect': return renderShowSelectStep();
      case 'seats': return renderSeatStep();
      case 'tickets': return renderTicketsStep();
      case 'guests': return renderGuestsStep();
      case 'checkout': return renderCheckoutStep();
      default: return null;
    }
  };

  const canProceedFromCurrentStep = () => {
    switch (currentStep) {
      case 'showSelect': return !!selectedShowId;
      case 'seats': return selectedSeats.length > 0;
      case 'tickets': return tierTotalTickets > 0;
      case 'guests': return allGuestDetailsFilled && totalTickets > 0;
      case 'checkout': return true;
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
      <div className="flex justify-between pt-4">
        {!isFirstStep ? (
          <Button variant="outline" onClick={() => setCurrentStepIdx(currentStepIdx - 1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.back}
          </Button>
        ) : <div />}

        {!isLastStep ? (
          <Button
            onClick={() => setCurrentStepIdx(currentStepIdx + 1)}
            disabled={!canProceedFromCurrentStep()}
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

  const stepLabelMap: Record<string, string> = {
    showSelect: t.steps.showSelect,
    seats: t.steps.seats,
    tickets: t.steps.tickets,
    guests: t.steps.guests,
    checkout: t.steps.checkout,
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
      <div className="text-center mb-4">
        <Badge variant="outline">{stepLabelMap[currentStep]}</Badge>
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
      <DialogContent ref={scrollRef} className={cn("max-h-[90vh] overflow-y-auto", hasSeating && currentStep === 'seats' ? "max-w-2xl" : "max-w-md")}>
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
