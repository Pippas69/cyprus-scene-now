import { Instagram, Facebook, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageToggle from "@/components/LanguageToggle";
import { Logo } from "@/components/Logo";

const Footer = () => {
  const { language } = useLanguage();

  const text = {
    el: {
      tagline: "Ζήσε το τώρα. Ανακάλυψε τι συμβαίνει στην Κύπρο, ζωντανά.",
      explore: "Εξερεύνηση",
      events: "Εκδηλώσεις",
      discounts: "Εκπτώσεις",
      map: "Χάρτης",
      blog: "Blog",
      connect: "Επικοινωνία",
      forBusiness: "Για Επιχειρήσεις",
      madeWith: "Φτιαγμένο με",
      inCyprus: "στην Κύπρο",
      rights: "© 2025 ΦΟΜΟ. Όλα τα δικαιώματα διατηρούνται.",
    },
    en: {
      tagline: "Live the moment. Discover what's happening in Cyprus, live.",
      explore: "Explore",
      events: "Events",
      discounts: "Discounts",
      map: "Map",
      blog: "Blog",
      connect: "Connect",
      forBusiness: "For Businesses",
      madeWith: "Made with",
      inCyprus: "in Cyprus",
      rights: "© 2025 ΦΟΜΟ. All rights reserved.",
    },
  };

  const t = text[language];

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Column 1 - ΦΟΜΟ */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Logo size="lg" />
            <p className="text-primary-foreground/80 text-sm leading-relaxed">
              {t.tagline}
            </p>
          </div>

          {/* Column 2 - Explore */}
          <div className="space-y-4">
            <h4 className="font-poppins font-semibold text-lg">{t.explore}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/feed" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm">
                  {t.events}
                </Link>
              </li>
              <li>
                <Link to="/feed" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm">
                  {t.discounts}
                </Link>
              </li>
              <li>
                <Link to="/xartis" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm">
                  {t.map}
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm">
                  {t.blog}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 - Business */}
          <div className="space-y-4">
            <h4 className="font-poppins font-semibold text-lg">{t.forBusiness}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/features" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm">
                  {language === "el" ? "Χαρακτηριστικά" : "Features"}
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm">
                  {language === "el" ? "Τιμοκατάλογος" : "Pricing"}
                </Link>
              </li>
              <li>
                <Link to="/signup-business" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm">
                  {language === "el" ? "Εγγραφή" : "Sign Up"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4 - Connect */}
          <div className="space-y-4">
            <h4 className="font-poppins font-semibold text-lg">{t.connect}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/contact" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm">
                  {language === "el" ? "Επικοινωνία" : "Contact Us"}
                </Link>
              </li>
              <li>
                <a href="mailto:hello@fomo.cy" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm">
                  hello@fomo.cy
                </a>
              </li>
            </ul>
            <div className="flex gap-3 pt-2">
              <a
                href="#"
                className="w-8 h-8 bg-primary-foreground/10 rounded-full flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 bg-primary-foreground/10 rounded-full flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="mailto:hello@fomo.cy"
                className="w-8 h-8 bg-primary-foreground/10 rounded-full flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-foreground/20 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-sm text-primary-foreground/70">
            <p>{t.rights}</p>
            <span className="hidden sm:inline">•</span>
            <p>{t.madeWith} ❤️ {t.inCyprus}</p>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center gap-3">
              <Link to="/privacy" className="hover:text-primary-foreground transition-colors">
                {language === "el" ? "Απόρρητο" : "Privacy"}
              </Link>
              <span>•</span>
              <Link to="/terms" className="hover:text-primary-foreground transition-colors">
                {language === "el" ? "Όροι" : "Terms"}
              </Link>
            </div>
          </div>
          <LanguageToggle />
        </div>
      </div>
    </footer>
  );
};

export default Footer;