import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CollapsibleSpecialRequests } from "@/components/ui/CollapsibleSpecialRequests";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Ticket, Minus, Plus, Loader2, CreditCard, PartyPopper, ExternalLink, Users, Info, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SuccessQRCard } from "@/components/ui/SuccessQRCard";
import { isBottleTier, formatBottleLabel } from "@/lib/bottlePricing";

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

interface TicketPurchaseCardProps {
  eventId: string;
  eventTitle: string;
  tiers: TicketTier[];
  onSuccess?: (orderId: string, isFree: boolean) => void;
  /** When true, shows guest name+age fields per ticket (Kaliva flow) */
  isLinkedReservation?: boolean;
}

const t = {
  el: {
    tickets: "Εισιτήρια",
    selectTickets: "Επιλέξτε Εισιτήρια",
    available: "διαθέσιμα",
    soldOut: "Εξαντλήθηκαν",
    free: "Δωρεάν",
    total: "Σύνολο",
    checkout: "Αγορά",
    getTickets: "Λήψη Εισιτηρίων",
    noTicketsSelected: "Επιλέξτε τουλάχιστον ένα εισιτήριο",
    processing: "Επεξεργασία...",
    loginRequired: "Πρέπει να συνδεθείτε για να αγοράσετε εισιτήρια",
    name: "Όνομα",
    email: "Email",
    yourInfo: "Τα στοιχεία σας",
    guestDetails: "Στοιχεία Καλεσμένων",
    guestN: "Καλεσμένος",
    age: "Ηλικία",
    ticketAndReservation: "Εισιτήριο & Κράτηση",
    ticketReservationHint: "Η αγορά εισιτηρίων δημιουργεί αυτόματα κράτηση.",
    minimumChargeNote: "Ελάχιστη κατανάλωση τραπεζιού",
    paidAtVenue: "Πληρώνεται στο κατάστημα",
    fillAllGuests: "Συμπληρώστε όνομα και ηλικία για όλους τους καλεσμένους",
    specialRequests: "Ειδικά αιτήματα",
    optional: "προαιρετικό",
  },
  en: {
    tickets: "Tickets",
    selectTickets: "Select Tickets",
    available: "available",
    soldOut: "Sold Out",
    free: "Free",
    total: "Total",
    checkout: "Checkout",
    getTickets: "Get Tickets",
    noTicketsSelected: "Please select at least one ticket",
    processing: "Processing...",
    loginRequired: "You must be logged in to purchase tickets",
    name: "Name",
    email: "Email",
    yourInfo: "Your Information",
    guestDetails: "Guest Details",
    guestN: "Guest",
    age: "Age",
    ticketAndReservation: "Ticket & Reservation",
    ticketReservationHint: "Buying tickets automatically creates a reservation.",
    minimumChargeNote: "Table minimum charge",
    paidAtVenue: "Paid at the venue",
    fillAllGuests: "Please fill in name and age for all guests",
    specialRequests: "Special requests",
    optional: "optional",
  },
};

export const TicketPurchaseCard = ({
  eventId,
  eventTitle,
  tiers,
  onSuccess,
  isLinkedReservation = false,
}: TicketPurchaseCardProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const text = t[language];
  
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [specialRequests, setSpecialRequests] = useState('');
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [guests, setGuests] = useState<GuestInfo[]>([]);
  const [minChargeCents, setMinChargeCents] = useState<number | null>(null);
  const [matchedBottle, setMatchedBottle] = useState<{ bottle_type: 'bottle' | 'premium_bottle'; bottle_count: number } | null>(null);
  const [allTiersData, setAllTiersData] = useState<{ min_people: number; max_people: number; prepaid_min_charge_cents: number; pricing_mode?: 'amount' | 'bottles' | null; bottle_type?: 'bottle' | 'premium_bottle' | null; bottle_count?: number | null }[]>([]);
  const [isPayAtDoor, setIsPayAtDoor] = useState(false);
  const [ticketSuccessData, setTicketSuccessData] = useState<{
    orderId: string;
    tickets: { guest_name: string; qr_code_token: string }[];
  } | null>(null);
  const [ticketSuccessIndex, setTicketSuccessIndex] = useState(0);

  // Fetch all price tiers for linked reservation events (Kaliva)
  useEffect(() => {
    if (!isLinkedReservation) {
      // Still fetch pay_at_door for non-linked events
      supabase
        .from('events')
        .select('pay_at_door')
        .eq('id', eventId)
        .single()
        .then(({ data }) => {
          if (data) setIsPayAtDoor(data.pay_at_door === true);
        });
      return;
    }
    const fetchTiers = async () => {
      // Also fetch pay_at_door
      const { data: evData } = await supabase
        .from('events')
        .select('pay_at_door')
        .eq('id', eventId)
        .single();
      if (evData) setIsPayAtDoor(evData.pay_at_door === true);

      const { data: seatingTypes } = await supabase
        .from("reservation_seating_types")
        .select("id")
        .eq("event_id", eventId)
        .limit(1);
      if (seatingTypes && seatingTypes.length > 0) {
        const { data: fetchedTiers } = await supabase
          .from("seating_type_tiers")
          .select("min_people, max_people, prepaid_min_charge_cents, pricing_mode, bottle_type, bottle_count")
          .eq("seating_type_id", seatingTypes[0].id)
          .order("min_people", { ascending: true });
        if (fetchedTiers && fetchedTiers.length > 0) {
          setAllTiersData(fetchedTiers as any);
          // Set initial value from smallest tier
          const first: any = fetchedTiers[0];
          if (isBottleTier(first)) {
            setMatchedBottle({ bottle_type: first.bottle_type, bottle_count: first.bottle_count });
            setMinChargeCents(0);
          } else {
            setMatchedBottle(null);
            setMinChargeCents(first.prepaid_min_charge_cents);
          }
        }
      }
    };
    fetchTiers();
  }, [eventId, isLinkedReservation]);

  // Update min charge based on total tickets (party size)
  useEffect(() => {
    if (!isLinkedReservation || allTiersData.length === 0) return;
    const total = getTotalTickets();
    const applyTier = (tier: any) => {
      if (isBottleTier(tier)) {
        setMatchedBottle({ bottle_type: tier.bottle_type, bottle_count: tier.bottle_count });
        setMinChargeCents(0);
      } else {
        setMatchedBottle(null);
        setMinChargeCents(tier.prepaid_min_charge_cents);
      }
    };
    if (total === 0) {
      applyTier(allTiersData[0]);
      return;
    }
    const matched = allTiersData.find(t => total >= t.min_people && total <= t.max_people);
    if (matched) {
      applyTier(matched);
    } else {
      // If above max tier, use the highest tier
      const last = allTiersData[allTiersData.length - 1];
      if (total > last.max_people) {
        applyTier(last);
      }
    }
  }, [quantities, allTiersData, isLinkedReservation]);

  // Reset checkout state when quantities change
  useEffect(() => {
    if (checkoutUrl) {
      setCheckoutUrl(null);
      setRedirectAttempted(false);
    }
  }, [quantities]);

  // Sync guest fields count with total tickets (Kaliva mode)
  useEffect(() => {
    if (!isLinkedReservation) return;
    const total = getTotalTickets();
    setGuests(prev => {
      if (prev.length === total) return prev;
      if (prev.length < total) {
        return [...prev, ...Array(total - prev.length).fill(null).map(() => ({ name: '', age: '' }))];
      }
      return prev.slice(0, total);
    });
  }, [quantities, isLinkedReservation]);

  const updateQuantity = (tierId: string, delta: number) => {
    const tier = tiers.find(t => t.id === tierId);
    if (!tier) return;

    const current = quantities[tierId] || 0;
    const newQty = Math.max(0, Math.min(tier.max_per_order, current + delta));
    const available = tier.quantity_total > 0 ? tier.quantity_total - tier.quantity_sold : Infinity;
    
    if (available !== Infinity && newQty > available) {
      toast.error(language === 'el' 
        ? `Μόνο ${available} διαθέσιμα` 
        : `Only ${available} available`
      );
      return;
    }

    setQuantities({ ...quantities, [tierId]: newQty });
  };

  const updateGuest = (index: number, field: keyof GuestInfo, value: string) => {
    setGuests(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return text.free;
    return `€${(cents / 100).toFixed(2)}`;
  };

  const calculateTotal = () => {
    return tiers.reduce((sum, tier) => {
      const qty = quantities[tier.id] || 0;
      return sum + (tier.price_cents * qty);
    }, 0);
  };

  const getTotalTickets = () => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  };

  const isFreeOrder = () => {
    return tiers.every(tier => tier.price_cents === 0 || !quantities[tier.id]);
  };

  const handleCheckout = async () => {
    if (getTotalTickets() === 0) {
      toast.error(text.noTicketsSelected);
      return;
    }

    if (!customerName.trim()) {
      toast.error(language === 'el' ? "Παρακαλώ εισάγετε το όνομά σας" : "Please enter your name");
      return;
    }

    // Validate guest info for Kaliva mode
    if (isLinkedReservation) {
      const allFilled = guests.every(g => g.name.trim() && g.age.trim());
      if (!allFilled) {
        toast.error(text.fillAllGuests);
        return;
      }
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(text.loginRequired);
        setIsLoading(false);
        return;
      }

      const items = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([tierId, quantity]) => ({ tierId, quantity }));

      const body: any = {
        eventId,
        items,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || user.email,
        specialRequests: specialRequests.trim() || null,
      };

      // Pass guest info for Kaliva-linked reservations
      if (isLinkedReservation && guests.length > 0) {
        body.guests = guests.map(g => ({
          name: g.name.trim(),
          age: parseInt(g.age) || 0,
        }));
      }

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
        setIsLoading(false);
        toast.success(language === 'el' 
          ? "Εισιτήρια επιβεβαιώθηκαν!" 
          : "Tickets confirmed!"
        );
        queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
        queryClient.invalidateQueries({ queryKey: ["my-tickets-events"] });

        // For pay-at-door: show QR codes inline
        if (isPayAtDoor) {
          try {
            const { data: tickets } = await supabase
              .from('tickets')
              .select('guest_name, qr_code_token')
              .eq('order_id', data.orderId)
              .order('created_at');
            if (tickets && tickets.length > 0) {
              setTicketSuccessData({
                orderId: data.orderId,
                tickets: tickets.map(tk => ({
                  guest_name: tk.guest_name || '',
                  qr_code_token: tk.qr_code_token,
                })),
              });
              setTicketSuccessIndex(0);
              return;
            }
          } catch (e) {
            console.error('Failed to fetch tickets for success screen', e);
          }
        }

        window.location.href = `/dashboard-user/tickets?success=true&order_id=${data.orderId}`;
      } else {
        setCheckoutUrl(data.url);
        setIsLoading(false);
        window.location.assign(data.url);
        setTimeout(() => {
          setRedirectAttempted(true);
        }, 900);
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || (language === 'el' ? "Αποτυχία αγοράς" : "Purchase failed"));
      setIsLoading(false);
    }
  };

  const handleCancelRedirect = () => {
    setCheckoutUrl(null);
    setRedirectAttempted(false);
  };

  const total = calculateTotal();
  const totalTickets = getTotalTickets();

  return (
    <>
    <Card>
      <CardHeader className="pb-2 md:pb-3 lg:pb-4">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          {isLinkedReservation ? (
            <>
              <Users className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
              {text.ticketAndReservation}
            </>
          ) : (
            <>
              <Ticket className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
              {text.tickets}
            </>
          )}
        </CardTitle>
        {isLinkedReservation && (
          <p className="text-xs text-muted-foreground mt-1">{text.ticketReservationHint}</p>
        )}
        {isLinkedReservation && matchedBottle && (
          <div className="flex items-center gap-1.5 mt-2 p-2 rounded-md bg-muted border border-border">
            <Info className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs text-muted-foreground">
              {text.minimumChargeNote}: <strong className="text-foreground">{formatBottleLabel(matchedBottle.bottle_type, matchedBottle.bottle_count, language)}</strong> — {text.paidAtVenue}
            </span>
          </div>
        )}
        {isLinkedReservation && !matchedBottle && minChargeCents != null && minChargeCents > 0 && (
          <div className="flex items-center gap-1.5 mt-2 p-2 rounded-md bg-muted border border-border">
            <Info className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs text-muted-foreground">
              {text.minimumChargeNote}: <strong className="text-foreground">€{(minChargeCents / 100).toFixed(2)}</strong> — {text.paidAtVenue}
            </span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3 md:space-y-4">
        {tiers.map((tier) => {
          const available = tier.quantity_total > 0 ? tier.quantity_total - tier.quantity_sold : Infinity;
          const isSoldOut = tier.quantity_total > 0 && available <= 0;
          const qty = quantities[tier.id] || 0;

          return (
            <div key={tier.id} className="flex items-center justify-between p-2.5 md:p-3 rounded-lg border bg-muted/30">
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <span className="font-medium text-sm md:text-base truncate">{tier.name}</span>
                  {isSoldOut && (
                    <Badge variant="destructive" className="text-[10px] md:text-xs shrink-0">{text.soldOut}</Badge>
                  )}
                </div>
                {tier.description && (
                  <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{tier.description}</p>
                )}
                <div className="flex items-center gap-1.5 md:gap-2 mt-0.5 md:mt-1">
                  <span className="font-semibold text-primary text-sm md:text-base">
                    {formatPrice(tier.price_cents)}
                  </span>
                  {isSoldOut ? (
                    <span className="text-[10px] md:text-xs text-destructive font-semibold whitespace-nowrap">
                      {text.soldOut}
                    </span>
                  ) : available <= 10 && available !== Infinity ? (
                    <span className="text-[10px] md:text-xs text-muted-foreground font-medium whitespace-nowrap">
                      ({available} {text.available})
                    </span>
                  ) : null}
                </div>
              </div>

              {!isSoldOut && (
                <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 md:h-8 md:w-8"
                    onClick={() => updateQuantity(tier.id, -1)}
                    disabled={qty === 0}
                  >
                    <Minus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </Button>
                  <span className="w-6 md:w-8 text-center font-medium text-sm md:text-base">{qty}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 md:h-8 md:w-8"
                    onClick={() => updateQuantity(tier.id, 1)}
                    disabled={qty >= tier.max_per_order || qty >= available}
                  >
                    <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {totalTickets > 0 && (
          <>
            <Separator />
            
            {/* Kaliva mode: guest info per ticket */}
            {isLinkedReservation && guests.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {text.guestDetails} ({guests.length} {language === 'el' ? 'άτομα' : 'people'})
                </Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {guests.map((guest, idx) => (
                    <div key={idx} className="flex gap-2 items-center p-2 rounded-lg border bg-muted/20">
                      <span className="text-xs text-muted-foreground shrink-0 w-5 text-center">{idx + 1}</span>
                      <Input
                        placeholder={`${text.name}`}
                        value={guest.name}
                        onChange={(e) => updateGuest(idx, 'name', e.target.value)}
                        className="h-8 text-sm flex-1"
                      />
                      <Input
                        placeholder={text.age}
                        type="number"
                        min="1"
                        max="120"
                        value={guest.age}
                        onChange={(e) => updateGuest(idx, 'age', e.target.value)}
                        className="h-8 text-sm w-16"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-sm font-medium">{text.yourInfo}</Label>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="customer-name" className="text-xs">{text.name} *</Label>
                  <Input
                    id="customer-name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={language === 'el' ? "Γιάννης Παπαδόπουλος" : "John Doe"}
                  />
                </div>
                <div>
                  <Label htmlFor="customer-email" className="text-xs">{text.email}</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder={language === 'el' ? "email@example.com" : "email@example.com"}
                  />
                </div>
                <CollapsibleSpecialRequests
                  value={specialRequests}
                  onChange={setSpecialRequests}
                  label={text.specialRequests}
                  optionalLabel={text.optional}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>

      {totalTickets > 0 && (
        <CardFooter className="flex flex-col gap-3">
          <div className="flex items-center justify-between w-full">
            <span className="font-medium">{text.total}</span>
            <span className="text-xl font-bold text-primary">
              {isPayAtDoor
                ? (language === 'el' ? 'Δωρεάν online' : 'Free online')
                : total === 0 ? text.free : `€${(total / 100).toFixed(2)}`}
            </span>
          </div>

          {/* Pay at door banner */}
          {isPayAtDoor && total > 0 && (
            <div className="w-full bg-muted border border-border rounded-lg p-3 text-center">
              <p className="text-sm font-medium text-foreground">
                💰 {language === 'el' ? 'Πληρωμή στην Είσοδο' : 'Pay at Door'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'el'
                  ? `Θα πληρώσετε €${(total / 100).toFixed(2)} στην είσοδο του χώρου`
                  : `You will pay €${(total / 100).toFixed(2)} at the venue entrance`}
              </p>
            </div>
          )}

          {/* Checkout URL redirect state */}
          {checkoutUrl ? (
            <div className="w-full space-y-3">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">
                  {language === 'el' ? 'Μεταφορά στην πληρωμή...' : 'Opening payment...'}
                </span>
              </div>
              
              {redirectAttempted && (
                <>
                  <a
                    href={checkoutUrl}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {language === 'el' ? 'Συνέχεια στην Πληρωμή' : 'Continue to Payment'}
                  </a>
                  <p className="text-xs text-muted-foreground text-center">
                    {language === 'el' 
                      ? 'Αν η σελίδα δεν άνοιξε αυτόματα, πατήστε το κουμπί παραπάνω.' 
                      : "If the page didn't open automatically, tap the button above."}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelRedirect}
                    className="w-full"
                  >
                    {language === 'el' ? 'Ακύρωση' : 'Cancel'}
                  </Button>
                </>
              )}
            </div>
          ) : (
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleCheckout}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {text.processing}
                </>
              ) : total === 0 || isPayAtDoor ? (
                <>
                  <PartyPopper className="h-4 w-4 mr-2" />
                  {isPayAtDoor ? (language === 'el' ? 'Ολοκλήρωση' : 'Complete') : text.getTickets}
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  {text.checkout}
                </>
              )}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
    {ticketSuccessData && (() => {
      const currentTicket = ticketSuccessData.tickets[ticketSuccessIndex];
      return (
        <Dialog open={true} onOpenChange={() => { onSuccess?.(ticketSuccessData.orderId, true); setTicketSuccessData(null); }}>
          <DialogContent className="w-[92vw] max-w-sm p-0 overflow-hidden border-0 bg-transparent [&>button]:hidden max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <div className="space-y-4">
              <SuccessQRCard
                type="ticket"
                qrToken={currentTicket?.qr_code_token || ''}
                title={eventTitle}
                businessName=""
                language={language}
                guestName={currentTicket?.guest_name}
                showSuccessMessage={ticketSuccessIndex === 0}
                onViewDashboard={() => { navigate('/dashboard-user?tab=events'); setTicketSuccessData(null); }}
                viewDashboardLabel={language === 'el' ? 'Τα Εισιτήριά Μου' : 'My Tickets'}
                onClose={() => { onSuccess?.(ticketSuccessData.orderId, true); setTicketSuccessData(null); }}
              />
              {ticketSuccessData.tickets.length > 1 && (
                <div className="flex items-center justify-center gap-3 pb-2">
                  <Button variant="outline" size="sm" onClick={() => setTicketSuccessIndex(Math.max(0, ticketSuccessIndex - 1))} disabled={ticketSuccessIndex === 0}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium text-foreground">
                    {currentTicket?.guest_name} ({ticketSuccessIndex + 1}/{ticketSuccessData.tickets.length})
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setTicketSuccessIndex(Math.min(ticketSuccessData.tickets.length - 1, ticketSuccessIndex + 1))} disabled={ticketSuccessIndex === ticketSuccessData.tickets.length - 1}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      );
    })()}
    </>
  );
};

export default TicketPurchaseCard;
