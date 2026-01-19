import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { Calendar, Percent, TrendingUp, MapPin, Settings, Users, Home, CreditCard, Zap } from "lucide-react";
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
    content: "Περιεχόμενο",
    posts: "Posts",
    events: "Εκδηλώσεις",
    offers: "Προσφορές",
    reservations: "Κρατήσεις",
    business: "Επιχείρηση",
    subscription: "Συνδρομή",
    boosts: "Προωθήσεις",
    profile: "Προφίλ",
    settings: "Ρυθμίσεις",
  },
  en: {
    dashboard: "Dashboard",
    overview: "Overview",
    feed: "Feed",
    map: "Map",
    analytics: "Analytics",
    content: "Content",
    posts: "Posts",
    events: "Events",
    offers: "Offers",
    reservations: "Reservations",
    business: "Business",
    subscription: "Subscription",
    boosts: "Boosts",
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
  ];

  const contentItems = [
    // Posts feature hidden but kept in code
    // { title: t.posts, url: "/dashboard-business/posts", icon: PenSquare },
    { title: t.events, url: "/dashboard-business/events", icon: Calendar },
    { title: t.offers, url: "/dashboard-business/offers", icon: Percent },
    { title: t.reservations, url: "/dashboard-business/reservations", icon: Users },
  ];

  const businessItems = [
    { title: t.subscription, url: "/dashboard-business/subscription", icon: CreditCard },
    { title: t.boosts, url: "/dashboard-business/boosts", icon: Zap },
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
