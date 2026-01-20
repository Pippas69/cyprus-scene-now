import { Instagram, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageToggle from "@/components/LanguageToggle";
import { Logo } from "@/components/Logo";

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
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-16">
          {/* Column 1 - Logo & Description */}
          <div className="space-y-4">
            <Logo size="lg" />
            <div className="text-primary-foreground/80 text-sm leading-relaxed space-y-1">
              <p>{t.description}</p>
              <p>{t.descriptionSub}</p>
            </div>
          </div>

          {/* Column 2 - ΦΟΜΟ Links */}
          <div className="space-y-4">
            <h4 className="font-poppins font-semibold text-lg">ΦΟΜΟ</h4>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/feed" 
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
                >
                  {t.explore}
                </Link>
              </li>
              <li>
                <Link 
                  to="/for-visitors" 
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
                >
                  {t.forVisitors}
                </Link>
              </li>
              <li>
                <Link 
                  to="/for-businesses" 
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
                >
                  {t.forBusiness}
                </Link>
              </li>
              <li>
                <Link 
                  to="/blog" 
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
                >
                  {t.blog}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 - Terms & Policies */}
          <div className="space-y-4">
            <h4 className="font-poppins font-semibold text-lg">{t.termsTitle}</h4>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/terms" 
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
                >
                  {t.termsOfUse}
                </Link>
              </li>
              <li>
                <Link 
                  to="/privacy" 
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
                >
                  {t.privacyPolicy}
                </Link>
              </li>
              <li>
                <Link 
                  to="/cookies" 
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
                >
                  {t.cookies}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4 - Contact */}
          <div className="space-y-4">
            <h4 className="font-poppins font-semibold text-lg">{t.contactTitle}</h4>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/contact" 
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
                >
                  {t.contact}
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:hello@fomo.cy" 
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
                >
                  hello@fomo.cy
                </a>
              </li>
            </ul>
            <div className="flex gap-3 pt-2">
              <a
                href="https://instagram.com/fomo.cy"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  window.open("https://instagram.com/fomo.cy", "_blank", "noopener,noreferrer");
                }}
                className="w-9 h-9 bg-primary-foreground/10 rounded-full flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://tiktok.com/@fomo.cy"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-primary-foreground/10 rounded-full flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                aria-label="TikTok"
              >
                <TikTokIcon className="w-4 h-4" />
              </a>
              <a
                href="mailto:hello@fomo.cy"
                className="w-9 h-9 bg-primary-foreground/10 rounded-full flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-foreground/20 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-sm text-primary-foreground/70">
            <span>{t.rights}</span>
            <span className="hidden sm:inline">•</span>
            <span>{t.madeWith} ❤️ {t.inCyprus}</span>
            <span className="hidden sm:inline">•</span>
            <span>{t.liveNow}</span>
          </div>
          <LanguageToggle />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
