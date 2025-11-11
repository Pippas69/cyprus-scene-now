import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Menu, ChevronDown } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  language: "el" | "en";
  onLanguageToggle: (lang: "el" | "en") => void;
}

const NavLink = ({ text, onClick, scrolled }: { text: string; onClick: () => void; scrolled: boolean }) => (
  <button
    onClick={onClick}
    className={`font-inter font-medium transition-colors ${
      scrolled ? "text-foreground hover:text-secondary" : "text-white hover:text-accent"
    }`}
  >
    {text}
  </button>
);

interface NavbarProps {
  language: "el" | "en";
  onLanguageToggle: (lang: "el" | "en") => void;
}

const Navbar = ({ language, onLanguageToggle }: NavbarProps) => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const text = {
    el: {
      events: "Εκδηλώσεις",
      map: "Χάρτης",
      discounts: "Εκπτώσεις",
      login: "Σύνδεση",
      signup: "Εγγραφή",
      joinFomo: "Εγγραφή στο ΦΟΜΟ",
      forBusinesses: "Για Επιχειρήσεις",
    },
    en: {
      events: "Events",
      map: "Map",
      discounts: "Discounts",
      login: "Login",
      signup: "Sign Up",
      joinFomo: "Join ΦΟΜΟ",
      forBusinesses: "For Businesses",
    },
  };

  const t = text[language];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background text-foreground shadow-card"
          : "bg-transparent text-white"
      }`}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className={`font-cinzel text-3xl font-black tracking-tight transition-colors ${
              scrolled ? "text-primary" : "text-white"
            }`}
          >
            ΦΟΜΟ
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink text={t.events} onClick={() => navigate("/feed")} scrolled={scrolled} />
            <NavLink text={t.map} onClick={() => {}} scrolled={scrolled} />
            <NavLink text={t.discounts} onClick={() => {}} scrolled={scrolled} />
            <NavLink text={t.login} onClick={() => {}} scrolled={scrolled} />

            {/* Language Toggle */}
            <div className={`flex gap-1 rounded-lg p-1 ${scrolled ? "bg-muted" : "bg-white/10 backdrop-blur-sm"}`}>
              <button
                onClick={() => onLanguageToggle("el")}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  language === "el"
                    ? scrolled ? "bg-primary text-primary-foreground" : "bg-white text-primary"
                    : scrolled ? "text-foreground hover:bg-background" : "text-white hover:bg-white/20"
                }`}
              >
                🇬🇷 ΕΛ
              </button>
              <button
                onClick={() => onLanguageToggle("en")}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  language === "en"
                    ? scrolled ? "bg-primary text-primary-foreground" : "bg-white text-primary"
                    : scrolled ? "text-foreground hover:bg-background" : "text-white hover:bg-white/20"
                }`}
              >
                🇬🇧 EN
              </button>
            </div>

            {/* Join Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="gradient" className="gap-1">
                  {t.signup} <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="font-medium cursor-pointer">
                  {t.joinFomo}
                </DropdownMenuItem>
                <DropdownMenuItem className="font-medium cursor-pointer text-secondary">
                  {t.forBusinesses}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center gap-4">
            {/* Language Toggle Mobile */}
            <div className={`flex gap-1 rounded-lg p-1 ${scrolled ? "bg-muted" : "bg-white/10 backdrop-blur-sm"}`}>
              <button
                onClick={() => onLanguageToggle("el")}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  language === "el"
                    ? scrolled ? "bg-primary text-primary-foreground" : "bg-white text-primary"
                    : scrolled ? "text-foreground hover:bg-background" : "text-white hover:bg-white/20"
                }`}
              >
                🇬🇷
              </button>
              <button
                onClick={() => onLanguageToggle("en")}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  language === "en"
                    ? scrolled ? "bg-primary text-primary-foreground" : "bg-white text-primary"
                    : scrolled ? "text-foreground hover:bg-background" : "text-white hover:bg-white/20"
                }`}
              >
                🇬🇧
              </button>
            </div>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className={scrolled ? "text-foreground" : "text-white"}>
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] bg-background">
                <div className="flex flex-col gap-6 mt-8">
                  <button
                    onClick={() => {
                      navigate("/feed");
                      setMobileOpen(false);
                    }}
                    className="text-foreground font-inter font-medium text-lg hover:text-secondary transition-colors"
                  >
                    {t.events}
                  </button>
                  <button className="text-foreground font-inter font-medium text-lg hover:text-secondary transition-colors">
                    {t.map}
                  </button>
                  <button className="text-foreground font-inter font-medium text-lg hover:text-secondary transition-colors">
                    {t.discounts}
                  </button>
                  <button className="text-foreground font-inter font-medium text-lg hover:text-secondary transition-colors">
                    {t.login}
                  </button>
                  <div className="pt-4 border-t space-y-3">
                    <Button variant="gradient" className="w-full" size="lg">
                      {t.joinFomo}
                    </Button>
                    <Button variant="premium" className="w-full" size="lg">
                      {t.forBusinesses}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
