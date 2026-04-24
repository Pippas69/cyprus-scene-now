// Φάση 4 — SMS link landing page (/r/:token)
// Minimal redirector: validates the token via RPC and forwards to the event page
// with ?booking_token=... so EventDetail re-fetches the locked data from the DB.
// We do NOT cache anything in sessionStorage — the URL + DB are the source of truth,
// so the link works even after closing the browser or opening a new tab on mobile.
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

type PendingBookingRow = {
  id: string;
  event_id: string | null;
  status: "pending" | "completed" | "link_expired" | "cancelled";
};

const PublicBookingPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [errorState, setErrorState] = useState<"expired" | "completed" | "invalid" | "no_event" | null>(null);

  useEffect(() => {
    if (!token) {
      setErrorState("invalid");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data: pbData, error: pbError } = await supabase.rpc(
          "get_pending_booking_by_token",
          { _token: token },
        );

        if (pbError) {
          console.error("RPC error", pbError);
          if (!cancelled) setErrorState("invalid");
          return;
        }

        const pb = (pbData as PendingBookingRow[] | null)?.[0];
        if (!pb) {
          // RPC returns nothing for completed/expired — disambiguate with a status lookup
          const { data: rawData } = await supabase
            .from("pending_bookings")
            .select("status")
            .eq("token", token)
            .maybeSingle();
          if (cancelled) return;
          if (rawData?.status === "completed") setErrorState("completed");
          else setErrorState("expired");
          return;
        }

        if (!pb.event_id) {
          if (!cancelled) setErrorState("no_event");
          return;
        }

        if (cancelled) return;
        // Forward to the event page — EventDetail will re-fetch the locked data
        // from the DB using this same token, so nothing needs to live in storage.
        navigate(
          `/event/${pb.event_id}?booking_token=${encodeURIComponent(token)}`,
          { replace: true },
        );
      } catch (e) {
        console.error(e);
        if (!cancelled) setErrorState("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  if (errorState === "expired") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Ο σύνδεσμος έληξε
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Αυτός ο σύνδεσμος κράτησης έχει λήξει. Παρακαλώ επικοινωνήστε με την επιχείρηση για νέο σύνδεσμο.
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>Επιστροφή στην αρχική</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (errorState === "completed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" /> Έχει ήδη ολοκληρωθεί
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Αυτή η κράτηση έχει ήδη ολοκληρωθεί.
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>Επιστροφή στην αρχική</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (errorState === "invalid" || errorState === "no_event") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Μη έγκυρος σύνδεσμος
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ο σύνδεσμος δεν είναι έγκυρος. Παρακαλώ επικοινωνήστε με την επιχείρηση.
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>Επιστροφή στην αρχική</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Άνοιγμα κράτησης…</p>
      </div>
    </div>
  );
};

// Shape of the locked-customer payload consumed by EventDetail and the dialogs.
// Fetched fresh from the DB via get_pending_booking_by_token — never cached.
export type SmsLockedBooking = {
  token: string;
  pendingBookingId: string;
  bookingType: "reservation" | "ticket" | "walk_in";
  customerName: string;
  customerPhone: string;
  seatingPreference: string | null;
  partySize: number | null;
  notes: string | null;
};

export default PublicBookingPage;
