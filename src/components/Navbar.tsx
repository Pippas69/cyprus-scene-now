import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import fomoLogo from "@/assets/fomo-logo-white.png";
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
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
      home: "Αρχική",
      explore: "Εξερεύνηση",
      signup: "Εγγραφή",
      contact: "Επικοινωνία",
      login: "Σύνδεση",
      joinFomo: "Εγγραφή στο ΦΟΜΟ",
      forBusinesses: "Για Επιχειρήσεις",
      myAccount: "Ο λογαριασμός μου",
      signOut: "Αποσύνδεση",
    },
    en: {
      home: "Home",
      explore: "Explore",
      signup: "Sign Up",
      contact: "Contact",
      login: "Login",
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

  const navLinkClass = "text-foreground font-inter text-sm font-bold tracking-wide hover:text-seafoam transition-colors whitespace-nowrap cursor-pointer";

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      scrolled
        ? "bg-background/95 backdrop-blur-md shadow-md border-b border-white/10"
        : "bg-background shadow-md border-b-4 border-accent"
    )}>
      <div className="container mx-auto px-4 py-3">
        {/* Desktop layout (lg+): Αρχική | Εξερεύνηση | LOGO | Εγγραφή | Επικοινωνία */}
        <div className="hidden lg:grid lg:grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Left links */}
          <div className="flex items-center justify-end gap-6">
            <button onClick={() => navigate("/")} className={navLinkClass}>
              {t.home}
            </button>
            <button onClick={() => navigate("/feed")} className={navLinkClass}>
              {t.explore}
            </button>
          </div>

          {/* Center logo */}
          <button onClick={() => navigate("/")} className="hover:opacity-80 transition-opacity flex-shrink-0">
            <img src={fomoLogo} alt="ΦΟΜΟ" className="h-9 w-9 object-contain" />
          </button>

          {/* Right links */}
          <div className="flex items-center justify-start gap-6">
            {user ? (
              <>
                <UserAccountDropdown
                  userId={user.id}
                  userName={userName}
                  avatarUrl={userAvatarUrl}
                  variant="button"
                />
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(navLinkClass, "flex items-center gap-1")}>
                    {t.signup} <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 bg-background">
                  <DropdownMenuItem className="font-medium cursor-pointer" onClick={() => navigate("/signup")}>
                    {t.joinFomo}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="font-medium cursor-pointer" onClick={() => navigate("/login")}>
                    {t.login}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="font-medium cursor-pointer text-white" onClick={() => navigate("/signup-business")}>
                    {t.forBusinesses}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <button onClick={() => navigate("/contact")} className={navLinkClass}>
              {t.contact}
            </button>

            {/* Search */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-foreground" aria-label="Search">
                  <Search className="h-5 w-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="top" className="h-full">
                <GlobalSearch language={language} fullscreen resultTypes={['business']} />
              </SheetContent>
            </Sheet>

            <LanguageToggle />
          </div>
        </div>

        {/* Mobile/Tablet layout (<lg) */}
        <div className="lg:hidden flex items-center justify-between">
          {/* Left: Logo with dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                <img src={fomoLogo} alt="ΦΟΜΟ" className="h-7 w-7 object-contain" />
                <ChevronDown className="w-4 h-4 text-aegean" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-background z-[60]">
              <DropdownMenuItem className="font-medium cursor-pointer" onClick={() => navigate("/")}>
                {t.home}
              </DropdownMenuItem>
              <DropdownMenuItem className="font-medium cursor-pointer" onClick={() => navigate("/feed")}>
                {t.explore}
              </DropdownMenuItem>
              <DropdownMenuItem className="font-medium cursor-pointer" onClick={() => navigate("/contact")}>
                {t.contact}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Right: Search + Language + Menu */}
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-foreground" aria-label="Search">
                  <Search className="h-5 w-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="top" className="h-full">
                <GlobalSearch language={language} fullscreen resultTypes={['business']} />
              </SheetContent>
            </Sheet>

            <LanguageToggle />

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                {user ? (
                  <Button variant="ghost" size="icon" className="text-foreground" aria-label="Open menu">
                    <Menu aria-hidden="true" />
                  </Button>
                ) : (
                  <button className="px-3.5 py-1.5 rounded-xl bg-gradient-ocean text-white text-xs font-semibold whitespace-nowrap shadow-sm hover:opacity-90 transition-opacity">
                    {t.signup}
                  </button>
                )}
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] bg-background">
                <div className="flex flex-col gap-6 mt-8">
                  {user ? (
                    <>
                      <button
                        onClick={() => { navigate('/feed'); setMobileOpen(false); }}
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
                      <Button className="w-full text-sm bg-[#4ECDC4] text-white hover:bg-[#3dbdb5] border-0" size="default"
                        onClick={() => { navigate("/signup"); setMobileOpen(false); }}>
                        {t.joinFomo}
                      </Button>
                      <Button className="w-full text-sm bg-[#4ECDC4] text-white hover:bg-[#3dbdb5] border-0" size="default"
                        onClick={() => { navigate("/signup-business"); setMobileOpen(false); }}>
                        {t.forBusinesses}
                      </Button>
                      <Button className="w-full text-sm bg-[#4ECDC4] text-white hover:bg-[#3dbdb5] border-0" size="default"
                        onClick={() => { navigate("/login"); setMobileOpen(false); }}>
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
