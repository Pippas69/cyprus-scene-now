import { CalendarHeart, Tag } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BusinessBoostBadgesProps {
  hasEventBoost?: boolean;
  hasOfferBoost?: boolean;
  language?: "el" | "en";
}

const tooltips = {
  el: {
    event: "Έχει ενεργό event",
    offer: "Έχει ενεργή προσφορά",
  },
  en: {
    event: "Has active event",
    offer: "Has active offer",
  },
};

export const BusinessBoostBadges = ({
  hasEventBoost,
  hasOfferBoost,
  language = "en",
}: BusinessBoostBadgesProps) => {
  const t = tooltips[language];

  return (
    <TooltipProvider delayDuration={300}>
      {/* Event boost - top right */}
      {hasEventBoost && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 ring-2 ring-background shadow-sm z-10">
              <CalendarHeart className="h-3 w-3 text-white" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {t.event}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Offer boost - top left */}
      {hasOfferBoost && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="absolute -top-1 -left-1 bg-green-500 rounded-full p-0.5 ring-2 ring-background shadow-sm z-10">
              <Tag className="h-3 w-3 text-white" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {t.offer}
          </TooltipContent>
        </Tooltip>
      )}
    </TooltipProvider>
  );
};

export default BusinessBoostBadges;
