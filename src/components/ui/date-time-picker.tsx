import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { useLanguage } from "@/hooks/useLanguage";

interface DateTimePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder,
  disabled,
  minDate,
  maxDate,
}: DateTimePickerProps) {
  const { language } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value);
  const [hours, setHours] = React.useState(value ? value.getHours().toString().padStart(2, '0') : '12');
  const [minutes, setMinutes] = React.useState(value ? value.getMinutes().toString().padStart(2, '0') : '00');
  
  // Use ref to track previous value and prevent infinite loops
  const prevValueRef = React.useRef<Date | undefined>(value);

  React.useEffect(() => {
    // Only sync when the external value actually changes
    if (value && (!prevValueRef.current || value.getTime() !== prevValueRef.current.getTime())) {
      setSelectedDate(value);
      setHours(value.getHours().toString().padStart(2, '0'));
      setMinutes(value.getMinutes().toString().padStart(2, '0'));
    }
    prevValueRef.current = value;
  }, [value]);

  // Commit the current selection to the form
  const commitValue = React.useCallback((date: Date | undefined, h: string, m: string) => {
    if (date) {
      const newDate = new Date(date);
      const hours = parseInt(h) || 0;
      const mins = parseInt(m) || 0;
      newDate.setHours(hours, mins, 0, 0);
      onChange(newDate);
    }
  }, [onChange]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    // Auto-commit when date is selected (with current time values)
    if (date) {
      commitValue(date, hours, minutes);
    }
  };

  const handleDone = () => {
    if (selectedDate) {
      commitValue(selectedDate, hours, minutes);
      setOpen(false);
    }
  };

  // Also commit when popover closes (if we have a date)
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && selectedDate) {
      commitValue(selectedDate, hours, minutes);
    }
    setOpen(isOpen);
  };

  const handleClear = () => {
    setSelectedDate(undefined);
    setHours('12');
    setMinutes('00');
    onChange(undefined);
    setOpen(false);
  };

  const locale = language === 'el' ? el : enUS;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            format(value, "PPP, HH:mm", { locale })
          ) : (
            <span>{placeholder || (language === 'el' ? 'Επιλέξτε ημερομηνία' : 'Select date')}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="pointer-events-auto">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
          
          <div className="border-t p-3 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">
                  {language === 'el' ? 'Ώρες' : 'Hours'}
                </label>
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 23)) {
                      setHours(val);
                    }
                  }}
                  onBlur={() => {
                    if (hours === '' || parseInt(hours) < 0) setHours('00');
                    else if (parseInt(hours) > 23) setHours('23');
                    else setHours(parseInt(hours).toString().padStart(2, '0'));
                  }}
                  className="text-center"
                  placeholder="HH"
                />
              </div>
              <span className="text-2xl font-bold mt-5">:</span>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">
                  {language === 'el' ? 'Λεπτά' : 'Minutes'}
                </label>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
                      setMinutes(val);
                    }
                  }}
                  onBlur={() => {
                    if (minutes === '' || parseInt(minutes) < 0) setMinutes('00');
                    else if (parseInt(minutes) > 59) setMinutes('59');
                    else setMinutes(parseInt(minutes).toString().padStart(2, '0'));
                  }}
                  className="text-center"
                  placeholder="MM"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleClear}
              >
                <X className="h-4 w-4 mr-1" />
                {language === 'el' ? 'Καθαρισμός' : 'Clear'}
              </Button>
              <Button
                type="button"
                size="sm"
                className="flex-1"
                onClick={handleDone}
                disabled={!selectedDate}
              >
                {language === 'el' ? 'Εντάξει' : 'Done'}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
