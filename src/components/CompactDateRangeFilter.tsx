import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

interface CompactDateRangeFilterProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  language: 'el' | 'en';
}

export const CompactDateRangeFilter = ({ value, onChange, language }: CompactDateRangeFilterProps) => {
  const [open, setOpen] = useState(false);
  const locale = language === 'el' ? el : enUS;

  const hasSelection = value?.from;

  const formatLabel = () => {
    if (!value?.from) return language === 'el' ? 'Ημερομηνίες' : 'Dates';
    if (value.to && value.from.getTime() !== value.to.getTime()) {
      return `${format(value.from, 'dd/MM', { locale })} – ${format(value.to, 'dd/MM', { locale })}`;
    }
    return format(value.from, 'dd MMM', { locale });
  };

  return (
    <div className="flex items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap border ${
              hasSelection
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/60 hover:bg-muted text-muted-foreground border-transparent'
            }`}
          >
            <CalendarIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            {formatLabel()}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" sideOffset={6}>
          <Calendar
            mode="range"
            selected={value}
            onSelect={(range) => {
              onChange(range);
              // Auto-close when both dates selected
              if (range?.from && range?.to) {
                setTimeout(() => setOpen(false), 200);
              }
            }}
            numberOfMonths={1}
            locale={locale}
            className="text-sm"
          />
        </PopoverContent>
      </Popover>

      {hasSelection && (
        <button
          onClick={() => onChange(undefined)}
          className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};
