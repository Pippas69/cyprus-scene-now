import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckCircle, 
  Users, 
  BarChart3, 
  Flag, 
  Settings, 
  MapPin,
  Database,
  Ticket,
  ClipboardList
} from 'lucide-react';
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
} from '@/components/ui/sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import { adminTranslations } from '@/translations/adminTranslations';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export const AdminSidebar = () => {
  const { language } = useLanguage();
  const location = useLocation();
  const t = adminTranslations[language];
  const [userId, setUserId] = useState<string>();
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);

  const { data: profile } = useUserProfile(userId);

  const menuItems = [
    {
      title: t.sidebar.dashboard,
      icon: LayoutDashboard,
      href: '/admin',
    },
    {
      title: t.sidebar.verification,
      icon: CheckCircle,
      href: '/admin/verification',
    },
    {
      title: t.sidebar.users,
      icon: Users,
      href: '/admin/users',
    },
    {
      title: t.sidebar.analytics,
      icon: BarChart3,
      href: '/admin/analytics',
    },
    {
      title: t.sidebar.reports,
      icon: Flag,
      href: '/admin/reports',
    },
    {
      title: t.sidebar.settings,
      icon: Settings,
      href: '/admin/settings',
    },
    {
      title: t.sidebar.geocoding,
      icon: MapPin,
      href: '/admin/geocoding',
    },
    {
      title: 'Database',
      icon: Database,
      href: '/admin/database',
    },
    {
      title: language === 'el' ? 'Διαχείριση Beta' : 'Beta Management',
      icon: Ticket,
      href: '/admin/beta',
    },
    {
      title: t.sidebar.waitlist,
      icon: ClipboardList,
      href: '/admin/waitlist',
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="h-8 w-8 rounded bg-gradient-to-br from-[#0D3B66] to-[#4ECDC4] flex items-center justify-center">
            <span className="text-xs font-bold text-white">Φ</span>
          </div>
          <div>
            <p className="text-sm font-semibold">Admin Panel</p>
            <p className="text-xs text-muted-foreground">ΦΟΜΟ</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="w-full"
                    >
                      <Link to={item.href} className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-3 px-4 py-3 border-t">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback>{profile?.name?.[0] || 'A'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.name || 'Admin'}</p>
            <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
