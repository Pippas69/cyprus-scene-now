import { Home, MapPin, Calendar, Heart, User, Settings, CalendarCheck } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLanguage } from '@/hooks/useLanguage';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const translations = {
  el: {
    mainNav: 'Πλοήγηση',
    feed: 'Feed',
    map: 'Χάρτης',
    events: 'Εκδηλώσεις',
    myActivities: 'Οι Δραστηριότητές Μου',
    rsvps: 'Οι Κρατήσεις Μου',
    reservations: 'Κρατήσεις',
    saved: 'Αποθηκευμένα',
    account: 'Λογαριασμός',
    profile: 'Προφίλ',
    settings: 'Ρυθμίσεις',
  },
  en: {
    mainNav: 'Main Navigation',
    feed: 'Feed',
    map: 'Map',
    events: 'Events',
    myActivities: 'My Activities',
    rsvps: 'My RSVPs',
    reservations: 'Reservations',
    saved: 'Saved Events',
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
  
  const currentPath = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab');

  const mainNavItems = [
    { title: t.feed, url: '/feed', icon: Home },
    { title: t.map, url: '/xartis', icon: MapPin },
    { title: t.events, url: '/ekdiloseis', icon: Calendar },
  ];

  const activityItems = [
    { title: t.rsvps, url: '/dashboard-user?tab=rsvps', icon: Calendar, tab: 'rsvps' },
    { title: t.reservations, url: '/dashboard-user?tab=reservations', icon: CalendarCheck, tab: 'reservations' },
    { title: t.saved, url: '/dashboard-user?tab=saved', icon: Heart, tab: 'saved' },
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
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t.mainNav}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isItemActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-2">
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
                    <NavLink to={item.url} className="flex items-center gap-2">
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
                    <NavLink to={item.url} className="flex items-center gap-2">
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
