import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useNavigate } from "react-router-dom";
import { Menu, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageToggle from "@/components/LanguageToggle";
import { UserAccountDropdown } from "@/components/UserAccountDropdown";
import type { User } from "@supabase/supabase-js";

const Navbar = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
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
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const profileResult = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', user.id)
          .single();
        
        setUserName(profileResult.data?.name || user.email?.split('@')[0] || 'User');
        setUserAvatarUrl(profileResult.data?.avatar_url || user?.user_metadata?.avatar_url || null);
      } else {
        setUserName("");
        setUserAvatarUrl(null);
      }
    } catch (error) {
      console.warn('Error fetching user data:', error);
      setUserName('User');
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
      login: "Σύνδεση",
      signup: "Εγγραφή",
      joinFomo: "Εγγραφή στο ΦΟΜΟ",
      forBusinesses: "Για Επιχειρήσεις",
      myAccount: "Ο λογαριασμός μου",
      signOut: "Αποσύνδεση",
    },
    en: {
      login: "Login",
      signup: "Sign Up",
      joinFomo: "Join ΦΟΜΟ",
      forBusinesses: "For Businesses",
      myAccount: "My Account",
      signOut: "Sign Out",
    }
  };

  const t = text[language];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
    setMobileOpen(false);
  };

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      scrolled 
        ? "bg-background/95 backdrop-blur-md shadow-md border-b border-white/10" 
        : "bg-background shadow-md border-b-4 border-accent"
    )}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section: Logo + Nav Links */}
          <div className="flex items-center">
            {/* Desktop/Tablet Logo (md+) */}
            <button onClick={() => navigate("/")} className="hidden md:block hover:opacity-80 transition-opacity">
              <Logo size="md" />
            </button>

            {/* Mobile Logo with Dropdown (<md) */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                    <Logo size="md" />
                    <ChevronDown className="w-5 h-5 text-aegean" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 bg-background z-[60]">
                  <DropdownMenuItem className="font-medium cursor-pointer" onClick={() => navigate("/")}>
                    {language === "el" ? "Αρχική" : "Home"}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="font-medium cursor-pointer" onClick={() => navigate("/feed")}>
                    {language === "el" ? "Εξερεύνηση" : "Explore"}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="font-medium cursor-pointer" onClick={() => navigate("/for-visitors")}>
                    {language === "el" ? "Επισκέπτες" : "Visitors"}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="font-medium cursor-pointer" onClick={() => navigate("/for-businesses")}>
                    {language === "el" ? "Επιχειρήσεις" : "Businesses"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Tablet Horizontal Navigation Links (md to lg) - consistent gap with logo */}
            <div className="hidden md:flex lg:hidden items-center gap-3 ml-3">
              <button 
                onClick={() => navigate("/")} 
                className="text-foreground font-inter text-xs font-bold tracking-wide hover:opacity-80 transition-opacity whitespace-nowrap"
              >
                {language === "el" ? "Αρχική" : "Home"}
              </button>
              <button 
                onClick={() => navigate("/feed")} 
                className="text-foreground font-inter text-xs font-bold tracking-wide hover:opacity-80 transition-opacity whitespace-nowrap"
              >
                {language === "el" ? "Εξερεύνηση" : "Explore"}
              </button>
              <button 
                onClick={() => navigate("/for-visitors")} 
                className="text-foreground font-inter text-xs font-bold tracking-wide hover:opacity-80 transition-opacity whitespace-nowrap"
              >
                {language === "el" ? "Επισκέπτες" : "Visitors"}
              </button>
              <button 
                onClick={() => navigate("/for-businesses")} 
                className="text-foreground font-inter text-xs font-bold tracking-wide hover:opacity-80 transition-opacity whitespace-nowrap"
              >
                {language === "el" ? "Επιχειρήσεις" : "Businesses"}
              </button>
            </div>

            {/* Desktop Horizontal Navigation Links (lg+) - consistent gap with logo */}
            <div className="hidden lg:flex items-center gap-4 ml-4">
            <button 
              onClick={() => navigate("/")} 
              className="text-foreground font-inter text-sm font-bold tracking-wide hover:opacity-80 transition-opacity"
            >
              {language === "el" ? "Αρχική" : "Home"}
            </button>
            <button 
              onClick={() => navigate("/feed")} 
              className="text-foreground font-inter text-sm font-bold tracking-wide hover:opacity-80 transition-opacity"
            >
              {language === "el" ? "Εξερεύνηση" : "Explore"}
            </button>
            <button 
              onClick={() => navigate("/for-visitors")} 
              className="text-foreground font-inter text-sm font-bold tracking-wide hover:opacity-80 transition-opacity"
            >
              {language === "el" ? "Επισκέπτες" : "Visitors"}
            </button>
            <button 
              onClick={() => navigate("/for-businesses")} 
              className="text-foreground font-inter text-sm font-bold tracking-wide hover:opacity-80 transition-opacity"
            >
              {language === "el" ? "Επιχειρήσεις" : "Businesses"}
            </button>
            </div>
          </div>

          {/* Right Section: Search + Auth buttons */}
          <div className="hidden lg:flex items-center gap-2">
            {/* Desktop Search Icon (lg+) */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-foreground"
                  aria-label={language === "el" ? "Αναζήτηση" : "Search"}
                >
                  <Search className="h-5 w-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="top" className="h-full">
                <GlobalSearch language={language} fullscreen resultTypes={['business']} />
              </SheetContent>
            </Sheet>

            {/* Login button */}
            {!user && (
              <Button 
                onClick={() => navigate("/login")}
                className="font-inter font-semibold bg-gradient-ocean text-white hover:opacity-90 border-0 transition-all"
              >
                {t.login}
              </Button>
            )}

            {/* Language Toggle */}
            <LanguageToggle />

            {/* User Profile Menu or Join Dropdown */}
            {user ? (
              <UserAccountDropdown
                userId={user.id}
                userName={userName}
                avatarUrl={userAvatarUrl}
                variant="button"
              />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="gap-1 bg-gradient-ocean text-white hover:opacity-90 border-0">
                    {t.signup} <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-background">
                  <DropdownMenuItem className="font-medium cursor-pointer" onClick={() => navigate("/signup")}>
                    {t.joinFomo}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="font-medium cursor-pointer text-white" onClick={() => navigate("/signup-business")}>
                    {t.forBusinesses}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Tablet/Mobile Menu (<lg) */}
          <div className="lg:hidden flex items-center gap-2">
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
                <GlobalSearch language={language} fullscreen resultTypes={['business']} />
              </SheetContent>
            </Sheet>

            {/* Language Toggle Mobile */}
            <LanguageToggle />

            {/* Mobile Menu Sheet */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-foreground"
                  aria-label="Open menu"
                >
                  <Menu aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] bg-background">
                <div className="flex flex-col gap-6 mt-8">
                  {user ? (
                    <>
                      <button 
                        onClick={() => {
                          navigate('/feed');
                          setMobileOpen(false);
                        }} 
                        className="text-foreground font-inter font-medium text-lg hover:text-secondary transition-colors"
                      >
                        {t.myAccount}
                      </button>
                      <button 
                        onClick={handleSignOut} 
                        className="text-destructive font-inter font-medium text-lg hover:text-destructive/80 transition-colors"
                      >
                        {t.signOut}
                      </button>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <Button 
                        className="w-full text-sm bg-[#4ECDC4] text-white hover:bg-[#3dbdb5] border-0" 
                        size="default" 
                         onClick={() => {
                           navigate("/signup");
                           setMobileOpen(false);
                         }}
                       >
                         {t.joinFomo}
                       </Button>
                      <Button 
                        className="w-full text-sm bg-[#4ECDC4] text-white hover:bg-[#3dbdb5] border-0" 
                        size="default" 
                        onClick={() => {
                          navigate("/signup-business");
                          setMobileOpen(false);
                        }}
                      >
                        {t.forBusinesses}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full text-sm border-background text-white hover:bg-background hover:text-white" 
                        size="default" 
                        onClick={() => {
                          navigate("/login");
                          setMobileOpen(false);
                        }}
                      >
                        {t.login}
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
