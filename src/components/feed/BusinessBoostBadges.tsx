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
  // Student discount badges only show when filter is active
  showStudentDiscount?: boolean;
  studentDiscountPercent?: number | null;
  studentDiscountMode?: "once" | "unlimited" | string | null;
  language?: "el" | "en";
}

const tooltips = {
  el: {
    event: "Έχει boosted event",
    offer: "Έχει boosted προσφορά",
    student: (percent?: number | null, mode?: string | null) =>
      `Φοιτητική έκπτωση${percent ? ` ${percent}%` : ""}${mode ? ` (${mode === "unlimited" ? "απεριόριστη" : "μια φορά"})` : ""}`,
  },
  en: {
    event: "Has boosted event",
    offer: "Has boosted offer",
    student: (percent?: number | null, mode?: string | null) =>
      `Student discount${percent ? ` ${percent}%` : ""}${mode ? ` (${mode === "unlimited" ? "unlimited" : "once"})` : ""}`,
  },
} as const;

export const BusinessBoostBadges = ({
  hasEventBoost,
  hasOfferBoost,
  showStudentDiscount = false,
  studentDiscountPercent,
  studentDiscountMode,
  language = "en",
}: BusinessBoostBadgesProps) => {
  const t = tooltips[language];
  // Only show student badge when filter is active AND business has discount
  const hasStudentDiscount = showStudentDiscount && (studentDiscountPercent ?? 0) > 0;

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
            <div className="absolute -top-1 -left-1 bg-emerald-500 rounded-full p-0.5 ring-2 ring-background shadow-sm z-10">
              <Tag className="h-3 w-3 text-white" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {t.offer}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Student discount - bottom left - ONLY when filter is active */}
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
