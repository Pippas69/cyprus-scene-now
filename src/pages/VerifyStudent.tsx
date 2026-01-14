import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { OceanLoader } from "@/components/ui/ocean-loader";
import { CheckCircle2, XCircle, GraduationCap, ArrowRight, Clock } from "lucide-react";
import { Confetti, useConfetti } from "@/components/ui/confetti";

const VerifyStudent = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const confetti = useConfetti();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'already_verified' | 'expired' | 'invalid' | 'error'>('loading');
  const [universityName, setUniversityName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const token = searchParams.get('token');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('invalid');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-student-token', {
          body: { token }
        });

        if (error) {
          console.error('Verification error:', error);
          setStatus('error');
          setErrorMessage(error.message);
          return;
        }

        if (data.error) {
          if (data.error === 'token_expired') {
            setStatus('expired');
          } else if (data.error === 'invalid_token') {
            setStatus('invalid');
          } else {
            setStatus('error');
            setErrorMessage(data.message || 'Unknown error');
          }
          return;
        }

        if (data.already_verified) {
          setStatus('already_verified');
          setUniversityName(data.university_name || '');
        } else if (data.success) {
          setStatus('success');
          setUniversityName(data.university_name || '');
          confetti.trigger();
        }
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('error');
      }
    };

    verifyToken();
  }, [token]);

  const translations = {
    en: {
      verifying: "Verifying your student status...",
      success: "Student Status Verified!",
      successDesc: "Congratulations! You now have access to exclusive student discounts.",
      alreadyVerified: "Already Verified",
      alreadyVerifiedDesc: "Your student status was already verified.",
      expired: "Link Expired",
      expiredDesc: "This verification link has expired. Please request a new one from your profile settings.",
      invalid: "Invalid Link",
      invalidDesc: "This verification link is invalid or has already been used.",
      error: "Verification Failed",
      errorDesc: "Something went wrong during verification. Please try again.",
      goToFeed: "Explore Events",
      goToProfile: "Go to Profile",
      university: "University",
    },
    el: {
      verifying: "Επαλήθευση φοιτητικής ιδιότητας...",
      success: "Επιτυχής Επαλήθευση!",
      successDesc: "Συγχαρητήρια! Έχεις πλέον πρόσβαση σε αποκλειστικές φοιτητικές εκπτώσεις.",
      alreadyVerified: "Ήδη Επαληθευμένος",
      alreadyVerifiedDesc: "Η φοιτητική σου ιδιότητα έχει ήδη επαληθευτεί.",
      expired: "Ο Σύνδεσμος Έληξε",
      expiredDesc: "Αυτός ο σύνδεσμος επαλήθευσης έχει λήξει. Ζήτησε νέο από τις ρυθμίσεις του προφίλ σου.",
      invalid: "Μη Έγκυρος Σύνδεσμος",
      invalidDesc: "Αυτός ο σύνδεσμος επαλήθευσης δεν είναι έγκυρος ή έχει ήδη χρησιμοποιηθεί.",
      error: "Αποτυχία Επαλήθευσης",
      errorDesc: "Κάτι πήγε στραβά κατά την επαλήθευση. Παρακαλώ δοκίμασε ξανά.",
      goToFeed: "Εξερεύνηση Εκδηλώσεων",
      goToProfile: "Πήγαινε στο Προφίλ",
      university: "Πανεπιστήμιο",
    }
  };

  const t = translations[language];

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center">
            <OceanLoader size="lg" />
            <p className="mt-6 text-lg text-muted-foreground">{t.verifying}</p>
          </div>
        );
      
      case 'success':
        return (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{t.success}</h1>
              <p className="text-muted-foreground">{t.successDesc}</p>
              {universityName && (
                <p className="mt-4 text-sm text-primary font-medium">
                  <GraduationCap className="inline h-4 w-4 mr-1" />
                  {t.university}: {universityName}
                </p>
              )}
            </div>
            <Button onClick={() => navigate('/feed')} variant="gradient" size="lg" className="gap-2">
              {t.goToFeed}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        );
      
      case 'already_verified':
        return (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
              <GraduationCap className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{t.alreadyVerified}</h1>
              <p className="text-muted-foreground">{t.alreadyVerifiedDesc}</p>
            </div>
            <Button onClick={() => navigate('/feed')} variant="gradient" size="lg" className="gap-2">
              {t.goToFeed}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        );
      
      case 'expired':
        return (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
              <Clock className="h-12 w-12 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{t.expired}</h1>
              <p className="text-muted-foreground">{t.expiredDesc}</p>
            </div>
            <Button onClick={() => navigate('/dashboard-user/settings')} variant="outline" size="lg" className="gap-2">
              {t.goToProfile}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        );
      
      case 'invalid':
        return (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{t.invalid}</h1>
              <p className="text-muted-foreground">{t.invalidDesc}</p>
            </div>
            <Button onClick={() => navigate('/')} variant="outline" size="lg">
              {language === 'el' ? 'Αρχική' : 'Home'}
            </Button>
          </div>
        );
      
      case 'error':
      default:
        return (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{t.error}</h1>
              <p className="text-muted-foreground">{t.errorDesc}</p>
              {errorMessage && (
                <p className="mt-2 text-sm text-red-500">{errorMessage}</p>
              )}
            </div>
            <Button onClick={() => navigate('/')} variant="outline" size="lg">
              {language === 'el' ? 'Αρχική' : 'Home'}
            </Button>
          </div>
        );
    }
  };

  return (
    <>
      <Confetti isActive={confetti.isActive} onComplete={confetti.reset} particleCount={100} />
      <div className="min-h-screen gradient-hero flex items-center justify-center py-12 px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-30 blur-3xl">
            <div className="w-full h-full rounded-full bg-gradient-glow" />
          </div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-sunset-coral/20 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="max-w-md w-full relative z-10">
          <div className="bg-card rounded-3xl shadow-elegant p-8 md:p-12">
            {/* Logo */}
            <div className="text-center mb-8">
              <h1 className="font-cinzel text-4xl font-bold text-primary mb-2">ΦΟΜΟ</h1>
              <div className="w-16 h-1 bg-gradient-to-r from-primary to-seafoam mx-auto rounded-full" />
            </div>

            {renderContent()}
          </div>
        </div>
      </div>
    </>
  );
};

export default VerifyStudent;
