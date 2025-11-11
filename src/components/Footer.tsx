import { Instagram, Facebook, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FooterProps {
  language: "el" | "en";
  onLanguageToggle: (lang: "el" | "en") => void;
}

const Footer = ({ language, onLanguageToggle }: FooterProps) => {
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Column 1 - ΦΟΜΟ */}
          <div className="space-y-4">
            <h3 className="font-urbanist text-4xl font-black">ΦΟΜΟ</h3>
            <p className="text-primary-foreground/80 text-sm leading-relaxed">
              {t.tagline}
            </p>
            <p className="text-primary-foreground/60 text-xs">{t.rights}</p>
          </div>

          {/* Column 2 - Explore */}
          <div className="space-y-4">
            <h4 className="font-poppins font-semibold text-lg">{t.explore}</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="/feed"
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
                >
                  {t.events}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
                >
                  {t.discounts}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
                >
                  {t.map}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
                >
                  {t.blog}
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3 - Connect */}
          <div className="space-y-4">
            <h4 className="font-poppins font-semibold text-lg">{t.connect}</h4>
            <div className="flex gap-3">
              <a
                href="#"
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="mailto:hello@fomo.cy"
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
            <div className="pt-2">
              <a
                href="#"
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm underline"
              >
                {t.forBusiness}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-foreground/20 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-primary-foreground/70 text-sm">
            {t.madeWith} ❤️ {t.inCyprus}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={language === "el" ? "secondary" : "ghost"}
              onClick={() => onLanguageToggle("el")}
              className="text-xs"
            >
              🇬🇷 ΕΛ
            </Button>
            <Button
              size="sm"
              variant={language === "en" ? "secondary" : "ghost"}
              onClick={() => onLanguageToggle("en")}
              className="text-xs"
            >
              🇬🇧 EN
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
