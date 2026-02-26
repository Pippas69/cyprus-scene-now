import { ReactNode, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { UserSidebar } from '@/components/user/UserSidebar';
import { Button } from '@/components/ui/button';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { Search } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import LanguageToggle from '@/components/LanguageToggle';
import Logo from '@/components/Logo';
import { UserAccountDropdown } from '@/components/UserAccountDropdown';
import type { User } from '@supabase/supabase-js';

interface UserLayoutProps {
  children: ReactNode;
}

export function UserLayout({ children }: UserLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const scrollRef = useRef<HTMLElement | null>(null);

  // Always jump to top when switching dashboard sections (user/business nav, tabs, etc.)
  useEffect(() => {
    const el = scrollRef.current;
    if (el && typeof (el as any).scrollTo === 'function') {
      (el as any).scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [location.pathname, location.search]);

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

  // Get user avatar URL
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchAvatar = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
        if (data?.avatar_url) {
          setUserAvatarUrl(data.avatar_url);
        }
      }
    };
    fetchAvatar();
  }, [user]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        {/* Fixed Header spanning full width - Mobile optimized */}
        <header className="h-12 sm:h-14 border-b flex items-center px-2 sm:px-4 bg-background sticky top-0 z-50 overflow-visible">
          <SidebarTrigger className="mr-2 sm:mr-4 shrink-0" />
          
          {/* Logo - consistent with business dashboard */}
          <button onClick={() => navigate("/")} className="shrink-0">
            <Logo size="sm" />
          </button>

          {/* Search - Desktop only, right next to logo */}
          <div className="hidden md:flex flex-1 max-w-md ml-3 min-w-0">
            <GlobalSearch language={language} resultTypes={['business', 'event', 'offer']} />
          </div>

          {/* Spacer to push right-side items */}
          <div className="flex-1 md:hidden" />

          {/* Mobile Search Button */}
          <div className="md:hidden mr-1 shrink-0">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" aria-label={language === 'el' ? 'Αναζήτηση' : 'Search'}>
                  <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="top" className="h-full">
                <GlobalSearch language={language} fullscreen resultTypes={['business', 'event', 'offer']} />
              </SheetContent>
            </Sheet>
          </div>

          {/* Language Toggle - All device sizes */}
          <div className="mr-1 sm:mr-2 shrink-0">
            <LanguageToggle />
          </div>

          {/* User Menu - Unified 3 options: My Account, Notifications, Sign Out */}
          {user && (
            <UserAccountDropdown
              userId={user.id}
              userName={userName}
              avatarUrl={userAvatarUrl || user?.user_metadata?.avatar_url}
            />
          )}
        </header>

        {/* Main Layout with Sidebar and Content */}
        <div className="flex flex-1 w-full min-h-0">
          <UserSidebar />
          
          <main
            data-scroll-container
            ref={(node) => {
              // React Router may remount content; keep a stable scroll target
              scrollRef.current = node as unknown as HTMLElement | null;
            }}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-background relative z-10 max-w-full [-webkit-overflow-scrolling:touch]"
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}