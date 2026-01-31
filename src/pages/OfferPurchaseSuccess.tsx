import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { SuccessQRCard } from "@/components/ui/SuccessQRCard";

interface PurchaseData {
  qrToken: string;
  offerTitle: string;
  businessName: string;
  businessLogo: string | null;
  discountPercent: number;
  purchaseDate: string;
  expiryDate: string;
}

export default function OfferPurchaseSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const purchaseId = searchParams.get("purchase_id");

  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchaseData, setPurchaseData] = useState<PurchaseData | null>(null);

  const text = {
    processing: { el: "Επεξεργασία πληρωμής...", en: "Processing payment..." },
    errorTitle: { el: "Σφάλμα", en: "Error" },
    errorGeneric: { el: "Κάτι πήγε στραβά", en: "Something went wrong" },
    noPurchaseId: { el: "Δεν βρέθηκε η αγορά", en: "Purchase not found" },
    backToFeed: { el: "Πίσω στο Feed", en: "Back to Feed" },
    viewOffers: { el: "Οι Προσφορές Μου", en: "My Offers" },
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
        const { data: purchase, error: fetchError } = await supabase
          .from("offer_purchases")
          .select(`
            *,
            discounts!inner(title, percent_off, end_at),
            businesses!inner(name, logo_url)
          `)
          .eq("id", purchaseId)
          .single();

        if (fetchError) throw fetchError;

        setPurchaseData({
          qrToken: data.qrToken || purchase.qr_code_token,
          offerTitle: purchase.discounts.title,
          businessName: purchase.businesses.name,
          businessLogo: purchase.businesses.logo_url,
          discountPercent: purchase.discounts.percent_off,
          purchaseDate: purchase.created_at,
          expiryDate: purchase.discounts.end_at,
        });

        setIsProcessing(false);
      } catch (err: any) {
        console.error("Payment processing error:", err);
        setError(err.message || t("errorGeneric"));
        setIsProcessing(false);
      }
    };

    processPayment();
  }, [purchaseId]);

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {purchaseData && (
        <SuccessQRCard
          type="offer"
          qrToken={purchaseData.qrToken}
          title={purchaseData.offerTitle}
          businessName={purchaseData.businessName}
          businessLogo={purchaseData.businessLogo}
          language={language}
          discountPercent={purchaseData.discountPercent}
          purchaseDate={purchaseData.purchaseDate}
          expiryDate={purchaseData.expiryDate}
          showSuccessMessage={true}
          onViewDashboard={() => navigate("/dashboard-user?tab=offers")}
          viewDashboardLabel={t("viewOffers")}
        />
      )}
    </div>
  );
}
