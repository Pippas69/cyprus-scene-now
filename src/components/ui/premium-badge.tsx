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
export const PremiumBadge = ({ type, className = "" }: PremiumBadgeProps) => {
  if (type === "event") {
    return (
      <div 
        className={`
          inline-flex items-center justify-center 
          w-7 h-7 rounded-full 
          bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600
          shadow-[0_0_12px_rgba(251,191,36,0.6)]
          ring-2 ring-amber-300/50
          ${className}
        `}
      >
        <Crown className="h-3.5 w-3.5 text-white drop-shadow-sm" />
      </div>
    );
  }

  // Offer badge
  return (
    <div 
      className={`
        inline-flex items-center justify-center 
        w-7 h-7 rounded-full 
        bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600
        shadow-[0_0_12px_rgba(52,211,153,0.6)]
        ring-2 ring-emerald-300/50
        ${className}
      `}
    >
      <Sparkles className="h-3.5 w-3.5 text-white drop-shadow-sm" />
    </div>
  );
};

export default PremiumBadge;
