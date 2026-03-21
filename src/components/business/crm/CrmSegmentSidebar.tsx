import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";
import { Users, Star, RefreshCw, UserPlus, AlertTriangle, Skull, XCircle, DollarSign, Cake } from "lucide-react";

type Segment = "all" | "vip" | "regulars" | "new" | "at_risk" | "churned" | "no_show_risk" | "high_spenders" | "birthday_week";

interface CrmSegmentSidebarProps {
  segment: Segment;
  onSegmentChange: (segment: Segment) => void;
  guestCount: number;
}

const translations = {
  el: {
    segments: "Segments",
    all: "Όλοι",
    vip: "VIP",
    regulars: "Τακτικοί",
    new: "Νέοι",
    at_risk: "Σε κίνδυνο",
    churned: "Ανενεργοί",
    no_show_risk: "No-show risk",
    high_spenders: "Υψηλή δαπάνη",
    birthday_week: "Γενέθλια",
  },
  en: {
    segments: "Segments",
    all: "All guests",
    vip: "VIP",
    regulars: "Regulars",
    new: "New",
    at_risk: "At risk",
    churned: "Churned",
    no_show_risk: "No-show risk",
    high_spenders: "High spenders",
    birthday_week: "Birthday",
  },
};

const segmentConfig: { key: Segment; icon: React.ElementType }[] = [
  { key: "all", icon: Users },
  { key: "vip", icon: Star },
  { key: "regulars", icon: RefreshCw },
  { key: "new", icon: UserPlus },
  { key: "at_risk", icon: AlertTriangle },
  { key: "churned", icon: Skull },
  { key: "no_show_risk", icon: XCircle },
  { key: "high_spenders", icon: DollarSign },
  { key: "birthday_week", icon: Cake },
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
