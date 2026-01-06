import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Calendar } from 'lucide-react';
import { StudentVerification } from '@/hooks/useStudentVerification';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';

interface StudentQRCardProps {
  verification: StudentVerification;
  language: 'en' | 'el';
}

const translations = {
  en: {
    title: 'Student Discount QR Code',
    description: 'Show this QR code at partner businesses to receive your student discount',
    university: 'University',
    validUntil: 'Valid Until',
    scanInstructions: 'Present this code at checkout',
  },
  el: {
    title: 'QR Κώδικας Φοιτητικής Έκπτωσης',
    description: 'Δείξτε αυτόν τον QR κώδικα σε συνεργαζόμενες επιχειρήσεις για τη φοιτητική σας έκπτωση',
    university: 'Πανεπιστήμιο',
    validUntil: 'Ισχύει μέχρι',
    scanInstructions: 'Παρουσιάστε αυτόν τον κώδικα στο ταμείο',
  },
};

export function StudentQRCard({ verification, language }: StudentQRCardProps) {
  const t = translations[language];
  const locale = language === 'el' ? el : enUS;
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
            
            {verification.expires_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t.validUntil}</span>
                <div className="flex items-center gap-1 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(verification.expires_at), 'PPP', { locale })}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
