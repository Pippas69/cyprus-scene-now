import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Gift, Calendar, Ticket, Zap, TrendingUp, ChevronRight, ChevronLeft, X, Check } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Confetti, useConfetti } from '@/components/ui/confetti';

interface OnboardingTourProps {
  isOpen: boolean;
  onComplete: () => void;
  language: 'el' | 'en';
}

const translations = {
  el: {
    skipTour: 'Παράλειψη',
    next: 'Επόμενο',
    previous: 'Προηγούμενο',
    startExploring: 'Ξεκινήστε την Εξερεύνηση',
    letsGo: 'Πάμε!',
    step1Title: 'Καλώς ήρθατε στο ΦΟΜΟ!',
    step1Subtitle: 'Ως beta tester, έχετε ΔΩΡΕΑΝ πρόσβαση στο Growth Plan μας!',
    step1Feature1: '€250 μηνιαίο budget boost',
    step1Feature2: '10 προσφορές χωρίς προμήθεια',
    step1Feature3: 'Πλήρες dashboard analytics',
    step1Feature4: 'Απεριόριστες εκδηλώσεις',
    step1Feature5: 'Προτεραιότητα υποστήριξης',
    step1Bonus: 'Αξίας €200/μήνα - Δωρεάν για εσάς!',
    step2Title: 'Δημιουργήστε Εκδηλώσεις',
    step2Subtitle: 'Μοιραστείτε τι συμβαίνει στην επιχείρησή σας',
    step2Feature1: 'Προσθέστε τίτλο, περιγραφή και εικόνα',
    step2Feature2: 'Ορίστε ημερομηνία, ώρα και τοποθεσία',
    step2Feature3: 'Ενεργοποιήστε κρατήσεις αν θέλετε',
    step2Feature4: 'Δημοσιεύστε με ένα κλικ',
    step3Title: 'Διαχειριστείτε Προσφορές',
    step3Subtitle: 'Δημιουργήστε εκπτώσεις με μοναδικούς QR κωδικούς',
    step3Feature1: 'Ορίστε ποσοστό έκπτωσης',
    step3Feature2: 'Κάθε προσφορά έχει μοναδικό QR code',
    step3Feature3: 'Παρακολουθήστε τις εξαργυρώσεις',
    step3Feature4: '10 προσφορές/μήνα χωρίς προμήθεια',
    step4Title: 'Ενισχύστε την Εμβέλειά σας',
    step4Subtitle: 'Ο αλγόριθμός μας στοχεύει ενδιαφερόμενους χρήστες',
    step4Feature1: 'Έξυπνη στόχευση βάσει ενδιαφερόντων',
    step4Feature2: 'Υψηλότερο budget = καλύτερη στόχευση',
    step4Feature3: 'Παρακολουθήστε την απόδοση σε real-time',
    step4Feature4: '€250 budget περιλαμβάνεται στο πλάνο σας',
    step5Title: 'Παρακολουθήστε την Απόδοση',
    step5Subtitle: 'Αναλυτικά στατιστικά για την επιχείρησή σας',
    step5Feature1: 'Προβολές εκδηλώσεων και προσφορών',
    step5Feature2: 'RSVPs και κρατήσεις',
    step5Feature3: 'Δημογραφικά στοιχεία κοινού',
    step5Feature4: 'Εξαγωγή αναφορών σε PDF',
    completeTitle: 'Είστε Έτοιμοι!',
    completeSubtitle: 'Ξεκινήστε να εξερευνάτε το dashboard σας',
  },
  en: {
    skipTour: 'Skip Tour',
    next: 'Next',
    previous: 'Previous',
    startExploring: 'Start Exploring',
    letsGo: "Let's Go!",
    step1Title: 'Welcome to ΦΟΜΟ!',
    step1Subtitle: 'As a beta tester, you have FREE access to our Growth Plan!',
    step1Feature1: '€250 monthly boost budget',
    step1Feature2: '10 commission-free offers',
    step1Feature3: 'Full analytics dashboard',
    step1Feature4: 'Unlimited events',
    step1Feature5: 'Priority support',
    step1Bonus: 'Worth €200/month - Free for you!',
    step2Title: 'Create Events',
    step2Subtitle: 'Share what\'s happening at your business',
    step2Feature1: 'Add title, description and cover image',
    step2Feature2: 'Set date, time and location',
    step2Feature3: 'Enable reservations if you want',
    step2Feature4: 'Publish with one click',
    step3Title: 'Manage Offers',
    step3Subtitle: 'Create discounts with unique QR codes',
    step3Feature1: 'Set discount percentage',
    step3Feature2: 'Each offer gets a unique QR code',
    step3Feature3: 'Track redemptions in real-time',
    step3Feature4: '10 offers/month commission-free',
    step4Title: 'Boost Your Reach',
    step4Subtitle: 'Our algorithm targets interested users',
    step4Feature1: 'Smart targeting based on interests',
    step4Feature2: 'Higher budget = better targeting',
    step4Feature3: 'Track performance in real-time',
    step4Feature4: '€250 budget included in your plan',
    step5Title: 'Track Performance',
    step5Subtitle: 'Detailed analytics for your business',
    step5Feature1: 'Event and offer views',
    step5Feature2: 'RSVPs and reservations',
    step5Feature3: 'Audience demographics',
    step5Feature4: 'Export reports to PDF',
    completeTitle: "You're All Set!",
    completeSubtitle: 'Start exploring your dashboard',
  }
};

const steps = [
  { icon: Gift, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { icon: Ticket, color: 'text-green-500', bg: 'bg-green-500/10' },
  { icon: Zap, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { icon: TrendingUp, color: 'text-rose-500', bg: 'bg-rose-500/10' },
];

export function OnboardingTour({ isOpen, onComplete, language }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const navigate = useNavigate();
  const confetti = useConfetti();
  const t = translations[language];

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    confetti.trigger();
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  const handleSkip = () => {
    onComplete();
  };

  const getStepContent = (step: number) => {
    const stepData = steps[step];
    const Icon = stepData.icon;

    const features = {
      0: [t.step1Feature1, t.step1Feature2, t.step1Feature3, t.step1Feature4, t.step1Feature5],
      1: [t.step2Feature1, t.step2Feature2, t.step2Feature3, t.step2Feature4],
      2: [t.step3Feature1, t.step3Feature2, t.step3Feature3, t.step3Feature4],
      3: [t.step4Feature1, t.step4Feature2, t.step4Feature3, t.step4Feature4],
      4: [t.step5Feature1, t.step5Feature2, t.step5Feature3, t.step5Feature4],
    };

    const titles = [t.step1Title, t.step2Title, t.step3Title, t.step4Title, t.step5Title];
    const subtitles = [t.step1Subtitle, t.step2Subtitle, t.step3Subtitle, t.step4Subtitle, t.step5Subtitle];

    return (
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center text-center px-2"
      >
        <div className={`w-20 h-20 rounded-full ${stepData.bg} flex items-center justify-center mb-6`}>
          <Icon className={`w-10 h-10 ${stepData.color}`} />
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">{titles[step]}</h2>
        <p className="text-muted-foreground mb-6">{subtitles[step]}</p>

        <div className="w-full space-y-3 text-left">
          {features[step as keyof typeof features].map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              <Check className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-sm text-foreground">{feature}</span>
            </motion.div>
          ))}
        </div>

        {step === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 px-4 py-2 bg-primary/10 rounded-full"
          >
            <span className="text-primary font-semibold text-sm">{t.step1Bonus}</span>
          </motion.div>
        )}
      </motion.div>
    );
  };

  return (
    <>
      <Confetti isActive={confetti.isActive} onComplete={confetti.reset} />
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden [&>button]:hidden">
          <div className="relative">
            {/* Skip button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="p-6 pt-12 pb-4">
              <AnimatePresence mode="wait">
                {isCompleting ? (
                  <motion.div
                    key="complete"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center text-center py-8"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', bounce: 0.5 }}
                      className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6"
                    >
                      <Check className="w-10 h-10 text-primary" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">{t.completeTitle}</h2>
                    <p className="text-muted-foreground">{t.completeSubtitle}</p>
                  </motion.div>
                ) : (
                  getStepContent(currentStep)
                )}
              </AnimatePresence>
            </div>

            {/* Progress dots */}
            {!isCompleting && (
              <div className="flex justify-center gap-2 pb-4">
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStep(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentStep 
                        ? 'bg-primary w-6' 
                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Navigation buttons */}
            {!isCompleting && (
              <div className="flex items-center justify-between p-4 border-t">
                <Button
                  variant="ghost"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t.previous}
                </Button>

                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-muted-foreground"
                >
                  {t.skipTour}
                </Button>

                <Button
                  onClick={handleNext}
                  className="gap-1"
                >
                  {currentStep === 4 ? t.letsGo : t.next}
                  {currentStep < 4 && <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
