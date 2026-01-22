import { Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageToggle from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const InfoNavbar = () => {
  const { language } = useLanguage();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const text = {
    el: {
      home: "Αρχική",
      explore: "Εξερεύνηση",
      blog: "Blog",
      contact: "Επικοινωνία",
      login: "Σύνδεση",
      getStarted: "Ξεκίνα Τώρα",
    },
    en: {
      home: "Home",
      explore: "Explore",
      blog: "Blog",
      contact: "Contact",
      login: "Login",
      getStarted: "Get Started",
    },
  };

  const t = text[language];

  // Desktop nav links
  const desktopNavLinks = [
    { href: "/", label: t.home },
    { href: "/feed", label: t.explore },
    { href: "/blog", label: t.blog },
    { href: "/contact", label: t.contact },
  ];

  // Tablet nav links (different from desktop)
  const tabletNavLinks = [
    { href: "/", label: t.home },
    { href: "/feed", label: t.explore },
    { href: "/for-visitors", label: language === "el" ? "Επισκέπτες" : "Visitors" },
    { href: "/for-businesses", label: language === "el" ? "Επιχειρήσεις" : "Businesses" },
  ];

  // Mobile nav links (same as desktop)
  const mobileNavLinks = desktopNavLinks;

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/">
            <Logo size="md" />
          </Link>

          {/* Tablet Navigation (md to lg) - Different links */}
          <div className="hidden md:flex lg:hidden items-center gap-4 ml-4">
            {tabletNavLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary whitespace-nowrap ${
                  isActive(link.href)
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Navigation (lg+) */}
          <div className="hidden lg:flex items-center gap-8">
            {desktopNavLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive(link.href)
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Tablet Right Side (md to lg) - Language toggle + hamburger */}
          <div className="hidden md:flex lg:hidden items-center gap-3">
            <LanguageToggle />
            <button
              className="p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Desktop Right Side (lg+) */}
          <div className="hidden lg:flex items-center gap-4">
            <LanguageToggle />
            <Link to="/login">
              <Button variant="ghost" size="sm">
                {t.login}
              </Button>
            </Link>
            <Link to="/signup-business">
              <Button size="sm" className="bg-primary hover:bg-primary/90 whitespace-nowrap flex-shrink-0">
                {t.getStarted}
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {/* Mobile Menu (< md) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-background border-b border-border"
          >
            <div className="container mx-auto px-4 py-4 space-y-4">
              {mobileNavLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2 text-sm font-medium ${
                    isActive(link.href)
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <LanguageToggle />

                <Link to="/login" className="shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-3 whitespace-nowrap"
                  >
                    {t.login}
                  </Button>
                </Link>

                <Link to="/signup-business" className="flex-1 min-w-0">
                  <Button
                    size="sm"
                    className="w-full px-3 whitespace-normal leading-tight h-auto py-2"
                  >
                    {t.getStarted}
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default InfoNavbar;
