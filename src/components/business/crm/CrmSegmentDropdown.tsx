import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Star, RefreshCw, UserPlus, AlertTriangle, Skull, XCircle, DollarSign, Cake } from "lucide-react";

type Segment = "all" | "vip" | "regulars" | "new" | "at_risk" | "churned" | "no_show_risk" | "high_spenders" | "birthday_week";

interface CrmSegmentDropdownProps {
  segment: Segment;
  onSegmentChange: (segment: Segment) => void;
}

const translations = {
  el: {
    all: "Όλοι οι πελάτες",
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

const segmentIcons: Record<Segment, React.ElementType> = {
  all: Users,
  vip: Star,
  regulars: RefreshCw,
  new: UserPlus,
  at_risk: AlertTriangle,
  churned: Skull,
  no_show_risk: XCircle,
  high_spenders: DollarSign,
  birthday_week: Cake,
};

const segmentOrder: Segment[] = ["all", "vip", "regulars", "new", "at_risk", "churned", "no_show_risk", "high_spenders", "birthday_week"];

export function CrmSegmentDropdown({ segment, onSegmentChange }: CrmSegmentDropdownProps) {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <Select value={segment} onValueChange={(val) => onSegmentChange(val as Segment)}>
      <SelectTrigger className="w-[180px] h-8 text-xs bg-card border-border">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {segmentOrder.map((key) => {
          const Icon = segmentIcons[key];
          return (
            <SelectItem key={key} value={key} className="text-xs">
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{t[key]}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
