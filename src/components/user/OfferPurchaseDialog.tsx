import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CreditCard, Tag, Store, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  percent_off: number | null;
  original_price_cents: number;
  start_at: string;
  end_at: string;
  terms: string | null;
  max_per_user: number | null;
  businesses: {
    name: string;
    logo_url: string | null;
  };
}

interface OfferPurchaseDialogProps {
  offer: Offer | null;
  isOpen: boolean;
  onClose: () => void;
  language: "el" | "en";
}

export function OfferPurchaseDialog({ offer, isOpen, onClose, language }: OfferPurchaseDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const text = {
    title: { el: "Αγορά Προσφοράς", en: "Purchase Offer" },
    originalPrice: { el: "Αρχική τιμή", en: "Original price" },
    discount: { el: "Έκπτωση", en: "Discount" },
    youPay: { el: "Πληρώνετε", en: "You pay" },
    youSave: { el: "Εξοικονομείτε", en: "You save" },
    validUntil: { el: "Ισχύει μέχρι", en: "Valid until" },
    terms: { el: "Όροι & Προϋποθέσεις", en: "Terms & Conditions" },
    acceptTerms: { el: "Αποδέχομαι τους όρους χρήσης", en: "I accept the terms of use" },
    noRefund: { el: "Σημείωση: Δεν γίνονται επιστροφές χρημάτων", en: "Note: No refunds available" },
    payWithCard: { el: "Πληρωμή με Κάρτα", en: "Pay with Card" },
    cancel: { el: "Άκυρο", en: "Cancel" },
    processing: { el: "Επεξεργασία...", en: "Processing..." },
    errorAuth: { el: "Πρέπει να συνδεθείτε για να αγοράσετε", en: "You must be logged in to purchase" },
    errorGeneric: { el: "Κάτι πήγε στραβά", en: "Something went wrong" },
  };

  const t = (key: keyof typeof text) => text[key][language];

  if (!offer) return null;

  const originalPriceEuros = (offer.original_price_cents / 100).toFixed(2);
  const discountPercent = offer.percent_off || 0;
  const finalPriceCents = Math.round(offer.original_price_cents * (100 - discountPercent) / 100);
  const finalPriceEuros = (finalPriceCents / 100).toFixed(2);
  const savingsEuros = ((offer.original_price_cents - finalPriceCents) / 100).toFixed(2);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === "el" ? "el-GR" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handlePurchase = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t("errorAuth"));
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-offer-checkout", {
        body: { discountId: offer.id },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
        onClose();
      }
    } catch (error: any) {
      console.error("Purchase error:", error);
      toast.error(error.message || t("errorGeneric"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Purchase details for {offer.title}
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
              <div>
                <h3 className="font-semibold">{offer.title}</h3>
                <p className="text-sm text-muted-foreground">{offer.businesses.name}</p>
              </div>
            </div>
            {offer.description && (
              <p className="text-sm text-muted-foreground">{offer.description}</p>
            )}
          </div>

          <Separator />

          {/* Price Breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("originalPrice")}</span>
              <span className="line-through text-muted-foreground">€{originalPriceEuros}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("discount")}</span>
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                -{discountPercent}%
              </Badge>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>{t("youPay")}</span>
              <span className="text-primary">€{finalPriceEuros}</span>
            </div>
            <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
              <span>{t("youSave")}</span>
              <span>€{savingsEuros}</span>
            </div>
          </div>

          <Separator />

          {/* Valid Until */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{t("validUntil")}: {formatDate(offer.end_at)}</span>
          </div>

          {/* Terms */}
          {offer.terms && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium mb-1">{t("terms")}</p>
              <p className="text-muted-foreground">{offer.terms}</p>
            </div>
          )}

          {/* No Refund Warning */}
          <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{t("noRefund")}</span>
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
              {t("acceptTerms")}
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isLoading}>
              {t("cancel")}
            </Button>
            <Button
              onClick={handlePurchase}
              className="flex-1"
              disabled={isLoading || !acceptedTerms}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("processing")}
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  {t("payWithCard")}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
