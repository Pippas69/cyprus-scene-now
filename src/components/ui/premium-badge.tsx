import { memo } from "react";
import { Sparkles, Crown } from "lucide-react";

interface PremiumBadgeProps {
  type: "event" | "offer";
  className?: string;
}

/**
 * Premium Badge Component for Boosted Content
 * - Events: Golden/Amber gradient with crown icon
 * - Offers: Emerald/Teal gradient with sparkles icon
 */
export const PremiumBadge = memo(({ type, className = "" }: PremiumBadgeProps) => {
  if (type === "event") {
    return (
      <div 
        className={`
          inline-flex items-center justify-center 
          w-6 h-6 rounded-full 
          bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600
          ${className}
        `}
      >
        <Crown className="h-3 w-3 text-white drop-shadow-sm" />
      </div>
    );
  }

  // Offer badge
  return (
      <div 
        className={`
          inline-flex items-center justify-center 
          w-6 h-6 rounded-full 
          bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600
          ${className}
      `}
    >
      <Sparkles className="h-3 w-3 text-white drop-shadow-sm" />
    </div>
  );
});
PremiumBadge.displayName = "PremiumBadge";

export default PremiumBadge;
