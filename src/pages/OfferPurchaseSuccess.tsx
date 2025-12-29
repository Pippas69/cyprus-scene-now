import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, QrCode, ArrowLeft, Download, Store } from "lucide-react";
import QRCodeLib from "qrcode";
import { toast } from "sonner";

export default function OfferPurchaseSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const purchaseId = searchParams.get("purchase_id");

  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchase, setPurchase] = useState<any>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  const text = {
    processing: { el: "Επεξεργασία πληρωμής...", en: "Processing payment..." },
    success: { el: "Αγορά Επιτυχής!", en: "Purchase Successful!" },
    yourQR: { el: "Ο QR Κωδικός σας", en: "Your QR Code" },
    showAtVenue: { el: "Δείξτε αυτόν τον κωδικό στο κατάστημα για να λάβετε την προσφορά", en: "Show this code at the venue to claim your offer" },
    validUntil: { el: "Ισχύει μέχρι", en: "Valid until" },
    youPaid: { el: "Πληρώσατε", en: "You paid" },
    discount: { el: "Έκπτωση", en: "Discount" },
    goToOffers: { el: "Δείτε τις Προσφορές μου", en: "View My Offers" },
    backToFeed: { el: "Πίσω στο Feed", en: "Back to Feed" },
    downloadQR: { el: "Λήψη QR", en: "Download QR" },
    errorTitle: { el: "Σφάλμα", en: "Error" },
    errorGeneric: { el: "Κάτι πήγε στραβά", en: "Something went wrong" },
    noPurchaseId: { el: "Δεν βρέθηκε η αγορά", en: "Purchase not found" },
  };

  const t = (key: keyof typeof text) => text[key][language];

  useEffect(() => {
    const processPayment = async () => {
      if (!purchaseId) {
        setError(t("noPurchaseId"));
        setIsProcessing(false);
        return;
      }

      try {
        // Call process-offer-payment to verify and finalize the purchase
        const { data, error: processError } = await supabase.functions.invoke("process-offer-payment", {
          body: { purchaseId },
        });

        if (processError) throw processError;

        if (!data?.success) {
          throw new Error(data?.error || t("errorGeneric"));
        }

        // Fetch the full purchase details
        const { data: purchaseData, error: fetchError } = await supabase
          .from("offer_purchases")
          .select(`
            *,
            discounts!inner(title, description, percent_off, end_at),
            businesses!inner(name, logo_url)
          `)
          .eq("id", purchaseId)
          .single();

        if (fetchError) throw fetchError;

        setPurchase(purchaseData);

        // Generate QR code
        if (data.qrToken) {
          const qrDataUrl = await QRCodeLib.toDataURL(data.qrToken, {
            width: 300,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#ffffff",
            },
          });
          setQrCodeDataUrl(qrDataUrl);
        }

        setIsProcessing(false);
      } catch (err: any) {
        console.error("Payment processing error:", err);
        setError(err.message || t("errorGeneric"));
        setIsProcessing(false);
      }
    };

    processPayment();
  }, [purchaseId]);

  const handleDownloadQR = () => {
    if (!qrCodeDataUrl || !purchase) return;

    const link = document.createElement("a");
    link.download = `offer-${purchase.discounts.title.replace(/\s+/g, "-")}.png`;
    link.href = qrCodeDataUrl;
    link.click();
    toast.success(language === "el" ? "QR κωδικός αποθηκεύτηκε" : "QR code saved");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === "el" ? "el-GR" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">{t("processing")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">{t("errorTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => navigate("/feed")} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToFeed")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-green-50 to-background dark:from-green-950/20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <CardTitle className="text-2xl">{t("success")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Offer Info */}
          {purchase && (
            <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
              {purchase.businesses.logo_url ? (
                <img
                  src={purchase.businesses.logo_url}
                  alt={purchase.businesses.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Store className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold">{purchase.discounts.title}</h3>
                <p className="text-sm text-muted-foreground">{purchase.businesses.name}</p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                -{purchase.discounts.percent_off}%
              </Badge>
            </div>
          )}

          {/* QR Code */}
          {qrCodeDataUrl && (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">{t("yourQR")}</p>
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-xl shadow-lg">
                  <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{t("showAtVenue")}</p>
            </div>
          )}

          {/* Purchase Details */}
          {purchase && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("youPaid")}</span>
                <span className="font-semibold">€{(purchase.final_price_cents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("validUntil")}</span>
                <span>{formatDate(purchase.discounts.end_at)}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button onClick={handleDownloadQR} variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              {t("downloadQR")}
            </Button>
            <Button onClick={() => navigate("/dashboard/user?tab=offers")} className="w-full">
              <QrCode className="mr-2 h-4 w-4" />
              {t("goToOffers")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
