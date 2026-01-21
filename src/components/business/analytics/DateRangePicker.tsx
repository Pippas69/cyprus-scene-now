import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  language: 'el' | 'en';
}

const translations = {
  el: {
    today: 'Σήμερα',
    yesterday: 'Χθες',
    last7Days: 'Τελευταίες 7 ημέρες',
    last30Days: 'Τελευταίες 30 ημέρες',
    last90Days: 'Τελευταίες 90 ημέρες',
    custom: 'Προσαρμοσμένο',
    selectRange: 'Επιλέξτε εύρος ημερομηνιών',
  },
  en: {
    today: 'Today',
    yesterday: 'Yesterday',
    last7Days: 'Last 7 days',
    last30Days: 'Last 30 days',
    last90Days: 'Last 90 days',
    custom: 'Custom',
    selectRange: 'Select date range',
  },
};

export const DateRangePicker = ({ value, onChange, language }: DateRangePickerProps) => {
  const t = translations[language];
  const locale = language === 'el' ? el : enUS;
  const [open, setOpen] = useState(false);

  const presets = [
    {
      label: t.today,
      range: { from: new Date(), to: new Date() },
    },
    {
      label: t.yesterday,
      range: {
        from: new Date(Date.now() - 86400000),
        to: new Date(Date.now() - 86400000),
      },
    },
    {
      label: t.last7Days,
      range: {
        from: new Date(Date.now() - 7 * 86400000),
        to: new Date(),
      },
    },
    {
      label: t.last30Days,
      range: {
        from: new Date(Date.now() - 30 * 86400000),
        to: new Date(),
      },
    },
    {
      label: t.last90Days,
      range: {
        from: new Date(Date.now() - 90 * 86400000),
        to: new Date(),
      },
    },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'justify-start text-left font-normal text-xs sm:text-sm h-9 sm:h-10 px-2 sm:px-3 w-full sm:w-auto',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="truncate">
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, 'dd/MM', { locale })} - {format(value.to, 'dd/MM', { locale })}
                </>
              ) : (
                format(value.from, 'dd/MM/yyyy', { locale })
              )
            ) : (
              <span>{t.selectRange}</span>
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 max-w-[95vw]" align="end" sideOffset={4}>
        {/* Mobile: Stack layout, Desktop: Side by side */}
        <div className="flex flex-col sm:flex-row max-h-[80vh] overflow-auto">
          {/* Presets */}
          <div className="flex sm:flex-col gap-1 p-2 border-b sm:border-b-0 sm:border-r overflow-x-auto sm:overflow-visible">
            <div className="flex sm:flex-col gap-1 min-w-max sm:min-w-0">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="justify-start text-xs sm:text-sm whitespace-nowrap h-8 sm:h-9"
                  onClick={() => {
                    onChange(preset.range);
                    setOpen(false);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          {/* Calendar - single month on mobile */}
          <div className="p-2">
            <Calendar
              mode="range"
              selected={value}
              onSelect={onChange} 
              numberOfMonths={typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 2}
              locale={locale}
              className="text-sm"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
