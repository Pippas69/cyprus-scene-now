import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { Calendar, Percent, TrendingUp, Settings, Users, CreditCard, Zap, Ticket, LayoutGrid, Megaphone } from "lucide-react";
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
    analytics: "Analytics & CRM",
    promoters: "Promoters",
    content: "Περιεχόμενο",
    posts: "Posts",
    events: "Εκδηλώσεις",
    offers: "Προσφορές",
    reservations: "Διαχείριση",
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
    analytics: "Analytics & CRM",
    promoters: "Promoters",
    content: "Content",
    posts: "Posts",
    events: "Events",
    offers: "Offers",
    reservations: "Management",
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
  promotersEnabled?: boolean;
}

export function BusinessSidebar({ businessCategories, floorPlanEnabled, planSlug, promotersEnabled }: BusinessSidebarProps) {
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
  // CRM is now integrated into the Insights & CRM page (analytics tab)
  const crmItem: { title: string; url: string; icon: React.ElementType }[] = [];

  const promotersItem = promotersEnabled
    ? [{ title: t.promoters, url: "/dashboard-business/promoters", icon: Megaphone }]
    : [];

  const contentItems = showOffers
    ? [
        { title: reservationLabel, url: "/dashboard-business/reservations", icon: Users },
        { title: eventsLabel, url: "/dashboard-business/events", icon: Calendar },
        { title: t.offers, url: "/dashboard-business/offers", icon: Percent },
        ...(floorPlanEnabled ? [{ title: t.floorPlan, url: "/dashboard-business/floor-plan", icon: LayoutGrid }] : []),
        { title: t.analytics, url: "/dashboard-business/analytics", icon: TrendingUp },
        ...promotersItem,
        ...crmItem,
      ]
    : [
        { title: eventsLabel, url: "/dashboard-business/events", icon: Calendar },
        { title: reservationLabel, url: "/dashboard-business/reservations", icon: isPerformance ? Ticket : Users },
        ...(floorPlanEnabled ? [{ title: t.floorPlan, url: "/dashboard-business/floor-plan", icon: LayoutGrid }] : []),
        { title: t.analytics, url: "/dashboard-business/analytics", icon: TrendingUp },
        ...promotersItem,
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
