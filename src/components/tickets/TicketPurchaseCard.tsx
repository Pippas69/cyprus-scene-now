import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Ticket, Minus, Plus, Loader2, CreditCard, PartyPopper } from "lucide-react";
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
        toast.success(language === 'el' 
          ? "Εισιτήρια επιβεβαιώθηκαν!" 
          : "Tickets confirmed!"
        );
        onSuccess?.(data.orderId, true);
      } else {
        // Redirect to Stripe checkout in same tab to avoid pop-up blockers
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || (language === 'el' ? "Αποτυχία αγοράς" : "Purchase failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const total = calculateTotal();
  const totalTickets = getTotalTickets();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" />
          {text.tickets}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {tiers.map((tier) => {
          const available = tier.quantity_total - tier.quantity_sold;
          const isSoldOut = available <= 0;
          const qty = quantities[tier.id] || 0;

          return (
            <div key={tier.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{tier.name}</span>
                  {isSoldOut && (
                    <Badge variant="destructive" className="text-xs">{text.soldOut}</Badge>
                  )}
                </div>
                {tier.description && (
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-semibold text-primary">
                    {formatPrice(tier.price_cents)}
                  </span>
                  {!isSoldOut && (
                    <span className="text-xs text-muted-foreground">
                      ({available} {text.available})
                    </span>
                  )}
                </div>
              </div>

              {!isSoldOut && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(tier.id, -1)}
                    disabled={qty === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-medium">{qty}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(tier.id, 1)}
                    disabled={qty >= tier.max_per_order || qty >= available}
                  >
                    <Plus className="h-4 w-4" />
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
        </CardFooter>
      )}
    </Card>
  );
};

export default TicketPurchaseCard;
