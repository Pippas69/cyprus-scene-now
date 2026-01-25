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
  /** If true, only shows date without time in the button display (mobile optimization) */
  dateOnlyDisplay?: boolean;
}

// Helper to get a safe timestamp, treating invalid dates as undefined
function getSafeTimestamp(date: Date | undefined): number | undefined {
  if (!date) return undefined;
  const ts = date.getTime();
  // NaN check: NaN !== NaN is always true
  if (Number.isNaN(ts)) return undefined;
  return ts;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder,
  disabled,
  minDate,
  maxDate,
  dateOnlyDisplay = false,
}: DateTimePickerProps) {
  const { language } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(() => {
    // Initialize only if value is a valid date
    if (value && !Number.isNaN(value.getTime())) return value;
    return undefined;
  });
  const [hours, setHours] = React.useState(() => {
    if (value && !Number.isNaN(value.getTime())) {
      return value.getHours().toString().padStart(2, '0');
    }
    return '12';
  });
  const [minutes, setMinutes] = React.useState(() => {
    if (value && !Number.isNaN(value.getTime())) {
      return value.getMinutes().toString().padStart(2, '0');
    }
    return '00';
  });
  
  // Use ref to track previous timestamp (number | undefined) to prevent infinite loops
  // Using timestamp instead of Date avoids reference comparison issues
  const prevTimestampRef = React.useRef<number | undefined>(getSafeTimestamp(value));

  // Track if user made changes during this session (dirty tracking)
  const dirtyRef = React.useRef(false);

  // Single-flight scheduler for onChange using MACROTASK (setTimeout)
  // This prevents browser freeze by yielding to the event loop
  const pendingOnChangeRef = React.useRef<Date | undefined | null>(null);
  const timerRef = React.useRef<number | null>(null);
  const onChangeRef = React.useRef(onChange);
  
  // Keep onChange ref current
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  
  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Schedule an onChange call with macrotask deferral (single-flight)
  const scheduleOnChange = React.useCallback((date: Date | undefined) => {
    pendingOnChangeRef.current = date;
    
    if (timerRef.current === null) {
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        const valueToSend = pendingOnChangeRef.current;
        pendingOnChangeRef.current = null;
        if (valueToSend !== null) {
          onChangeRef.current(valueToSend);
        }
      }, 0); // Macrotask - yields to browser
    }
  }, []);

  React.useEffect(() => {
    const incomingTs = getSafeTimestamp(value);
    const prevTs = prevTimestampRef.current;
    
    // Only sync when the timestamp actually changed
    if (incomingTs !== prevTs) {
      prevTimestampRef.current = incomingTs;
      
      if (incomingTs !== undefined && value) {
        setSelectedDate(value);
        setHours(value.getHours().toString().padStart(2, '0'));
        setMinutes(value.getMinutes().toString().padStart(2, '0'));
      }
      // Note: We don't clear state when incomingTs becomes undefined
      // to preserve user's in-progress selection
    }
  }, [value]);

  // Commit the current selection to the form - with no-op prevention
  const commitValue = React.useCallback((date: Date | undefined, h: string, m: string, force = false) => {
    if (date) {
      const newDate = new Date(date);
      const hoursNum = parseInt(h) || 0;
      const minsNum = parseInt(m) || 0;
      newDate.setHours(hoursNum, minsNum, 0, 0);
      
      const newTs = newDate.getTime();
      const currentTs = getSafeTimestamp(value);
      
      // Only call onChange if the timestamp actually changed (or force is true)
      if (force || newTs !== currentTs) {
        prevTimestampRef.current = newTs;
        // Use macrotask deferral to avoid commit-phase conflicts
        scheduleOnChange(newDate);
      }
    }
  }, [value, scheduleOnChange]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    dirtyRef.current = true;
    // Auto-commit when date is selected (with current time values)
    if (date) {
      commitValue(date, hours, minutes);
    }
  };

  const handleDone = () => {
    if (selectedDate) {
      commitValue(selectedDate, hours, minutes, true);
      setOpen(false);
      dirtyRef.current = false;
    }
  };

  // Also commit when popover closes (if we have a date AND user made changes)
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && selectedDate && dirtyRef.current) {
      commitValue(selectedDate, hours, minutes);
      dirtyRef.current = false;
    }
    setOpen(isOpen);
  };

  const handleClear = () => {
    setSelectedDate(undefined);
    setHours('12');
    setMinutes('00');
    // Use macrotask deferral for clear as well
    scheduleOnChange(undefined);
    setOpen(false);
  };

  const locale = language === 'el' ? el : enUS;

  // Safe display value - only show if valid
  const displayValue = value && !Number.isNaN(value.getTime()) ? value : undefined;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !displayValue && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          {displayValue ? (
            <>
              {/* Mobile: Short date format */}
              <span className="truncate sm:hidden text-xs">
                {format(displayValue, dateOnlyDisplay ? "dd/MM/yy" : "dd/MM/yy HH:mm", { locale })}
              </span>
              {/* Desktop: Full date format */}
              <span className="truncate hidden sm:inline">
                {format(displayValue, dateOnlyDisplay ? "PPP" : "PPP, HH:mm", { locale })}
              </span>
            </>
          ) : (
            <span className="truncate text-xs sm:text-sm">{placeholder || (language === 'el' ? 'Επιλέξτε ημερομηνία' : 'Select date')}</span>
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
