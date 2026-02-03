import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    previous: 'Πίσω',
    letsGo: 'Πάμε!',
    step1Title: 'Καλώς ήρθατε στο ΦΟΜΟ!',
    step1Subtitle: 'ΔΩΡΕΑΝ πρόσβαση στο Elite Plan!',
    step1Feature1: '€300 boost budget/μήνα',
    step1Feature2: '10 προσφορές χωρίς προμήθεια',
    step1Feature3: 'Πλήρη analytics',
    step1Feature4: 'Απεριόριστες εκδηλώσεις',
    step1Bonus: 'Αξίας €339.99/μήνα - Δωρεάν!',
    step2Title: 'Εκδηλώσεις',
    step2Subtitle: 'Δημοσιεύστε εύκολα',
    step2Feature1: 'Τίτλος, περιγραφή, εικόνα',
    step2Feature2: 'Ημερομηνία & τοποθεσία',
    step2Feature3: 'Κρατήσεις (προαιρετικά)',
    step2Feature4: 'Δημοσίευση με 1 κλικ',
    step3Title: 'Προσφορές',
    step3Subtitle: 'Με μοναδικό QR code',
    step3Feature1: 'Ορίστε έκπτωση',
    step3Feature2: 'Μοναδικό QR ανά προσφορά',
    step3Feature3: 'Παρακολούθηση εξαργυρώσεων',
    step3Feature4: '10 χωρίς προμήθεια/μήνα',
    step4Title: 'Boost',
    step4Subtitle: 'Στοχευμένη προβολή',
    step4Feature1: 'Έξυπνη στόχευση',
    step4Feature2: 'Real-time απόδοση',
    step4Feature3: '€300 budget στο πλάνο',
    step4Feature4: 'Μέγιστη εμβέλεια',
    step5Title: 'Analytics',
    step5Subtitle: 'Πλήρη στατιστικά',
    step5Feature1: 'Προβολές & RSVPs',
    step5Feature2: 'Κρατήσεις',
    step5Feature3: 'Δημογραφικά κοινού',
    step5Feature4: 'Εξαγωγή PDF',
    completeTitle: 'Έτοιμοι!',
    completeSubtitle: 'Εξερευνήστε το dashboard',
  },
  en: {
    skipTour: 'Skip',
    next: 'Next',
    previous: 'Back',
    letsGo: "Let's Go!",
    step1Title: 'Welcome to ΦΟΜΟ!',
    step1Subtitle: 'FREE access to Elite Plan!',
    step1Feature1: '€300 boost budget/month',
    step1Feature2: '10 commission-free offers',
    step1Feature3: 'Full analytics',
    step1Feature4: 'Unlimited events',
    step1Bonus: 'Worth €339.99/month - Free!',
    step2Title: 'Events',
    step2Subtitle: 'Publish easily',
    step2Feature1: 'Title, description, image',
    step2Feature2: 'Date & location',
    step2Feature3: 'Reservations (optional)',
    step2Feature4: 'Publish with 1 click',
    step3Title: 'Offers',
    step3Subtitle: 'With unique QR code',
    step3Feature1: 'Set discount',
    step3Feature2: 'Unique QR per offer',
    step3Feature3: 'Track redemptions',
    step3Feature4: '10 commission-free/month',
    step4Title: 'Boost',
    step4Subtitle: 'Targeted reach',
    step4Feature1: 'Smart targeting',
    step4Feature2: 'Real-time performance',
    step4Feature3: '€300 budget included',
    step4Feature4: 'Maximum reach',
    step5Title: 'Analytics',
    step5Subtitle: 'Full statistics',
    step5Feature1: 'Views & RSVPs',
    step5Feature2: 'Reservations',
    step5Feature3: 'Audience demographics',
    step5Feature4: 'Export to PDF',
    completeTitle: 'Ready!',
    completeSubtitle: 'Explore your dashboard',
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
      0: [t.step1Feature1, t.step1Feature2, t.step1Feature3, t.step1Feature4],
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
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center text-center"
      >
        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full ${stepData.bg} flex items-center justify-center mb-3`}>
          <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${stepData.color}`} />
        </div>

        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1">{titles[step]}</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mb-3">{subtitles[step]}</p>

        <div className="w-full space-y-1.5">
          {features[step as keyof typeof features].map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted/50"
            >
              <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="text-xs text-foreground text-left">{feature}</span>
            </motion.div>
          ))}
        </div>

        {step === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-3 px-3 py-1.5 bg-primary/10 rounded-full"
          >
            <span className="text-primary font-semibold text-xs">{t.step1Bonus}</span>
          </motion.div>
        )}
      </motion.div>
    );
  };

  return (
    <>
      <Confetti isActive={confetti.isActive} onComplete={confetti.reset} />
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-[90vw] sm:max-w-sm p-0 overflow-hidden [&>button]:hidden">
          <div className="relative">
            {/* Skip button */}
            <button
              onClick={handleSkip}
              className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground transition-colors z-10 p-1"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="px-4 pt-8 pb-3">
              <AnimatePresence mode="wait">
                {isCompleting ? (
                  <motion.div
                    key="complete"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center text-center py-6"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', bounce: 0.5 }}
                      className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4"
                    >
                      <Check className="w-7 h-7 text-primary" />
                    </motion.div>
                    <h2 className="text-xl font-bold text-foreground mb-1">{t.completeTitle}</h2>
                    <p className="text-sm text-muted-foreground">{t.completeSubtitle}</p>
                  </motion.div>
                ) : (
                  getStepContent(currentStep)
                )}
              </AnimatePresence>
            </div>

            {/* Progress dots */}
            {!isCompleting && (
              <div className="flex justify-center gap-1.5 pb-2.5">
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStep(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentStep 
                        ? 'bg-primary w-4' 
                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/50 w-1.5'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Navigation buttons */}
            {!isCompleting && (
              <div className="flex items-center justify-between px-3 py-2.5 border-t bg-muted/30">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="gap-0.5 h-8 px-2 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  {t.previous}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-muted-foreground h-8 px-2 text-xs"
                >
                  {t.skipTour}
                </Button>

                <Button
                  size="sm"
                  onClick={handleNext}
                  className="gap-0.5 h-8 px-3 text-xs"
                >
                  {currentStep === 4 ? t.letsGo : t.next}
                  {currentStep < 4 && <ChevronRight className="w-3.5 h-3.5" />}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
