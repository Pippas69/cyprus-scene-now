import { useState, useRef, useEffect } from 'react';
import QrScanner from 'qr-scanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QrCode, Camera, Loader2, CheckCircle, XCircle, GraduationCap, Euro } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStudentPartner } from '@/hooks/useStudentPartner';
import { useCreateStudentRedemption } from '@/hooks/useStudentRedemptions';

interface StudentDiscountScannerProps {
  businessId: string;
  userId?: string;
  language: 'en' | 'el';
}

interface ScannedStudent {
  verificationId: string;
  name: string;
  universityName: string;
  avatarUrl: string | null;
}

const translations = {
  en: {
    title: 'Student Discount Scanner',
    description: 'Scan student QR codes to apply discounts',
    openScanner: 'Open Scanner',
    scanning: 'Scanning...',
    startScan: 'Start Scanning',
    stopScan: 'Stop Scanning',
    scanSuccess: 'Student Verified',
    scanError: 'Invalid QR Code',
    expiredError: 'Student verification has expired',
    notFoundError: 'Student not found',
    originalPrice: 'Original Price (€)',
    discountedPrice: 'Discounted Price (€)',
    itemDescription: 'Item Description (optional)',
    discount: 'Discount',
    applyDiscount: 'Record Discount',
    recording: 'Recording...',
    success: 'Discount recorded successfully!',
    scanAnother: 'Scan Another',
    close: 'Close',
    notPartner: 'Your business is not registered as a student discount partner.',
  },
  el: {
    title: 'Σαρωτής Φοιτητικής Έκπτωσης',
    description: 'Σαρώστε QR κώδικες φοιτητών για εφαρμογή εκπτώσεων',
    openScanner: 'Άνοιγμα Σαρωτή',
    scanning: 'Σάρωση...',
    startScan: 'Έναρξη Σάρωσης',
    stopScan: 'Διακοπή Σάρωσης',
    scanSuccess: 'Φοιτητής Επαληθεύτηκε',
    scanError: 'Μη έγκυρος QR Κώδικας',
    expiredError: 'Η επαλήθευση φοιτητή έχει λήξει',
    notFoundError: 'Ο φοιτητής δεν βρέθηκε',
    originalPrice: 'Αρχική Τιμή (€)',
    discountedPrice: 'Τιμή με Έκπτωση (€)',
    itemDescription: 'Περιγραφή Προϊόντος (προαιρετικό)',
    discount: 'Έκπτωση',
    applyDiscount: 'Καταγραφή Έκπτωσης',
    recording: 'Καταγραφή...',
    success: 'Η έκπτωση καταγράφηκε επιτυχώς!',
    scanAnother: 'Σάρωση Άλλου',
    close: 'Κλείσιμο',
    notPartner: 'Η επιχείρησή σας δεν είναι εγγεγραμμένη ως συνεργάτης φοιτητικών εκπτώσεων.',
  },
};

export function StudentDiscountScanner({ businessId, userId, language }: StudentDiscountScannerProps) {
  const t = translations[language];
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedStudent, setScannedStudent] = useState<ScannedStudent | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [originalPrice, setOriginalPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  
  const { data: partner, isLoading: partnerLoading } = useStudentPartner(businessId);
  const createRedemption = useCreateStudentRedemption();
  
  const discountPercent = partner?.discount_percent || 0;
  const discountedPrice = originalPrice 
    ? (parseFloat(originalPrice) * (1 - discountPercent / 100)).toFixed(2)
    : '';
  
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.destroy();
      }
    };
  }, []);
  
  const startScanning = async () => {
    if (!videoRef.current) return;
    
    setError('');
    setScannedStudent(null);
    setSuccess(false);
    
    try {
      scannerRef.current = new QrScanner(
        videoRef.current,
        async (result) => {
          await handleScan(result.data);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );
      
      await scannerRef.current.start();
      setIsScanning(true);
    } catch (err) {
      console.error('Camera error:', err);
      setError('Failed to access camera');
    }
  };
  
  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };
  
  const handleScan = async (data: string) => {
    stopScanning();
    
    // Parse QR data: fomo-student:{token}
    if (!data.startsWith('fomo-student:')) {
      setError(t.scanError);
      return;
    }
    
    const token = data.replace('fomo-student:', '');
    
    // Look up student verification
    const { data: verification, error: verificationError } = await supabase
      .from('student_verifications')
      .select(`
        id,
        status,
        expires_at,
        user:profiles!student_verifications_user_id_fkey(name, avatar_url),
        university_name
      `)
      .eq('qr_code_token', token)
      .single();
    
    if (verificationError || !verification) {
      setError(t.notFoundError);
      return;
    }
    
    if (verification.status !== 'approved') {
      setError(t.notFoundError);
      return;
    }
    
    if (verification.expires_at && new Date(verification.expires_at) < new Date()) {
      setError(t.expiredError);
      return;
    }
    
    setScannedStudent({
      verificationId: verification.id,
      name: (verification.user as { name: string })?.name || 'Unknown',
      universityName: verification.university_name,
      avatarUrl: (verification.user as { avatar_url: string | null })?.avatar_url,
    });
  };
  
  const handleApplyDiscount = async () => {
    if (!scannedStudent || !originalPrice) return;
    
    const originalCents = Math.round(parseFloat(originalPrice) * 100);
    const discountedCents = Math.round(parseFloat(discountedPrice) * 100);
    
    await createRedemption.mutateAsync({
      studentVerificationId: scannedStudent.verificationId,
      businessId,
      scannedBy: userId,
      originalPriceCents: originalCents,
      discountedPriceCents: discountedCents,
      itemDescription: itemDescription || undefined,
    });
    
    setSuccess(true);
  };
  
  const resetScanner = () => {
    setScannedStudent(null);
    setError('');
    setSuccess(false);
    setOriginalPrice('');
    setItemDescription('');
  };
  
  const handleClose = () => {
    stopScanning();
    resetScanner();
    setIsOpen(false);
  };
  
  if (partnerLoading) {
    return null;
  }
  
  if (!partner || !partner.is_active) {
    return null;
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <GraduationCap className="h-4 w-4" />
          {t.openScanner}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {t.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Video Scanner */}
          {!scannedStudent && !success && (
            <div className="space-y-4">
              <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                />
                {!isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                    <Camera className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <Button
                onClick={isScanning ? stopScanning : startScanning}
                className="w-full"
                variant={isScanning ? 'destructive' : 'default'}
              >
                {isScanning ? t.stopScan : t.startScan}
              </Button>
            </div>
          )}
          
          {/* Scanned Student - Price Entry */}
          {scannedStudent && !success && (
            <div className="space-y-4">
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-400">
                  {t.scanSuccess}
                </AlertDescription>
              </Alert>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{scannedStudent.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {scannedStudent.universityName}
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
                onClick={handleApplyDiscount}
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
          
          {/* Success State */}
          {success && (
            <div className="space-y-4 text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-lg font-medium">{t.success}</p>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  {t.close}
                </Button>
                <Button onClick={resetScanner} className="flex-1">
                  {t.scanAnother}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
