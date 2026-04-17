import { useState, useEffect, useCallback } from 'react';
import { Home, MapPin, Calendar, Settings, CalendarCheck, Percent, Ticket, Megaphone } from 'lucide-react';
import { useIsActivePromoter, usePromoterApplicationsRealtime } from '@/hooks/usePromoter';
import { useLanguage } from '@/hooks/useLanguage';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';

const translations = {
  el: {
    feed: 'Feed',
    map: 'Χάρτης',
    events: 'Εκδηλώσεις',
    offers: 'Προσφορές',
    myTickets: 'Τα Εισιτήρια Μου',
    reservations: 'Οι Κρατήσεις Μου',
    myOffers: 'Οι Προσφορές Μου',
    settings: 'Ρυθμίσεις',
    promoterDashboard: 'PR Dashboard',
  },
  en: {
    feed: 'Feed',
    map: 'Map',
    events: 'Events',
    offers: 'Offers',
    myTickets: 'My Tickets',
    reservations: 'My Reservations',
    myOffers: 'My Offers',
    settings: 'Settings',
    promoterDashboard: 'PR Dashboard',
  },
};

export function UserSidebar() {
  const { language } = useLanguage();
  const t = translations[language];
  const { open, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', user.id)
          .single();
        
        setUserName(profile?.name || user.email?.split('@')[0] || 'User');
        setUserAvatar(profile?.avatar_url || null);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          getUser();
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // PR access: ενεργό μόνο αν έχει ένα τουλάχιστον εγκεκριμένο αίτημα.
  const { data: isActivePromoter } = useIsActivePromoter(user?.id);
  usePromoterApplicationsRealtime(user?.id);
  
  const currentPath = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab');

  const mainNavItems = [
    { title: t.feed, url: '/feed', icon: Home },
    { title: t.map, url: '/xartis', icon: MapPin },
    { title: t.events, url: '/ekdiloseis', icon: Calendar },
    { title: t.offers, url: '/offers', icon: Percent },
  ];

  const personalItems = [
    { title: t.myTickets, tab: 'events', icon: Ticket },
    { title: t.reservations, tab: 'reservations', icon: CalendarCheck },
    { title: t.myOffers, tab: 'offers', icon: Percent },
    { title: t.settings, tab: 'settings', icon: Settings },
  ];

  const isMainActive = (url: string) => currentPath === url;

  const isTabActive = (tab: string) => {
    return currentPath === '/dashboard-user' && currentTab === tab;
  };

  const handleNavClick = useCallback((url: string) => {
    if (isMobile) {
      setOpenMobile(false);
    }
    navigate(url);
  }, [isMobile, navigate, setOpenMobile]);

  const handleTabClick = useCallback((tab: string) => {
    if (isMobile) {
      setOpenMobile(false);
    }
    navigate(`/dashboard-user?tab=${tab}`, { replace: true });
  }, [isMobile, navigate, setOpenMobile]);

  return (
    <Sidebar collapsible="icon">
      {/* User Profile Section */}
      <SidebarHeader>
        <div className={`flex items-center gap-3 px-2 py-4 text-sidebar-foreground ${!open && 'justify-center'}`}>
          <Avatar className={`${open ? 'h-10 w-10' : 'h-8 w-8'}`}>
            <AvatarImage src={userAvatar || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {open && (
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isMainActive(item.url)}
                    onClick={() => handleNavClick(item.url)}
                    className="flex items-center gap-2 text-sidebar-foreground cursor-pointer"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {personalItems.map((item) => (
                <SidebarMenuItem key={item.tab}>
                  <SidebarMenuButton
                    isActive={isTabActive(item.tab)}
                    onClick={() => handleTabClick(item.tab)}
                    className="flex items-center gap-2 text-sidebar-foreground cursor-pointer"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isActivePromoter && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={currentPath === '/dashboard-promoter'}
                    onClick={() => handleNavClick('/dashboard-promoter')}
                    className="flex items-center gap-2 text-sidebar-foreground cursor-pointer"
                  >
                    <Megaphone className="h-4 w-4" />
                    <span>{t.promoterDashboard}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
