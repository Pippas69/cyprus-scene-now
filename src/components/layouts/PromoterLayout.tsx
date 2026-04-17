import { ReactNode, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { PromoterSidebar } from '@/components/promoter/PromoterSidebar';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import LanguageToggle from '@/components/LanguageToggle';
import Logo from '@/components/Logo';
import { UserAccountDropdown } from '@/components/UserAccountDropdown';
import { SidebarMobileClose } from '@/components/SidebarMobileClose';
import type { User } from '@supabase/supabase-js';

interface PromoterLayoutProps {
  children: ReactNode;
}

export function PromoterLayout({ children }: PromoterLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && typeof (el as any).scrollTo === 'function') {
      (el as any).scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', user.id)
        .single();
      setUserName(profile?.name || user.email?.split('@')[0] || 'User');
      setUserAvatarUrl(profile?.avatar_url || null);
    };
    load();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => load());
    return () => authListener.subscription.unsubscribe();
  }, [navigate]);

  return (
    <SidebarProvider>
      <SidebarMobileClose />
      <div className="min-h-screen flex flex-col w-full bg-background">
        <header className="h-12 sm:h-14 border-b flex items-center px-2 sm:px-4 bg-background sticky top-0 z-50 overflow-visible">
          <SidebarTrigger className="mr-2 sm:mr-4 shrink-0" />
          <button onClick={() => navigate('/')} className="shrink-0">
            <Logo size="sm" />
          </button>

          <div className="ml-auto flex items-center">
            <div className="mr-1 sm:mr-2 shrink-0">
              <LanguageToggle />
            </div>
            {user && (
              <UserAccountDropdown
                userId={user.id}
                userName={userName}
                avatarUrl={userAvatarUrl || user?.user_metadata?.avatar_url}
              />
            )}
          </div>
        </header>

        <div className="flex flex-1 w-full min-h-0">
          <PromoterSidebar />
          <main
            data-scroll-container
            ref={(node) => { scrollRef.current = node as unknown as HTMLElement | null; }}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-background relative z-10 max-w-full [-webkit-overflow-scrolling:touch]"
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
