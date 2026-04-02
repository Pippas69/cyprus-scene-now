import { Instagram, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageToggle from "@/components/LanguageToggle";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const SocialIcons = () => (
  <div className="flex gap-2">
    {[
      { href: "https://instagram.com/fomo.cy", icon: <Instagram className="w-3.5 h-3.5 text-aegean" />, label: "Instagram" },
      { href: "https://tiktok.com/@fomo.cy", icon: <TikTokIcon className="w-3.5 h-3.5 text-aegean" />, label: "TikTok" },
      { href: "mailto:support@fomocy.com", icon: <Mail className="w-3.5 h-3.5 text-aegean" />, label: "Email" },
    ].map((s) => (
      <a
        key={s.label}
        href={s.href}
        target={s.href.startsWith("http") ? "_blank" : undefined}
        rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
        className="w-7 h-7 sm:w-8 sm:h-8 bg-seafoam rounded-full flex items-center justify-center hover:bg-seafoam/80 transition-all duration-300 hover:scale-105"
        aria-label={s.label}
      >
        {s.icon}
      </a>
    ))}
  </div>
);

const Footer = () => {
  const { language } = useLanguage();

  const text = {
    el: {
      explore: "Εξερεύνηση",
      visitors: "Επισκέπτες",
      businesses: "Επιχειρήσεις",
      legalTitle: "ΝΟΜΙΚΑ",
      termsOfUse: "Όροι Χρήσης",
      privacyPolicy: "Πολιτική Απορρήτου",
      privacyPolicyMobile: "Πολιτική Απορ.",
      licenseAgreement: "Άδεια Χρήσης",
      cookies: "Cookies",
      supportTitle: "ΥΠΟΣΤΗΡΙΞΗ",
      contact: "Επικοινωνία",
      bookDemo: "Book a Demo",
      madeWith: "Φτιαγμένο με",
      inCyprus: "στην Κύπρο",
      rights: "© 2026 ΦΟΜΟ. Όλα τα δικαιώματα διατηρούνται.",
    },
    en: {
      explore: "Explore",
      visitors: "Visitors",
      businesses: "Businesses",
      legalTitle: "LEGAL",
      termsOfUse: "Terms of Use",
      privacyPolicy: "Privacy Policy",
      privacyPolicyMobile: "Privacy Policy",
      licenseAgreement: "License Agreement",
      cookies: "Cookies",
      supportTitle: "SUPPORT",
      contact: "Contact",
      bookDemo: "Book a Demo",
      madeWith: "Made with",
      inCyprus: "in Cyprus",
      rights: "© 2026 ΦΟΜΟ. All rights reserved.",
    },
  };

  const t = text[language];

  return (
    <footer className="bg-background border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-10 md:py-12">
        {/* 3 Columns — always */}
        <div className="grid grid-cols-3 gap-4 sm:gap-6 lg:gap-16">
          {/* Column 1 — ΦΟΜΟ */}
          <div className="space-y-2 sm:space-y-3">
            <h4 className="font-cinzel font-bold text-[9px] sm:text-xs lg:text-sm text-white uppercase tracking-wider">ΦΟΜΟ</h4>
            <ul className="space-y-1 sm:space-y-1.5">
              <li>
                <Link to="/feed" className="text-white/40 hover:text-seafoam transition-colors text-[9px] sm:text-xs lg:text-sm">
                  {t.explore}
                </Link>
              </li>
              <li>
                <Link to="/for-visitors" className="text-white/40 hover:text-seafoam transition-colors text-[9px] sm:text-xs lg:text-sm">
                  {t.visitors}
                </Link>
              </li>
              <li>
                <Link to="/for-businesses" className="text-white/40 hover:text-seafoam transition-colors text-[9px] sm:text-xs lg:text-sm">
                  {t.businesses}
                </Link>
              </li>
            </ul>
            <div className="pt-1 sm:pt-2">
              <SocialIcons />
            </div>
          </div>

          {/* Column 2 — ΝΟΜΙΚΑ */}
          <div className="space-y-2 sm:space-y-3">
             <h4 className="font-poppins font-bold text-[9px] sm:text-xs lg:text-sm text-white uppercase tracking-wider">
              {t.legalTitle}
            </h4>
            <ul className="space-y-1 sm:space-y-1.5">
              <li>
                <Link to="/terms" className="text-white/40 hover:text-seafoam transition-colors text-[9px] sm:text-xs lg:text-sm">
                  {t.termsOfUse}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-white/40 hover:text-seafoam transition-colors text-[9px] sm:text-xs lg:text-sm">
                  <span className="sm:hidden">{t.privacyPolicyMobile}</span>
                  <span className="hidden sm:inline">{t.privacyPolicy}</span>
                </Link>
              </li>
              <li>
                <Link to="/license" className="text-white/40 hover:text-seafoam transition-colors text-[11px] sm:text-xs lg:text-sm">
                  {t.licenseAgreement}
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-white/40 hover:text-seafoam transition-colors text-[11px] sm:text-xs lg:text-sm">
                  {t.cookies}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 — ΥΠΟΣΤΗΡΙΞΗ */}
          <div className="space-y-2 sm:space-y-3">
            <h4 className="font-poppins font-bold text-[11px] sm:text-xs lg:text-sm text-white uppercase tracking-wider">
              {t.supportTitle}
            </h4>
            <ul className="space-y-1 sm:space-y-1.5">
              <li>
                <Link to="/contact" className="text-white/40 hover:text-seafoam transition-colors text-[11px] sm:text-xs lg:text-sm">
                  {t.contact}
                </Link>
              </li>
              <li>
                <Link to="/book-demo" className="text-white/40 hover:text-seafoam transition-colors text-[11px] sm:text-xs lg:text-sm">
                  {t.bookDemo}
                </Link>
              </li>
              <li>
                <a href="mailto:support@fomocy.com" className="text-white/40 hover:text-seafoam transition-colors text-[11px] sm:text-xs lg:text-sm">
                  <span className="sm:hidden">support@fomocy</span>
                  <span className="hidden sm:inline">support@fomocy.com</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 mt-6 sm:mt-8 md:mt-10 pt-4 sm:pt-5 md:pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-[10px] sm:text-xs md:text-sm text-white/30">
            <span>{t.rights}</span>
            <span className="hidden sm:inline">•</span>
            <span>{t.madeWith} ❤️ {t.inCyprus}</span>
          </div>
          <LanguageToggle />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
