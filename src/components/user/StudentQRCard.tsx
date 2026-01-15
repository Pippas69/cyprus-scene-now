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
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          {t.title}
        </CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-white rounded-xl shadow-lg">
            <canvas ref={canvasRef} />
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            {t.scanInstructions}
          </p>
          
          <div className="w-full space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t.university}</span>
              <Badge variant="secondary">{verification.university_name}</Badge>
            </div>
            
            {/* Only show usage type when a specific business discount mode is provided */}
            {discountMode !== null && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t.usageType}</span>
                {isRedeemed ? (
                  <Badge variant="destructive">{t.redeemed}</Badge>
                ) : discountMode === 'once' ? (
                  <Badge variant="outline" className="border-amber-500 text-amber-600">{t.oneTime}</Badge>
                ) : (
                  <Badge variant="default" className="bg-green-600">{t.unlimited}</Badge>
                )}
              </div>
            )}
          </div>
          
          {/* Usage note */}
          <div className="w-full mt-4 p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground">
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
