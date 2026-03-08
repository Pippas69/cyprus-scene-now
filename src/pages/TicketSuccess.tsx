import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OceanLoader } from "@/components/ui/ocean-loader";
import { SuccessQRCard } from "@/components/ui/SuccessQRCard";
import { AlertCircle, ArrowRight, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { toast } from "sonner";

const t = {
  el: {
    processing: "Επεξεργασία πληρωμής...",
    viewTickets: "Τα Εισιτήριά Μου",
    viewReservations: "Οι Κρατήσεις Μου",
    continueBrowsing: "Συνέχεια περιήγησης",
    error: "Κάτι πήγε στραβά",
    tryAgain: "Παρακαλώ δοκιμάστε ξανά ή επικοινωνήστε μαζί μας",
    ticketOf: "Εισιτήριο",
    of: "από",
    copyLink: "Αντιγραφή",
    copied: "Αντιγράφηκε!",
  },
  en: {
    processing: "Processing your payment...",
    viewTickets: "My Tickets",
    viewReservations: "My Reservations",
    continueBrowsing: "Continue Browsing",
    error: "Something went wrong",
    tryAgain: "Please try again or contact support",
    ticketOf: "Ticket",
    of: "of",
    copyLink: "Copy link",
    copied: "Copied!",
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
  guest_name?: string | null;
  guest_age?: number | null;
  seat_zone?: string | null;
  seat_row?: string | null;
  seat_number?: number | null;
}

export const TicketSuccess = () => {
  const { language } = useLanguage();
  const text = t[language];
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [allTickets, setAllTickets] = useState<TicketData[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLinkedToReservation, setIsLinkedToReservation] = useState(false);

  const ranOnceRef = useRef(false);

  useEffect(() => {
    if (ranOnceRef.current) return;
    ranOnceRef.current = true;

    const processPayment = async () => {
      const sessionId = searchParams.get("session_id");
      const orderId = searchParams.get("order_id");
      const freeParam = searchParams.get("free") === "true";

      if (!orderId) {
        setStatus("error");
        setErrorMessage("Missing order information");
        return;
      }

      const processKey = `ticket_success_processed:${orderId}:${sessionId ?? (freeParam ? "free" : "no_session")}`;

      try {
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

        const alreadyProcessed = sessionStorage.getItem(processKey) === "1";

        if (!alreadyProcessed) {
          sessionStorage.setItem(processKey, "1");

          if (isFreeOrder) {
            const { error } = await supabase.functions.invoke("process-free-ticket", {
              body: { orderId },
            });
            if (error) throw error;
          } else if (sessionId) {
            const { data, error } = await supabase.functions.invoke("process-ticket-payment", {
              body: { sessionId, orderId },
            });

            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || "Failed to process payment");
          }
        }

        // Fetch ALL tickets for this order
        let tickets: any[] | null = null;
        let fetchError: any = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const { data, error } = await supabase
            .from("tickets")
            .select(`
              id,
              qr_code_token,
              guest_name,
              guest_age,
              seat_zone,
              seat_row,
              seat_number,
              ticket_tiers(name),
              events(title, start_at, businesses(name, logo_url))
            `)
            .eq("order_id", orderId)
            .order("created_at", { ascending: true });

          if (!error && data && data.length > 0) {
            tickets = data;
            fetchError = null;
            break;
          }
          fetchError = error;
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
        }

        if (fetchError || !tickets || tickets.length === 0) {
          console.error("Ticket fetch error:", fetchError);
          setStatus("success");
          return;
        }

        const allTicketData: TicketData[] = tickets.map((ticket: any) => {
          const tierData = ticket.ticket_tiers as any;
          const eventData = ticket.events as any;
          const business = eventData?.businesses;

          return {
            id: ticket.id,
            qr_code_token: ticket.qr_code_token,
            tier_name: tierData?.name || "General",
            event_title: eventData?.title || "Event",
            event_date: eventData?.start_at || "",
            business_name: business?.name || "",
            business_logo: business?.logo_url || null,
            guest_name: ticket.guest_name || null,
            guest_age: ticket.guest_age || null,
            seat_zone: ticket.seat_zone || null,
            seat_row: ticket.seat_row || null,
            seat_number: ticket.seat_number || null,
          };
        });

        setAllTickets(allTicketData);
        setStatus("success");
      } catch (err) {
        console.error("Payment processing error:", err);

        try {
          sessionStorage.removeItem(processKey);
        } catch {
          // ignore
        }

        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      }
    };

    processPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const handleCopyLink = async (ticket: TicketData) => {
    const shareUrl = `${window.location.origin}/ticket-view/${ticket.qr_code_token}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success(text.copied);
  };

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

  const currentTicket = allTickets[currentIdx];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {allTickets.length > 0 && currentTicket ? (
        <div className="w-full max-w-sm mx-auto space-y-3">
          {/* Ticket counter & navigation */}
          {allTickets.length > 1 && (
            <div className="flex items-center justify-between px-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                disabled={currentIdx === 0}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="text-sm font-medium text-muted-foreground">
                {text.ticketOf} {currentIdx + 1} {text.of} {allTickets.length}
                {currentTicket.guest_name && (
                  <span className="ml-1 text-foreground font-semibold">
                    — {currentTicket.guest_name}
                  </span>
                )}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentIdx(Math.min(allTickets.length - 1, currentIdx + 1))}
                disabled={currentIdx === allTickets.length - 1}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <SuccessQRCard
            type="ticket"
            qrToken={currentTicket.qr_code_token}
            title={currentTicket.event_title}
            businessName={currentTicket.business_name}
            businessLogo={currentTicket.business_logo}
            language={language}
            eventDate={currentTicket.event_date}
            ticketTier={currentTicket.tier_name}
            guestName={currentTicket.guest_name || undefined}
            guestAge={currentTicket.guest_age || undefined}
            seatZone={currentTicket.seat_zone || undefined}
            seatRow={currentTicket.seat_row || undefined}
            seatNumber={currentTicket.seat_number || undefined}
            showSuccessMessage={currentIdx === 0}
            onViewDashboard={() => navigate("/dashboard-user?tab=events&subtab=tickets")}
            viewDashboardLabel={text.viewTickets}
          />

          {/* Copyable link for this ticket */}
          <div className="flex items-center gap-2 px-1">
            <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-[10px] text-muted-foreground font-mono truncate">
              {`${window.location.origin}/ticket-view/${currentTicket.qr_code_token}`}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyLink(currentTicket)}
              className="border-[#3ec3b7] text-[#102b4a] bg-white hover:bg-[#3ec3b7]/10 h-8 px-3 shrink-0"
            >
              <Copy className="h-3 w-3 mr-1" />
              {text.copyLink}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
