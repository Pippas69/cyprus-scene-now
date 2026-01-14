import { CalendarHeart, Tag, GraduationCap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BusinessBoostBadgesProps {
  hasEventBoost?: boolean;
  hasOfferBoost?: boolean;
  studentDiscountPercent?: number | null;
  studentDiscountMode?: "once" | "unlimited" | string | null;
  language?: "el" | "en";
}

const tooltips = {
  el: {
    event: "Έχει ενεργό event",
    offer: "Έχει ενεργή προσφορά",
    student: (percent?: number | null, mode?: string | null) =>
      `Φοιτητική έκπτωση${percent ? ` ${percent}%` : ""}${mode ? ` (${mode === "unlimited" ? "απεριόριστη" : "μια φορά"})` : ""}`,
  },
  en: {
    event: "Has active event",
    offer: "Has active offer",
    student: (percent?: number | null, mode?: string | null) =>
      `Student discount${percent ? ` ${percent}%` : ""}${mode ? ` (${mode === "unlimited" ? "unlimited" : "once"})` : ""}`,
  },
} as const;

export const BusinessBoostBadges = ({
  hasEventBoost,
  hasOfferBoost,
  studentDiscountPercent,
  studentDiscountMode,
  language = "en",
}: BusinessBoostBadgesProps) => {
  const t = tooltips[language];
  const hasStudentDiscount = (studentDiscountPercent ?? 0) > 0;

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

      {/* Student discount - bottom left */}
      {hasStudentDiscount && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="absolute -bottom-1 -left-1 bg-primary rounded-full p-0.5 ring-2 ring-background shadow-sm z-10">
              <GraduationCap className="h-3 w-3 text-primary-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {t.student(studentDiscountPercent, studentDiscountMode)}
          </TooltipContent>
        </Tooltip>
      )}
    </TooltipProvider>
  );
};

export default BusinessBoostBadges;

