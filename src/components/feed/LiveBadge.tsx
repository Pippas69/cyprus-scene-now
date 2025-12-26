import { TrendingUp, Radio, Clock, Flame, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
          className: "bg-gradient-to-r from-ocean to-seafoam text-white border-0",
          glowClass: "badge-glow-trending",
          animate: true,
        };
      case "live":
        return {
          label: t.live,
          icon: Radio,
          className: "bg-gradient-to-r from-red-500 to-rose-500 text-white border-0",
          glowClass: "badge-glow-hot",
          animate: true,
        };
      case "ending-soon":
        return {
          label: t.endingSoon,
          icon: Clock,
          className: "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0",
          glowClass: "",
          animate: false,
        };
      case "hot":
        return {
          label: t.hot,
          icon: Flame,
          className: "bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 text-white border-0",
          glowClass: "badge-glow-hot",
          animate: true,
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 25,
        delay: 0.1 
      }}
      className={cn("absolute top-3 left-3 z-20", className)}
    >
      <Badge
        className={cn(
          "flex items-center gap-1.5 font-bold shadow-lg px-2.5 py-1",
          "backdrop-blur-sm",
          config.className,
          config.glowClass
        )}
      >
        {config.animate ? (
          <motion.span
            animate={{ 
              scale: [1, 1.2, 1],
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="flex items-center"
          >
            <Icon className="h-3.5 w-3.5" />
          </motion.span>
        ) : (
          <Icon className="h-3.5 w-3.5" />
        )}
        <span className="text-xs tracking-wide">{config.label}</span>
        
        {/* Sparkle decoration for hot/trending */}
        {(type === "hot" || type === "trending") && (
          <motion.span
            animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="h-3 w-3 ml-0.5" />
          </motion.span>
        )}
      </Badge>
    </motion.div>
  );
};

export default LiveBadge;
