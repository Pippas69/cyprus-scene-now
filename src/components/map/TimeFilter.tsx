import { Button } from "@/components/ui/button";
import { Clock, Calendar, CalendarDays, CalendarRange } from "lucide-react";

export type TimeFilterValue = "now" | "today" | "week" | "month" | "all";

interface TimeFilterProps {
  value: TimeFilterValue;
  onChange: (value: TimeFilterValue) => void;
}

export const TimeFilter = ({ value, onChange }: TimeFilterProps) => {
  const filters = [
    { id: "now" as TimeFilterValue, label: "Τώρα", icon: Clock },
    { id: "today" as TimeFilterValue, label: "Σήμερα", icon: Calendar },
    { id: "week" as TimeFilterValue, label: "Εβδομάδα", icon: CalendarDays },
    { id: "month" as TimeFilterValue, label: "Μήνας", icon: CalendarRange },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map((filter) => {
        const Icon = filter.icon;
        return (
          <Button
            key={filter.id}
            size="sm"
            variant={value === filter.id ? "default" : "outline"}
            onClick={() => onChange(filter.id)}
            className="gap-1.5"
          >
            <Icon size={14} />
            {filter.label}
          </Button>
        );
      })}
    </div>
  );
};
