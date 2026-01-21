import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { UserSidebar } from '@/components/user/UserSidebar';
import { Button } from '@/components/ui/button';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, User as UserIcon, Settings, LogOut } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import LanguageToggle from '@/components/LanguageToggle';
import Logo from '@/components/Logo';
import type { User } from '@supabase/supabase-js';

interface UserLayoutProps {
  children: ReactNode;
}

export function UserLayout({ children }: UserLayoutProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
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

  const text = {
    el: {
      myDashboard: "Ο Λογαριασμός μου",
      profile: "Προφίλ",
      settings: "Ρυθμίσεις",
      signOut: "Αποσύνδεση"
    },
    en: {
      myDashboard: "My Dashboard",
      profile: "Profile",
      settings: "Settings",
      signOut: "Sign Out"
    }
  };

  const t = text[language];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        {/* Fixed Header spanning full width - Mobile optimized */}
        <header className="h-12 sm:h-14 border-b flex items-center px-2 sm:px-4 bg-background sticky top-0 z-50 overflow-hidden">
          <SidebarTrigger className="mr-2 sm:mr-4 shrink-0" />
          
          {/* Logo */}
          <button onClick={() => navigate("/")} className="mr-auto shrink-0">
            <Logo size="sm" className="sm:hidden" />
            <Logo size="md" className="hidden sm:block" />
          </button>

          {/* Search - Desktop only in header */}
          <div className="hidden md:flex flex-1 max-w-md mx-4 min-w-0">
            <GlobalSearch language={language} resultTypes={['business']} />
          </div>

          {/* Mobile Search Button */}
          <div className="md:hidden mr-1 sm:mr-2 shrink-0">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" aria-label={language === 'el' ? 'Αναζήτηση' : 'Search'}>
                  <Search className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="top" className="h-full">
                <GlobalSearch language={language} fullscreen resultTypes={['business']} />
              </SheetContent>
            </Sheet>
          </div>

          {/* Language Toggle - Hidden on mobile */}
          <div className="hidden sm:block mr-2 sm:mr-4 shrink-0">
            <LanguageToggle />
          </div>

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full p-0">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {userName?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                    {user?.user_metadata?.avatar_url && (
                      <AvatarImage 
                        src={user.user_metadata.avatar_url} 
                        alt={userName || 'User'} 
                      />
                    )}
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 sm:w-56 bg-background border-border z-50">
                <DropdownMenuItem onClick={handleDashboardClick} className="text-sm">
                  <UserIcon className="mr-2 h-4 w-4" />
                  {t.myDashboard}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/dashboard-user?tab=settings')} className="text-sm">
                  <Settings className="mr-2 h-4 w-4" />
                  {t.settings}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="text-sm">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </header>

        {/* Main Layout with Sidebar and Content */}
        <div className="flex flex-1 w-full min-h-0">
          <UserSidebar />
          
          <main
            data-scroll-container
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-background relative z-10 max-w-full [-webkit-overflow-scrolling:touch]"
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}