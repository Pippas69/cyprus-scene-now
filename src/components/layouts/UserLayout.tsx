import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { UserSidebar } from '@/components/user/UserSidebar';
import { Button } from '@/components/ui/button';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { User as UserIcon, Settings, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import type { User } from '@supabase/supabase-js';

interface UserLayoutProps {
  children: ReactNode;
}

export function UserLayout({ children }: UserLayoutProps) {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
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
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      const { data: business } = await supabase.from('businesses').select('id').eq('user_id', user.id).maybeSingle();
      const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
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
        {/* Fixed Header spanning full width */}
        <header className="h-14 border-b flex items-center px-4 bg-background sticky top-0 z-50">
          <SidebarTrigger className="mr-4" />
          
          {/* Logo */}
          <button 
            onClick={() => navigate("/")} 
            className="font-cinzel text-2xl font-black tracking-tight text-primary mr-auto"
          >
            ΦΟΜΟ
          </button>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <GlobalSearch language={language} />
          </div>

          {/* Language Toggle */}
          <div className="flex items-center gap-2 mr-4">
            <Button
              variant={language === 'el' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLanguage('el')}
            >
              ΕΛ
            </Button>
            <Button
              variant={language === 'en' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLanguage('en')}
            >
              EN
            </Button>
          </div>

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {userName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background border-border z-50">
                <DropdownMenuItem onClick={handleDashboardClick}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  {t.myDashboard}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/dashboard-user?tab=settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t.settings}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </header>

        {/* Main Layout with Sidebar and Content */}
        <div className="flex flex-1 w-full">
          <UserSidebar />
          
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
