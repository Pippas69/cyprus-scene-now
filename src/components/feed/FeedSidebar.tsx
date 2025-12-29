import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  Calendar, 
  Building2, 
  Wine, 
  Umbrella, 
  Map, 
  Heart, 
  Settings, 
  Tag,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  LogIn
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useState } from "react";

interface FeedSidebarProps {
  language: "el" | "en";
  user: any;
  className?: string;
}

const FeedSidebar = ({ language, user, className }: FeedSidebarProps) => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const translations = {
    el: {
      home: "Αρχική",
      events: "Εκδηλώσεις",
      venues: "Χώροι",
      bars: "Μπαρ",
      beachBars: "Beach Bars",
      map: "Χάρτης",
      offers: "Προσφορές",
      favorites: "Αγαπημένα",
      settings: "Ρυθμίσεις",
      login: "Σύνδεση",
      darkMode: "Σκοτεινό",
      lightMode: "Φωτεινό",
    },
    en: {
      home: "Home",
      events: "Events",
      venues: "Venues",
      bars: "Bars",
      beachBars: "Beach Bars",
      map: "Map",
      offers: "Offers",
      favorites: "Favorites",
      settings: "Settings",
      login: "Login",
      darkMode: "Dark Mode",
      lightMode: "Light Mode",
    },
  };

  const t = translations[language];

  const mainNavItems = [
    { icon: Home, label: t.home, href: "/feed", active: location.pathname === "/feed" },
    { icon: Calendar, label: t.events, href: "/ekdiloseis", active: location.pathname === "/ekdiloseis" },
    { icon: Building2, label: t.venues, href: "/feed?category=cafe", active: false },
    { icon: Wine, label: t.bars, href: "/feed?category=nightlife", active: false },
    { icon: Umbrella, label: t.beachBars, href: "/feed?category=travel", active: false },
    { icon: Map, label: t.map, href: "/xartis", active: location.pathname === "/xartis" },
    { icon: Tag, label: t.offers, href: "/feed?tab=offers", active: false },
  ];

  const userNavItems = user ? [
    { icon: Heart, label: t.favorites, href: "/dashboard-user?tab=events", active: false },
    { icon: Settings, label: t.settings, href: "/dashboard-user?tab=settings", active: false },
  ] : [
    { icon: LogIn, label: t.login, href: "/login", active: false },
  ];

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-[calc(100vh-4rem)] sticky top-16",
        "bg-card border-r border-border",
        "transition-all duration-300 ease-out",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border bg-card shadow-sm"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {mainNavItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl",
              "transition-all duration-200",
              "hover:bg-accent group",
              item.active && "bg-ocean/10 text-ocean",
              collapsed && "justify-center"
            )}
          >
            <item.icon
              className={cn(
                "h-5 w-5 shrink-0",
                item.active ? "text-ocean" : "text-card-foreground/80 dark:text-gray-200 group-hover:text-card-foreground"
              )}
            />
            {!collapsed && (
              <span
                className={cn(
                  "text-sm font-medium",
                  item.active ? "text-ocean" : "text-card-foreground dark:text-gray-100"
                )}
              >
                {item.label}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t border-border" />

      {/* User Navigation */}
      <nav className="p-3 space-y-1">
        {userNavItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl",
              "transition-all duration-200",
              "hover:bg-accent group",
              collapsed && "justify-center"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0 text-card-foreground/80 dark:text-gray-200 group-hover:text-card-foreground" />
            {!collapsed && (
              <span className="text-sm font-medium text-card-foreground dark:text-gray-100">{item.label}</span>
            )}
          </Link>
        ))}
      </nav>

      {/* Theme Toggle */}
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className={cn(
            "w-full justify-start gap-3 px-3 py-2.5 rounded-xl",
            "hover:bg-accent",
            collapsed && "justify-center"
          )}
        >
          {theme === "dark" ? (
            <>
              <Sun className="h-5 w-5 text-card-foreground dark:text-gray-200" />
              {!collapsed && <span className="text-sm font-medium text-card-foreground dark:text-gray-100">{t.lightMode}</span>}
            </>
          ) : (
            <>
              <Moon className="h-5 w-5 text-card-foreground dark:text-gray-200" />
              {!collapsed && <span className="text-sm font-medium text-card-foreground dark:text-gray-100">{t.darkMode}</span>}
            </>
          )}
        </Button>
      </div>
    </aside>
  );
};

export default FeedSidebar;
