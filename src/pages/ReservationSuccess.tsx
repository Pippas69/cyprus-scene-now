import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OceanLoader } from "@/components/ui/ocean-loader";
import { SuccessQRCard } from "@/components/ui/SuccessQRCard";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";

const t = {
  el: {
    processing: "Επεξεργασία πληρωμής...",
    viewReservations: "Οι Κρατήσεις Μου",
    continueBrowsing: "Συνέχεια περιήγησης",
    error: "Κάτι πήγε στραβά",
    tryAgain: "Παρακαλώ δοκιμάστε ξανά ή επικοινωνήστε μαζί μας",
  },
  en: {
    processing: "Processing your payment...",
    viewReservations: "My Reservations",
    continueBrowsing: "Continue Browsing",
    error: "Something went wrong",
    tryAgain: "Please try again or contact support",
  },
};

interface ReservationData {
  id: string;
  reservation_name: string;
  qr_code_token: string;
  confirmation_code: string;
  party_size: number;
  preferred_time: string | null;
  prepaid_min_charge_cents: number;
  event_title: string;
  event_date: string;
  business_name: string;
  business_logo?: string | null;
  seating_type_id?: string | null;
  ticket_total_cents?: number;
  seating_min_charge_cents?: number;
  bottle_type?: 'bottle' | 'premium_bottle' | null;
  bottle_count?: number | null;
}

interface GuestTicketData {
  id: string;
  guest_name: string | null;
  guest_age: number | null;
  qr_code_token: string;
}

export const ReservationSuccess = () => {
  const { language } = useLanguage();
  const text = t[language];
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [reservationData, setReservationData] = useState<ReservationData | null>(null);
  const [guestTickets, setGuestTickets] = useState<GuestTicketData[]>([]);
  const [currentGuestIndex, setCurrentGuestIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const ranOnceRef = useRef(false);

  useEffect(() => {
    if (ranOnceRef.current) return;
    ranOnceRef.current = true;

    const processPayment = async () => {
      const sessionId = searchParams.get("session_id");
      const reservationId = searchParams.get("reservation_id");
      const eventId = searchParams.get("event_id");

      if (!reservationId && !sessionId) {
        setStatus("error");
        setErrorMessage("Missing reservation information");
        return;
      }

      // If we have reservation_id, use it directly. Otherwise poll by user + event.
      let targetReservationId = reservationId;

      if (!targetReservationId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setStatus("error");
          setErrorMessage("Not authenticated");
          return;
        }

        // Poll for the reservation created by the webhook after payment
        const maxPolls = 15;
        for (let i = 0; i < maxPolls; i++) {
          await new Promise((resolve) => setTimeout(resolve, i === 0 ? 2500 : 1500));

          let query = supabase
            .from("reservations")
            .select("id")
            .eq("user_id", user.id)
            .eq("status", "accepted")
            .order("created_at", { ascending: false })
            .limit(1);

          if (eventId) {
            query = query.eq("event_id", eventId);
          }

          const { data } = await query.maybeSingle();
          if (data) {
            targetReservationId = data.id;
            break;
          }
        }

        if (!targetReservationId) {
          // Last resort: still show a success state with navigation
          setStatus("success");
          return;
        }
      }

      const processKey = `reservation_success_processed:${targetReservationId}:${sessionId ?? "no_session"}`;

      try {
        // Fetch reservation details
        const { data: reservation, error: fetchError } = await supabase
          .from("reservations")
          .select(
            `
              id,
              reservation_name,
              qr_code_token,
              confirmation_code,
              party_size,
              preferred_time,
              prepaid_min_charge_cents,
              seating_type_id,
              events!inner(title, start_at, businesses!inner(name, logo_url))
            `
          )
          .eq("id", targetReservationId)
          .single();

        if (fetchError) {
          console.error("Reservation fetch error:", fetchError);
          setStatus("success");
          return;
        }

        const event = (reservation as any).events;
        const business = event?.businesses;

        // Fetch ticket total for hybrid events (amount user actually paid via tickets)
        let ticketTotalCents = 0;
        const { data: linkedOrders } = await supabase
          .from("ticket_orders")
          .select("total_cents")
          .eq("linked_reservation_id", targetReservationId);
        if (linkedOrders && linkedOrders.length > 0) {
          ticketTotalCents = linkedOrders.reduce((sum, o) => sum + ((o as any).total_cents || 0), 0);
        }

        // Fetch seating tier min charge / bottle info for accurate display
        let seatingMinChargeCents = 0;
        let bottleType: 'bottle' | 'premium_bottle' | null = null;
        let bottleCount: number | null = null;
        if ((reservation as any).seating_type_id) {
          const { data: tiers } = await supabase
            .from("seating_type_tiers")
            .select("min_people, max_people, prepaid_min_charge_cents, pricing_mode, bottle_type, bottle_count")
            .eq("seating_type_id", (reservation as any).seating_type_id)
            .order("min_people", { ascending: true });
          if (tiers) {
            const matched = tiers.find(
              (t: any) => reservation.party_size >= t.min_people && reservation.party_size <= t.max_people
            );
            const fallback = matched ?? [...tiers].reverse().find((t: any) => reservation.party_size >= t.min_people) ?? tiers[0];
            if (fallback) {
              seatingMinChargeCents = fallback.prepaid_min_charge_cents;
              if ((fallback as any).pricing_mode === 'bottles' && (fallback as any).bottle_type && (fallback as any).bottle_count) {
                bottleType = (fallback as any).bottle_type;
                bottleCount = (fallback as any).bottle_count;
              }
            }
          }
        }

        const baseReservationData: ReservationData = {
          id: reservation.id,
          reservation_name: (reservation as any).reservation_name,
          qr_code_token: reservation.qr_code_token,
          confirmation_code: reservation.confirmation_code,
          party_size: reservation.party_size,
          preferred_time: reservation.preferred_time,
          prepaid_min_charge_cents: reservation.prepaid_min_charge_cents ?? 0,
          event_title: event?.title || "Event",
          event_date: event?.start_at || "",
          business_name: business?.name || "",
          business_logo: business?.logo_url || null,
          seating_type_id: (reservation as any).seating_type_id,
          ticket_total_cents: ticketTotalCents,
          seating_min_charge_cents: seatingMinChargeCents || reservation.prepaid_min_charge_cents || 0,
          bottle_type: bottleType,
          bottle_count: bottleCount,
        };

        setReservationData(baseReservationData);

        // Fetch individual guest QR codes (tickets) linked to this reservation.
        // Wait briefly for the payment processor to finish creating all per-guest QR records.
        const expectedGuestCount = Math.max(baseReservationData.party_size || 0, 0);
        const maxAttempts = expectedGuestCount > 1 ? 7 : 2;
        let cleanedTickets: GuestTicketData[] = [];

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const { data: orders, error: ordersError } = await supabase
            .from("ticket_orders")
            .select("id")
            .eq("linked_reservation_id", targetReservationId);

          if (ordersError) {
            console.warn("Ticket orders fetch error:", ordersError);
          } else {
            const orderIds = (orders || []).map((o) => o.id);

            if (orderIds.length > 0) {
              const { data: tickets, error: ticketsError } = await supabase
                .from("tickets")
                .select("id, guest_name, guest_age, qr_code_token, created_at, order_id")
                .in("order_id", orderIds)
                .order("created_at", { ascending: true });

              if (ticketsError) {
                console.warn("Guest tickets fetch error:", ticketsError);
              } else {
                cleanedTickets = (tickets || [])
                  .filter((x: any) => !!x.qr_code_token)
                  .map(
                    (x: any): GuestTicketData => ({
                      id: x.id,
                      guest_name: x.guest_name ?? null,
                      guest_age: x.guest_age ?? null,
                      qr_code_token: x.qr_code_token,
                    })
                  );

                if (expectedGuestCount <= 1 || cleanedTickets.length >= expectedGuestCount) {
                  break;
                }
              }
            }
          }

          if (attempt < maxAttempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1200));
          }
        }

        setGuestTickets(cleanedTickets);
        setCurrentGuestIndex(0);
        setStatus("success");
      } catch (err) {
        console.error("Payment processing error:", err);
        try {
          sessionStorage.removeItem(processKey);
        } catch {
          /* ignore */
        }
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      }
    };

    processPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

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

  const hasGuestTickets = guestTickets.length > 0;
  const currentTicket = hasGuestTickets ? guestTickets[currentGuestIndex] : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {reservationData ? (
        <div className="space-y-4 w-full">
          <SuccessQRCard
            type="event_reservation"
            shareViewType={hasGuestTickets ? "ticket" : "reservation"}
            qrToken={hasGuestTickets ? currentTicket?.qr_code_token || "" : reservationData.qr_code_token}
            title={reservationData.event_title}
            businessName={reservationData.business_name}
            businessLogo={reservationData.business_logo}
            language={language}
            reservationDate={reservationData.event_date}
            reservationName={reservationData.reservation_name}
            guestName={hasGuestTickets ? currentTicket?.guest_name || undefined : undefined}
            guestAge={hasGuestTickets ? currentTicket?.guest_age || undefined : undefined}
            confirmationCode={reservationData.confirmation_code}
            partySize={reservationData.party_size}
            prepaidAmountCents={reservationData.ticket_total_cents && reservationData.ticket_total_cents > 0 ? reservationData.ticket_total_cents : reservationData.prepaid_min_charge_cents}
            minChargeCents={reservationData.ticket_total_cents && reservationData.ticket_total_cents > 0 ? reservationData.seating_min_charge_cents : undefined}
            bottleType={reservationData.bottle_type}
            bottleCount={reservationData.bottle_count}
            showSuccessMessage={!hasGuestTickets || currentGuestIndex === 0}
            onViewDashboard={() => navigate("/dashboard-user?tab=reservations")}
            viewDashboardLabel={text.viewReservations}
          />

          {hasGuestTickets && guestTickets.length > 1 && (
            <div className="flex items-center justify-center gap-3 pb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentGuestIndex(Math.max(0, currentGuestIndex - 1))}
                disabled={currentGuestIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium text-foreground">
                {(currentTicket?.guest_name || reservationData.reservation_name) ?? "-"} ({currentGuestIndex + 1}/
                {guestTickets.length})
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentGuestIndex(Math.min(guestTickets.length - 1, currentGuestIndex + 1))}
                disabled={currentGuestIndex === guestTickets.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-medium">{language === "el" ? "Η κράτηση ολοκληρώθηκε!" : "Reservation complete!"}</p>
          <Button onClick={() => navigate("/dashboard-user?tab=reservations")} className="mt-4">
            {text.viewReservations}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReservationSuccess;
