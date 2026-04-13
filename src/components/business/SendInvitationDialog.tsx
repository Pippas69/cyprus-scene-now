import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { getCityOptions } from "@/lib/cityTranslations";
import { Send, Loader2 } from "lucide-react";

interface SendInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id: string;
    title: string;
    event_type: string | null;
    accepts_reservations: boolean | null;
    business_id: string;
  };
  seatingTypes?: { id: string; name: string }[];
}

type InvitationType = "ticket" | "reservation" | "walk_in" | "hybrid";

const getAvailableTypes = (event: SendInvitationDialogProps["event"]): { value: InvitationType; label: string; labelEn: string }[] => {
  const eventType = event.event_type;
  const types: { value: InvitationType; label: string; labelEn: string }[] = [];

  if (eventType === "ticket") {
    types.push({ value: "ticket", label: "Εισιτήριο", labelEn: "Ticket" });
  } else if (eventType === "reservation") {
    types.push({ value: "reservation", label: "Κράτηση", labelEn: "Reservation" });
    types.push({ value: "walk_in", label: "Walk-in", labelEn: "Walk-in" });
  } else if (eventType === "ticket_and_reservation") {
    types.push({ value: "hybrid", label: "Κράτηση", labelEn: "Reservation" });
    types.push({ value: "ticket", label: "Εισιτήριο", labelEn: "Ticket" });
    types.push({ value: "walk_in", label: "Walk-in", labelEn: "Walk-in" });
  } else {
    types.push({ value: "ticket", label: "Εισιτήριο Εισόδου", labelEn: "Entry Ticket" });
  }

  return types;
};

const SendInvitationDialog = ({ open, onOpenChange, event, seatingTypes }: SendInvitationDialogProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const availableTypes = getAvailableTypes(event);
  const [invitationType, setInvitationType] = useState<InvitationType>(availableTypes[0]?.value || "ticket");

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestCity, setGuestCity] = useState("");
  const [guestAge, setGuestAge] = useState("");
  const [minAge, setMinAge] = useState("");
  const [partySize, setPartySize] = useState("");
  const [seatingTypeId, setSeatingTypeId] = useState("");

  const isReservationType = invitationType === "reservation" || invitationType === "hybrid";
  const isTicketOnly = invitationType === "ticket";
  const isWalkIn = invitationType === "walk_in";

  const cityOptions = getCityOptions(language);

  const t = language === "el" ? {
    title: "Αποστολή Πρόσκλησης",
    subtitle: "Στείλτε δωρεάν πρόσκληση για",
    name: "Όνομα *",
    email: "Email *",
    phone: "Τηλέφωνο",
    city: "Πόλη",
    age: "Ηλικία",
    minAge: "Ελάχιστη Ηλικία",
    partySize: "Αριθμός Ατόμων",
    seatingType: "Θέση",
    invType: "Τύπος Πρόσκλησης",
    send: "Αποστολή Πρόσκλησης",
    sending: "Αποστολή...",
    success: "Η πρόσκληση εστάλη!",
    successDesc: "Ο καλεσμένος θα λάβει email με QR code",
    error: "Σφάλμα",
    errorDesc: "Δεν ήταν δυνατή η αποστολή της πρόσκλησης",
    required: "Συμπληρώστε τα υποχρεωτικά πεδία",
    selectSeating: "Επιλέξτε θέση",
    selectCity: "Επιλέξτε πόλη",
  } : {
    title: "Send Invitation",
    subtitle: "Send a free invitation for",
    name: "Name *",
    email: "Email *",
    phone: "Phone",
    city: "City",
    age: "Age",
    minAge: "Minimum Age",
    partySize: "Party Size",
    seatingType: "Seating",
    invType: "Invitation Type",
    send: "Send Invitation",
    sending: "Sending...",
    success: "Invitation sent!",
    successDesc: "Guest will receive an email with QR code",
    error: "Error",
    errorDesc: "Could not send invitation",
    required: "Fill in required fields",
    selectSeating: "Select seating",
    selectCity: "Select city",
  };

  const resetForm = () => {
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setGuestCity("");
    setGuestAge("");
    setMinAge("");
    setPartySize("");
    setSeatingTypeId("");
  };

  const handleSend = async () => {
    if (!guestName.trim() || !guestEmail.trim()) {
      toast({ title: t.error, description: t.required, variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        event_id: event.id,
        guest_name: guestName.trim(),
        guest_email: guestEmail.trim().toLowerCase(),
        invitation_type: invitationType,
      };

      if (guestPhone.trim()) payload.guest_phone = guestPhone.trim();
      if (guestCity) payload.guest_city = guestCity;

      if ((isTicketOnly || isWalkIn) && guestAge) {
        payload.guest_age = parseInt(guestAge, 10);
      }
      if (isReservationType && minAge) {
        payload.min_age = parseInt(minAge, 10);
      }
      if (isReservationType) {
        payload.party_size = parseInt(partySize, 10) || 2;
        if (seatingTypeId) payload.seating_type_id = seatingTypeId;
      }

      const { data, error } = await supabase.functions.invoke("send-invitation", {
        body: payload,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: t.success, description: t.successDesc });
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      console.error("[SendInvitation] error", err);
      toast({
        title: t.error,
        description: err?.message || t.errorDesc,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  // Determine which age field label to show
  // Walk-in = single person → "Ηλικία" / "Age"
  // Reservation/Hybrid = group → "Ελάχιστη Ηλικία" / "Minimum Age"
  const ageLabel = isWalkIn ? t.age : t.minAge;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            {t.title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{t.subtitle} <strong>{event.title}</strong></p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Invitation type selector (only if multiple types) */}
          {availableTypes.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t.invType}</Label>
              <Select value={invitationType} onValueChange={(v) => setInvitationType(v as InvitationType)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {language === "el" ? type.label : type.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t.name}</Label>
            <Input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder={language === "el" ? "π.χ. Γιάννης Παπαδόπουλος" : "e.g. John Smith"}
              className="h-9 text-sm"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t.email}</Label>
            <Input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="example@email.com"
              className="h-9 text-sm"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t.phone}</Label>
            <Input
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              placeholder="+357..."
              className="h-9 text-sm"
            />
          </div>

          {/* City - Dropdown */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t.city}</Label>
            <Select value={guestCity} onValueChange={setGuestCity}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={t.selectCity} />
              </SelectTrigger>
              <SelectContent>
                {cityOptions.map((city) => (
                  <SelectItem key={city.value} value={city.value}>
                    {city.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Age - ticket-only or walk-in (single person) */}
          {(isTicketOnly || isWalkIn) && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t.age}</Label>
              <Input
                type="number"
                min={0}
                max={120}
                value={guestAge}
                onChange={(e) => setGuestAge(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          )}

          {/* Min Age - reservation/hybrid (group) */}
          {isReservationType && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t.minAge}</Label>
              <Input
                type="number"
                min={0}
                max={120}
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          )}

          {/* Party Size - reservation/hybrid */}
          {isReservationType && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t.partySize}</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          )}

          {/* Seating Type - reservation/hybrid */}
          {isReservationType && seatingTypes && seatingTypes.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t.seatingType}</Label>
              <Select value={seatingTypeId} onValueChange={setSeatingTypeId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={t.selectSeating} />
                </SelectTrigger>
                <SelectContent>
                  {seatingTypes.map((st) => (
                    <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={sending || !guestName.trim() || !guestEmail.trim()}
            className="w-full h-10 mt-2"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t.sending}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {t.send}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SendInvitationDialog;
