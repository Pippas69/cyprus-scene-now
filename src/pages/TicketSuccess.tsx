import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OceanLoader } from "@/components/ui/ocean-loader";
import { SuccessQRCard } from "@/components/ui/SuccessQRCard";
import { AlertCircle, ArrowRight } from "lucide-react";

const t = {
  el: {
    processing: "Επεξεργασία πληρωμής...",
    viewTickets: "Τα Εισιτήριά Μου",
    continueBrowsing: "Συνέχεια περιήγησης",
    error: "Κάτι πήγε στραβά",
    tryAgain: "Παρακαλώ δοκιμάστε ξανά ή επικοινωνήστε μαζί μας",
  },
  en: {
    processing: "Processing your payment...",
    viewTickets: "My Tickets",
    continueBrowsing: "Continue Browsing",
    error: "Something went wrong",
    tryAgain: "Please try again or contact support",
  },
};

interface TicketData {
  id: string;
  qr_code_token: string;
  tier_name: string;
  event_title: string;
  event_date: string;
  business_name: string;
  business_logo?: string | null;
}

export const TicketSuccess = () => {
  const { language } = useLanguage();
  const text = t[language];
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const processPayment = async () => {
      const sessionId = searchParams.get("session_id");
      const orderId = searchParams.get("order_id");
      const freeParam = searchParams.get("free") === "true";

      if (!orderId) {
        setStatus("error");
        setErrorMessage("Missing order information");
        return;
      }

      try {
        // Determine if this is a free order (URL param OR backend order total)
        let isFreeOrder = freeParam;
        if (!isFreeOrder && !sessionId) {
          const { data: order, error: orderFetchError } = await supabase
            .from("ticket_orders")
            .select("total_cents")
            .eq("id", orderId)
            .single();

          if (orderFetchError) throw orderFetchError;
          isFreeOrder = (order?.total_cents ?? 0) === 0;
        }

        // For free tickets, call process-free-ticket (this triggers the ticket email)
        if (isFreeOrder) {
          const { error } = await supabase.functions.invoke("process-free-ticket", {
            body: { orderId },
          });
          if (error) throw error;
        } else if (sessionId) {
          // For paid tickets
          const { data, error } = await supabase.functions.invoke("process-ticket-payment", {
            body: { sessionId, orderId },
          });

          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || "Failed to process payment");
        }

        // Fetch ticket details
        const { data: tickets, error: fetchError } = await supabase
          .from("tickets")
          .select(`
            id,
            qr_code_token,
            ticket_tiers!inner(name, events!inner(title, start_at, businesses!inner(name, logo_url)))
          `)
          .eq("order_id", orderId)
          .limit(1)
          .single();

        if (fetchError) {
          console.error("Ticket fetch error:", fetchError);
          // Still show success but with minimal data
          setStatus("success");
          return;
        }

        const ticketTier = tickets.ticket_tiers as any;
        const event = ticketTier?.events;
        const business = event?.businesses;

        setTicketData({
          id: tickets.id,
          qr_code_token: tickets.qr_code_token,
          tier_name: ticketTier?.name || "General",
          event_title: event?.title || "Event",
          event_date: event?.start_at || "",
          business_name: business?.name || "",
          business_logo: business?.logo_url || null,
        });
        
        setStatus("success");
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {ticketData ? (
        <SuccessQRCard
          type="ticket"
          qrToken={ticketData.qr_code_token}
          title={ticketData.event_title}
          businessName={ticketData.business_name}
          businessLogo={ticketData.business_logo}
          language={language}
          eventDate={ticketData.event_date}
          ticketTier={ticketData.tier_name}
          showSuccessMessage={true}
          onViewDashboard={() => navigate("/dashboard-user?tab=events&subtab=tickets")}
          viewDashboardLabel={text.viewTickets}
        />
      ) : (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-medium">
            {language === "el" ? "Η αγορά ολοκληρώθηκε!" : "Purchase complete!"}
          </p>
          <Button asChild className="mt-4">
            <Link to="/dashboard-user?tab=events&subtab=tickets">
              {text.viewTickets}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default TicketSuccess;
