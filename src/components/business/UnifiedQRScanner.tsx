import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, CheckCircle, XCircle, Loader2, QrCode, GraduationCap, Ticket, Users, Percent, Euro } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCreateStudentRedemption } from '@/hooks/useStudentRedemptions';

interface UnifiedQRScannerProps {
  businessId: string;
  language: 'el' | 'en';
  onScanComplete?: () => void;
}

type QRType = 'ticket' | 'offer' | 'reservation' | 'student' | 'unknown';

interface ScanResult {
  success: boolean;
  message: string;
  qrType: QRType;
  alreadyUsed?: boolean;
  alreadyRedeemed?: boolean;
  alreadyCheckedIn?: boolean;
  requiresPriceEntry?: boolean;
  details?: {
    // Ticket
    tierName?: string;
    tierPrice?: number;
    customerName?: string;
    customerEmail?: string;
    eventTitle?: string;
    eventStartAt?: string;
    // Offer
    title?: string;
    description?: string;
    originalPriceCents?: number;
    discountPercent?: number;
    finalPriceCents?: number;
    // Reservation
    id?: string;
    name?: string;
    partySize?: number;
    arrivalTime?: string;
    reservationDate?: string;
    isDirectReservation?: boolean;
    businessName?: string;
    prepaidMinChargeCents?: number;
    prepaidChargeStatus?: string;
    seatingType?: string;
    checkedInAt?: string;
    // Student
    verificationId?: string;
    studentName?: string;
    universityName?: string;
    avatarUrl?: string;
  };
}

const translations = {
  el: {
    scanQR: 'Σάρωση QR',
    scanning: 'Σάρωση...',
    verifying: 'Επαλήθευση...',
    startScan: 'Έναρξη Σάρωσης',
    stopScan: 'Διακοπή',
    close: 'Κλείσιμο',
    scanAnother: 'Σάρωση Άλλου',
    cameraError: 'Σφάλμα κάμερας',
    cameraPermissionDenied: 'Δεν επιτράπηκε η πρόσβαση στην κάμερα',
    cameraNotFound: 'Δεν βρέθηκε κάμερα',
    scanError: 'Σφάλμα σάρωσης',
    // Type labels
    ticket: 'Εισιτήριο',
    offer: 'Προσφορά',
    reservation: 'Κράτηση',
    student: 'Φοιτητής',
    unknown: 'Άγνωστο',
    // Details labels
    customer: 'Πελάτης',
    event: 'Εκδήλωση',
    tier: 'Κατηγορία',
    price: 'Τιμή',
    name: 'Όνομα',
    partySize: 'Άτομα',
    time: 'Ώρα',
    date: 'Ημερομηνία',
    directReservation: 'Απευθείας Κράτηση',
    eventReservation: 'Κράτηση Εκδήλωσης',
    paid: 'ΠΛΗΡΩΜΕΝΟ',
    // Student
    originalPrice: 'Αρχική Τιμή (€)',
    discountedPrice: 'Τιμή με Έκπτωση (€)',
    discount: 'Έκπτωση',
    applyDiscount: 'Καταγραφή Έκπτωσης',
    recording: 'Καταγραφή...',
    discountRecorded: 'Η έκπτωση καταγράφηκε!',
    itemDescription: 'Περιγραφή Προϊόντος (προαιρετικό)',
    university: 'Πανεπιστήμιο',
  },
  en: {
    scanQR: 'Scan QR',
    scanning: 'Scanning...',
    verifying: 'Verifying...',
    startScan: 'Start Scanning',
    stopScan: 'Stop',
    close: 'Close',
    scanAnother: 'Scan Another',
    cameraError: 'Camera error',
    cameraPermissionDenied: 'Camera access denied',
    cameraNotFound: 'No camera found',
    scanError: 'Scan error',
    // Type labels
    ticket: 'Ticket',
    offer: 'Offer',
    reservation: 'Reservation',
    student: 'Student',
    unknown: 'Unknown',
    // Details labels
    customer: 'Customer',
    event: 'Event',
    tier: 'Tier',
    price: 'Price',
    name: 'Name',
    partySize: 'Party Size',
    time: 'Time',
    date: 'Date',
    directReservation: 'Direct Reservation',
    eventReservation: 'Event Reservation',
    paid: 'PAID',
    // Student
    originalPrice: 'Original Price (€)',
    discountedPrice: 'Discounted Price (€)',
    discount: 'Discount',
    applyDiscount: 'Record Discount',
    recording: 'Recording...',
    discountRecorded: 'Discount recorded!',
    itemDescription: 'Item Description (optional)',
    university: 'University',
  },
};

const getTypeIcon = (type: QRType) => {
  switch (type) {
    case 'ticket':
      return <Ticket className="h-5 w-5" />;
    case 'offer':
      return <Percent className="h-5 w-5" />;
    case 'reservation':
      return <Users className="h-5 w-5" />;
    case 'student':
      return <GraduationCap className="h-5 w-5" />;
    default:
      return <QrCode className="h-5 w-5" />;
  }
};

export function UnifiedQRScanner({ businessId, language, onScanComplete }: UnifiedQRScannerProps) {
  const t = translations[language];
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  
  // Student discount state
  const [originalPrice, setOriginalPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [discountRecorded, setDiscountRecorded] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const isVerifyingRef = useRef(false);
  
  const createRedemption = useCreateStudentRedemption();
  
  const discountPercent = scanResult?.details?.discountPercent || 0;
  const discountedPrice = originalPrice 
    ? (parseFloat(originalPrice) * (1 - discountPercent / 100)).toFixed(2)
    : '';

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const startScanning = async () => {
    setScanResult(null);
    setDiscountRecorded(false);
    setOriginalPrice('');
    setItemDescription('');

    // Wait for video element
    let videoElement: HTMLVideoElement | null = null;
    for (let i = 0; i < 40; i++) {
      videoElement = videoRef.current;
      if (videoElement) {
        const rect = videoElement.getBoundingClientRect();
        const style = window.getComputedStyle(videoElement);
        const visible = rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        if (visible) break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    if (!videoElement) {
      toast.error(t.cameraError);
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported');
      }

      stopScanner();
      setIsScanning(true);

      videoElement.setAttribute('playsinline', 'true');
      videoElement.muted = true;
      videoElement.autoplay = true;
      (videoElement as any).disablePictureInPicture = true;

      const qrScanner = new QrScanner(
        videoElement,
        async (result) => {
          if (isVerifyingRef.current) return;
          isVerifyingRef.current = true;
          setVerifying(true);

          if (scannerRef.current) {
            scannerRef.current.stop();
          }

          await handleScan(result.data);
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment',
        }
      );

      scannerRef.current = qrScanner;
      await qrScanner.start();

      try {
        await (qrScanner as any).setCamera?.('environment');
      } catch {
        // ignore
      }
    } catch (error) {
      console.error('Scanner error:', error);

      let errorMsg = t.cameraError;
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMsg = t.cameraPermissionDenied;
        } else if (error.name === 'NotFoundError') {
          errorMsg = t.cameraNotFound;
        }
      }

      toast.error(errorMsg);
      setIsScanning(false);
    }
  };

  const handleScan = async (qrData: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('validate-qr', {
        body: {
          qrData,
          businessId,
          language,
        },
      });

      if (error) {
        console.error('validate-qr invoke error:', error);
        setScanResult({ success: false, message: t.scanError, qrType: 'unknown' });
        return;
      }

      const result = data as ScanResult;
      setScanResult(result);

      if (result.success && !result.requiresPriceEntry) {
        toast.success(result.message);
        onScanComplete?.();
      } else if (!result.success) {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Verification error:', error);
      setScanResult({ success: false, message: t.scanError, qrType: 'unknown' });
    } finally {
      setVerifying(false);
      isVerifyingRef.current = false;
      stopScanner();
    }
  };

  const handleApplyStudentDiscount = async () => {
    if (!scanResult?.details?.verificationId || !originalPrice) return;

    const originalCents = Math.round(parseFloat(originalPrice) * 100);
    const discountedCents = Math.round(parseFloat(discountedPrice) * 100);

    try {
      await createRedemption.mutateAsync({
        studentVerificationId: scanResult.details.verificationId,
        businessId,
        scannedBy: undefined,
        originalPriceCents: originalCents,
        discountedPriceCents: discountedCents,
        itemDescription: itemDescription || undefined,
      });

      setDiscountRecorded(true);
      toast.success(t.discountRecorded);
      onScanComplete?.();
    } catch (error) {
      console.error('Failed to record discount:', error);
      toast.error(t.scanError);
    }
  };

  const handleClose = () => {
    stopScanner();
    setIsOpen(false);
    setScanResult(null);
    setDiscountRecorded(false);
    setOriginalPrice('');
    setItemDescription('');
  };

  const handleScanAnother = () => {
    setScanResult(null);
    setDiscountRecorded(false);
    setOriginalPrice('');
    setItemDescription('');
    startScanning();
  };

  const formatPrice = (cents: number | undefined) => {
    if (cents === undefined) return null;
    return `€${(cents / 100).toFixed(2)}`;
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Button
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => startScanning(), 100);
        }}
        className="gap-2 bg-aegean hover:bg-aegean-deep text-white"
      >
        <Camera className="h-4 w-4" />
        <span className="hidden sm:inline">{t.scanQR}</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              {t.scanQR}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Scanning View */}
            {!scanResult && (
              <div className="space-y-4">
                <div className="relative aspect-square w-full bg-muted rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                    autoPlay
                  />
                  {!isScanning && !verifying && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
                      <Camera className="h-16 w-16 text-muted-foreground mb-4" />
                      <Button onClick={startScanning} size="lg">
                        <QrCode className="h-5 w-5 mr-2" />
                        {t.startScan}
                      </Button>
                    </div>
                  )}
                  {isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-primary rounded-lg" />
                    </div>
                  )}
                  {verifying && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-center text-white">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <p>{t.verifying}</p>
                      </div>
                    </div>
                  )}
                </div>
                {isScanning && (
                  <p className="text-center text-sm text-muted-foreground">{t.scanning}</p>
                )}
                <Button onClick={handleClose} variant="outline" className="w-full">
                  {t.close}
                </Button>
              </div>
            )}

            {/* Result View */}
            {scanResult && !scanResult.requiresPriceEntry && (
              <div className="space-y-4">
                <Alert className={scanResult.success ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-destructive bg-destructive/10'}>
                  {scanResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <AlertDescription className={scanResult.success ? 'font-semibold text-green-700 dark:text-green-400' : 'font-medium text-destructive'}>
                    {scanResult.message}
                  </AlertDescription>
                </Alert>

                {/* Type Badge */}
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    {getTypeIcon(scanResult.qrType)}
                    {t[scanResult.qrType]}
                  </Badge>
                  {scanResult.details?.prepaidChargeStatus === 'paid' && (
                    <Badge className="bg-green-600 text-white">{t.paid}</Badge>
                  )}
                </div>

                {/* Details Card */}
                {scanResult.details && (
                  <Card>
                    <CardContent className="pt-4 space-y-2 text-sm">
                      {/* Ticket details */}
                      {scanResult.qrType === 'ticket' && (
                        <>
                          {scanResult.details.eventTitle && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t.event}:</span>
                              <span className="font-medium">{scanResult.details.eventTitle}</span>
                            </div>
                          )}
                          {scanResult.details.customerName && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t.customer}:</span>
                              <span className="font-medium">{scanResult.details.customerName}</span>
                            </div>
                          )}
                          {scanResult.details.tierName && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t.tier}:</span>
                              <span className="font-medium">{scanResult.details.tierName}</span>
                            </div>
                          )}
                          {scanResult.details.tierPrice !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t.price}:</span>
                              <span className="font-medium">{formatPrice(scanResult.details.tierPrice)}</span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Offer details */}
                      {scanResult.qrType === 'offer' && (
                        <>
                          {scanResult.details.title && (
                            <div className="bg-muted/50 p-2 rounded">
                              <p className="font-medium">{scanResult.details.title}</p>
                              {scanResult.details.description && (
                                <p className="text-xs text-muted-foreground mt-1">{scanResult.details.description}</p>
                              )}
                            </div>
                          )}
                          {scanResult.details.customerName && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t.customer}:</span>
                              <span className="font-medium">{scanResult.details.customerName}</span>
                            </div>
                          )}
                          {scanResult.details.finalPriceCents !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t.price}:</span>
                              <span className="font-medium">{formatPrice(scanResult.details.finalPriceCents)}</span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Reservation details */}
                      {scanResult.qrType === 'reservation' && (
                        <>
                          <div className="flex justify-center mb-2">
                            <Badge variant={scanResult.details.isDirectReservation ? 'secondary' : 'outline'}>
                              {scanResult.details.isDirectReservation ? t.directReservation : t.eventReservation}
                            </Badge>
                          </div>
                          {scanResult.details.eventTitle && (
                            <div className="bg-muted/50 p-2 rounded">
                              <p className="font-medium">{scanResult.details.eventTitle}</p>
                            </div>
                          )}
                          {scanResult.details.name && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t.name}:</span>
                              <span className="font-medium">{scanResult.details.name}</span>
                            </div>
                          )}
                          {scanResult.details.partySize && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t.partySize}:</span>
                              <span className="font-medium">{scanResult.details.partySize}</span>
                            </div>
                          )}
                          {scanResult.details.arrivalTime && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t.time}:</span>
                              <span className="font-medium">{scanResult.details.arrivalTime}</span>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose} className="flex-1">
                    {t.close}
                  </Button>
                  <Button onClick={handleScanAnother} className="flex-1">
                    {t.scanAnother}
                  </Button>
                </div>
              </div>
            )}

            {/* Student Discount Price Entry */}
            {scanResult?.requiresPriceEntry && !discountRecorded && (
              <div className="space-y-4">
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    {scanResult.message}
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{scanResult.details?.studentName}</p>
                        <p className="text-sm text-muted-foreground">
                          {scanResult.details?.universityName}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>{t.originalPrice}</Label>
                        <div className="relative">
                          <Euro className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={originalPrice}
                            onChange={(e) => setOriginalPrice(e.target.value)}
                            className="pl-10"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {originalPrice && (
                        <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <div className="flex justify-between text-sm">
                            <span>{t.discount}:</span>
                            <span className="font-medium">{discountPercent}%</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold text-green-700 dark:text-green-400">
                            <span>{t.discountedPrice}:</span>
                            <span>€{discountedPrice}</span>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>{t.itemDescription}</Label>
                        <Input
                          value={itemDescription}
                          onChange={(e) => setItemDescription(e.target.value)}
                          placeholder="Coffee, lunch, etc."
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={handleApplyStudentDiscount}
                  className="w-full"
                  disabled={!originalPrice || createRedemption.isPending}
                >
                  {createRedemption.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t.recording}
                    </>
                  ) : (
                    t.applyDiscount
                  )}
                </Button>
              </div>
            )}

            {/* Student Discount Success */}
            {discountRecorded && (
              <div className="space-y-4 text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-lg font-medium">{t.discountRecorded}</p>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose} className="flex-1">
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

export default UnifiedQRScanner;
