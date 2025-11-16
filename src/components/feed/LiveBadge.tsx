import { TrendingUp, Radio, Clock, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LiveBadgeProps {
  type: "trending" | "live" | "ending-soon" | "hot";
  language: "el" | "en";
  className?: string;
}

const LiveBadge = ({ type, language, className }: LiveBadgeProps) => {
  const translations = {
    el: {
      trending: "Τάση Τώρα",
      live: "ΖΩΝΤΑΝΑ",
      endingSoon: "Τελειώνει Σύντομα",
      hot: "HOT",
    },
    en: {
      trending: "Trending Now",
      live: "LIVE",
      endingSoon: "Ending Soon",
      hot: "HOT",
    },
  };

  const t = translations[language];

  const getConfig = () => {
    switch (type) {
      case "trending":
        return {
          label: t.trending,
          icon: TrendingUp,
          className: "bg-blue-500 text-white border-blue-400",
          animate: false,
        };
      case "live":
        return {
          label: t.live,
          icon: Radio,
          className: "bg-red-500 text-white border-red-400",
          animate: true,
        };
      case "ending-soon":
        return {
          label: t.endingSoon,
          icon: Clock,
          className: "bg-orange-500 text-white border-orange-400",
          animate: false,
        };
      case "hot":
        return {
          label: t.hot,
          icon: Flame,
          className: "bg-gradient-to-r from-red-500 to-orange-500 text-white border-red-400",
          animate: true,
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <Badge
      className={cn(
        "absolute top-2 right-2 z-10 flex items-center gap-1 font-bold shadow-lg",
        config.className,
        config.animate && "animate-pulse",
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

export default LiveBadge;
