// Φάση 4 — Public booking page accessed via SMS link /r/:token
// Customers complete a pre-filled reservation that the business pre-created.
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2,
  Lock,
  Calendar,
  MapPin,
  Users,
  Phone,
  User as UserIcon,
  AlertTriangle,
  CheckCircle2,
  Euro,
} from "lucide-react";
import { format } from "date-fns";

type PendingBookingRow = {
  id: string;
  business_id: string;
  business_name: string;
  event_id: string | null;
  event_title: string | null;
  event_start_at: string | null;
  event_location: string | null;
  booking_type: "reservation" | "ticket" | "walk_in";
  customer_phone: string;
  customer_name: string | null;
  party_size: number | null;
  seating_preference: string | null;
  preferred_time: string | null;
  tier_data: any;
  notes: string | null;
  status: "pending" | "completed" | "link_expired" | "cancelled";
  expires_at: string;
};

type SeatingType = {
  id: string;
  seating_type: string;
  available_slots: number;
  paused: boolean | null;
};

type Tier = {
  id: string;
  seating_type_id: string;
  min_people: number;
  max_people: number;
  prepaid_min_charge_cents: number;
  pricing_mode?: "amount" | "bottles" | null;
  bottle_type?: "bottle" | "premium_bottle" | null;
  bottle_count?: number | null;
};

type GuestEntry = { name: string; age: string };

const seatingTranslate = (s: string): string => {
  const map: Record<string, string> = {
    bar: "Μπαρ",
    table: "Τραπέζι",
    vip: "VIP",
    sofa: "Καναπές",
  };
  return map[s.toLowerCase()] ?? s;
};

const PublicBookingPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorState, setErrorState] = useState<
    "expired" | "invalid" | "soldout" | null
  >(null);

  const [booking, setBooking] = useState<PendingBookingRow | null>(null);
  const [seatingType, setSeatingType] = useState<SeatingType | null>(null);
  const [seatingTier, setSeatingTier] = useState<Tier | null>(null);
  const [allTiers, setAllTiers] = useState<Tier[]>([]);
  const [bookedSlots, setBookedSlots] = useState(0);

  const [partySize, setPartySize] = useState<number>(1);
  const [notes, setNotes] = useState("");
  const [guests, setGuests] = useState<GuestEntry[]>([]);
  const [email, setEmail] = useState("");
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);

  // Load booking + seating + tiers
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        // 1. Load pending booking via SECURITY DEFINER RPC
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
          // Could be expired or used. Check raw status (without security definer filter for status only)
          const { data: rawData } = await supabase
            .from("pending_bookings")
            .select("status, expires_at")
            .eq("token", token)
            .maybeSingle();
          if (rawData?.status === "completed") {
            if (!cancelled) setErrorState("invalid");
          } else {
            if (!cancelled) setErrorState("expired");
          }
          return;
        }

        if (!cancelled) {
          setBooking(pb);
          setPartySize(pb.party_size || 1);
          setNotes(pb.notes || "");
        }

        // 2. Auth email (if any)
        const { data: userData } = await supabase.auth.getUser();
        if (!cancelled) setAuthedEmail(userData.user?.email ?? null);

        // 3. Load seating types & tiers (only for reservation type)
        if (pb.event_id && pb.booking_type === "reservation") {
          const { data: sTypes } = await supabase
            .from("reservation_seating_types")
            .select("id, seating_type, available_slots, paused")
            .eq("event_id", pb.event_id);

          // Match by label (case-insensitive)
          const matched =
            (sTypes as SeatingType[] | null)?.find(
              (s) =>
                s.seating_type.toLowerCase() ===
                (pb.seating_preference || "").toLowerCase(),
            ) ?? null;

          if (!cancelled && matched) {
            setSeatingType(matched);

            // Booked counts
            const { data: counts } = await supabase.rpc(
              "get_event_seating_booked_counts",
              { p_event_id: pb.event_id },
            );
            const row = (counts as any[] | null)?.find(
              (r) => r.seating_type_id === matched.id,
            );
            const booked = Number(row?.slots_booked ?? 0);
            setBookedSlots(booked);

            if (booked >= matched.available_slots || matched.paused) {
              setErrorState("soldout");
            }

            const { data: tiers } = await supabase
              .from("seating_type_tiers")
              .select("*")
              .eq("seating_type_id", matched.id)
              .order("min_people", { ascending: true });

            if (!cancelled) {
              setAllTiers((tiers as Tier[] | null) || []);
            }
          }
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setErrorState("invalid");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Recalculate matched tier whenever party size or tiers change
  useEffect(() => {
    if (!allTiers.length) {
      setSeatingTier(null);
      return;
    }
    const t = allTiers.find(
      (x) => partySize >= x.min_people && partySize <= x.max_people,
    );
    setSeatingTier(t ?? null);
  }, [allTiers, partySize]);

  // Guest list size = partySize - 1 (excluding main customer)
  useEffect(() => {
    const target = Math.max(0, partySize - 1);
    setGuests((prev) => {
      if (prev.length === target) return prev;
      const next = [...prev];
      while (next.length < target) next.push({ name: "", age: "" });
      while (next.length > target) next.pop();
      return next;
    });
  }, [partySize]);

  const partySizeLimits = useMemo(() => {
    if (!allTiers.length) return { min: 1, max: 20 };
    return {
      min: Math.min(...allTiers.map((t) => t.min_people)),
      max: Math.max(...allTiers.map((t) => t.max_people)),
    };
  }, [allTiers]);

  const isBottleTier =
    !!seatingTier &&
    seatingTier.pricing_mode === "bottles" &&
    !!seatingTier.bottle_type &&
    (seatingTier.bottle_count ?? 0) >= 1;

  const onlinePriceCents = useMemo(() => {
    if (!seatingTier) return 0;
    if (isBottleTier) return 0;
    return seatingTier.prepaid_min_charge_cents;
  }, [seatingTier, isBottleTier]);

  const remainingSlots = seatingType
    ? Math.max(0, seatingType.available_slots - bookedSlots)
    : 0;

  const handleSubmit = async () => {
    if (!booking || !seatingType) return;

    // Validate
    if (partySize < partySizeLimits.min || partySize > partySizeLimits.max) {
      toast.error(
        `Ο αριθμός ατόμων πρέπει να είναι μεταξύ ${partySizeLimits.min} και ${partySizeLimits.max}`,
      );
      return;
    }
    if (partySize > remainingSlots && partySize > (booking.party_size || 0)) {
      toast.error("Δεν υπάρχουν αρκετές διαθέσιμες θέσεις.");
      return;
    }
    if (!seatingTier) {
      toast.error("Δεν βρέθηκε διαθέσιμη τιμολόγηση για αυτό τον αριθμό.");
      return;
    }
    for (const g of guests) {
      if (!g.name.trim()) {
        toast.error("Συμπληρώστε το όνομα κάθε ατόμου.");
        return;
      }
    }
    const finalEmail = authedEmail || email.trim();
    if (!finalEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(finalEmail)) {
      toast.error("Παρακαλώ εισάγετε έγκυρο email.");
      return;
    }

    setSubmitting(true);
    try {
      const guestsPayload = guests.map((g) => ({
        name: g.name.trim(),
        age: g.age.trim() || undefined,
      }));

      const { data, error } = await supabase.functions.invoke(
        "create-reservation-event-checkout",
        {
          body: {
            event_id: booking.event_id,
            seating_type_id: seatingType.id,
            party_size: partySize,
            reservation_name: booking.customer_name || "Guest",
            phone_number: booking.customer_phone,
            special_requests: notes.trim() || undefined,
            customer_email: finalEmail,
            guests: guestsPayload,
            pending_booking_id: booking.id,
            pending_booking_token: token,
            success_url: `${window.location.origin}/reservation-success?session_id={CHECKOUT_SESSION_ID}&event_id=${booking.event_id}`,
            cancel_url: `${window.location.origin}/r/${token}?cancelled=true`,
          },
        },
      );

      if (error) {
        console.error(error);
        toast.error(error.message || "Σφάλμα");
        return;
      }

      const result = data as { url?: string; error?: string };
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      toast.error("Σφάλμα κατά τη δημιουργία πληρωμής.");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Σφάλμα");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
              Αυτός ο σύνδεσμος κράτησης έχει λήξει. Παρακαλώ επικοινωνήστε με
              την επιχείρηση για ένα νέο σύνδεσμο.
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>
              Επιστροφή στην αρχική
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (errorState === "invalid") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" /> Έχει ήδη
              ολοκληρωθεί
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Αυτή η κράτηση έχει ήδη ολοκληρωθεί ή ο σύνδεσμος δεν είναι
              έγκυρος.
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>
              Επιστροφή στην αρχική
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (errorState === "soldout") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Εξαντλήθηκαν οι θέσεις
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Δυστυχώς η εκδήλωση γέμισε. Παρακαλώ επικοινωνήστε με την
              επιχείρηση.
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>
              Επιστροφή στην αρχική
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!booking) return null;

  const eventDateLabel = booking.event_start_at
    ? format(new Date(booking.event_start_at), "dd/MM/yyyy HH:mm")
    : "—";

  return (
    <div className="min-h-screen bg-background py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Ολοκλήρωσε την κράτησή σου</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {booking.business_name}
          </p>
        </div>

        {/* Event info */}
        {booking.event_title && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="font-semibold">{booking.event_title}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {eventDateLabel}
              </div>
              {booking.event_location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {booking.event_location}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Locked fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Στοιχεία Κράτησης</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" /> Τύπος Θέσης
              </Label>
              <div className="mt-1">
                <Badge variant="secondary">
                  {seatingTranslate(booking.seating_preference || "")}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" /> Όνομα
              </Label>
              <Input
                value={booking.customer_name || ""}
                disabled
                className="mt-1 bg-muted"
              />
            </div>
            <div>
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" /> Τηλέφωνο
              </Label>
              <Input
                value={booking.customer_phone}
                disabled
                className="mt-1 bg-muted font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Editable: party size */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Αριθμός Ατόμων
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setPartySize((p) => Math.max(partySizeLimits.min, p - 1))
                }
                disabled={partySize <= partySizeLimits.min}
              >
                −
              </Button>
              <div className="w-16 text-center font-semibold text-lg">
                {partySize}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setPartySize((p) => Math.min(partySizeLimits.max, p + 1))
                }
                disabled={partySize >= partySizeLimits.max}
              >
                +
              </Button>
              <span className="text-xs text-muted-foreground ml-2">
                ({partySizeLimits.min}–{partySizeLimits.max})
              </span>
            </div>

            {seatingTier && (
              <div className="flex items-center justify-between rounded-md bg-muted p-3">
                <span className="text-sm font-medium">
                  {isBottleTier
                    ? `${seatingTier.bottle_count} ${
                        seatingTier.bottle_type === "premium_bottle"
                          ? "Premium Bottle(s)"
                          : "Bottle(s)"
                      } (πληρωμή στο venue)`
                    : "Προπληρωμή"}
                </span>
                <span className="text-lg font-bold flex items-center gap-1">
                  <Euro className="h-4 w-4" />
                  {(onlinePriceCents / 100).toFixed(2)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guest names */}
        {guests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ονόματα Παρέας</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {guests.map((g, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder={`Όνομα ${idx + 2}`}
                    value={g.name}
                    onChange={(e) => {
                      const next = [...guests];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setGuests(next);
                    }}
                    className="col-span-2"
                  />
                  <Input
                    placeholder="Ηλικία"
                    type="number"
                    min={0}
                    value={g.age}
                    onChange={(e) => {
                      const next = [...guests];
                      next[idx] = { ...next[idx], age: e.target.value };
                      setGuests(next);
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Email (if not authed) */}
        {!authedEmail && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email Επιβεβαίωσης</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Θα λάβετε QR επιβεβαίωσης.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Σημειώσεις (προαιρετικό)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Αλλεργίες, προτιμήσεις, γενέθλια κ.λπ."
              rows={3}
              maxLength={500}
            />
          </CardContent>
        </Card>

        <Separator />

        <Button
          className="w-full h-12 text-base"
          onClick={handleSubmit}
          disabled={submitting || !seatingTier}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          {onlinePriceCents > 0
            ? `Πληρωμή €${(onlinePriceCents / 100).toFixed(2)}`
            : "Επιβεβαίωση Κράτησης"}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          🔒 Ασφαλής πληρωμή μέσω Stripe
        </p>
      </div>
    </div>
  );
};

export default PublicBookingPage;
