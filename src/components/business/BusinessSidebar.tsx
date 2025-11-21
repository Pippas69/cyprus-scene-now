import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { Calendar, Ticket, TrendingUp, MapPin, User, Settings, Users, Home, QrCode } from "lucide-react";
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
} from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/useLanguage";

const translations = {
  el: {
    dashboard: "Dashboard",
    overview: "Επισκόπηση",
    feed: "Feed",
    map: "Χάρτης",
    analytics: "Αναλυτικά",
    qrAnalytics: "Στατιστικά QR",
    content: "Περιεχόμενο",
    events: "Εκδηλώσεις",
    offers: "Προσφορές",
    customers: "Πελάτες",
    reservations: "Κρατήσεις",
    business: "Επιχείρηση",
    profile: "Προφίλ",
    settings: "Ρυθμίσεις",
  },
  en: {
    dashboard: "Dashboard",
    overview: "Overview",
    feed: "Feed",
    map: "Map",
    analytics: "Analytics",
    qrAnalytics: "QR Analytics",
    content: "Content",
    events: "Events",
    offers: "Offers",
    customers: "Customers",
    reservations: "Reservations",
    business: "Business",
    profile: "Profile",
    settings: "Settings",
  },
};

export function BusinessSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { language } = useLanguage();
  const t = translations[language];

  const isActive = (path: string) => location.pathname === path;

  const dashboardItems = [
    { title: t.feed, url: "/dashboard-business", icon: Home },
    { title: t.map, url: "/dashboard-business/map", icon: MapPin },
    { title: t.analytics, url: "/dashboard-business/analytics", icon: TrendingUp },
    { title: t.qrAnalytics, url: "/dashboard-business/qr-analytics", icon: QrCode },
  ];

  const contentItems = [
    { title: t.events, url: "/dashboard-business/events", icon: Calendar },
    { title: t.offers, url: "/dashboard-business/offers", icon: Ticket },
  ];

  const customerItems = [
    { title: t.reservations, url: "/dashboard-business/reservations", icon: Users },
  ];

  const businessItems = [
    { title: t.profile, url: "/dashboard-business/profile", icon: User },
    { title: t.settings, url: "/dashboard-business/settings", icon: Settings },
  ];

  return (
    <Sidebar className={state === "collapsed" ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        {/* Dashboard Overview */}
        <SidebarGroup>
          <SidebarGroupLabel>{t.overview}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dashboardItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Content Management */}
        <SidebarGroup>
          <SidebarGroupLabel>{t.content}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {contentItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Customer Management */}
        <SidebarGroup>
          <SidebarGroupLabel>{t.customers}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {customerItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Business Settings */}
        <SidebarGroup>
          <SidebarGroupLabel>{t.business}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {businessItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {state !== "collapsed" && <span>{item.title}</span>}
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
