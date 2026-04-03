import { Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageToggle from "@/components/LanguageToggle";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const InfoNavbar = () => {
  const { language } = useLanguage();
  const location = useLocation();
  const [signupDropdownOpen, setSignupDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const text = {
    el: {
      explore: "Εξερεύνηση",
      visitors: "Επισκέπτες",
      businesses: "Επιχειρήσεις",
      signup: "Εγγραφή",
      signupFomo: "Εγγραφή στο FOMO",
      signupBusiness: "Εγγραφή ως Επιχείρηση",
      login: "Σύνδεση",
    },
    en: {
      explore: "Explore",
      visitors: "Visitors",
      businesses: "Businesses",
      signup: "Sign Up",
      signupFomo: "Sign up to FOMO",
      signupBusiness: "Sign up as Business",
      login: "Login",
    },
  };

  const t = text[language];

  const navLinks = [
    { href: "/feed", label: t.explore },
    { href: "/for-visitors", label: t.visitors },
    { href: "/for-businesses", label: t.businesses },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSignupDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a2e52]/95 backdrop-blur-lg border-b border-white/[0.06]">
      <div className="w-full px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo Badge */}
          <Link to="/" className="flex-shrink-0">
            <Logo size="sm" />
          </Link>

          {/* Desktop/Tablet Nav Links (md+) */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="relative px-3 lg:px-4 py-2 text-sm font-medium transition-colors hover:text-white group"
              >
                <span className={isActive(link.href) ? "text-white" : "text-white/60"}>
                  {link.label}
                </span>
                {/* Active underline */}
                {isActive(link.href) && (
                  <motion.div
                    layoutId="navbar-active"
                    className="absolute bottom-0 left-3 right-3 lg:left-4 lg:right-4 h-[2px] bg-[#4ECDC4] rounded-full"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </Link>
            ))}

            {/* Εγγραφή with dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setSignupDropdownOpen(!signupDropdownOpen)}
                className="relative flex items-center gap-1 px-3 lg:px-4 py-2 text-sm font-medium transition-colors hover:text-white group"
              >
                <span className={
                  isActive("/signup") || isActive("/signup-business")
                    ? "text-white"
                    : "text-white/60"
                }>
                  {t.signup}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${signupDropdownOpen ? "rotate-180" : ""} ${
                  isActive("/signup") || isActive("/signup-business") ? "text-white" : "text-white/60"
                }`} />
                {(isActive("/signup") || isActive("/signup-business")) && (
                  <motion.div
                    layoutId="navbar-active"
                    className="absolute bottom-0 left-3 right-3 lg:left-4 lg:right-4 h-[2px] bg-[#4ECDC4] rounded-full"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
              <AnimatePresence>
                {signupDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-1 min-w-[220px] bg-[#0a2e52] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
                  >
                    <Link
                      to="/signup"
                      onClick={() => setSignupDropdownOpen(false)}
                      className="block px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      {t.signupFomo}
                    </Link>
                    <Link
                      to="/signup-business"
                      onClick={() => setSignupDropdownOpen(false)}
                      className="block px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      {t.signupBusiness}
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Σύνδεση */}
            <Link
              to="/login"
              className="relative px-3 lg:px-4 py-2 text-sm font-medium transition-colors hover:text-white group"
            >
              <span className={isActive("/login") ? "text-white" : "text-white/60"}>
                {t.login}
              </span>
              {isActive("/login") && (
                <motion.div
                  layoutId="navbar-active"
                  className="absolute bottom-0 left-3 right-3 lg:left-4 lg:right-4 h-[2px] bg-[#4ECDC4] rounded-full"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </Link>
          </div>

          {/* Desktop/Tablet Right Side: Language Toggle */}
          <div className="hidden md:flex items-center">
            <LanguageToggle />
          </div>

          {/* Mobile Layout (< md) */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              to="/feed"
              className="text-xs font-medium text-white/60 hover:text-white transition-colors"
            >
              {t.explore}
            </Link>

            {/* Mobile Εγγραφή badge that opens dropdown */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="px-3 py-1.5 rounded-full bg-gradient-ocean text-white text-xs font-semibold whitespace-nowrap shadow-sm hover:opacity-90 transition-opacity"
            >
              {t.signup}
            </button>

            <LanguageToggle />
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#0a2e52] border-t border-white/[0.06]"
          >
            <div className="px-4 py-3 space-y-1">
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2.5 px-3 text-sm text-white/80 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
              >
                {t.signupFomo}
              </Link>
              <Link
                to="/signup-business"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2.5 px-3 text-sm text-white/80 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
              >
                {t.signupBusiness}
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2.5 px-3 text-sm text-white/80 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
              >
                {t.login}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default InfoNavbar;
