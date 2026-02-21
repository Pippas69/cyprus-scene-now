import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OceanLoader } from "@/components/ui/ocean-loader";
import { SuccessQRCard } from "@/components/ui/SuccessQRCard";
import { AlertCircle } from "lucide-react";

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
  qr_code_token: string;
  confirmation_code: string;
  party_size: number;
  preferred_time: string | null;
  prepaid_min_charge_cents: number;
  event_title: string;
  event_date: string;
  business_name: string;
  business_logo?: string | null;
}

export const ReservationSuccess = () => {
  const { language } = useLanguage();
  const text = t[language];
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [reservationData, setReservationData] = useState<ReservationData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const ranOnceRef = useRef(false);

  useEffect(() => {
    if (ranOnceRef.current) return;
    ranOnceRef.current = true;

    const processPayment = async () => {
      const sessionId = searchParams.get("session_id");
      const reservationId = searchParams.get("reservation_id");

      if (!reservationId) {
        setStatus("error");
        setErrorMessage("Missing reservation information");
        return;
      }

      const processKey = `reservation_success_processed:${reservationId}:${sessionId ?? "no_session"}`;

      try {
        // The Stripe webhook (checkout.session.completed) handles payment processing
        // and reservation status updates automatically. We just need to wait briefly
        // for the webhook to complete, then fetch the reservation data.
        
        // Small delay to allow webhook processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Fetch reservation details
        const { data: reservation, error: fetchError } = await supabase
          .from("reservations")
          .select(`
            id,
            qr_code_token,
            confirmation_code,
            party_size,
            preferred_time,
            prepaid_min_charge_cents,
            events!inner(title, start_at, businesses!inner(name, logo_url))
          `)
          .eq("id", reservationId)
          .single();

        if (fetchError) {
          console.error("Reservation fetch error:", fetchError);
          setStatus("success");
          return;
        }

        const event = (reservation as any).events;
        const business = event?.businesses;

        setReservationData({
          id: reservation.id,
          qr_code_token: reservation.qr_code_token,
          confirmation_code: reservation.confirmation_code,
          party_size: reservation.party_size,
          preferred_time: reservation.preferred_time,
          prepaid_min_charge_cents: reservation.prepaid_min_charge_cents ?? 0,
          event_title: event?.title || "Event",
          event_date: event?.start_at || "",
          business_name: business?.name || "",
          business_logo: business?.logo_url || null,
        });

        setStatus("success");
      } catch (err) {
        console.error("Payment processing error:", err);
        try { sessionStorage.removeItem(processKey); } catch { /* ignore */ }
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {reservationData ? (
        <SuccessQRCard
          type="event_reservation"
          qrToken={reservationData.qr_code_token}
          title={reservationData.event_title}
          businessName={reservationData.business_name}
          businessLogo={reservationData.business_logo}
          language={language}
          reservationDate={reservationData.event_date}
          confirmationCode={reservationData.confirmation_code}
          partySize={reservationData.party_size}
          prepaidAmountCents={reservationData.prepaid_min_charge_cents}
          showSuccessMessage={true}
          onViewDashboard={() => navigate("/dashboard-user?tab=events&subtab=reservations")}
          viewDashboardLabel={text.viewReservations}
        />
      ) : (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-medium">
            {language === "el" ? "Η κράτηση ολοκληρώθηκε!" : "Reservation complete!"}
          </p>
          <Button onClick={() => navigate("/dashboard-user?tab=events&subtab=reservations")} className="mt-4">
            {text.viewReservations}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReservationSuccess;
