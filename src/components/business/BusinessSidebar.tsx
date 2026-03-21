import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { Calendar, Percent, TrendingUp, Settings, Users, CreditCard, Zap, Ticket, LayoutGrid, UserSearch } from "lucide-react";
import { isPerformanceBusiness } from "@/lib/isClubOrEventBusiness";
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
    analytics: "Insights & CRM",
    content: "Περιεχόμενο",
    posts: "Posts",
    events: "Εκδηλώσεις",
    offers: "Προσφορές",
    reservations: "Κρατήσεις",
    floorPlan: "Σχεδιάγραμμα",
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
    analytics: "Insights & CRM",
    content: "Content",
    posts: "Posts",
    events: "Events",
    offers: "Offers",
    reservations: "Reservations",
    floorPlan: "Floor plan",
    business: "Business",
    subscription: "Subscription",
    boosts: "Boosts",
    profile: "Profile",
    settings: "Settings",
  },
};

interface BusinessSidebarProps {
  businessCategories: string[];
  floorPlanEnabled?: boolean;
  planSlug?: string;
}

export function BusinessSidebar({ businessCategories, floorPlanEnabled, planSlug }: BusinessSidebarProps) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const { language } = useLanguage();
  const t = translations[language];

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  

  // Categories that should NOT see Offers
  const normalizedCategories = businessCategories.map((cat) => cat.toLowerCase());
  const noOffersCategories = ['clubs', 'events', 'theatre', 'music', 'dance', 'kids'];
  const showOffers = !normalizedCategories.some((cat) => noOffersCategories.includes(cat));
  const isPerformance = isPerformanceBusiness(businessCategories);
  const reservationLabel = isPerformance
    ? (language === 'el' ? 'Εισιτήρια' : 'Tickets')
    : t.reservations;

  const eventsLabel = isPerformance
    ? (language === 'el' ? 'Παραστάσεις' : 'Productions')
    : t.events;

  // For bars/pubs/dining: Reservations → Events → Offers → Analytics
  // For clubs/events/performances: Events → Reservations → Analytics
  const crmItem = planSlug === 'elite' ? [{ title: language === 'el' ? 'CRM' : 'CRM', url: "/dashboard-business/crm", icon: UserSearch }] : [];

  const contentItems = showOffers
    ? [
        { title: reservationLabel, url: "/dashboard-business/reservations", icon: Users },
        { title: eventsLabel, url: "/dashboard-business/events", icon: Calendar },
        { title: t.offers, url: "/dashboard-business/offers", icon: Percent },
        ...(floorPlanEnabled ? [{ title: t.floorPlan, url: "/dashboard-business/floor-plan", icon: LayoutGrid }] : []),
        { title: t.analytics, url: "/dashboard-business/analytics", icon: TrendingUp },
        ...crmItem,
      ]
    : [
        { title: eventsLabel, url: "/dashboard-business/events", icon: Calendar },
        { title: reservationLabel, url: "/dashboard-business/reservations", icon: isPerformance ? Ticket : Users },
        ...(floorPlanEnabled ? [{ title: t.floorPlan, url: "/dashboard-business/floor-plan", icon: LayoutGrid }] : []),
        { title: t.analytics, url: "/dashboard-business/analytics", icon: TrendingUp },
        ...crmItem,
      ];

  const businessItems = [
    { title: t.subscription, url: "/dashboard-business/subscription", icon: CreditCard },
    { title: t.boosts, url: "/dashboard-business/boosts", icon: Zap },
    { title: t.settings, url: "/dashboard-business/settings", icon: Settings },
  ];

  return (
    <Sidebar className={state === "collapsed" ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
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
                      end={item.url === "/dashboard-business"}
                      className="flex items-center gap-3"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                      onClick={handleLinkClick}
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
                      onClick={handleLinkClick}
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
