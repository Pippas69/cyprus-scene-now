import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QrCode, CheckCircle, XCircle, Loader2, Camera, User, Percent } from "lucide-react";
import QrScanner from "qr-scanner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface OfferQRScannerProps {
  businessId: string;
  language: "el" | "en";
}

interface ScannedOffer {
  id: string;
  title: string;
  description: string | null;
  percent_off: number | null;
  start_at: string;
  end_at: string;
  active: boolean;
  business_id: string;
}

export function OfferQRScanner({ businessId, language }: OfferQRScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanner, setScanner] = useState<QrScanner | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    offer?: ScannedOffer;
  } | null>(null);

  const text = {
    scanButton: { el: "Σάρωση QR Προσφοράς", en: "Scan Offer QR Code" },
    title: { el: "Σάρωση Κωδικού Προσφοράς", en: "Scan Offer Code" },
    scanning: { el: "Σάρωση...", en: "Scanning..." },
    verifying: { el: "Επαλήθευση...", en: "Verifying..." },
    startScanning: { el: "Ξεκινήστε τη σάρωση", en: "Start Scanning" },
    close: { el: "Κλείσιμο", en: "Close" },
    scanAnother: { el: "Σάρωση Άλλου", en: "Scan Another" },
    success: { el: "Επιτυχής Εξαργύρωση!", en: "Successfully Redeemed!" },
    offerDetails: { el: "Λεπτομέρειες Προσφοράς", en: "Offer Details" },
    discount: { el: "Έκπτωση", en: "Discount" },
    validUntil: { el: "Ισχύει μέχρι", en: "Valid until" },
    errors: {
      notFound: { el: "Η προσφορά δεν βρέθηκε", en: "Offer not found" },
      wrongBusiness: { el: "Αυτή η προσφορά δεν ανήκει στην επιχείρησή σας", en: "This offer doesn't belong to your business" },
      inactive: { el: "Η προσφορά δεν είναι ενεργή", en: "Offer is not active" },
      expired: { el: "Η προσφορά έχει λήξει", en: "Offer has expired" },
      notStarted: { el: "Η προσφορά δεν έχει ξεκινήσει ακόμα", en: "Offer hasn't started yet" },
      alreadyRedeemed: { el: "Αυτή η προσφορά έχει ήδη εξαργυρωθεί", en: "This offer has already been redeemed" },
      cameraError: { el: "Σφάλμα πρόσβασης κάμερας", en: "Camera access error" },
      cameraPermissionDenied: { 
        el: "Δεν επιτράπηκε η πρόσβαση στην κάμερα. Παρακαλώ ελέγξτε τις ρυθμίσεις του προγράμματος περιήγησης.", 
        en: "Camera access was denied. Please check your browser settings." 
      },
      cameraNotFound: { 
        el: "Δεν βρέθηκε κάμερα σε αυτή τη συσκευή", 
        en: "No camera found on this device" 
      },
      cameraInUse: { 
        el: "Η κάμερα χρησιμοποιείται ήδη από άλλη εφαρμογή", 
        en: "Camera is already in use by another application" 
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
    offerDetails: text.offerDetails.el,
    discount: text.discount.el,
    validUntil: text.validUntil.el,
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
    offerDetails: text.offerDetails.en,
    discount: text.discount.en,
    validUntil: text.validUntil.en,
    errors: text.errors,
  };

  const handleScanStart = async () => {
    setIsScanning(true);
    setScanResult(null);

    // Wait for DOM to update
    await new Promise(resolve => setTimeout(resolve, 100));

    const videoElement = document.getElementById("qr-video") as HTMLVideoElement;
    if (!videoElement) {
      const errorMsg = language === "el" ? t.errors.cameraError.el : t.errors.cameraError.en;
      toast.error(errorMsg);
      setIsScanning(false);
      return;
    }

    try {
      // Check if camera is available
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
        } else if (error.name === 'NotReadableError') {
          errorMsg = language === "el" ? t.errors.cameraInUse.el : t.errors.cameraInUse.en;
        }
      }
      
      toast.error(errorMsg);
      setIsScanning(false);
    }
  };

  const handleScan = async (qrToken: string) => {
    setVerifying(true);
    
    try {
      // Fetch the offer by QR token
      const { data: offer, error: offerError } = await supabase
        .from("discounts")
        .select("*")
        .eq("qr_code_token", qrToken)
        .single();

      if (offerError || !offer) {
        const msg = language === "el" ? t.errors.notFound.el : t.errors.notFound.en;
        setScanResult({ success: false, message: msg });
        // Track failed verification
        await supabase.from('discount_scans').insert({
          discount_id: offer?.id,
          scan_type: 'verify',
          success: false,
        });
        stopScanner();
        return;
      }

      // Verify business ownership
      if (offer.business_id !== businessId) {
        const msg = language === "el" ? t.errors.wrongBusiness.el : t.errors.wrongBusiness.en;
        setScanResult({ success: false, message: msg });
        stopScanner();
        return;
      }

      // Check if active
      if (!offer.active) {
        const msg = language === "el" ? t.errors.inactive.el : t.errors.inactive.en;
        setScanResult({ success: false, message: msg });
        stopScanner();
        return;
      }

      // Check dates
      const now = new Date();
      const startDate = new Date(offer.start_at);
      const endDate = new Date(offer.end_at);

      if (now < startDate) {
        const msg = language === "el" ? t.errors.notStarted.el : t.errors.notStarted.en;
        setScanResult({ success: false, message: msg });
        stopScanner();
        return;
      }

      if (now > endDate) {
        const msg = language === "el" ? t.errors.expired.el : t.errors.expired.en;
        setScanResult({ success: false, message: msg });
        stopScanner();
        return;
      }

      // Get the current user to record redemption
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setScanResult({ success: false, message: "User not authenticated" });
        stopScanner();
        return;
      }

      // Check if already redeemed (we'll need the user_id from somewhere - for now, create redemption)
      // In a real scenario, you might want to scan a user QR that contains user_id + offer_token
      // For now, we'll just mark it as redeemed without linking to specific user
      
      // Track successful verification
      await supabase.from('discount_scans').insert({
        discount_id: offer.id,
        scan_type: 'verify',
        success: true,
      });
      
      // Create redemption record
      const { error: redemptionError } = await supabase
        .from("redemptions")
        .insert({
          discount_id: offer.id,
          user_id: user.id, // This should ideally come from the user's QR code
          verified: true,
        });

      if (redemptionError) {
        const alreadyRedeemedMsg = language === "el" ? t.errors.alreadyRedeemed.el : t.errors.alreadyRedeemed.en;
        const scanErrorMsg = language === "el" ? t.errors.scanError.el : t.errors.scanError.en;
        
        if (redemptionError.code === "23505") { // Unique constraint violation
          setScanResult({ success: false, message: alreadyRedeemedMsg });
        } else {
          setScanResult({ success: false, message: scanErrorMsg });
        }
        stopScanner();
        return;
      }

      // Track successful redemption
      await supabase.from('discount_scans').insert({
        discount_id: offer.id,
        scan_type: 'redeem',
        success: true,
      });

      // Success!
      setScanResult({ 
        success: true, 
        message: t.success,
        offer: offer as ScannedOffer
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
    return format(new Date(dateString), language === "el" ? "dd/MM/yyyy" : "MM/dd/yyyy");
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
                      ? "Πατήστε το κουμπί για να ξεκινήσετε τη σάρωση του QR κωδικού προσφοράς"
                      : "Press the button to start scanning the offer QR code"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === "el"
                      ? "Θα σας ζητηθεί να επιτρέψετε την πρόσβαση στην κάμερα"
                      : "You will be asked to allow camera access"}
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
                      <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    )}
                    <AlertDescription className="flex-1">
                      {scanResult.message}
                    </AlertDescription>
                  </div>
                </Alert>

                {scanResult.success && scanResult.offer && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{t.offerDetails}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="font-semibold text-lg">{scanResult.offer.title}</p>
                        {scanResult.offer.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {scanResult.offer.description}
                          </p>
                        )}
                      </div>
                      
                      {scanResult.offer.percent_off && (
                        <div className="flex items-center gap-2">
                          <Percent className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{t.discount}:</span>
                          <Badge variant="default" className="text-lg font-bold">
                            -{scanResult.offer.percent_off}%
                          </Badge>
                        </div>
                      )}

                      <p className="text-sm text-muted-foreground">
                        {t.validUntil}: {formatDate(scanResult.offer.end_at)}
                      </p>
                    </CardContent>
                  </Card>
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
