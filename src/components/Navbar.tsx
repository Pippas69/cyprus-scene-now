import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
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
      join: "Εγγραφή",
      forBusinesses: "Για Επιχειρήσεις",
    },
    en: {
      events: "Events",
      map: "Map",
      discounts: "Discounts",
      login: "Login",
      join: "Join ΦΟΜΟ",
      forBusinesses: "For Businesses",
    },
  };

  const t = text[language];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white shadow-card"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className="font-urbanist text-3xl font-black tracking-tight"
            style={{
              color: scrolled ? "hsl(var(--midnight))" : "white",
              transition: "color 0.3s",
            }}
          >
            ΦΟΜΟ
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => navigate("/feed")}
              className={`font-inter font-medium transition-colors ${
                scrolled ? "text-midnight hover:text-coral" : "text-white hover:text-amber"
              }`}
            >
              {t.events}
            </button>
            <button
              className={`font-inter font-medium transition-colors ${
                scrolled ? "text-midnight hover:text-coral" : "text-white hover:text-amber"
              }`}
            >
              {t.map}
            </button>
            <button
              className={`font-inter font-medium transition-colors ${
                scrolled ? "text-midnight hover:text-coral" : "text-white hover:text-amber"
              }`}
            >
              {t.discounts}
            </button>
            <button
              className={`font-inter font-medium transition-colors ${
                scrolled ? "text-midnight hover:text-coral" : "text-white hover:text-amber"
              }`}
            >
              {t.login}
            </button>

            {/* Language Toggle */}
            <div className="flex gap-1 bg-white/10 backdrop-blur-sm rounded-lg p-1">
              <button
                onClick={() => onLanguageToggle("el")}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  language === "el"
                    ? "bg-white text-midnight"
                    : "text-white hover:bg-white/20"
                }`}
              >
                🇬🇷 ΕΛ
              </button>
              <button
                onClick={() => onLanguageToggle("en")}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  language === "en"
                    ? "bg-white text-midnight"
                    : "text-white hover:bg-white/20"
                }`}
              >
                🇬🇧 EN
              </button>
            </div>

            {/* Join Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={scrolled ? "gradient" : "premium"} size="default">
                  {t.join} ▾
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="font-medium cursor-pointer">
                  {t.join}
                </DropdownMenuItem>
                <DropdownMenuItem className="font-medium cursor-pointer text-coral">
                  {t.forBusinesses}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center gap-4">
            {/* Language Toggle Mobile */}
            <div className="flex gap-1 bg-white/10 backdrop-blur-sm rounded-lg p-1">
              <button
                onClick={() => onLanguageToggle("el")}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  language === "el"
                    ? "bg-white text-midnight"
                    : "text-white hover:bg-white/20"
                }`}
              >
                🇬🇷
              </button>
              <button
                onClick={() => onLanguageToggle("en")}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  language === "en"
                    ? "bg-white text-midnight"
                    : "text-white hover:bg-white/20"
                }`}
              >
                🇬🇧
              </button>
            </div>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className={scrolled ? "text-midnight" : "text-white"}>
                  {mobileOpen ? <X /> : <Menu />}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] bg-white">
                <div className="flex flex-col gap-6 mt-8">
                  <button
                    onClick={() => {
                      navigate("/feed");
                      setMobileOpen(false);
                    }}
                    className="text-midnight font-inter font-medium text-lg hover:text-coral transition-colors"
                  >
                    {t.events}
                  </button>
                  <button className="text-midnight font-inter font-medium text-lg hover:text-coral transition-colors">
                    {t.map}
                  </button>
                  <button className="text-midnight font-inter font-medium text-lg hover:text-coral transition-colors">
                    {t.discounts}
                  </button>
                  <button className="text-midnight font-inter font-medium text-lg hover:text-coral transition-colors">
                    {t.login}
                  </button>
                  <div className="pt-4 border-t space-y-3">
                    <Button variant="gradient" className="w-full" size="lg">
                      {t.join}
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
