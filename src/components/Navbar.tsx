import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useNavigate } from "react-router-dom";
import { Menu, ChevronDown, User as UserIcon, Settings, LogOut, Search, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { useLanguage } from "@/hooks/useLanguage";
import LanguageToggle from "@/components/LanguageToggle";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import type { User } from "@supabase/supabase-js";

const Navbar = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const { data: unreadCount } = useUnreadCount();

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
        // Optimize: Fetch business and profile in parallel
        const [businessResult, profileResult] = await Promise.all([
          supabase.from('businesses').select('id').eq('user_id', user.id).maybeSingle(),
          supabase.from('profiles').select('name, avatar_url').eq('id', user.id).single()
        ]);
        
        setUserRole(businessResult.data ? 'business' : 'user');
        setUserName(profileResult.data?.name || user.email?.split('@')[0] || 'User');
      } else {
        setUserRole(null);
        setUserName("");
      }
    } catch (error) {
      console.warn('Error fetching user data:', error);
      setUserName('User');
      setUserRole('user');
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
      signOut: "Αποσύνδεση",
      messages: "Μηνύματα"
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
      signOut: "Sign Out",
      messages: "Messages"
    }
  };

  const t = text[language];

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      scrolled 
        ? "bg-background/95 backdrop-blur-md shadow-md border-b border-border" 
        : "bg-background shadow-md border-b-4 border-accent"
    )}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => navigate("/")} className="hover:opacity-80 transition-opacity">
            <Logo size="md" />
          </button>

          {/* Desktop Horizontal Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => navigate("/")} 
              className="text-foreground font-inter font-medium hover:text-aegean transition-colors"
            >
              {language === "el" ? "Αρχική" : "Home"}
            </button>
            <button 
              onClick={() => navigate("/feed")} 
              className="text-foreground font-inter font-medium hover:text-aegean transition-colors"
            >
              {language === "el" ? "Εξερεύνηση" : "Explore"}
            </button>
            <button 
              onClick={() => navigate("/for-visitors")} 
              className="text-foreground font-inter font-medium hover:text-aegean transition-colors"
            >
              {language === "el" ? "Για Επισκέπτες" : "For Visitors"}
            </button>
            <button 
              onClick={() => navigate("/for-businesses")} 
              className="text-foreground font-inter font-medium hover:text-aegean transition-colors"
            >
              {language === "el" ? "Για Επιχειρήσεις" : "For Businesses"}
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">

            {/* Global Search */}
            <GlobalSearch language={language} />
            
            {/* Messages Icon (only for logged-in users) */}
            {user && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/messages')}
                className="relative"
                aria-label={t.messages}
              >
                <MessageCircle className="h-5 w-5" />
                {(unreadCount ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            )}
            
            {/* Notification Bell (only for logged-in users) */}
            {user && <NotificationBell userId={user.id} />}
            
            {!user && <Button 
                onClick={() => navigate("/login")}
                className="font-inter font-semibold bg-aegean text-white hover:bg-aegean/90 border-2 border-aegean transition-all"
              >
                {t.login}
              </Button>}

            {/* Language Toggle */}
            <LanguageToggle />

            {/* User Profile Menu or Join Dropdown */}
            {user ? <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 border-none">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {userName?.substring(0, 2)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                      {user?.user_metadata?.avatar_url && (
                        <AvatarImage 
                          src={user.user_metadata.avatar_url} 
                          alt={userName || 'User'} 
                        />
                      )}
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
            <LanguageToggle />

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={scrolled ? "text-foreground" : "text-foreground"}
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
                          const basePath = userRole === 'business' ? '/dashboard-business' : '/dashboard-user';
                          navigate(`${basePath}?tab=profile`);
                          setMobileOpen(false);
                        }} 
                        className="text-foreground font-inter font-medium text-lg hover:text-secondary transition-colors"
                      >
                        {userRole === 'business' ? t.myDashboard : t.profile}
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
                    <div className="space-y-4">
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
                      <Button 
                        variant="outline" 
                        className="w-full border-aegean text-aegean hover:bg-aegean hover:text-white" 
                        size="lg" 
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