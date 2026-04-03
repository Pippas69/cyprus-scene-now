import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { Cookie, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const COOKIE_CONSENT_KEY = 'fomo-cookie-consent';

const translations = {
  el: {
    message: 'Χρησιμοποιούμε cookies για τη σωστή λειτουργία της πλατφόρμας.',
    learnMore: 'Μάθετε περισσότερα',
    accept: 'Αποδοχή',
  },
  en: {
    message: 'We use cookies to ensure the proper functioning of the platform.',
    learnMore: 'Learn more',
    accept: 'Accept',
  },
};

export const CookieConsentBanner = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Small delay so it doesn't flash on load
    const timer = setTimeout(() => {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!consent) {
        setVisible(true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[100]"
        >
          <div className="bg-card border border-border/60 rounded-2xl shadow-premium p-4 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <Cookie className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-relaxed">
                  {t.message}{' '}
                  <Link
                    to="/cookies"
                    className="text-primary hover:underline font-medium"
                  >
                    {t.learnMore}
                  </Link>
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleAccept}
                    className="h-8 px-5 text-xs font-semibold rounded-full"
                  >
                    {t.accept}
                  </Button>
                  <button
                    onClick={handleAccept}
                    className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
