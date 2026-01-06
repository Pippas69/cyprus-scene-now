import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Wallet, CheckCircle, XCircle, Loader2, Camera, User, CreditCard, Minus } from "lucide-react";
import QrScanner from "qr-scanner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface CreditBalanceScannerProps {
  businessId: string;
  language: "el" | "en";
}

interface ScannedCreditPurchase {
  id: string;
  discount_id: string;
  user_id: string;
  balance_remaining_cents: number;
  status: string;
  expires_at: string;
  discounts: {
    id: string;
    title: string;
    offer_type: string;
  };
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

const translations = {
  en: {
    scanButton: "Scan Credit QR",
    title: "Scan Store Credit",
    scanning: "Scanning...",
    verifying: "Verifying...",
    startScanning: "Start Scanning",
    close: "Close",
    scanAnother: "Scan Another",
    currentBalance: "Current Balance",
    enterAmount: "Enter bill amount",
    amountPlaceholder: "0.00",
    deductButton: "Deduct from Balance",
    customer: "Customer",
    newBalance: "New Balance",
    success: "Payment Successful!",
    deducted: "deducted from credit",
    errors: {
      notFound: "Credit purchase not found",
      wrongBusiness: "This credit doesn't belong to your business",
      notCredit: "This is not a store credit purchase",
      expired: "This credit has expired",
      depleted: "This credit has been fully used",
      insufficientBalance: "Insufficient balance",
      invalidAmount: "Please enter a valid amount",
      cameraError: "Camera access error",
      scanError: "Scan error",
    },
  },
  el: {
    scanButton: "Σάρωση Πίστωσης",
    title: "Σάρωση Πίστωσης Καταστήματος",
    scanning: "Σάρωση...",
    verifying: "Επαλήθευση...",
    startScanning: "Έναρξη Σάρωσης",
    close: "Κλείσιμο",
    scanAnother: "Σάρωση Άλλου",
    currentBalance: "Τρέχον Υπόλοιπο",
    enterAmount: "Εισάγετε το ποσό λογαριασμού",
    amountPlaceholder: "0.00",
    deductButton: "Αφαίρεση από Υπόλοιπο",
    customer: "Πελάτης",
    newBalance: "Νέο Υπόλοιπο",
    success: "Επιτυχής Πληρωμή!",
    deducted: "αφαιρέθηκε από την πίστωση",
    errors: {
      notFound: "Η πίστωση δεν βρέθηκε",
      wrongBusiness: "Αυτή η πίστωση δεν ανήκει στην επιχείρησή σας",
      notCredit: "Αυτό δεν είναι πίστωση καταστήματος",
      expired: "Αυτή η πίστωση έχει λήξει",
      depleted: "Αυτή η πίστωση έχει εξαντληθεί",
      insufficientBalance: "Ανεπαρκές υπόλοιπο",
      invalidAmount: "Παρακαλώ εισάγετε έγκυρο ποσό",
      cameraError: "Σφάλμα πρόσβασης κάμερας",
      scanError: "Σφάλμα σάρωσης",
    },
  },
};

export function CreditBalanceScanner({ businessId, language }: CreditBalanceScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanner, setScanner] = useState<QrScanner | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [billAmount, setBillAmount] = useState("");
  const [scannedPurchase, setScannedPurchase] = useState<ScannedCreditPurchase | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ amountDeducted: number; newBalance: number } | null>(null);

  const t = translations[language];

  const handleScanStart = async () => {
    setIsScanning(true);
    setScanError(null);
    setScannedPurchase(null);
    setSuccessResult(null);
    setBillAmount("");

    await new Promise(resolve => setTimeout(resolve, 100));

    const videoElement = document.getElementById("credit-qr-video") as HTMLVideoElement;
    if (!videoElement) {
      toast.error(t.errors.cameraError);
      setIsScanning(false);
      return;
    }

    try {
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
      toast.error(t.errors.cameraError);
      setIsScanning(false);
    }
  };

  const handleScan = async (qrToken: string) => {
    setVerifying(true);
    stopScanner();

    try {
      // Fetch the purchase by QR token
      const { data: purchase, error: purchaseError } = await supabase
        .from("offer_purchases")
        .select(`
          *,
          discounts (
            id,
            title,
            offer_type,
            business_id
          )
        `)
        .eq("qr_code_token", qrToken)
        .single();

      if (purchaseError || !purchase) {
        setScanError(t.errors.notFound);
        return;
      }

      // Verify it's a credit offer
      if (purchase.discounts.offer_type !== 'credit') {
        setScanError(t.errors.notCredit);
        return;
      }

      // Verify business ownership
      if (purchase.discounts.business_id !== businessId) {
        setScanError(t.errors.wrongBusiness);
        return;
      }

      // Check expiry
      if (new Date(purchase.expires_at) < new Date()) {
        setScanError(t.errors.expired);
        return;
      }

      // Check balance
      if ((purchase.balance_remaining_cents || 0) <= 0) {
        setScanError(t.errors.depleted);
        return;
      }

      // Get customer name
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", purchase.user_id)
        .single();

      setScannedPurchase({
        ...purchase,
        profiles: profile,
      } as ScannedCreditPurchase);

    } catch (error) {
      console.error("Verification error:", error);
      setScanError(t.errors.scanError);
    } finally {
      setVerifying(false);
    }
  };

  const handleDeduct = async () => {
    if (!scannedPurchase) return;

    const amountCents = Math.round(parseFloat(billAmount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      toast.error(t.errors.invalidAmount);
      return;
    }

    if (amountCents > scannedPurchase.balance_remaining_cents) {
      toast.error(t.errors.insufficientBalance);
      return;
    }

    setProcessing(true);

    try {
      const balanceBefore = scannedPurchase.balance_remaining_cents;
      const balanceAfter = balanceBefore - amountCents;

      // Get current user for tracking
      const { data: { user } } = await supabase.auth.getUser();

      // Update balance
      const { error: updateError } = await supabase
        .from("offer_purchases")
        .update({
          balance_remaining_cents: balanceAfter,
          status: balanceAfter === 0 ? 'redeemed' : 'paid',
          redeemed_at: balanceAfter === 0 ? new Date().toISOString() : null,
        })
        .eq("id", scannedPurchase.id);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: txError } = await supabase
        .from("credit_transactions")
        .insert({
          purchase_id: scannedPurchase.id,
          business_id: businessId,
          amount_cents: amountCents,
          transaction_type: 'redemption',
          balance_before_cents: balanceBefore,
          balance_after_cents: balanceAfter,
          notes: `Bill: €${(amountCents / 100).toFixed(2)}`,
          redeemed_by: user?.id,
        });

      if (txError) {
        console.error("Transaction record error:", txError);
        // Non-fatal - balance was updated
      }

      setSuccessResult({
        amountDeducted: amountCents,
        newBalance: balanceAfter,
      });

      toast.success(t.success);

    } catch (error) {
      console.error("Deduction error:", error);
      toast.error(t.errors.scanError);
    } finally {
      setProcessing(false);
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
    setScannedPurchase(null);
    setScanError(null);
    setSuccessResult(null);
    setBillAmount("");
  };

  const handleScanAnother = () => {
    setScannedPurchase(null);
    setScanError(null);
    setSuccessResult(null);
    setBillAmount("");
    handleScanStart();
  };

  const getCustomerName = (purchase: ScannedCreditPurchase) => {
    if (purchase.profiles?.first_name || purchase.profiles?.last_name) {
      return `${purchase.profiles.first_name || ''} ${purchase.profiles.last_name || ''}`.trim();
    }
    return language === "el" ? "Άγνωστος" : "Unknown";
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" className="w-full sm:w-auto">
        <Wallet className="h-4 w-4 mr-2" />
        {t.scanButton}
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Initial state */}
            {!isScanning && !scannedPurchase && !scanError && !successResult && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Camera className="h-16 w-16 text-muted-foreground" />
                <Button onClick={handleScanStart} size="lg">
                  <Wallet className="h-5 w-5 mr-2" />
                  {t.startScanning}
                </Button>
              </div>
            )}

            {/* Scanning */}
            {isScanning && (
              <div className="space-y-4">
                <div className="relative aspect-square w-full bg-black rounded-lg overflow-hidden">
                  <video id="credit-qr-video" className="w-full h-full object-cover" />
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

            {/* Scan error */}
            {scanError && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <XCircle className="h-5 w-5" />
                  <AlertDescription>{scanError}</AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <Button onClick={handleClose} variant="outline" className="flex-1">
                    {t.close}
                  </Button>
                  <Button onClick={handleScanAnother} className="flex-1">
                    {t.scanAnother}
                  </Button>
                </div>
              </div>
            )}

            {/* Scanned credit - enter amount */}
            {scannedPurchase && !successResult && (
              <div className="space-y-4">
                <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{t.customer}:</span>
                        <span className="font-medium">{getCustomerName(scannedPurchase)}</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">{t.currentBalance}</p>
                      <p className="text-4xl font-bold text-primary">
                        €{(scannedPurchase.balance_remaining_cents / 100).toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Label>{t.enterAmount}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={(scannedPurchase.balance_remaining_cents / 100).toFixed(2)}
                      placeholder={t.amountPlaceholder}
                      className="pl-8 text-2xl h-14 font-mono"
                      value={billAmount}
                      onChange={(e) => setBillAmount(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleDeduct} 
                  className="w-full h-12"
                  disabled={!billAmount || processing}
                >
                  {processing ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Minus className="h-5 w-5 mr-2" />
                  )}
                  {t.deductButton}
                </Button>

                <Button onClick={handleScanAnother} variant="outline" className="w-full">
                  {t.scanAnother}
                </Button>
              </div>
            )}

            {/* Success state */}
            {successResult && (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <p className="font-bold text-xl text-green-700 dark:text-green-300">{t.success}</p>
                  <div className="mt-4 space-y-2">
                    <Badge variant="default" className="text-lg py-1 px-3">
                      €{(successResult.amountDeducted / 100).toFixed(2)} {t.deducted}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      {t.newBalance}: <span className="font-bold">€{(successResult.newBalance / 100).toFixed(2)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleClose} variant="outline" className="flex-1">
                    {t.close}
                  </Button>
                  <Button onClick={handleScanAnother} className="flex-1">
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
