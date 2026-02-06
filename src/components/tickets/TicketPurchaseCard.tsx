import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Ticket, Minus, Plus, Loader2, CreditCard, PartyPopper, ExternalLink } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface TicketPurchaseCardProps {
  eventId: string;
  eventTitle: string;
  tiers: TicketTier[];
  onSuccess?: (orderId: string, isFree: boolean) => void;
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
  },
};

export const TicketPurchaseCard = ({
  eventId,
  eventTitle,
  tiers,
  onSuccess,
}: TicketPurchaseCardProps) => {
  const { language } = useLanguage();
  const text = t[language];
  
const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  // Reset checkout state when quantities change
  useEffect(() => {
    if (checkoutUrl) {
      setCheckoutUrl(null);
      setRedirectAttempted(false);
    }
  }, [quantities]);

  const updateQuantity = (tierId: string, delta: number) => {
    const tier = tiers.find(t => t.id === tierId);
    if (!tier) return;

    const current = quantities[tierId] || 0;
    const newQty = Math.max(0, Math.min(tier.max_per_order, current + delta));
    const available = tier.quantity_total - tier.quantity_sold;
    
    if (newQty > available) {
      toast.error(language === 'el' 
        ? `Μόνο ${available} διαθέσιμα` 
        : `Only ${available} available`
      );
      return;
    }

    setQuantities({ ...quantities, [tierId]: newQty });
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

      const { data, error } = await supabase.functions.invoke('create-ticket-checkout', {
        body: {
          eventId,
          items,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim() || user.email,
        },
      });

      if (error) throw error;

      if (data.isFree) {
        // Free tickets - order completed directly
        setIsLoading(false);
        toast.success(language === 'el' 
          ? "Εισιτήρια επιβεβαιώθηκαν!" 
          : "Tickets confirmed!"
        );
        // Redirect to My Tickets for free tickets
        window.location.href = `/dashboard-user/tickets?success=true&order_id=${data.orderId}`;
      } else {
        // Store URL and attempt redirect - use fallback pattern for iOS/Safari
        setCheckoutUrl(data.url);
        setIsLoading(false);
        
        // Attempt automatic redirect
        window.location.assign(data.url);
        
        // Show fallback button after delay if user is still on page
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
    <Card>
      <CardHeader className="pb-2 md:pb-3 lg:pb-4">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <Ticket className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
          {text.tickets}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3 md:space-y-4">
        {tiers.map((tier) => {
          const available = tier.quantity_total - tier.quantity_sold;
          const isSoldOut = available <= 0;
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
                  {!isSoldOut && (
                    <span className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
                      ({available} {text.available})
                    </span>
                  )}
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
              {total === 0 ? text.free : `€${(total / 100).toFixed(2)}`}
            </span>
          </div>
          
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
              ) : total === 0 ? (
                <>
                  <PartyPopper className="h-4 w-4 mr-2" />
                  {text.getTickets}
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
  );
};

export default TicketPurchaseCard;
