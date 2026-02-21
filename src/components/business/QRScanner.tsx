import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, CheckCircle, XCircle, UserCheck, WifiOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toastTranslations } from '@/translations/toastTranslations';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { queueOfflineScan } from '@/lib/offlineScanQueue';
import { resilientCall } from '@/lib/apiRetry';

interface QRScannerProps {
  businessId: string;
  language: 'el' | 'en';
  onReservationVerified?: (reservation: any) => void;
}

export const QRScanner = ({ businessId, language, onReservationVerified }: QRScannerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [offlineQueued, setOfflineQueued] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    reservation?: any;
    message: string;
    isDirectReservation?: boolean;
    alreadyCheckedIn?: boolean;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const { isOffline } = useOfflineStatus();

  const text = {
    el: {
      scanQR: 'Σάρωση QR',
      scanning: 'Σάρωση...',
      verifying: 'Επαλήθευση...',
      verified: 'Επαληθεύτηκε!',
      checkedIn: 'Check-in ολοκληρώθηκε!',
      invalid: 'Μη έγκυρο',
      notFound: 'Η κράτηση δεν βρέθηκε',
      wrongBusiness: 'Αυτή η κράτηση ανήκει σε άλλη επιχείρηση',
      alreadyCheckedIn: 'Ήδη έχει γίνει check-in',
      cancelled: 'Η κράτηση έχει ακυρωθεί',
      declined: 'Η κράτηση απορρίφθηκε',
      pending: 'Η κράτηση εκκρεμεί έγκριση',
      reservationDetails: 'Στοιχεία Κράτησης',
      name: 'Όνομα',
      partySize: 'Άτομα',
      time: 'Ώρα',
      date: 'Ημερομηνία',
      status: 'Κατάσταση',
      close: 'Κλείσιμο',
      scanAnother: 'Σάρωση Άλλου',
      checkIn: 'Check-in',
      cameraError: 'Σφάλμα πρόσβασης στην κάμερα',
      directReservation: 'Απευθείας Κράτηση',
      eventReservation: 'Κράτηση Εκδήλωσης',
      seating: 'Θέση',
      specialRequests: 'Ειδικά Αιτήματα',
      prepaidCredit: 'Προπληρωμένη Πίστωση',
      paid: 'ΠΛΗΡΩΜΕΝΟ',
      seatingType: 'Τύπος Θέσης',
    },
    en: {
      scanQR: 'Scan QR',
      scanning: 'Scanning...',
      verifying: 'Verifying...',
      verified: 'Verified!',
      checkedIn: 'Check-in complete!',
      invalid: 'Invalid',
      notFound: 'Reservation not found',
      wrongBusiness: 'This reservation belongs to another business',
      alreadyCheckedIn: 'Already checked in',
      cancelled: 'Reservation has been cancelled',
      declined: 'Reservation was declined',
      pending: 'Reservation is pending approval',
      reservationDetails: 'Reservation Details',
      name: 'Name',
      partySize: 'Party Size',
      time: 'Time',
      date: 'Date',
      status: 'Status',
      close: 'Close',
      scanAnother: 'Scan Another',
      checkIn: 'Check-in',
      cameraError: 'Camera access error',
      directReservation: 'Direct Reservation',
      eventReservation: 'Event Reservation',
      seating: 'Seating',
      specialRequests: 'Special Requests',
      prepaidCredit: 'Prepaid Credit',
      paid: 'PAID',
      seatingType: 'Seating Type',
    },
  };

  const t = text[language];

  useEffect(() => {
    if (isOpen) {
      // (Dialog is a portal) videoRef may not be ready on first effect tick.
      // Always attempt init; initScanner will wait until the video element exists.
      setVerificationResult(null);
      setScanning(false);
      initScanner();
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const initScanner = async () => {
    // Wait for the video element to mount AND be visible (Dialog portal + animation timing)
    for (let i = 0; i < 60; i++) {
      const el = videoRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const visible = rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        if (visible) break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    if (!videoRef.current) {
      console.error('Video element not found');
      return;
    }

    // Wait for DOM to settle
    await new Promise((resolve) => setTimeout(resolve, 250));

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported');
      }

      // Clean up any previous scanner instance
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }

      // Ensure Safari/iOS will actually render the stream
      videoRef.current.setAttribute('playsinline', 'true');
      videoRef.current.muted = true;
      videoRef.current.autoplay = true;
      (videoRef.current as any).disablePictureInPicture = true;

      const scanner = new QrScanner(
        videoRef.current,
        (result) => handleScan(result.data),
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment',
        }
      );

      scannerRef.current = scanner;
      await scanner.start();

      // Extra nudge: ensure the back camera is selected when possible
      try {
        await (scanner as any).setCamera?.('environment');
      } catch {
        // ignore
      }

      setScanning(true);
    } catch (error) {
      console.error('Scanner error:', error);

      let errorMsg = toastTranslations[language].cameraError;

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMsg =
            language === 'el'
              ? 'Δεν επιτράπηκε η πρόσβαση στην κάμερα. Παρακαλώ ελέγξτε τις ρυθμίσεις του προγράμματος περιήγησης.'
              : 'Camera access was denied. Please check your browser settings.';
        } else if (error.name === 'NotFoundError') {
          errorMsg = language === 'el' ? 'Δεν βρέθηκε κάμερα σε αυτή τη συσκευή' : 'No camera found on this device';
        } else if (error.name === 'NotReadableError') {
          errorMsg =
            language === 'el'
              ? 'Η κάμερα χρησιμοποιείται ήδη από άλλη εφαρμογή'
              : 'Camera is already in use by another application';
        }
      }

      setScanning(false);
      toast.error(errorMsg);
      setIsOpen(false);
    }
  };

  const handleScan = async (data: string) => {
    if (!data) return;

    // Stop scanning while verifying
    if (scannerRef.current) {
      scannerRef.current.stop();
    }
    setScanning(false);
    setOfflineQueued(false);

    // If offline, queue locally
    if (!navigator.onLine) {
      try {
        await queueOfflineScan({
          scanType: 'reservation',
          qrData: data,
          businessId,
          scannedAt: new Date().toISOString(),
        });
        setOfflineQueued(true);
        setVerificationResult({
          success: true,
          message: language === 'el' ? 'Αποθηκεύτηκε offline - θα συγχρονιστεί αυτόματα' : 'Saved offline - will sync automatically',
        });
        toast.info(language === 'el' ? 'Αποθηκεύτηκε offline' : 'Saved offline');
      } catch {
        setVerificationResult({ success: false, message: t.invalid });
      }
      return;
    }

    try {
      // Query reservation by QR token or confirmation code
      const { data: reservation, error } = await supabase
        .from('reservations')
        .select(`
          *,
          events (
            id,
            title,
            start_at,
            business_id,
            event_type
          ),
          businesses (
            id,
            name
          ),
          reservation_seating_types (
            id,
            seating_type
          )
        `)
        .or(`qr_code_token.eq.${data},confirmation_code.eq.${data}`)
        .single();

      if (error || !reservation) {
        setVerificationResult({
          success: false,
          message: t.notFound,
        });
        toast.error(toastTranslations[language].qrNotFound);
        return;
      }

      // Determine if this is a direct reservation
      const isDirectReservation: boolean = !reservation.event_id && !!reservation.business_id;

      // Verify reservation belongs to this business
      const reservationBusinessId = isDirectReservation 
        ? reservation.business_id 
        : reservation.events?.business_id;
      
      if (reservationBusinessId !== businessId) {
        setVerificationResult({
          success: false,
          message: t.wrongBusiness,
        });
        toast.error(toastTranslations[language].wrongBusiness);
        return;
      }

      // Check reservation status
      if (reservation.status === 'cancelled') {
        setVerificationResult({
          success: false,
          reservation,
          message: t.cancelled,
          isDirectReservation,
        });
        toast.error(toastTranslations[language].reservationCancelledStatus);
        return;
      }

      if (reservation.status === 'declined') {
        setVerificationResult({
          success: false,
          reservation,
          message: t.declined,
          isDirectReservation,
        });
        toast.error(toastTranslations[language].reservationDeclined);
        return;
      }

      if (reservation.status === 'pending') {
        setVerificationResult({
          success: false,
          reservation,
          message: t.pending,
          isDirectReservation,
        });
        toast.error(language === 'el' ? 'Η κράτηση εκκρεμεί έγκριση' : 'Reservation is pending approval');
        return;
      }

      // Check if already checked in
      if (reservation.checked_in_at) {
        setVerificationResult({
          success: true,
          reservation,
          message: t.alreadyCheckedIn,
          isDirectReservation,
          alreadyCheckedIn: true,
        });
        toast.info(language === 'el' ? 'Ήδη έχει γίνει check-in' : 'Already checked in');
        return;
      }

      // Success - perform atomic check-in
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: updateError } = await supabase
        .from('reservations')
        .update({
          checked_in_at: new Date().toISOString(),
          checked_in_by: user?.id,
        })
        .eq('id', reservation.id);

      if (updateError) {
        console.error('Error updating reservation:', updateError);
      }

      // Record the scan for analytics
      await supabase.from('reservation_scans').insert({
        reservation_id: reservation.id,
        scanned_by: user?.id,
        scan_type: 'check_in',
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        },
        success: true,
      });

      setVerificationResult({
        success: true,
        reservation: { ...reservation, checked_in_at: new Date().toISOString() },
        message: t.checkedIn,
        isDirectReservation,
      });
      toast.success(toastTranslations[language].reservationVerified);

      if (onReservationVerified) {
        onReservationVerified(reservation);
      }
    } catch (error) {
      console.error('Error verifying reservation:', error);
      
      // Fallback to offline if network failed
      if (!navigator.onLine) {
        try {
          await queueOfflineScan({
            scanType: 'reservation',
            qrData: data,
            businessId,
            scannedAt: new Date().toISOString(),
          });
          setOfflineQueued(true);
          setVerificationResult({
            success: true,
            message: language === 'el' ? 'Αποθηκεύτηκε offline' : 'Saved offline',
          });
          toast.info(language === 'el' ? 'Αποθηκεύτηκε offline' : 'Saved offline');
        } catch {
          setVerificationResult({ success: false, message: t.invalid });
          toast.error(toastTranslations[language].qrInvalid);
        }
      } else {
        setVerificationResult({ success: false, message: t.invalid });
        toast.error(toastTranslations[language].qrInvalid);
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setVerificationResult(null);
    setOfflineQueued(false);
    setScanning(false);
  };

  const handleScanAnother = () => {
    setVerificationResult(null);
    setOfflineQueued(false);
    if (scannerRef.current && videoRef.current) {
      scannerRef.current.start();
      setScanning(true);
    } else {
      initScanner();
    }
  };

  const formatDateTime = (dateString: string | null) => {
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
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        {isOffline ? <WifiOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
        {t.scanQR}
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {t.scanQR}
              {isOffline && (
                <Badge variant="destructive" className="gap-1 text-[10px]">
                  <WifiOff className="h-3 w-3" />
                  Offline
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!verificationResult ? (
              <>
                <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                    autoPlay
                  />
                  {scanning && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-primary rounded-lg" />
                    </div>
                  )}
                  {!scanning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
                      <Camera className="h-16 w-16 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-center px-4">
                        {language === 'el' ? 'Εκκίνηση κάμερας...' : 'Starting camera...'}
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  {scanning ? t.scanning : t.verifying}
                </p>
              </>
            ) : (
              <Card className={verificationResult.success ? 'border-green-500' : 'border-destructive'}>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center gap-4">
                    {verificationResult.success ? (
                      verificationResult.alreadyCheckedIn ? (
                        <UserCheck className="h-16 w-16 text-amber-500" />
                      ) : (
                        <CheckCircle className="h-16 w-16 text-green-500" />
                      )
                    ) : (
                      <XCircle className="h-16 w-16 text-destructive" />
                    )}
                    
                    <div className="text-center w-full">
                      <h3 className="text-xl font-semibold mb-2">
                        {verificationResult.message}
                      </h3>
                      
                      {verificationResult.reservation && (
                        <div className="mt-4 space-y-3 text-sm text-left">
                          <div className="flex justify-center gap-2 mb-3 flex-wrap">
                            <Badge variant={verificationResult.isDirectReservation ? "secondary" : "outline"}>
                              {verificationResult.isDirectReservation ? t.directReservation : t.eventReservation}
                            </Badge>
                            {verificationResult.reservation.prepaid_min_charge_cents > 0 && 
                             verificationResult.reservation.prepaid_charge_status === 'paid' && (
                              <Badge className="bg-green-600 text-white">
                                {t.paid}
                              </Badge>
                            )}
                          </div>
                          
                          {!verificationResult.isDirectReservation && verificationResult.reservation.events && (
                            <div className="bg-muted/50 p-3 rounded-lg mb-3">
                              <p className="font-medium text-foreground">
                                {verificationResult.reservation.events.title}
                              </p>
                            </div>
                          )}
                          
                          {verificationResult.isDirectReservation && verificationResult.reservation.businesses && (
                            <div className="bg-muted/50 p-3 rounded-lg mb-3">
                              <p className="font-medium text-foreground">
                                {verificationResult.reservation.businesses.name}
                              </p>
                            </div>
                          )}
                          
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t.name}:</span>
                            <span className="font-medium">{verificationResult.reservation.reservation_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t.partySize}:</span>
                            <span className="font-medium">{verificationResult.reservation.party_size}</span>
                          </div>
                          {verificationResult.reservation.preferred_time && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t.date}:</span>
                              <span className="font-medium">
                                {formatDateTime(verificationResult.reservation.preferred_time)}
                              </span>
                            </div>
                          )}
                          {verificationResult.reservation.reservation_seating_types && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t.seatingType}:</span>
                              <span className="font-medium capitalize">
                                {verificationResult.reservation.reservation_seating_types.seating_type}
                              </span>
                            </div>
                          )}
                          {verificationResult.reservation.prepaid_min_charge_cents > 0 && (
                            <div className="flex justify-between bg-green-50 dark:bg-green-950/30 p-2 rounded-lg">
                              <span className="text-green-700 dark:text-green-300 font-medium">{t.prepaidCredit}:</span>
                              <span className="font-bold text-green-700 dark:text-green-300">
                                €{(verificationResult.reservation.prepaid_min_charge_cents / 100).toFixed(2)}
                              </span>
                            </div>
                          )}
                          {verificationResult.reservation.seating_preference && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t.seating}:</span>
                              <span className="font-medium">{verificationResult.reservation.seating_preference}</span>
                            </div>
                          )}
                          {verificationResult.reservation.special_requests && (
                            <div className="mt-2 pt-2 border-t">
                              <span className="text-muted-foreground text-xs">{t.specialRequests}:</span>
                              <p className="font-medium text-xs mt-1">{verificationResult.reservation.special_requests}</p>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t">
                            <span className="text-muted-foreground">{t.status}:</span>
                            <Badge 
                              variant={
                                verificationResult.reservation.checked_in_at 
                                  ? "default" 
                                  : verificationResult.reservation.status === 'accepted' 
                                    ? "secondary" 
                                    : "destructive"
                              }
                            >
                              {verificationResult.reservation.checked_in_at 
                                ? (language === 'el' ? 'Checked-in' : 'Checked-in')
                                : verificationResult.reservation.status
                              }
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" onClick={handleClose}>
                        {t.close}
                      </Button>
                      <Button onClick={handleScanAnother}>
                        {t.scanAnother}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
