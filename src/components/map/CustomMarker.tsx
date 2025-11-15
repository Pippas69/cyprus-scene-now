import { getCategoryColor, isEventHappeningNow } from "@/lib/mapUtils";
import { Coffee, Moon, Palette, Dumbbell, Users, Briefcase, Sparkles, Plane } from "lucide-react";

interface CustomMarkerProps {
  category: string[];
  isHappeningNow: boolean;
  onClick: () => void;
}

const getCategoryIcon = (category: string) => {
  const icons: Record<string, any> = {
    cafe: Coffee,
    nightlife: Moon,
    art: Palette,
    fitness: Dumbbell,
    family: Users,
    business: Briefcase,
    lifestyle: Sparkles,
    travel: Plane,
  };
  return icons[category] || Coffee;
};

export const CustomMarker = ({ category, isHappeningNow, onClick }: CustomMarkerProps) => {
  const primaryCategory = category[0] || "cafe";
  const color = getCategoryColor(primaryCategory);
  const Icon = getCategoryIcon(primaryCategory);

  return (
    <div
      onClick={onClick}
      className="relative cursor-pointer transition-transform hover:scale-110 hover:-translate-y-1 group"
    >
      {/* Pulsing ring for live events */}
      {isHappeningNow && (
        <div className="absolute inset-0 animate-ping">
          <svg width="40" height="50" viewBox="0 0 40 50" className="drop-shadow-lg">
            <path
              d="M20 2 C10 2, 2 10, 2 20 C2 30, 20 48, 20 48 C20 48, 38 30, 38 20 C38 10, 30 2, 20 2 Z"
              fill={color}
              fillOpacity="0.3"
            />
          </svg>
        </div>
      )}

      {/* Main marker */}
      <svg
        width="40"
        height="50"
        viewBox="0 0 40 50"
        className="drop-shadow-lg transition-all group-hover:drop-shadow-2xl"
      >
        {/* Shadow */}
        <ellipse cx="20" cy="47" rx="8" ry="3" fill="black" fillOpacity="0.2" />
        
        {/* Pin shape */}
        <defs>
          <linearGradient id={`gradient-${primaryCategory}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.8" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        <path
          d="M20 2 C10 2, 2 10, 2 20 C2 30, 20 48, 20 48 C20 48, 38 30, 38 20 C38 10, 30 2, 20 2 Z"
          fill={`url(#gradient-${primaryCategory})`}
          stroke="white"
          strokeWidth="2"
          filter={isHappeningNow ? "url(#glow)" : undefined}
        />
        
        {/* Icon circle background */}
        <circle cx="20" cy="18" r="10" fill="white" fillOpacity="0.95" />
      </svg>

      {/* Icon */}
      <div className="absolute top-[10px] left-1/2 -translate-x-1/2 pointer-events-none">
        <Icon size={16} color={color} strokeWidth={2.5} />
      </div>

      {/* Live indicator badge */}
      {isHappeningNow && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-lg animate-pulse">
          LIVE
        </div>
      )}
    </div>
  );
};
