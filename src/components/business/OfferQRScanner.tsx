import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QrCode, CheckCircle, XCircle, Loader2, Camera, User, Percent, CreditCard } from "lucide-react";
import QrScanner from "qr-scanner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface OfferQRScannerProps {
  businessId: string;
  language: "el" | "en";
}

interface ScannedPurchase {
  id: string;
  discount_id: string;
  user_id: string;
  original_price_cents: number;
  discount_percent: number;
  final_price_cents: number;
  status: string;
  created_at: string;
  expires_at: string;
  discounts: {
    id: string;
    title: string;
    description: string | null;
    percent_off: number | null;
  };
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export function OfferQRScanner({ businessId, language }: OfferQRScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanner, setScanner] = useState<QrScanner | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    purchase?: ScannedPurchase;
  } | null>(null);

  const text = {
    scanButton: { el: "Σαρωτής Προσφορών", en: "Offer Scanner" },
    title: { el: "Σαρωτής Προσφορών", en: "Offer Scanner" },
    scanning: { el: "Σάρωση...", en: "Scanning..." },
    verifying: { el: "Επαλήθευση...", en: "Verifying..." },
    startScanning: { el: "Ξεκινήστε τη σάρωση", en: "Start Scanning" },
    close: { el: "Κλείσιμο", en: "Close" },
    scanAnother: { el: "Σάρωση Άλλου", en: "Scan Another" },
    success: { el: "Επιτυχής Επαλήθευση!", en: "Successfully Verified!" },
    giveProduct: { el: "Δώστε το προϊόν στον πελάτη", en: "Give the product to the customer" },
    purchaseDetails: { el: "Λεπτομέρειες Αγοράς", en: "Purchase Details" },
    customer: { el: "Πελάτης", en: "Customer" },
    paidAmount: { el: "Πληρωμένο ποσό", en: "Amount paid" },
    discount: { el: "Έκπτωση", en: "Discount" },
    purchaseDate: { el: "Ημ/νία αγοράς", en: "Purchase date" },
    errors: {
      notFound: { el: "Η αγορά δεν βρέθηκε", en: "Purchase not found" },
      wrongBusiness: { el: "Αυτή η αγορά δεν ανήκει στην επιχείρησή σας", en: "This purchase doesn't belong to your business" },
      alreadyRedeemed: { el: "Αυτή η αγορά έχει ήδη εξαργυρωθεί", en: "This purchase has already been redeemed" },
      expired: { el: "Αυτή η αγορά έχει λήξει", en: "This purchase has expired" },
      notPaid: { el: "Αυτή η αγορά δεν έχει πληρωθεί", en: "This purchase hasn't been paid" },
      cameraError: { el: "Σφάλμα πρόσβασης κάμερας", en: "Camera access error" },
      cameraPermissionDenied: { 
        el: "Δεν επιτράπηκε η πρόσβαση στην κάμερα", 
        en: "Camera access was denied" 
      },
      cameraNotFound: { 
        el: "Δεν βρέθηκε κάμερα", 
        en: "No camera found" 
      },
      scanError: { el: "Σφάλμα σάρωσης", en: "Scan error" },
    },
  };

  const t = language === "el" ? {
    scanButton: text.scanButton.el,
    title: text.title.el,
    scanning: text.scanning.el,
    verifying: text.verifying.el,
    startScanning: text.startScanning.el,
    close: text.close.el,
    scanAnother: text.scanAnother.el,
    success: text.success.el,
    giveProduct: text.giveProduct.el,
    purchaseDetails: text.purchaseDetails.el,
    customer: text.customer.el,
    paidAmount: text.paidAmount.el,
    discount: text.discount.el,
    purchaseDate: text.purchaseDate.el,
    errors: text.errors,
  } : {
    scanButton: text.scanButton.en,
    title: text.title.en,
    scanning: text.scanning.en,
    verifying: text.verifying.en,
    startScanning: text.startScanning.en,
    close: text.close.en,
    scanAnother: text.scanAnother.en,
    success: text.success.en,
    giveProduct: text.giveProduct.en,
    purchaseDetails: text.purchaseDetails.en,
    customer: text.customer.en,
    paidAmount: text.paidAmount.en,
    discount: text.discount.el,
    purchaseDate: text.purchaseDate.en,
    errors: text.errors,
  };

  const handleScanStart = async () => {
    setIsScanning(true);
    setScanResult(null);

    await new Promise(resolve => setTimeout(resolve, 100));

    const videoElement = document.getElementById("qr-video") as HTMLVideoElement;
    if (!videoElement) {
      const errorMsg = language === "el" ? t.errors.cameraError.el : t.errors.cameraError.en;
      toast.error(errorMsg);
      setIsScanning(false);
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported");
      }

      const qrScanner = new QrScanner(
        videoElement,
        async (result) => {
          if (verifying) return;
          await handleScan(result.data);
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      await qrScanner.start();
      setScanner(qrScanner);
    } catch (error) {
      console.error("Scanner error:", error);
      
      let errorMsg = language === "el" ? t.errors.cameraError.el : t.errors.cameraError.en;
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMsg = language === "el" ? t.errors.cameraPermissionDenied.el : t.errors.cameraPermissionDenied.en;
        } else if (error.name === 'NotFoundError') {
          errorMsg = language === "el" ? t.errors.cameraNotFound.el : t.errors.cameraNotFound.en;
        }
      }
      
      toast.error(errorMsg);
      setIsScanning(false);
    }
  };

  const handleScan = async (qrToken: string) => {
    setVerifying(true);
    
    try {
      // Fetch the purchase by QR token
      const { data: purchase, error: purchaseError } = await supabase
        .from("offer_purchases")
        .select(`
          *,
          discounts (
            id,
            title,
            description,
            percent_off,
            business_id
          )
        `)
        .eq("qr_code_token", qrToken)
        .single();

      if (purchaseError || !purchase) {
        const msg = language === "el" ? t.errors.notFound.el : t.errors.notFound.en;
        setScanResult({ success: false, message: msg });
        stopScanner();
        return;
      }

      // Verify business ownership via the discount
      if (purchase.discounts.business_id !== businessId) {
        const msg = language === "el" ? t.errors.wrongBusiness.el : t.errors.wrongBusiness.en;
        setScanResult({ success: false, message: msg });
        stopScanner();
        return;
      }

      // Check status
      if (purchase.status === 'redeemed') {
        const msg = language === "el" ? t.errors.alreadyRedeemed.el : t.errors.alreadyRedeemed.en;
        setScanResult({ success: false, message: msg });
        stopScanner();
        return;
      }

      if (purchase.status !== 'paid') {
        const msg = language === "el" ? t.errors.notPaid.el : t.errors.notPaid.en;
        setScanResult({ success: false, message: msg });
        stopScanner();
        return;
      }

      // Check expiry
      if (new Date(purchase.expires_at) < new Date()) {
        const msg = language === "el" ? t.errors.expired.el : t.errors.expired.en;
        setScanResult({ success: false, message: msg });
        stopScanner();
        return;
      }

      // Get current user for redemption tracking
      const { data: { user } } = await supabase.auth.getUser();

      // Update purchase to redeemed
      const { error: updateError } = await supabase
        .from("offer_purchases")
        .update({
          status: 'redeemed',
          redeemed_at: new Date().toISOString(),
          redeemed_by: user?.id
        })
        .eq("id", purchase.id);

      if (updateError) {
        console.error('Error updating purchase:', updateError);
        const msg = language === "el" ? t.errors.scanError.el : t.errors.scanError.en;
        setScanResult({ success: false, message: msg });
        stopScanner();
        return;
      }

      // Get customer name if possible
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", purchase.user_id)
        .single();

      // Success!
      setScanResult({ 
        success: true, 
        message: t.success,
        purchase: {
          ...purchase,
          profiles: profile
        } as ScannedPurchase
      });
      stopScanner();
      toast.success(t.success);

    } catch (error) {
      console.error("Verification error:", error);
      const errorMsg = language === "el" ? t.errors.scanError.el : t.errors.scanError.en;
      setScanResult({ success: false, message: errorMsg });
      stopScanner();
    } finally {
      setVerifying(false);
    }
  };

  const stopScanner = () => {
    if (scanner) {
      scanner.stop();
      scanner.destroy();
      setScanner(null);
    }
    setIsScanning(false);
  };

  const handleClose = () => {
    stopScanner();
    setIsOpen(false);
    setScanResult(null);
  };

  const handleScanAnother = () => {
    setScanResult(null);
    handleScanStart();
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), language === "el" ? "dd/MM/yyyy HH:mm" : "MM/dd/yyyy HH:mm");
  };

  const getCustomerName = (purchase: ScannedPurchase) => {
    if (purchase.profiles?.first_name || purchase.profiles?.last_name) {
      return `${purchase.profiles.first_name || ''} ${purchase.profiles.last_name || ''}`.trim();
    }
    return language === "el" ? "Άγνωστος" : "Unknown";
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" className="w-full sm:w-auto">
        <QrCode className="h-4 w-4 mr-2" />
        {t.scanButton}
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!isScanning && !scanResult && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Camera className="h-16 w-16 text-muted-foreground" />
                <div className="text-center space-y-2">
                  <p className="text-muted-foreground">
                    {language === "el" 
                      ? "Σαρώστε τον QR κωδικό του πελάτη για να επαληθεύσετε την αγορά"
                      : "Scan customer's QR code to verify their purchase"}
                  </p>
                </div>
                <Button onClick={handleScanStart} size="lg">
                  <QrCode className="h-5 w-5 mr-2" />
                  {t.startScanning}
                </Button>
              </div>
            )}

            {isScanning && !scanResult && (
              <div className="space-y-4">
                <div className="relative aspect-square w-full bg-black rounded-lg overflow-hidden">
                  <video id="qr-video" className="w-full h-full object-cover" />
                  {verifying && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-center text-white">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <p>{t.verifying}</p>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-center text-sm text-muted-foreground">{t.scanning}</p>
                <Button onClick={stopScanner} variant="outline" className="w-full">
                  {t.close}
                </Button>
              </div>
            )}

            {scanResult && (
              <div className="space-y-4">
                <Alert variant={scanResult.success ? "default" : "destructive"}>
                  <div className="flex items-start gap-2">
                    {scanResult.success ? (
                      <CheckCircle className="h-5 w-5 shrink-0 mt-0.5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    )}
                    <AlertDescription className="flex-1 font-medium">
                      {scanResult.message}
                    </AlertDescription>
                  </div>
                </Alert>

                {scanResult.success && scanResult.purchase && (
                  <>
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="font-semibold text-green-700 dark:text-green-300">{t.giveProduct}</p>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">{t.purchaseDetails}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="font-semibold text-lg">{scanResult.purchase.discounts.title}</p>
                          {scanResult.purchase.discounts.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {scanResult.purchase.discounts.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{t.customer}:</span>
                          <span className="font-medium">{getCustomerName(scanResult.purchase)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{t.paidAmount}:</span>
                          <Badge variant="default" className="text-lg font-bold">
                            €{(scanResult.purchase.final_price_cents / 100).toFixed(2)}
                          </Badge>
                        </div>
                        
                        {scanResult.purchase.discount_percent > 0 && (
                          <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{t.discount}:</span>
                            <Badge variant="secondary">
                              -{scanResult.purchase.discount_percent}%
                            </Badge>
                          </div>
                        )}

                        <p className="text-sm text-muted-foreground">
                          {t.purchaseDate}: {formatDate(scanResult.purchase.created_at)}
                        </p>
                      </CardContent>
                    </Card>
                  </>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleClose} variant="outline" className="flex-1">
                    {t.close}
                  </Button>
                  <Button onClick={handleScanAnother} className="flex-1">
                    <QrCode className="h-4 w-4 mr-2" />
                    {t.scanAnother}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
