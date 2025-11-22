import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Menu, ChevronDown, User as UserIcon, Settings, LogOut, Search } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import type { User } from "@supabase/supabase-js";

interface NavbarProps {
  language: "el" | "en";
  onLanguageToggle: (lang: "el" | "en") => void;
}
const Navbar = ({
  language,
  onLanguageToggle
}: NavbarProps) => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  useEffect(() => {
    checkUser();
    const {
      data: authListener
    } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  const checkUser = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      // Check if user owns a business
      const {
        data: business
      } = await supabase.from('businesses').select('id').eq('user_id', user.id).maybeSingle();
      
      // Also get profile data for name
      const {
        data: profile
      } = await supabase.from('profiles').select('name').eq('id', user.id).single();
      
      setUserRole(business ? 'business' : 'user');
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
      profile: "Προφίλ",
      settings: "Ρυθμίσεις",
      signOut: "Αποσύνδεση"
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
      profile: "Profile",
      settings: "Settings",
      signOut: "Sign Out"
    }
  };
  const t = text[language];
  return <nav className="fixed top-0 left-0 right-0 z-50 bg-background shadow-md border-b-4 border-accent">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => navigate("/")} className="font-cinzel text-4xl font-black tracking-tight drop-shadow-lg text-[#012b67] dark:text-sand-white">
            ΦΟΜΟ
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {/* Explore Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="font-inter font-extrabold text-lg text-aegean hover:text-accent transition-colors flex items-center gap-1">
                  {language === "el" ? "Εξερεύνηση" : "Explore"}
                  <ChevronDown className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-background z-[60]">
                <DropdownMenuItem className="font-medium cursor-pointer" onClick={() => navigate("/feed")}>
                  {language === "el" ? "Αρχική" : "Home"}
                </DropdownMenuItem>
                <DropdownMenuItem className="font-medium cursor-pointer" onClick={() => navigate("/ekdiloseis")}>
                  {t.events}
                </DropdownMenuItem>
                <DropdownMenuItem className="font-medium cursor-pointer" onClick={() => navigate("/xartis")}>
                  {t.map}
                </DropdownMenuItem>
                <DropdownMenuItem className="font-medium cursor-pointer" onClick={() => {}}>
                  {t.discounts}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Global Search */}
            <GlobalSearch language={language} />
            
            {/* Notification Bell (only for logged-in users) */}
            {user && <NotificationBell userId={user.id} />}
            
            {!user && <Button 
                onClick={() => navigate("/login")}
                className="font-inter font-semibold bg-aegean text-white hover:bg-aegean/90 border-2 border-aegean transition-all"
              >
                {t.login}
              </Button>}

            {/* Language Toggle */}
            <div className="flex gap-1 rounded-lg p-1 border-2 border-accent bg-primary" role="group" aria-label="Language selection">
              <button 
                onClick={() => onLanguageToggle("el")} 
                className={`px-4 py-2 rounded text-sm font-extrabold transition-all bg-accent text-primary ${language === "el" ? "shadow-lg" : "opacity-70 hover:opacity-90"}`}
                aria-label="Switch to Greek"
                aria-pressed={language === "el"}
              >
                🇬🇷 ΕΛ
              </button>
              <button 
                onClick={() => onLanguageToggle("en")} 
                className={`px-4 py-2 rounded text-sm font-extrabold transition-all bg-accent text-primary ${language === "en" ? "shadow-lg" : "opacity-70 hover:opacity-90"}`}
                aria-label="Switch to English"
                aria-pressed={language === "en"}
              >
                🇬🇧 EN
              </button>
            </div>

            {/* User Profile Menu or Join Dropdown */}
            {user ? <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 border-none">{/* ... keep existing code */}
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {userName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden lg:inline font-medium">{userName}</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="font-medium cursor-pointer" onClick={() => {
                    const basePath = userRole === 'business' ? '/dashboard-business' : '/dashboard-user';
                    navigate(`${basePath}?tab=profile`);
                  }}>
                    <UserIcon className="w-4 h-4 mr-2" />
                    {userRole === 'business' ? t.myDashboard : t.profile}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="font-medium cursor-pointer" onClick={() => {
                    const basePath = userRole === 'business' ? '/dashboard-business' : '/dashboard-user';
                    navigate(`${basePath}?tab=settings`);
                  }}>
                    <Settings className="w-4 h-4 mr-2" />
                    {t.settings}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="font-medium cursor-pointer text-destructive" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    {t.signOut}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu> : <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="gradient" className="gap-1">
                    {t.signup} <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="font-medium cursor-pointer" onClick={() => navigate("/signup")}>
                    {t.joinFomo}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="font-medium cursor-pointer text-secondary" onClick={() => navigate("/signup-business")}>
                    {t.forBusinesses}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>}
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center gap-2">
            {/* Search Icon - Opens full screen search */}
            <Sheet>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-foreground"
                  aria-label="Open search"
                >
                  <Search className="h-5 w-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="top" className="h-full">
                <GlobalSearch language={language} fullscreen />
              </SheetContent>
            </Sheet>

            {/* Language Toggle Mobile */}
            <div className={`flex gap-1 rounded-lg p-1 ${scrolled ? "bg-muted" : "bg-white/10 backdrop-blur-sm"}`} role="group" aria-label="Language selection">
              <button 
                onClick={() => onLanguageToggle("el")} 
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${language === "el" ? scrolled ? "bg-primary text-primary-foreground" : "bg-white text-primary" : scrolled ? "text-foreground hover:bg-background" : "text-white hover:bg-white/20"}`}
                aria-label="Switch to Greek"
                aria-pressed={language === "el"}
              >
                🇬🇷
              </button>
              <button 
                onClick={() => onLanguageToggle("en")} 
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${language === "en" ? scrolled ? "bg-primary text-primary-foreground" : "bg-white text-primary" : scrolled ? "text-foreground hover:bg-background" : "text-white hover:bg-white/20"}`}
                aria-label="Switch to English"
                aria-pressed={language === "en"}
              >
                🇬🇧
              </button>
            </div>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={scrolled ? "text-foreground" : "text-white"}
                  aria-label="Open menu"
                >
                  <Menu aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] bg-background">
                <div className="flex flex-col gap-6 mt-8">
                  <button onClick={() => {
                  navigate("/ekdiloseis");
                  setMobileOpen(false);
                }} className="text-foreground font-inter font-medium text-lg hover:text-secondary transition-colors">
                    {t.events}
                  </button>
                  <button className="text-foreground font-inter font-medium text-lg hover:text-secondary transition-colors">
                    {t.map}
                  </button>
                  <button className="text-foreground font-inter font-medium text-lg hover:text-secondary transition-colors">
                    {t.discounts}
                  </button>
                  
                  {user ? <>
                      <button onClick={() => {
                    const basePath = userRole === 'business' ? '/dashboard-business' : '/dashboard-user';
                    navigate(`${basePath}?tab=profile`);
                    setMobileOpen(false);
                  }} className="text-foreground font-inter font-medium text-lg hover:text-secondary transition-colors">
                        {userRole === 'business' ? t.myDashboard : t.profile}
                      </button>
                      <button onClick={() => {
                    handleSignOut();
                    setMobileOpen(false);
                  }} className="text-destructive font-inter font-medium text-lg hover:text-destructive/80 transition-colors">
                        {t.signOut}
                      </button>
                    </> : <button onClick={() => {
                  navigate("/login");
                  setMobileOpen(false);
                }} className="text-foreground font-inter font-medium text-lg hover:text-secondary transition-colors">
                      {t.login}
                    </button>}
                  {!user && <div className="pt-4 border-t space-y-3">
                    <Button variant="gradient" className="w-full" size="lg" onClick={() => {
                    navigate("/signup");
                    setMobileOpen(false);
                  }}>
                      {t.joinFomo}
                    </Button>
                    <Button variant="premium" className="w-full" size="lg" onClick={() => {
                    navigate("/signup-business");
                    setMobileOpen(false);
                  }}>
                      {t.forBusinesses}
                    </Button>
                  </div>}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>;
};
export default Navbar;