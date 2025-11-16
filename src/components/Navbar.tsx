import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Menu, ChevronDown, User, Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    checkUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('id', user.id)
        .single();
      
      setUserRole(profile?.role || null);
      setUserName(profile?.name || user.email?.split('@')[0] || 'User');
    } else {
      setUserRole(null);
      setUserName("");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleDashboardClick = () => {
    if (userRole === 'business') {
      navigate('/dashboard-business');
    } else {
      navigate('/dashboard-user');
    }
  };

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
      myDashboard: "Ο Λογαριασμός μου",
      settings: "Ρυθμίσεις",
      signOut: "Αποσύνδεση",
    },
    en: {
      events: "Events",
      map: "Map",
      discounts: "Discounts",
      login: "Login",
      signup: "Sign Up",
      joinFomo: "Join ΦΟΜΟ",
      forBusinesses: "For Businesses",
      myDashboard: "My Dashboard",
      settings: "Settings",
      signOut: "Sign Out",
    },
  };

  const t = text[language];

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-background shadow-md border-b-4 border-sunset-coral"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className="font-cinzel text-4xl font-black tracking-tight text-sunset-coral drop-shadow-lg"
          >
            ΦΟΜΟ
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {/* Explore Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="font-inter font-extrabold text-lg text-aegean hover:text-sunset-coral transition-colors flex items-center gap-1">
                  {language === "el" ? "Εξερεύνηση" : "Explore"}
                  <ChevronDown className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-background z-[60]">
                <DropdownMenuItem 
                  className="font-medium cursor-pointer"
                  onClick={() => navigate("/feed")}
                >
                  {language === "el" ? "Αρχική" : "Home"}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="font-medium cursor-pointer"
                  onClick={() => navigate("/ekdiloseis")}
                >
                  {t.events}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="font-medium cursor-pointer"
                  onClick={() => navigate("/xartis")}
                >
                  {t.map}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="font-medium cursor-pointer"
                  onClick={() => {}}
                >
                  {t.discounts}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {!user && (
              <button onClick={() => navigate("/login")} className="font-inter font-bold text-aegean hover:text-sunset-coral transition-colors">
                {t.login}
              </button>
            )}

            {/* Language Toggle */}
            <div className="flex gap-1 rounded-lg p-1 border-2 bg-background border-sunset-coral">
              <button
                onClick={() => onLanguageToggle("el")}
                className={`px-4 py-2 rounded text-sm font-extrabold transition-all ${
                  language === "el"
                    ? "bg-sunset-coral text-white shadow-md"
                    : "text-sunset-coral hover:bg-sunset-coral/10"
                }`}
              >
                🇬🇷 ΕΛ
              </button>
              <button
                onClick={() => onLanguageToggle("en")}
                className={`px-4 py-2 rounded text-sm font-extrabold transition-all ${
                  language === "en"
                    ? "bg-sunset-coral text-white shadow-md"
                    : "text-sunset-coral hover:bg-sunset-coral/10"
                }`}
              >
                🇬🇧 EN
              </button>
            </div>

            {/* User Profile Menu or Join Dropdown */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={scrolled ? "outline" : "secondary"} className="gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {userName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden lg:inline">{userName}</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem 
                    className="font-medium cursor-pointer"
                    onClick={handleDashboardClick}
                  >
                    <User className="w-4 h-4 mr-2" />
                    {t.myDashboard}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="font-medium cursor-pointer"
                    onClick={() => {
                      handleDashboardClick();
                      // Navigate to settings tab after dashboard loads
                      setTimeout(() => {
                        const settingsTab = document.querySelector('[value="settings"]');
                        if (settingsTab instanceof HTMLElement) {
                          settingsTab.click();
                        }
                      }, 100);
                    }}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {t.settings}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="font-medium cursor-pointer text-destructive"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t.signOut}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="gradient" className="gap-1">
                    {t.signup} <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem 
                    className="font-medium cursor-pointer"
                    onClick={() => navigate("/signup")}
                  >
                    {t.joinFomo}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="font-medium cursor-pointer text-secondary"
                    onClick={() => navigate("/signup-business")}
                  >
                    {t.forBusinesses}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
                      navigate("/ekdiloseis");
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
                  
                  {user ? (
                    <>
                      <button 
                        onClick={() => {
                          handleDashboardClick();
                          setMobileOpen(false);
                        }}
                        className="text-foreground font-inter font-medium text-lg hover:text-secondary transition-colors"
                      >
                        {t.myDashboard}
                      </button>
                      <button 
                        onClick={() => {
                          handleSignOut();
                          setMobileOpen(false);
                        }}
                        className="text-destructive font-inter font-medium text-lg hover:text-destructive/80 transition-colors"
                      >
                        {t.signOut}
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => {
                        navigate("/login");
                        setMobileOpen(false);
                      }}
                      className="text-foreground font-inter font-medium text-lg hover:text-secondary transition-colors"
                    >
                      {t.login}
                    </button>
                  )}
                  {!user && (
                    <div className="pt-4 border-t space-y-3">
                    <Button 
                      variant="gradient" 
                      className="w-full" 
                      size="lg"
                      onClick={() => {
                        navigate("/signup");
                        setMobileOpen(false);
                      }}
                    >
                      {t.joinFomo}
                    </Button>
                    <Button 
                      variant="premium" 
                      className="w-full" 
                      size="lg"
                      onClick={() => {
                        navigate("/signup-business");
                        setMobileOpen(false);
                      }}
                    >
                      {t.forBusinesses}
                    </Button>
                  </div>
                  )}
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
