import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { safeLocalStorage } from '@/lib/browserStorage';

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
    const timer = setTimeout(() => {
      if (!safeLocalStorage.getItem(COOKIE_CONSENT_KEY)) setVisible(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    safeLocalStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="fixed bottom-[4.5rem] md:bottom-4 left-3 right-3 md:left-auto md:right-4 md:max-w-sm z-[100]"
        >
          <div className="bg-card/95 border border-border/40 rounded-xl shadow-lg px-3.5 py-2.5 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <p className="flex-1 text-[11px] leading-[1.4] text-muted-foreground">
                {t.message}{' '}
                <Link to="/cookies" className="text-primary hover:underline font-medium">
                  {t.learnMore}
                </Link>
              </p>
              <Button
                size="sm"
                onClick={handleAccept}
                className="h-6 px-3 text-[10px] font-semibold rounded-full shrink-0"
              >
                {t.accept}
              </Button>
              <button
                onClick={handleAccept}
                className="p-1 rounded-full text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
