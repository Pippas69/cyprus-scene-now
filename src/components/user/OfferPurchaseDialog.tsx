import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Tag, Store, Clock, AlertCircle, Users, CheckCircle, QrCode, CalendarCheck, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import QRCodeLib from "qrcode";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  percent_off: number | null;
  category?: string | null;
  discount_type?: string | null;
  special_deal_text?: string | null;
  valid_days?: string[] | null;
  valid_start_time?: string | null;
  valid_end_time?: string | null;
  total_people?: number | null;
  people_remaining?: number | null;
  max_people_per_redemption?: number | null;
  one_per_user?: boolean | null;
  show_reservation_cta?: boolean | null;
  start_at?: string;
  end_at: string;
  terms?: string | null;
  business_id?: string;
  // Legacy fields from OfferCard - kept for compatibility
  original_price_cents?: number | null;
  pricing_type?: string;
  requires_reservation?: boolean;
  businesses: {
    name: string;
    logo_url: string | null;
    city?: string;
    accepts_direct_reservations?: boolean;
  };
}

interface OfferClaimDialogProps {
  offer: Offer | null;
  isOpen: boolean;
  onClose: () => void;
  language: "el" | "en";
}

interface ClaimSuccessData {
  purchaseId: string;
  qrCodeToken: string;
  partySize: number;
  offerTitle: string;
  businessName: string;
  businessLogo: string | null;
  showReservationCta: boolean;
  businessId: string;
}

export function OfferPurchaseDialog({ offer, isOpen, onClose, language }: OfferClaimDialogProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [partySize, setPartySize] = useState(1);
  const [claimSuccess, setClaimSuccess] = useState<ClaimSuccessData | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
      setAcceptedTerms(false);
      setPartySize(1);
      setClaimSuccess(null);
      setQrCodeDataUrl(null);
    }
  }, [isOpen]);

  // Generate QR code when claim succeeds
  useEffect(() => {
    if (claimSuccess?.qrCodeToken) {
      QRCodeLib.toDataURL(claimSuccess.qrCodeToken, {
        width: 200,
        margin: 2,
        color: { dark: "#0d3b66", light: "#ffffff" },
      }).then(setQrCodeDataUrl);
    }
  }, [claimSuccess?.qrCodeToken]);

  const text = {
    title: { el: "Διεκδίκηση Προσφοράς", en: "Claim Offer" },
    successTitle: { el: "Η προσφορά σας είναι έτοιμη!", en: "Your offer is ready!" },
    partySize: { el: "Αριθμός Ατόμων", en: "Number of People" },
    validDays: { el: "Ισχύει", en: "Valid on" },
    validHours: { el: "Ώρες", en: "Hours" },
    expiresOn: { el: "Λήγει", en: "Expires" },
    spotsRemaining: { el: "Διαθέσιμες θέσεις", en: "Spots remaining" },
    terms: { el: "Όροι & Προϋποθέσεις", en: "Terms & Conditions" },
    acceptTerms: { el: "Αποδέχομαι τους όρους χρήσης", en: "I accept the terms of use" },
    walkInNote: { el: "Αυτή η προσφορά ισχύει για walk-in πελάτες και δεν εγγυάται θέση.", en: "This offer is for walk-in customers and does not guarantee a seat." },
    claimOffer: { el: "Διεκδίκηση", en: "Claim" },
    cancel: { el: "Άκυρο", en: "Cancel" },
    processing: { el: "Επεξεργασία...", en: "Processing..." },
    errorAuth: { el: "Πρέπει να συνδεθείτε για να διεκδικήσετε", en: "You must be logged in to claim" },
    errorGeneric: { el: "Κάτι πήγε στραβά", en: "Something went wrong" },
    showQrCode: { el: "Δείξτε αυτόν τον κωδικό QR στο κατάστημα", en: "Show this QR code at the venue" },
    emailSent: { el: "Email στάλθηκε με τον κωδικό QR", en: "Email sent with QR code" },
    viewMyOffers: { el: "Οι Προσφορές μου", en: "My Offers" },
    makeReservation: { el: "Θέλετε κράτηση;", en: "Want a reservation?" },
    validFor: { el: "Ισχύει για", en: "Valid for" },
    people: { el: "άτομα", en: "people" },
    person: { el: "άτομο", en: "person" },
    done: { el: "Τέλος", en: "Done" },
    drink: { el: "Ποτά", en: "Drinks" },
    food: { el: "Φαγητό", en: "Food" },
    account_total: { el: "Σύνολο Λογαριασμού", en: "Account Total" },
    everyDay: { el: "Κάθε μέρα", en: "Every day" },
    allDay: { el: "Όλη μέρα", en: "All day" },
  };

  const t = (key: keyof typeof text) => text[key][language];

  const dayTranslations: Record<string, Record<string, string>> = {
    monday: { el: "Δευτέρα", en: "Monday" },
    tuesday: { el: "Τρίτη", en: "Tuesday" },
    wednesday: { el: "Τετάρτη", en: "Wednesday" },
    thursday: { el: "Πέμπτη", en: "Thursday" },
    friday: { el: "Παρασκευή", en: "Friday" },
    saturday: { el: "Σάββατο", en: "Saturday" },
    sunday: { el: "Κυριακή", en: "Sunday" },
  };

  const getCategoryLabel = (category: string | null): string => {
    if (!category) return "";
    const key = category as keyof typeof text;
    return text[key]?.[language] || category;
  };

  const getCategoryIcon = (category: string | null): string => {
    const icons: Record<string, string> = {
      drink: "🍹",
      food: "🍽️",
      account_total: "💳",
    };
    return icons[category || ""] || "";
  };

  const formatDays = (days: string[] | null): string => {
    if (!days || days.length === 0 || days.length === 7) return t("everyDay");
    return days.map(d => dayTranslations[d]?.[language] || d).join(", ");
  };

  const formatTime = (start: string | null, end: string | null): string => {
    if (!start || !end) return t("allDay");
    return `${start.substring(0, 5)} - ${end.substring(0, 5)}`;
  };

  if (!offer) return null;

  const maxPerRedemption = offer.max_people_per_redemption || 5;
  const peopleRemaining = offer.people_remaining ?? offer.total_people ?? 999;
  const discountDisplay = offer.discount_type === "special_deal" && offer.special_deal_text
    ? offer.special_deal_text
    : offer.percent_off
      ? `-${offer.percent_off}%`
      : null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === "el" ? "el-GR" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleClaim = async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t("errorAuth"));
        return;
      }

      const { data, error } = await supabase.functions.invoke("claim-offer", {
        body: { discountId: offer.id, partySize },
      });

      if (error) {
        // Supabase Functions errors often hide the real message in context.body
        const rawBody = (error as any)?.context?.body;
        const parsedMsg = (() => {
          if (typeof rawBody === "string") {
            try {
              return JSON.parse(rawBody)?.error as string | undefined;
            } catch {
              return undefined;
            }
          }
          return undefined;
        })();

        const serverMsg = parsedMsg || (error as any)?.message;
        const friendlyMsg =
          serverMsg === "You have already claimed this offer"
            ? language === "el"
              ? "Έχετε ήδη διεκδικήσει αυτή την προσφορά. Δείτε την στις “Οι Προσφορές μου”."
              : "You already claimed this offer. Check it in “My Offers”."
            : serverMsg || t("errorGeneric");

        toast.error(friendlyMsg);
        return;
      }

      if (data?.success) {
        setClaimSuccess({
          purchaseId: data.purchaseId,
          qrCodeToken: data.qrCodeToken,
          partySize: data.partySize,
          offerTitle: data.offerTitle,
          businessName: data.businessName,
          businessLogo: data.businessLogo,
          showReservationCta: data.showReservationCta,
          businessId: data.businessId,
        });
        toast.success(language === "el" ? "Η προσφορά διεκδικήθηκε!" : "Offer claimed!");
      }
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewMyOffers = () => {
    onClose();
    navigate("/dashboard-user/offers");
  };

  const handleMakeReservation = () => {
    if (claimSuccess?.businessId) {
      onClose();
      navigate(`/business/${claimSuccess.businessId}`);
    }
  };

  // Success View
  if (claimSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              {t("successTitle")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Your offer has been claimed successfully
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Offer Info */}
            <div className="flex items-center gap-3">
              {claimSuccess.businessLogo ? (
                <img
                  src={claimSuccess.businessLogo}
                  alt={claimSuccess.businessName}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Store className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <h3 className="font-semibold">{claimSuccess.offerTitle}</h3>
                <p className="text-sm text-muted-foreground">{claimSuccess.businessName}</p>
              </div>
            </div>

            <Separator />

            {/* QR Code */}
            <div className="flex flex-col items-center py-4">
              <div className="bg-white p-4 rounded-xl border-2 border-primary/20 shadow-sm">
                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                <QrCode className="h-4 w-4" />
                <span>{t("showQrCode")}</span>
              </div>
            </div>

            {/* Party Size Badge */}
            <div className="flex justify-center">
              <Badge variant="secondary" className="text-sm py-1 px-3">
                <Users className="h-4 w-4 mr-2" />
                {t("validFor")} {claimSuccess.partySize} {claimSuccess.partySize === 1 ? t("person") : t("people")}
              </Badge>
            </div>

            {/* Email Confirmation */}
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg justify-center">
              <CheckCircle className="h-4 w-4" />
              <span>{t("emailSent")}</span>
            </div>

            {/* Walk-in Note */}
            <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{t("walkInNote")}</span>
            </div>

            {/* Optional Reservation CTA - for discount hours */}
            {claimSuccess.showReservationCta && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-primary font-medium">
                  <CalendarCheck className="h-5 w-5" />
                  <span>{language === "el" ? "Θέλετε να κλείσετε τραπέζι;" : "Want to book a table?"}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {language === "el" 
                    ? `Κάντε κράτηση για τις ώρες που ισχύει η έκπτωση (${offer?.valid_start_time?.substring(0,5) || ''} - ${offer?.valid_end_time?.substring(0,5) || ''}) για να εξασφαλίσετε θέση.`
                    : `Make a reservation for the discount hours (${offer?.valid_start_time?.substring(0,5) || ''} - ${offer?.valid_end_time?.substring(0,5) || ''}) to secure a seat.`
                  }
                </p>
                <Button onClick={handleMakeReservation} className="w-full">
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  {language === "el" ? "Κάνε Κράτηση για Έκπτωση" : "Book for Discount Hours"}
                </Button>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button onClick={handleViewMyOffers} variant="outline" className="w-full">
                <Tag className="mr-2 h-4 w-4" />
                {t("viewMyOffers")}
              </Button>

              <Button onClick={onClose} variant="ghost" className="w-full">
                {t("done")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Claim Form View
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Claim offer: {offer.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Offer Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {offer.businesses.logo_url ? (
                <img
                  src={offer.businesses.logo_url}
                  alt={offer.businesses.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Store className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{offer.title}</h3>
                  {offer.category && (
                    <Badge variant="outline" className="text-xs">
                      {getCategoryIcon(offer.category)} {getCategoryLabel(offer.category)}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{offer.businesses.name}</p>
              </div>
            </div>
            {offer.description && (
              <p className="text-sm text-muted-foreground">{offer.description}</p>
            )}
          </div>

          {/* Discount Display */}
          {discountDisplay && (
            <div className="flex justify-center">
              <Badge className="text-lg py-2 px-4 bg-gradient-to-r from-primary to-primary/80">
                {discountDisplay}
              </Badge>
            </div>
          )}

          <Separator />

          {/* Party Size Selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t("partySize")}
            </Label>
            <Select
              value={partySize.toString()}
              onValueChange={(val) => setPartySize(parseInt(val))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: Math.min(maxPerRedemption, peopleRemaining) }, (_, i) => i + 1).map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? t("person") : t("people")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Availability Info */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              {language === "el" ? "Διαθεσιμότητα" : "Availability"}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs">
                  {language === "el" ? "Διαθέσιμα" : "Available"}
                </span>
                <span className="font-medium">{peopleRemaining} {language === "el" ? "άτομα" : "people"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs">
                  {language === "el" ? "Μέγ. ανά εξαργύρωση" : "Max per redemption"}
                </span>
                <span className="font-medium">{maxPerRedemption} {language === "el" ? "άτομα" : "people"}</span>
              </div>
            </div>
            {offer.one_per_user && (
              <Badge variant="secondary" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                {language === "el" ? "Μία εξαργύρωση ανά χρήστη" : "One redemption per user"}
              </Badge>
            )}
          </div>

          {/* Validity Info */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{t("validDays")}: {formatDays(offer.valid_days || null)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{t("validHours")}: {formatTime(offer.valid_start_time || null, offer.valid_end_time || null)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{t("expiresOn")}: {formatDate(offer.end_at)}</span>
            </div>
          </div>

          {/* Terms */}
          {offer.terms && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium mb-1">{t("terms")}</p>
              <p className="text-muted-foreground">{offer.terms}</p>
            </div>
          )}

          {/* Walk-in Note */}
          <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{t("walkInNote")}</span>
          </div>

          {/* Accept Terms */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
            />
            <label
              htmlFor="terms"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {language === "el" ? (
                <>Αποδέχομαι τους <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">όρους χρήσης</a></>
              ) : (
                <>I accept the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">terms of use</a></>
              )}
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isLoading}>
              {t("cancel")}
            </Button>
            <Button
              onClick={handleClaim}
              className="flex-1"
              disabled={isLoading || !acceptedTerms || peopleRemaining < partySize}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("processing")}
                </>
              ) : (
                <>
                  <Tag className="mr-2 h-4 w-4" />
                  {t("claimOffer")}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
