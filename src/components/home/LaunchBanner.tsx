import { motion } from "framer-motion";
import { Instagram, X } from "lucide-react";
import { useState, useEffect } from "react";

interface LaunchBannerProps {
  language: "el" | "en";
}

const LaunchBanner = ({ language }: LaunchBannerProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem("launch-banner-dismissed");
    if (dismissed) setIsVisible(false);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("launch-banner-dismissed", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const text = {
    el: {
      welcome: "Καλώς ήρθατε από το Instagram!",
      message: "Ανακαλύψτε τις καλύτερες εκδηλώσεις στην Κύπρο",
    },
    en: {
      welcome: "Welcome from Instagram!",
      message: "Discover the best events in Cyprus",
    },
  };

  const t = text[language];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative bg-gradient-to-r from-aegean via-ocean to-seafoam text-white py-3 px-4"
    >
      <div className="container mx-auto flex items-center justify-center gap-3 text-center">
        <Instagram className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm md:text-base font-medium">
          <span className="font-semibold">{t.welcome}</span>{" "}
          <span className="opacity-90">{t.message}</span>
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
};

export default LaunchBanner;
