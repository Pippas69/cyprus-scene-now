import { Star, Crown, GraduationCap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger } from
"@/components/ui/tooltip";

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

type NormalizedPlan = "free" | "basic" | "pro" | "elite";

const tooltips = {
  el: {
    student: (percent?: number | null, mode?: string | null) =>
    `Φοιτητική έκπτωση${percent ? ` ${percent}%` : ""}${mode ? ` (${mode === "unlimited" ? "απεριόριστη" : "μια φορά"})` : ""}`
  },
  en: {
    student: (percent?: number | null, mode?: string | null) =>
    `Student discount${percent ? ` ${percent}%` : ""}${mode ? ` (${mode === "unlimited" ? "unlimited" : "once"})` : ""}`
  }
} as const;

export const BusinessBoostBadges = ({
  planSlug,
  showStudentDiscount = false,
  studentDiscountPercent,
  studentDiscountMode,
  language = "en"
}: BusinessBoostBadgesProps) => {
  const t = tooltips[language];
  const hasStudentDiscount = showStudentDiscount && (studentDiscountPercent ?? 0) > 0;
  const normalizedPlan = ((): NormalizedPlan => {
    const value = planSlug?.toLowerCase().trim();
    if (value === "elite" || value === "professional" || value === "premium") return "elite";
    if (value === "pro" || value === "growth") return "pro";
    if (value === "basic" || value === "starter") return "basic";
    return "free";
  })();

  const planConfig = {
    free: {
      short: "F",
      colorVar: "--ocean",
      label: { el: "Free Plan", en: "Free Plan" },
    },
    basic: {
      short: "B",
      colorVar: "--plan-basic",
      label: { el: "Basic Plan", en: "Basic Plan" },
    },
    pro: {
      short: "P",
      colorVar: "--plan-pro",
      label: { el: "Pro Plan", en: "Pro Plan" },
    },
    elite: {
      short: "E",
      colorVar: "--plan-elite",
      label: { el: "Elite Plan", en: "Elite Plan" },
    },
  }[normalizedPlan];

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="absolute -top-1 -right-1 z-10 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-background px-1 shadow-sm"
            style={{
              backgroundColor: `hsl(var(${planConfig.colorVar}))`,
              color: "hsl(var(--primary-foreground))",
              boxShadow: `0 4px 12px hsl(var(${planConfig.colorVar}) / 0.35)`,
            }}
            aria-label={planConfig.label[language]}
          >
            {normalizedPlan === "elite" ? (
              <Crown className="h-3 w-3" />
            ) : normalizedPlan === "pro" ? (
              <Star className="h-3 w-3" />
            ) : (
              <span className="text-[9px] font-bold leading-none">{planConfig.short}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {planConfig.label[language]}
        </TooltipContent>
      </Tooltip>

      {hasStudentDiscount &&
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
      }
    </TooltipProvider>);

};

export default BusinessBoostBadges;