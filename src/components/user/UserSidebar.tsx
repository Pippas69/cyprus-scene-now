import { useState, useEffect } from 'react';
import { Home, MapPin, Calendar, User, Settings, CalendarCheck, Percent, Ticket, GraduationCap } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLanguage } from '@/hooks/useLanguage';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const translations = {
  el: {
    mainNav: 'Πλοήγηση',
    feed: 'Feed',
    map: 'Χάρτης',
    events: 'Εκδηλώσεις',
    offers: 'Προσφορές',
    myActivities: 'Οι Δραστηριότητές Μου',
    myEvents: 'Οι Εκδηλώσεις Μου',
    reservations: 'Κρατήσεις',
    myOffers: 'Οι Προσφορές Μου',
    tickets: 'Τα Εισιτήριά μου',
    studentDiscount: 'Φοιτητική Έκπτωση',
    account: 'Λογαριασμός',
    profile: 'Προφίλ',
    settings: 'Ρυθμίσεις',
  },
  en: {
    mainNav: 'Main Navigation',
    feed: 'Feed',
    map: 'Map',
    events: 'Events',
    offers: 'Offers',
    myActivities: 'My Activities',
    myEvents: 'My Events',
    reservations: 'Reservations',
    myOffers: 'My Offers',
    tickets: 'My Tickets',
    studentDiscount: 'Student Discount',
    account: 'Account',
    profile: 'Profile',
    settings: 'Settings',
  },
};

export function UserSidebar() {
  const { language } = useLanguage();
  const t = translations[language];
  const { open } = useSidebar();
  const location = useLocation();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Get profile data
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
  
  const currentPath = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab');

  const mainNavItems = [
    { title: t.feed, url: '/feed', icon: Home },
    { title: t.map, url: '/xartis', icon: MapPin },
    { title: t.events, url: '/ekdiloseis', icon: Calendar },
    { title: t.offers, url: '/offers', icon: Percent },
  ];

  const activityItems = [
    { title: t.myEvents, url: '/dashboard-user?tab=events', icon: Calendar, tab: 'events' },
    { title: t.reservations, url: '/dashboard-user?tab=reservations', icon: CalendarCheck, tab: 'reservations' },
    { title: t.myOffers, url: '/dashboard-user?tab=offers', icon: Percent, tab: 'offers' },
    { title: t.tickets, url: '/dashboard-user?tab=tickets', icon: Ticket, tab: 'tickets' },
    { title: t.studentDiscount, url: '/dashboard-user?tab=student', icon: GraduationCap, tab: 'student' },
  ];

  const accountItems = [
    { title: t.profile, url: '/dashboard-user?tab=profile', icon: User, tab: 'profile' },
    { title: t.settings, url: '/dashboard-user?tab=settings', icon: Settings, tab: 'settings' },
  ];

  const isItemActive = (url: string, tab?: string) => {
    if (tab) {
      return currentPath === '/dashboard-user' && currentTab === tab;
    }
    return currentPath === url;
  };

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
          <SidebarGroupLabel>{t.mainNav}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isItemActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-2 text-sidebar-foreground">
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t.myActivities}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {activityItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isItemActive(item.url, item.tab)}>
                    <NavLink to={item.url} className="flex items-center gap-2 text-sidebar-foreground">
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t.account}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isItemActive(item.url, item.tab)}>
                    <NavLink to={item.url} className="flex items-center gap-2 text-sidebar-foreground">
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
