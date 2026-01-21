import { Instagram, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageToggle from "@/components/LanguageToggle";

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

// ΦΟΜΟ Logo for Footer
const FooterLogo = () => (
  <div className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-seafoam to-aegean">
    <span className="font-cinzel text-2xl font-bold text-white tracking-wider">ΦΟΜΟ</span>
  </div>
);

const Footer = () => {
  const { language } = useLanguage();

  const text = {
    el: {
      description: "Ανακάλυψε τι συμβαίνει στην Κύπρο, ζωντανά.",
      descriptionSub: "Ο απόλυτος οδηγός για νυχτερινή ζωή, φαγητό & αποκλειστικά events.",
      explore: "Εξερεύνηση",
      forVisitors: "Για Επισκέπτες",
      forBusiness: "Για Επιχειρήσεις",
      blog: "Blog",
      termsTitle: "Όροι & Πολιτικές",
      termsOfUse: "Όροι Χρήσης",
      privacyPolicy: "Πολιτική Απορρήτου",
      cookies: "Cookies",
      contactTitle: "Επικοινωνία",
      contact: "Επικοινωνία",
      madeWith: "Φτιαγμένο με",
      inCyprus: "στην Κύπρο",
      liveNow: "Ζήσε το τώρα",
      rights: "© 2026 ΦΟΜΟ. Όλα τα δικαιώματα διατηρούνται.",
    },
    en: {
      description: "Discover what's happening in Cyprus, live.",
      descriptionSub: "The ultimate guide to nightlife, food & exclusive events.",
      explore: "Explore",
      forVisitors: "For Visitors",
      forBusiness: "For Businesses",
      blog: "Blog",
      termsTitle: "Terms & Policies",
      termsOfUse: "Terms of Use",
      privacyPolicy: "Privacy Policy",
      cookies: "Cookies",
      contactTitle: "Contact",
      contact: "Contact",
      madeWith: "Made with",
      inCyprus: "in Cyprus",
      liveNow: "Live it now",
      rights: "© 2026 ΦΟΜΟ. All rights reserved.",
    },
  };

  const t = text[language];

  return (
    <footer className="bg-gradient-to-b from-[#4dd4c4] via-[#45c8c0] to-[#3bbcb8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-10 md:py-12">
        {/* Mobile: 2x2 grid, Desktop: 4 columns */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-16">
          {/* Column 1 - Logo & Description */}
          <div className="space-y-3 sm:space-y-4">
            <div className="inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-seafoam to-aegean">
              <span className="font-cinzel text-lg sm:text-xl md:text-2xl font-bold text-white tracking-wider">ΦΟΜΟ</span>
            </div>
            <div className="text-[#0d3b4a] text-xs sm:text-sm leading-relaxed space-y-1">
              <p>{t.description}</p>
              <p className="hidden sm:block">{t.descriptionSub}</p>
            </div>
          </div>

          {/* Column 2 - ΦΟΜΟ Links */}
          <div className="space-y-2 sm:space-y-3">
            <h4 className="font-poppins font-semibold text-sm sm:text-base lg:text-lg text-white">ΦΟΜΟ</h4>
            <ul className="space-y-1 sm:space-y-1.5">
              <li>
                <Link 
                  to="/feed" 
                  className="text-[#0d3b4a] hover:text-[#1a5a6a] transition-colors text-xs sm:text-sm"
                >
                  {t.explore}
                </Link>
              </li>
              <li>
                <Link 
                  to="/for-visitors" 
                  className="text-[#0d3b4a] hover:text-[#1a5a6a] transition-colors text-xs sm:text-sm"
                >
                  {t.forVisitors}
                </Link>
              </li>
              <li>
                <Link 
                  to="/for-businesses" 
                  className="text-[#0d3b4a] hover:text-[#1a5a6a] transition-colors text-xs sm:text-sm"
                >
                  {t.forBusiness}
                </Link>
              </li>
              <li>
                <Link 
                  to="/blog" 
                  className="text-[#0d3b4a] hover:text-[#1a5a6a] transition-colors text-xs sm:text-sm"
                >
                  {t.blog}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 - Terms & Policies */}
          <div className="space-y-2 sm:space-y-3">
            <h4 className="font-poppins font-semibold text-sm sm:text-base lg:text-lg text-white">{t.termsTitle}</h4>
            <ul className="space-y-1 sm:space-y-1.5">
              <li>
                <Link 
                  to="/terms" 
                  className="text-[#0d3b4a] hover:text-[#1a5a6a] transition-colors text-xs sm:text-sm"
                >
                  {t.termsOfUse}
                </Link>
              </li>
              <li>
                <Link 
                  to="/privacy" 
                  className="text-[#0d3b4a] hover:text-[#1a5a6a] transition-colors text-xs sm:text-sm"
                >
                  {t.privacyPolicy}
                </Link>
              </li>
              <li>
                <Link 
                  to="/cookies" 
                  className="text-[#0d3b4a] hover:text-[#1a5a6a] transition-colors text-xs sm:text-sm"
                >
                  {t.cookies}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4 - Contact */}
          <div className="space-y-2 sm:space-y-3">
            <h4 className="font-poppins font-semibold text-sm sm:text-base lg:text-lg text-white">{t.contactTitle}</h4>
            <ul className="space-y-1 sm:space-y-1.5">
              <li>
                <Link 
                  to="/contact" 
                  className="text-[#0d3b4a] hover:text-[#1a5a6a] transition-colors text-xs sm:text-sm"
                >
                  {t.contact}
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:hello@fomo.cy" 
                  className="text-[#0d3b4a] hover:text-[#1a5a6a] transition-colors text-xs sm:text-sm"
                >
                  hello@fomo.cy
                </a>
              </li>
            </ul>
            {/* Social Icons */}
            <div className="flex gap-1.5 sm:gap-2 pt-1">
              <a
                href="https://instagram.com/fomo.cy"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  window.open("https://instagram.com/fomo.cy", "_blank", "noopener,noreferrer");
                }}
                className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-gradient-to-r from-seafoam to-aegean rounded-full flex items-center justify-center hover:opacity-90 transition-all duration-300 hover:scale-105 shadow-md"
                aria-label="Instagram"
              >
                <Instagram className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
              </a>
              <a
                href="https://tiktok.com/@fomo.cy"
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-gradient-to-r from-seafoam to-aegean rounded-full flex items-center justify-center hover:opacity-90 transition-all duration-300 hover:scale-105 shadow-md"
                aria-label="TikTok"
              >
                <TikTokIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
              </a>
              <a
                href="mailto:hello@fomo.cy"
                className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-gradient-to-r from-seafoam to-aegean rounded-full flex items-center justify-center hover:opacity-90 transition-all duration-300 hover:scale-105 shadow-md"
                aria-label="Email"
              >
                <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#0d3b4a]/20 mt-6 sm:mt-8 md:mt-10 pt-4 sm:pt-5 md:pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-1.5 sm:gap-x-2 gap-y-1 text-[10px] sm:text-xs md:text-sm text-[#0d3b4a]">
            <span>{t.rights}</span>
            <span className="hidden sm:inline">•</span>
            <span>{t.madeWith} ❤️ {t.inCyprus}</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">{t.liveNow}</span>
          </div>
          <LanguageToggle />
        </div>
      </div>
    </footer>
  );
};

export default Footer;