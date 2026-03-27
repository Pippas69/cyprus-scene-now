import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Users, RefreshCw, UserPlus, AlertTriangle, XCircle, DollarSign, ChevronDown, Filter } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export type Segment = "all" | "regulars" | "new" | "at_risk" | "no_show_risk" | "high_spenders";
export type DataFilter = "has_table" | "has_notes" | "has_tags" | "has_email" | "has_phone";

interface CrmSegmentDropdownProps {
  segment: Segment;
  onSegmentChange: (segment: Segment) => void;
  activeFilters: Set<DataFilter>;
  onToggleFilter: (filter: DataFilter) => void;
}

const translations = {
  el: {
    all: "Όλοι οι πελάτες",
    regulars: "Τακτικοί",
    new: "Νέοι",
    at_risk: "Σε κίνδυνο",
    no_show_risk: "No-show risk",
    high_spenders: "Υψηλή δαπάνη",
    segments: "Segments",
    filters: "Φίλτρα",
    has_table: "Έχει τραπέζι",
    has_notes: "Έχει σημειώσεις",
    has_tags: "Έχει tags",
    has_email: "Έχει email",
    has_phone: "Έχει τηλέφωνο",
  },
  en: {
    all: "All guests",
    regulars: "Regulars",
    new: "New",
    at_risk: "At risk",
    no_show_risk: "No-show risk",
    high_spenders: "High spenders",
    segments: "Segments",
    filters: "Filters",
    has_table: "Has table",
    has_notes: "Has notes",
    has_tags: "Has tags",
    has_email: "Has email",
    has_phone: "Has phone",
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

const filterKeys: DataFilter[] = ["has_table", "has_notes", "has_tags", "has_email", "has_phone"];

export function CrmSegmentDropdown({ segment, onSegmentChange, activeFilters, onToggleFilter }: CrmSegmentDropdownProps) {
  const { language } = useLanguage();
  const t = translations[language];

  const activeCount = activeFilters.size;
  const ActiveIcon = segmentConfig.find((s) => s.key === segment)?.icon ?? Users;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 min-w-[140px] justify-between">
          <span className="flex items-center gap-1.5">
            <ActiveIcon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{t[segment]}</span>
          </span>
          <span className="flex items-center gap-1">
            {activeCount > 0 && (
              <span className="flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                {activeCount}
              </span>
            )}
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        {/* Segments section */}
        <div className="p-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 py-1">
            {t.segments}
          </p>
          <div className="space-y-0.5">
            {segmentConfig.map(({ key, icon: Icon }) => (
              <button
                key={key}
                onClick={() => onSegmentChange(key)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                  segment === key
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{t[key]}</span>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Data filters section */}
        <div className="p-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 py-1 flex items-center gap-1">
            <Filter className="h-3 w-3" />
            {t.filters}
          </p>
          <div className="space-y-0.5">
            {filterKeys.map((filterKey) => (
              <label
                key={filterKey}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer hover:bg-accent transition-colors"
              >
                <Checkbox
                  checked={activeFilters.has(filterKey)}
                  onCheckedChange={() => onToggleFilter(filterKey)}
                  className="h-3.5 w-3.5"
                />
                <span className={activeFilters.has(filterKey) ? "text-foreground font-medium" : "text-foreground"}>
                  {t[filterKey]}
                </span>
              </label>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
