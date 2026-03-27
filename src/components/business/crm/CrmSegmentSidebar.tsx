import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";
import { Users, RefreshCw, UserPlus, AlertTriangle, XCircle, DollarSign } from "lucide-react";
import type { Segment } from "./CrmSegmentDropdown";

interface CrmSegmentSidebarProps {
  segment: Segment;
  onSegmentChange: (segment: Segment) => void;
  guestCount: number;
}

const translations = {
  el: {
    segments: "Segments",
    all: "Όλοι",
    regulars: "Τακτικοί",
    new: "Νέοι",
    at_risk: "Σε κίνδυνο",
    no_show_risk: "No-show risk",
    high_spenders: "Υψηλή δαπάνη",
  },
  en: {
    segments: "Segments",
    all: "All guests",
    regulars: "Regulars",
    new: "New",
    at_risk: "At risk",
    no_show_risk: "No-show risk",
    high_spenders: "High spenders",
  },
};

const segmentConfig: { key: Segment; icon: React.ElementType }[] = [
  { key: "all", icon: Users },
  { key: "regulars", icon: RefreshCw },
  { key: "new", icon: UserPlus },
  { key: "at_risk", icon: AlertTriangle },
  { key: "no_show_risk", icon: XCircle },
  { key: "high_spenders", icon: DollarSign },
];

export function CrmSegmentSidebar({ segment, onSegmentChange, guestCount }: CrmSegmentSidebarProps) {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div className="p-2 space-y-0.5">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 py-1.5">
        {t.segments}
      </p>
      {segmentConfig.map(({ key, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onSegmentChange(key)}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors",
            "hover:bg-accent",
            segment === key
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground"
          )}
        >
          <Icon className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{t[key]}</span>
        </button>
      ))}
    </div>
  );
}
