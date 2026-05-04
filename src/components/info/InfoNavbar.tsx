import { Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageToggle from "@/components/LanguageToggle";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const InfoNavbar = () => {
  const { language } = useLanguage();
  const location = useLocation();
  const [signupDropdownOpen, setSignupDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const text = {
    el: {
      explore: "Εξερεύνηση",
      visitors: "Επισκέπτες",
      businesses: "Επιχειρήσεις",
      signup: "Εγγραφή",
      signupFomo: "Εγγραφή στο ΦΟΜΟ",
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
  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSignupDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { href: "/feed", label: t.explore },
    { href: "/for-visitors", label: t.visitors },
    { href: "/for-businesses", label: t.businesses },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-white/8 shadow-lg shadow-black/20"
          : "bg-background/40 backdrop-blur-md border-b border-white/5"
      }`}
    >
      <div className="w-full px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-14 sm:h-16">

          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <Logo size="sm" className="h-7 px-2.5 text-base" />
          </Link>

          {/* Centre nav links — desktop */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive(link.href)
                    ? "text-white bg-white/8"
                    : "text-white/55 hover:text-white/90 hover:bg-white/5"
                }`}
              >
                {link.label}
                {isActive(link.href) && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-lg bg-white/8"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">

            {/* Sign Up dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setSignupDropdownOpen(!signupDropdownOpen)}
                className="flex items-center gap-1.5 px-4 py-2 bg-seafoam text-aegean text-sm font-bold rounded-full hover:bg-seafoam/90 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] shadow-md shadow-seafoam/20"
              >
                {t.signup}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${signupDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {signupDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute top-full right-0 mt-2 min-w-[210px] bg-background/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
                  >
                    <div className="p-1.5">
                      <Link
                        to="/signup"
                        onClick={() => setSignupDropdownOpen(false)}
                        className="block px-4 py-3 text-sm text-white/75 hover:text-white hover:bg-white/6 rounded-xl transition-colors"
                      >
                        {t.signupFomo}
                      </Link>
                      <Link
                        to="/signup-business"
                        onClick={() => setSignupDropdownOpen(false)}
                        className="block px-4 py-3 text-sm text-white/75 hover:text-white hover:bg-white/6 rounded-xl transition-colors"
                      >
                        {t.signupBusiness}
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Login */}
            <Link
              to="/login"
              className={`hidden sm:block px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${
                isActive("/login") ? "text-white" : "text-white/50 hover:text-white/80"
              }`}
            >
              {t.login}
            </Link>

            {/* Language toggle */}
            <LanguageToggle />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default InfoNavbar;
