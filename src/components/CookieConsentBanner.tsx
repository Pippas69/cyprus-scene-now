import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { Cookie, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { safeLocalStorage } from '@/lib/browserStorage';

const COOKIE_CONSENT_KEY = 'fomo-cookie-consent';

const translations = {
  el: {
    title: 'Χρησιμοποιούμε cookies',
    message: 'Τα cookies μάς βοηθούν να βελτιώνουμε την εμπειρία σου στην πλατφόρμα.',
    learnMore: 'Μάθε περισσότερα',
    accept: 'Αποδοχή',
    reject: 'Απόρριψη',
  },
  en: {
    title: 'We use cookies',
    message: 'Cookies help us improve your experience on the platform.',
    learnMore: 'Learn more',
    accept: 'Accept',
    reject: 'Reject',
  },
};

export const CookieConsentBanner = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!safeLocalStorage.getItem(COOKIE_CONSENT_KEY)) setVisible(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleChoice = (value: 'accepted' | 'rejected') => {
    safeLocalStorage.setItem(COOKIE_CONSENT_KEY, value);
    setVisible(false);
  };

  // Stop pointer/mouse/touch events from bubbling out of the banner so that
  // Radix Dialog/Sheet/Popover do NOT treat clicks on the banner buttons as
  // "outside clicks" and accidentally close any open dialog (e.g. reservation
  // or ticket checkout) when the user accepts/closes the cookie notice.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="fixed bottom-4 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[200] pointer-events-auto"
          role="dialog"
          aria-label={t.title}
          onPointerDown={stop}
          onPointerDownCapture={stop}
          onMouseDown={stop}
          onMouseDownCapture={stop}
          onTouchStart={stop}
          onTouchStartCapture={stop}
          onClick={stop}
        >
          <div className="relative bg-card/95 border border-border/60 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <button
              onClick={() => handleChoice('rejected')}
              className="absolute top-2.5 right-2.5 p-1.5 rounded-full text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-4 md:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Cookie className="h-5 w-5" />
                </div>
                <div className="flex-1 pr-6">
                  <h3 className="text-sm font-semibold text-foreground leading-tight">
                    {t.title}
                  </h3>
                  <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                    {t.message}{' '}
                    <Link to="/cookies" className="text-primary hover:underline font-medium">
                      {t.learnMore}
                    </Link>
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleChoice('rejected')}
                  className="flex-1 h-9 text-xs font-semibold rounded-full"
                >
                  {t.reject}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleChoice('accepted')}
                  className="flex-1 h-9 text-xs font-semibold rounded-full"
                >
                  {t.accept}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
