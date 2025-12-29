import { useState, useRef, useEffect } from "react";
import QrScanner from "qr-scanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Scan, CheckCircle2, XCircle, Loader2, Camera, Keyboard, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

interface ScanResult {
  valid: boolean;
  checkedIn?: boolean;
  error?: string;
  ticket?: {
    id: string;
    tierName: string;
    tierPrice: number;
    customerName: string;
    customerEmail: string;
    eventTitle: string;
    eventStartAt: string;
    status: string;
    checkedInAt?: string;
  };
}

interface TicketScannerProps {
  eventId?: string;
}

const t = {
  el: {
    ticketScanner: "Σαρωτής Εισιτηρίων",
    startScanning: "Έναρξη Σάρωσης",
    stopScanning: "Διακοπή",
    manualEntry: "Χειροκίνητη Εισαγωγή",
    enterCode: "Εισάγετε κωδικό QR...",
    check: "Έλεγχος",
    checkIn: "Check-in",
    validTicket: "Έγκυρο Εισιτήριο",
    invalidTicket: "Μη Έγκυρο Εισιτήριο",
    checkedInSuccess: "Check-in Επιτυχές!",
    alreadyUsed: "Το εισιτήριο έχει ήδη χρησιμοποιηθεί",
    customer: "Πελάτης",
    tier: "Κατηγορία",
    scanAnother: "Σάρωση Άλλου",
    scanning: "Σάρωση...",
    cameraError: "Σφάλμα κάμερας",
    processing: "Επεξεργασία...",
  },
  en: {
    ticketScanner: "Ticket Scanner",
    startScanning: "Start Scanning",
    stopScanning: "Stop",
    manualEntry: "Manual Entry",
    enterCode: "Enter QR code...",
    check: "Check",
    checkIn: "Check In",
    validTicket: "Valid Ticket",
    invalidTicket: "Invalid Ticket",
    checkedInSuccess: "Check-in Successful!",
    alreadyUsed: "Ticket has already been used",
    customer: "Customer",
    tier: "Tier",
    scanAnother: "Scan Another",
    scanning: "Scanning...",
    cameraError: "Camera Error",
    processing: "Processing...",
  },
};

export const TicketScanner = ({ eventId }: TicketScannerProps) => {
  const { language } = useLanguage();
  const text = t[language];
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [lastScannedToken, setLastScannedToken] = useState("");

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
      }
    };
  }, []);

  const startScanning = async () => {
    if (!videoRef.current) return;

    try {
      scannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          if (!isProcessing) {
            handleScan(result.data);
          }
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      await scannerRef.current.start();
      setIsScanning(true);
      setScanResult(null);
    } catch (error) {
      console.error("Scanner error:", error);
      toast.error(text.cameraError);
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
    }
    setIsScanning(false);
  };

  const handleScan = async (qrToken: string, action: "check" | "checkin" = "check") => {
    if (isProcessing || !qrToken) return;
    
    setLastScannedToken(qrToken);
    setIsProcessing(true);
    stopScanning();

    try {
      const { data, error } = await supabase.functions.invoke("validate-ticket", {
        body: { qrToken, action },
      });

      if (error) throw error;
      
      setScanResult(data as ScanResult);
      
      if (data.checkedIn) {
        toast.success(text.checkedInSuccess);
      }
    } catch (error: any) {
      console.error("Validation error:", error);
      setScanResult({
        valid: false,
        error: error.message || "Validation failed",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckIn = () => {
    if (scanResult?.ticket && lastScannedToken) {
      handleScan(lastScannedToken, "checkin");
    }
  };

  const handleManualCheck = () => {
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
    }
  };

  const reset = () => {
    setScanResult(null);
    setManualCode("");
    setLastScannedToken("");
    if (mode === "camera") {
      startScanning();
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-5 w-5 text-primary" />
          {text.ticketScanner}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mode toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === "camera" ? "default" : "outline"}
            size="sm"
            onClick={() => { setMode("camera"); stopScanning(); }}
            className="flex-1"
          >
            <Camera className="h-4 w-4 mr-2" />
            Camera
          </Button>
          <Button
            variant={mode === "manual" ? "default" : "outline"}
            size="sm"
            onClick={() => { setMode("manual"); stopScanning(); }}
            className="flex-1"
          >
            <Keyboard className="h-4 w-4 mr-2" />
            {text.manualEntry}
          </Button>
        </div>

        {/* Result display */}
        {scanResult && (
          <Alert
            className={cn(
              scanResult.valid ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-destructive bg-destructive/10"
            )}
          >
            {scanResult.valid ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <AlertTitle>
              {scanResult.checkedIn 
                ? text.checkedInSuccess 
                : scanResult.valid 
                  ? text.validTicket 
                  : text.invalidTicket
              }
            </AlertTitle>
            <AlertDescription>
              {scanResult.error && <p className="text-destructive">{scanResult.error}</p>}
              
              {scanResult.ticket && (
                <div className="mt-2 space-y-1">
                  <p><strong>{text.customer}:</strong> {scanResult.ticket.customerName}</p>
                  <p><strong>{text.tier}:</strong> {scanResult.ticket.tierName}</p>
                  {scanResult.ticket.tierPrice > 0 && (
                    <p><strong>Price:</strong> €{(scanResult.ticket.tierPrice / 100).toFixed(2)}</p>
                  )}
                  <Badge className="mt-2">{scanResult.ticket.status}</Badge>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Camera mode */}
        {mode === "camera" && !scanResult && (
          <div className="space-y-3">
            <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
              />
              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Button onClick={startScanning} size="lg">
                    <Camera className="h-5 w-5 mr-2" />
                    {text.startScanning}
                  </Button>
                </div>
              )}
              {isScanning && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <Badge variant="secondary" className="animate-pulse">
                    {text.scanning}
                  </Badge>
                </div>
              )}
            </div>

            {isScanning && (
              <Button variant="outline" onClick={stopScanning} className="w-full">
                {text.stopScanning}
              </Button>
            )}
          </div>
        )}

        {/* Manual mode */}
        {mode === "manual" && !scanResult && (
          <div className="space-y-3">
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder={text.enterCode}
              onKeyPress={(e) => e.key === "Enter" && handleManualCheck()}
            />
            <Button 
              onClick={handleManualCheck} 
              className="w-full"
              disabled={!manualCode.trim() || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {text.processing}
                </>
              ) : (
                text.check
              )}
            </Button>
          </div>
        )}

        {/* Actions after scan */}
        {scanResult && (
          <div className="flex gap-2">
            {scanResult.valid && scanResult.ticket?.status === "valid" && !scanResult.checkedIn && (
              <Button onClick={handleCheckIn} className="flex-1" disabled={isProcessing}>
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                {text.checkIn}
              </Button>
            )}
            <Button variant="outline" onClick={reset} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              {text.scanAnother}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TicketScanner;
