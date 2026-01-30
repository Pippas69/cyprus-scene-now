import { useState, useEffect } from 'react';
import { GraduationCap, AlertCircle } from 'lucide-react';
import { RippleButton } from '@/components/ui/ripple-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useStudentVerification } from '@/hooks/useStudentVerification';
import { StudentQRCard } from './StudentQRCard';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface StudentDiscountButtonProps {
  businessId: string;
  businessName: string;
  discountPercent: number;
  discountMode: 'one_time' | 'unlimited';
  userId: string | null;
  language: 'en' | 'el';
  variant?: 'button' | 'badge';
}

const translations = {
  en: {
    useStudentDiscount: 'Use Student Discount',
    studentDiscountTitle: 'Student Discount',
    showQRToStaff: 'Show this QR code to staff at checkout',
    oneTimeNote: 'This discount can only be used once at this business',
    unlimitedNote: 'You can use this discount on every visit',
    verificationRequired: 'Student Verification Required',
    verifyNow: 'Verify Now',
    verifyDescription: 'To access student discounts, you need to verify your student status with your university email.',
    loginRequired: 'Please log in to use student discounts',
    login: 'Log In',
    pendingVerification: 'Your student verification is pending approval',
    off: 'off',
    close: 'Close',
  },
  el: {
    useStudentDiscount: 'Χρήση Φοιτητικής Έκπτωσης',
    studentDiscountTitle: 'Φοιτητική Έκπτωση',
    showQRToStaff: 'Δείξτε αυτόν τον QR κώδικα στο ταμείο',
    oneTimeNote: 'Αυτή η έκπτωση μπορεί να χρησιμοποιηθεί μόνο μία φορά σε αυτή την επιχείρηση',
    unlimitedNote: 'Μπορείτε να χρησιμοποιήσετε αυτή την έκπτωση σε κάθε επίσκεψη',
    verificationRequired: 'Απαιτείται Επιβεβαίωση Φοιτητικής Ιδιότητας',
    verifyNow: 'Επιβεβαίωση Τώρα',
    verifyDescription: 'Για πρόσβαση στις φοιτητικές εκπτώσεις, πρέπει να επιβεβαιώσετε τη φοιτητική σας ιδιότητα με το email του πανεπιστημίου σας.',
    loginRequired: 'Συνδεθείτε για να χρησιμοποιήσετε τη φοιτητική έκπτωση',
    login: 'Σύνδεση',
    pendingVerification: 'Η επαλήθευση φοιτητικής ιδιότητας εκκρεμεί',
    off: 'έκπτωση',
    close: 'Κλείσιμο',
  },
};

export function StudentDiscountButton({
  businessId,
  businessName,
  discountPercent,
  discountMode,
  userId,
  language,
  variant = 'button',
}: StudentDiscountButtonProps) {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isRedeemed, setIsRedeemed] = useState(false);
  const { data: verification, isLoading } = useStudentVerification(userId || undefined);
  const t = translations[language];

  const isVerifiedStudent = verification?.status === 'approved' && verification?.qr_code_token;
  const isPendingVerification = verification?.status === 'pending';

  // Check if one-time discount was already redeemed
  useEffect(() => {
    const checkRedemption = async () => {
      if (userId && discountMode === 'one_time') {
        const { data } = await supabase
          .from('student_redemptions')
          .select('id')
          .eq('user_id', userId)
          .eq('business_id', businessId)
          .maybeSingle();
        
        setIsRedeemed(!!data);
      }
    };
    checkRedemption();
  }, [userId, businessId, discountMode]);

  const handleClick = () => {
    if (!userId) {
      // Not logged in
      setDialogOpen(true);
      return;
    }
    setDialogOpen(true);
  };

  const handleLogin = () => {
    navigate('/login', { state: { from: `/business/${businessId}` } });
  };

  const handleVerify = () => {
    // Navigate to settings and scroll to student verification section
    setDialogOpen(false);
    navigate('/dashboard-user?tab=settings#student-verification');
  };

  // Badge variant - small circular badge for avatar overlay
  if (variant === 'badge') {
    if (isLoading) {
      return (
        <div className="bg-accent/50 text-accent-foreground text-[9px] font-bold rounded-full h-7 w-7 flex flex-col items-center justify-center border-2 border-background shadow-md opacity-50">
          <GraduationCap className="h-3 w-3" />
          <span className="-mt-0.5">{discountPercent}%</span>
        </div>
      );
    }

    return (
      <>
        <div 
          onClick={handleClick}
          className="bg-accent text-accent-foreground text-[9px] font-bold rounded-full h-7 w-7 flex flex-col items-center justify-center border-2 border-background shadow-md hover:scale-110 transition-transform cursor-pointer"
        >
          <GraduationCap className="h-3 w-3" />
          <span className="-mt-0.5">{discountPercent}%</span>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                {t.studentDiscountTitle}
              </DialogTitle>
              <DialogDescription>
                {businessName} - {discountPercent}% {t.off}
              </DialogDescription>
            </DialogHeader>

            {/* Not logged in */}
            {!userId && (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{t.loginRequired}</AlertDescription>
                </Alert>
                <Button onClick={handleLogin} className="w-full gap-2">
                  {t.login}
                </Button>
              </div>
            )}

            {/* Logged in but not verified */}
            {userId && !verification && (
              <div className="space-y-4">
                <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-amber-700 dark:text-amber-400">
                    {t.verificationRequired}
                  </AlertDescription>
                </Alert>
                <p className="text-sm text-muted-foreground">
                  {t.verifyDescription}
                </p>
                <Button onClick={handleVerify} className="w-full gap-2">
                  <GraduationCap className="h-4 w-4" />
                  {t.verifyNow}
                </Button>
              </div>
            )}

            {/* Pending verification */}
            {userId && isPendingVerification && (
              <div className="space-y-4">
                <Alert variant="default" className="border-blue-500/50 bg-blue-500/10">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-blue-700 dark:text-blue-400">
                    {t.pendingVerification}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Verified - show QR */}
            {userId && isVerifiedStudent && verification && (
              <div className="space-y-4">
                <StudentQRCard 
                  verification={verification} 
                  language={language}
                  discountMode={discountMode === 'one_time' ? 'once' : 'unlimited'}
                  isRedeemed={isRedeemed}
                />

                <Button 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)} 
                  className="w-full"
                >
                  {t.close}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Default button variant
  if (isLoading) {
    return (
      <RippleButton disabled className="gap-2 opacity-50">
        <GraduationCap className="h-4 w-4" />
        {t.useStudentDiscount}
      </RippleButton>
    );
  }

  return (
    <>
      <RippleButton
        onClick={handleClick}
        variant="outline"
        className="gap-2 border-primary/30 hover:bg-primary/10"
      >
        <GraduationCap className="h-4 w-4" />
        {t.useStudentDiscount}
        <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold bg-accent text-accent-foreground rounded">
          {discountPercent}%
        </span>
      </RippleButton>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              {t.studentDiscountTitle}
            </DialogTitle>
            <DialogDescription>
              {businessName} - {discountPercent}% {t.off}
            </DialogDescription>
          </DialogHeader>

          {/* Not logged in */}
          {!userId && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{t.loginRequired}</AlertDescription>
              </Alert>
              <Button onClick={handleLogin} className="w-full gap-2">
                {t.login}
              </Button>
            </div>
          )}

          {/* Logged in but not verified */}
          {userId && !verification && (
            <div className="space-y-4">
              <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-amber-700 dark:text-amber-400">
                  {t.verificationRequired}
                </AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground">
                {t.verifyDescription}
              </p>
              <Button onClick={handleVerify} className="w-full gap-2">
                <GraduationCap className="h-4 w-4" />
                {t.verifyNow}
              </Button>
            </div>
          )}

          {/* Pending verification */}
          {userId && isPendingVerification && (
            <div className="space-y-4">
              <Alert variant="default" className="border-blue-500/50 bg-blue-500/10">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-blue-700 dark:text-blue-400">
                  {t.pendingVerification}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Verified - show QR */}
          {userId && isVerifiedStudent && verification && (
            <div className="space-y-4">
              {/* Show the student QR card with discount mode and redemption status */}
              <StudentQRCard 
                verification={verification} 
                language={language}
                discountMode={discountMode === 'one_time' ? 'once' : 'unlimited'}
                isRedeemed={isRedeemed}
              />

              <Button 
                variant="outline" 
                onClick={() => setDialogOpen(false)} 
                className="w-full"
              >
                {t.close}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
