import { useEffect, useState, useCallback } from 'react';
import { LayoutDashboard, Ticket, Wallet } from 'lucide-react';
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
    overview: 'Επισκόπηση',
    eventsLinks: 'Events & Links',
    earnings: 'Τα Κέρδη μου',
  },
  en: {
    overview: 'Overview',
    eventsLinks: 'Events & Links',
    earnings: 'My Earnings',
  },
};

export function PromoterSidebar() {
  const { language } = useLanguage();
  const t = translations[language];
  const { open, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userName, setUserName] = useState('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  const items = [
    { title: t.overview, url: '/dashboard-promoter', icon: LayoutDashboard, exact: true },
    { title: t.eventsLinks, url: '/dashboard-promoter/events', icon: Ticket, exact: false },
    { title: t.earnings, url: '/dashboard-promoter/earnings', icon: Wallet, exact: false },
  ];

  const isActive = (url: string, exact: boolean) =>
    exact ? location.pathname === url : location.pathname.startsWith(url);

  const handleClick = useCallback((url: string) => {
    if (isMobile) setOpenMobile(false);
    navigate(url);
  }, [isMobile, navigate, setOpenMobile]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className={`flex items-center gap-3 px-2 py-4 text-sidebar-foreground ${!open && 'justify-center'}`}>
          <Avatar className={`${open ? 'h-10 w-10' : 'h-8 w-8'}`}>
            <AvatarImage src={userAvatar || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {userName.charAt(0).toUpperCase() || 'P'}
            </AvatarFallback>
          </Avatar>
          {open && (
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">PR · {user?.email}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    isActive={isActive(item.url, item.exact)}
                    onClick={() => handleClick(item.url)}
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
      </SidebarContent>
    </Sidebar>
  );
}
