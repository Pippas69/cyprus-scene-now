import { Star, Crown, GraduationCap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BusinessBoostBadgesProps {
  // Legacy props (no longer used for boost badges)
  hasEventBoost?: boolean;
  hasOfferBoost?: boolean;
  // Plan-based badge
  planSlug?: string | null;
  // Student discount badges only show when filter is active
  showStudentDiscount?: boolean;
  studentDiscountPercent?: number | null;
  studentDiscountMode?: "once" | "unlimited" | string | null;
  language?: "el" | "en";
}

const tooltips = {
  el: {
    student: (percent?: number | null, mode?: string | null) =>
      `Φοιτητική έκπτωση${percent ? ` ${percent}%` : ""}${mode ? ` (${mode === "unlimited" ? "απεριόριστη" : "μια φορά"})` : ""}`,
  },
  en: {
    student: (percent?: number | null, mode?: string | null) =>
      `Student discount${percent ? ` ${percent}%` : ""}${mode ? ` (${mode === "unlimited" ? "unlimited" : "once"})` : ""}`,
  },
} as const;

export const BusinessBoostBadges = ({
  planSlug,
  showStudentDiscount = false,
  studentDiscountPercent,
  studentDiscountMode,
  language = "en",
}: BusinessBoostBadgesProps) => {
  const t = tooltips[language];
  // Only show student badge when filter is active AND business has discount
  const hasStudentDiscount = showStudentDiscount && (studentDiscountPercent ?? 0) > 0;

  // Normalize plan slug
  const normalizedPlan = planSlug?.toLowerCase() || 'free';
  const isPro = normalizedPlan === 'pro' || normalizedPlan === 'growth';
  const isElite = normalizedPlan === 'elite' || normalizedPlan === 'professional';

  // Don't show any badge for Free or Basic plans
  const showPlanBadge = isPro || isElite;

  return (
    <TooltipProvider delayDuration={300}>
      {/* Plan badge - top right (only Pro and Elite) */}
      {showPlanBadge && (
        // NOTE: Icon-only (no plan text) by requirement.
        <div
          className={`absolute -top-1 -right-1 rounded-full p-0.5 ring-2 ring-background shadow-sm z-10 ${
            isElite
              ? "bg-gradient-to-br from-amber-400 to-yellow-600"
              : "bg-gradient-to-br from-primary to-sunset-coral"
          }`}
          aria-hidden
        >
          {isElite ? (
            <Crown className="h-2.5 w-2.5 text-white" />
          ) : (
            <Star className="h-2.5 w-2.5 text-white" />
          )}
        </div>
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
