import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap } from 'lucide-react';
import { StudentVerification } from '@/hooks/useStudentVerification';

interface StudentQRCardProps {
  verification: StudentVerification;
  language: 'en' | 'el';
  discountMode?: 'once' | 'unlimited' | null; // null = generic view (settings page)
  isRedeemed?: boolean;
}

const translations = {
  en: {
    title: 'Student Discount QR Code',
    description: 'Show this QR code at partner businesses to receive your student discount',
    university: 'University',
    usageType: 'Usage Type',
    scanInstructions: 'Present this code at checkout',
    oneTime: 'One-time use',
    unlimited: 'Unlimited use',
    redeemed: 'Already redeemed',
    unlimitedNote: 'You can use this discount on every visit',
    oneTimeNote: 'This discount can only be used once at this business',
    redeemedNote: 'You have already used this discount',
    genericNote: 'Show this code at participating businesses for student discounts',
  },
  el: {
    title: 'QR Κώδικας Φοιτητικής Έκπτωσης',
    description: 'Δείξτε αυτόν τον QR κώδικα σε συνεργαζόμενες επιχειρήσεις για τη φοιτητική σας έκπτωση',
    university: 'Πανεπιστήμιο',
    usageType: 'Τύπος Χρήσης',
    scanInstructions: 'Παρουσιάστε αυτόν τον κώδικα στο ταμείο',
    oneTime: 'Μιας χρήσης',
    unlimited: 'Μόνιμη έκπτωση',
    redeemed: 'Ήδη εξαργυρώθηκε',
    unlimitedNote: 'Μπορείτε να χρησιμοποιήσετε αυτή την έκπτωση σε κάθε επίσκεψη',
    oneTimeNote: 'Αυτή η έκπτωση μπορεί να χρησιμοποιηθεί μόνο μία φορά σε αυτή την επιχείρηση',
    redeemedNote: 'Έχετε ήδη χρησιμοποιήσει αυτή την έκπτωση',
    genericNote: 'Δείξτε αυτόν τον κώδικα σε συνεργαζόμενες επιχειρήσεις για φοιτητικές εκπτώσεις',
  },
};

export function StudentQRCard({ verification, language, discountMode = null, isRedeemed = false }: StudentQRCardProps) {
  const t = translations[language];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (canvasRef.current && verification.qr_code_token) {
      const qrData = `fomo-student:${verification.qr_code_token}`;
      QRCode.toCanvas(canvasRef.current, qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#0D3B66',
          light: '#FFFFFF',
        },
      });
    }
  }, [verification.qr_code_token]);
  
  if (!verification.qr_code_token) {
    return null;
  }
  
  return (
    <Card className="overflow-hidden w-[260px] sm:w-[320px] mx-auto">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 py-2 sm:py-3 px-3 sm:px-4">
        <CardTitle className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold">
          <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          {t.title}
        </CardTitle>
        <CardDescription className="text-[10px] sm:text-[11px] leading-tight text-center">{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4 pb-3 sm:pb-4">
        <div className="flex flex-col items-center gap-2 sm:gap-3">
          <div className="p-2 sm:p-3 bg-white rounded-xl shadow-lg">
            <canvas ref={canvasRef} className="w-[130px] h-[130px] sm:w-[160px] sm:h-[160px]" />
          </div>
          
          <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
            {t.scanInstructions}
          </p>
          
          <div className="w-full space-y-1.5 sm:space-y-2 pt-2 sm:pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-muted-foreground">{t.university}</span>
              <Badge variant="secondary" className="text-[9px] sm:text-[10px] h-4 sm:h-5 px-1.5 sm:px-2 bg-orange-500 text-white hover:bg-orange-600">{verification.university_name}</Badge>
            </div>
            
            {discountMode !== null && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs text-muted-foreground">{t.usageType}</span>
                {isRedeemed ? (
                  <Badge variant="destructive" className="text-[9px] sm:text-[10px] h-4 sm:h-5 px-1.5 sm:px-2">{t.redeemed}</Badge>
                ) : discountMode === 'once' ? (
                  <Badge variant="outline" className="border-amber-500 text-amber-600 text-[9px] sm:text-[10px] h-4 sm:h-5 px-1.5 sm:px-2">{t.oneTime}</Badge>
                ) : (
                  <Badge variant="default" className="bg-green-600 text-[9px] sm:text-[10px] h-4 sm:h-5 px-1.5 sm:px-2">{t.unlimited}</Badge>
                )}
              </div>
            )}
          </div>
          
          <div className="w-full mt-1.5 sm:mt-2 p-2 sm:p-2.5 rounded-lg bg-muted/50 text-center">
            <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight">
              {discountMode === null 
                ? t.genericNote 
                : isRedeemed 
                  ? t.redeemedNote 
                  : discountMode === 'once' 
                    ? t.oneTimeNote 
                    : t.unlimitedNote}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
