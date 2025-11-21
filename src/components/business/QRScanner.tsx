import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { toastTranslations } from '@/translations/toastTranslations';

interface QRScannerProps {
  businessId: string;
  language: 'el' | 'en';
  onReservationVerified?: (reservation: any) => void;
}

export const QRScanner = ({ businessId, language, onReservationVerified }: QRScannerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    reservation?: any;
    message: string;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const text = {
    el: {
      scanQR: 'Σάρωση QR',
      scanning: 'Σάρωση...',
      verifying: 'Επαλήθευση...',
      verified: 'Επαληθεύτηκε!',
      invalid: 'Μη έγκυρο',
      notFound: 'Η κράτηση δεν βρέθηκε',
      wrongBusiness: 'Αυτή η κράτηση ανήκει σε άλλη επιχείρηση',
      alreadyVerified: 'Ήδη επαληθευμένη',
      cancelled: 'Η κράτηση έχει ακυρωθεί',
      declined: 'Η κράτηση απορρίφθηκε',
      reservationDetails: 'Στοιχεία Κράτησης',
      name: 'Όνομα',
      partySize: 'Άτομα',
      time: 'Ώρα',
      status: 'Κατάσταση',
      close: 'Κλείσιμο',
      scanAnother: 'Σάρωση Άλλου',
      cameraError: 'Σφάλμα πρόσβασης στην κάμερα',
    },
    en: {
      scanQR: 'Scan QR',
      scanning: 'Scanning...',
      verifying: 'Verifying...',
      verified: 'Verified!',
      invalid: 'Invalid',
      notFound: 'Reservation not found',
      wrongBusiness: 'This reservation belongs to another business',
      alreadyVerified: 'Already verified',
      cancelled: 'Reservation has been cancelled',
      declined: 'Reservation was declined',
      reservationDetails: 'Reservation Details',
      name: 'Name',
      partySize: 'Party Size',
      time: 'Time',
      status: 'Status',
      close: 'Close',
      scanAnother: 'Scan Another',
      cameraError: 'Camera access error',
    },
  };

  const t = text[language];

  useEffect(() => {
    if (isOpen && videoRef.current && !scannerRef.current) {
      initScanner();
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  const initScanner = async () => {
    if (!videoRef.current) return;

    try {
      const scanner = new QrScanner(
        videoRef.current,
        (result) => handleScan(result.data),
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      await scanner.start();
      scannerRef.current = scanner;
      setScanning(true);
    } catch (error) {
      toast.error(toastTranslations[language].cameraError);
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

    try {
      // Query reservation by QR token or confirmation code
      const { data: reservation, error } = await supabase
        .from('reservations')
        .select(`
          *,
          events!inner(
            id,
            title,
            start_at,
            business_id
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

      // Verify reservation belongs to this business
      if (reservation.events.business_id !== businessId) {
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
        });
        toast.error(toastTranslations[language].reservationCancelledStatus);
        return;
      }

      if (reservation.status === 'declined') {
        setVerificationResult({
          success: false,
          reservation,
          message: t.declined,
        });
        toast.error(toastTranslations[language].reservationDeclined);
        return;
      }

      // Success
      setVerificationResult({
        success: true,
        reservation,
        message: t.verified,
      });
      toast.success(toastTranslations[language].reservationVerified);

      if (onReservationVerified) {
        onReservationVerified(reservation);
      }
    } catch (error) {
      console.error('Error verifying reservation:', error);
      setVerificationResult({
        success: false,
        message: t.invalid,
      });
      toast.error(toastTranslations[language].qrInvalid);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setVerificationResult(null);
    setScanning(false);
  };

  const handleScanAnother = () => {
    setVerificationResult(null);
    if (scannerRef.current && videoRef.current) {
      scannerRef.current.start();
      setScanning(true);
    } else {
      initScanner();
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Camera className="h-4 w-4" />
        {t.scanQR}
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.scanQR}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!verificationResult ? (
              <>
                <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                  />
                  {scanning && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-primary rounded-lg"></div>
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
                      <CheckCircle className="h-16 w-16 text-green-500" />
                    ) : (
                      <XCircle className="h-16 w-16 text-destructive" />
                    )}
                    
                    <div className="text-center">
                      <h3 className="text-xl font-semibold mb-2">
                        {verificationResult.message}
                      </h3>
                      
                      {verificationResult.reservation && (
                        <div className="mt-4 space-y-2 text-sm">
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
                              <span className="text-muted-foreground">{t.time}:</span>
                              <span className="font-medium">
                                {new Date(verificationResult.reservation.preferred_time).toLocaleTimeString(language, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t.status}:</span>
                            <span className="font-medium capitalize">{verificationResult.reservation.status}</span>
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
