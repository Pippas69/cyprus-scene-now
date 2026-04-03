import { Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageToggle from "@/components/LanguageToggle";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const InfoNavbar = () => {
  const { language } = useLanguage();
  const location = useLocation();
  const [signupDropdownOpen, setSignupDropdownOpen] = useState(false);
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

  const linkClass = (active: boolean) =>
    `relative shrink-0 px-1.5 sm:px-3 lg:px-4 py-2 text-[11px] sm:text-sm font-medium tracking-tight transition-colors hover:text-white ${active ? "text-white" : "text-white/60"}`;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-white/[0.06]">
      <div className="w-full px-2 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-12 sm:h-16 gap-2 sm:gap-1">
          {/* Logo Badge */}
          <Link to="/" className="flex-shrink-0">
            <Logo size="sm" className="h-6 px-2 text-[0.8rem] sm:h-7 sm:px-2.5 sm:text-base" />
          </Link>

          {/* Nav Links (all sizes) */}
          <div className="flex min-w-0 items-center gap-0 sm:gap-1 lg:gap-2 overflow-visible">
            {/* Explore - always visible */}
            <Link to="/feed" className={linkClass(isActive("/feed"))}>
              {t.explore}
              {isActive("/feed") && (
                <motion.div layoutId="navbar-active" className="absolute bottom-0 left-1.5 right-1.5 sm:left-3 sm:right-3 lg:left-4 lg:right-4 h-[2px] bg-[#4ECDC4] rounded-full" transition={{ type: "spring", stiffness: 350, damping: 30 }} />
              )}
            </Link>

            {/* Visitors & Businesses - hidden on mobile */}
            {navLinks.slice(1).map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`hidden md:block ${linkClass(isActive(link.href))}`}
              >
                {link.label}
                {isActive(link.href) && (
                  <motion.div layoutId="navbar-active" className="absolute bottom-0 left-1.5 right-1.5 sm:left-3 sm:right-3 lg:left-4 lg:right-4 h-[2px] bg-[#4ECDC4] rounded-full" transition={{ type: "spring", stiffness: 350, damping: 30 }} />
                )}
              </Link>
            ))}

            {/* Εγγραφή dropdown - all sizes */}
            <div ref={dropdownRef} className="relative shrink-0">
              <button
                onClick={() => setSignupDropdownOpen(!signupDropdownOpen)}
                className={linkClass(isActive("/signup") || isActive("/signup-business"))}
              >
                {t.signup}
                {(isActive("/signup") || isActive("/signup-business")) && (
                  <motion.div layoutId="navbar-active" className="absolute bottom-0 left-1.5 right-1.5 sm:left-3 sm:right-3 lg:left-4 lg:right-4 h-[2px] bg-[#4ECDC4] rounded-full" transition={{ type: "spring", stiffness: 350, damping: 30 }} />
                )}
              </button>
              <AnimatePresence>
                {signupDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 sm:left-0 sm:right-auto mt-1 min-w-[200px] bg-background border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
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
            <Link to="/login" className={linkClass(isActive("/login"))}>
              {t.login}
              {isActive("/login") && (
                <motion.div layoutId="navbar-active" className="absolute bottom-0 left-1.5 right-1.5 sm:left-3 sm:right-3 lg:left-4 lg:right-4 h-[2px] bg-[#4ECDC4] rounded-full" transition={{ type: "spring", stiffness: 350, damping: 30 }} />
              )}
            </Link>
          </div>

          {/* Language Toggle */}
          <div className="flex-shrink-0">
            <LanguageToggle />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default InfoNavbar;
