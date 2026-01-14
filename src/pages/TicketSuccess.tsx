import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SuccessCheckmark } from "@/components/ui/success-animation";
import { OceanLoader } from "@/components/ui/ocean-loader";
import { Logo } from "@/components/Logo";
import { Ticket, ArrowRight, AlertCircle } from "lucide-react";

const t = {
  el: {
    processing: "Επεξεργασία πληρωμής...",
    success: "Η αγορά ολοκληρώθηκε!",
    ticketsReady: "Τα εισιτήριά σας είναι έτοιμα",
    ticketCount: "εισιτήρια",
    viewTickets: "Δείτε τα Εισιτήριά Σας",
    continueBrowsing: "Συνέχεια περιήγησης",
    error: "Κάτι πήγε στραβά",
    tryAgain: "Παρακαλώ δοκιμάστε ξανά ή επικοινωνήστε μαζί μας",
    emailSent: "Ελέγξτε το email σας για τα εισιτήρια!",
  },
  en: {
    processing: "Processing your payment...",
    success: "Purchase complete!",
    ticketsReady: "Your tickets are ready",
    ticketCount: "tickets",
    viewTickets: "View Your Tickets",
    continueBrowsing: "Continue Browsing",
    error: "Something went wrong",
    tryAgain: "Please try again or contact support",
    emailSent: "Check your email for your tickets!",
  },
};

export const TicketSuccess = () => {
  const { language } = useLanguage();
  const text = t[language];
  const [searchParams] = useSearchParams();
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [ticketCount, setTicketCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const processPayment = async () => {
      const sessionId = searchParams.get("session_id");
      const orderId = searchParams.get("order_id");
      const isFree = searchParams.get("free") === "true";

      // For free tickets, we just need the orderId
      if (isFree && orderId) {
        try {
          // Call process-free-ticket to send emails
          const { data, error } = await supabase.functions.invoke("process-free-ticket", {
            body: { orderId },
          });

          if (error) throw error;
          
          setTicketCount(data?.ticketCount || 1);
          setStatus("success");
        } catch (err) {
          console.error("Free ticket processing error:", err);
          // Still show success even if email fails - tickets were already created
          setTicketCount(1);
          setStatus("success");
        }
        return;
      }

      // For paid tickets, we need both sessionId and orderId
      if (!sessionId || !orderId) {
        setStatus("error");
        setErrorMessage("Missing payment information");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("process-ticket-payment", {
          body: { sessionId, orderId },
        });

        if (error) throw error;
        
        if (data?.success) {
          setTicketCount(data.ticketCount || 1);
          setStatus("success");
        } else {
          throw new Error(data?.error || "Failed to process payment");
        }
      } catch (err) {
        console.error("Payment processing error:", err);
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      }
    };

    processPayment();
  }, [searchParams]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <OceanLoader size="lg" className="mx-auto mb-4" />
            <p className="text-lg font-medium">{text.processing}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold mb-2">{text.error}</h1>
            <p className="text-muted-foreground mb-4">{errorMessage || text.tryAgain}</p>
            <Button asChild variant="outline">
              <Link to="/ekdiloseis">{text.continueBrowsing}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="max-w-md w-full mx-4 overflow-hidden">
        {/* Branded Header */}
        <div className="bg-gradient-ocean p-6 text-center">
          <Logo size="lg" className="mx-auto shadow-none hover:scale-100" />
          <p className="text-white/85 text-xs tracking-widest uppercase mt-2">Cyprus Events</p>
        </div>
        
        <CardContent className="p-8 text-center">
          <SuccessCheckmark isVisible={true} size="lg" className="mx-auto mb-6" />
          
          <h1 className="text-2xl font-bold text-primary mb-2">{text.success}</h1>
          <p className="text-muted-foreground mb-6">{text.ticketsReady}</p>
          
          <div className="flex items-center justify-center gap-2 mb-6 p-4 bg-primary/5 rounded-lg">
            <Ticket className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">
              {ticketCount} {text.ticketCount}
            </span>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            📧 {text.emailSent}
          </p>

          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link to="/dashboard-user?tab=tickets">
                {text.viewTickets}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full">
              <Link to="/ekdiloseis">{text.continueBrowsing}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TicketSuccess;
