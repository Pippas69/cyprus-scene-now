import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Lightbulb, CalendarCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format, addDays, setHours, setMinutes, isBefore, startOfDay } from "date-fns";
import { el, enUS } from "date-fns/locale";

interface PostSchedulerProps {
  isScheduled: boolean;
  scheduledDate: Date | null;
  onScheduledChanged: (isScheduled: boolean) => void;
  onDateChange: (date: Date | null) => void;
  language: 'el' | 'en';
}

const translations = {
  el: {
    schedulePost: "Προγραμματισμός",
    scheduleDescription: "Δημοσιεύστε αργότερα",
    selectDate: "Επιλέξτε ημερομηνία",
    selectTime: "Ώρα",
    scheduledFor: "Προγραμματισμένο για",
    bestTimes: "Καλύτερες ώρες",
    bestTimesHint: "Βάσει engagement",
    publishNow: "Δημοσίευση τώρα",
    clear: "Καθαρισμός",
    morning: "Πρωί",
    afternoon: "Απόγευμα",
    evening: "Βράδυ",
  },
  en: {
    schedulePost: "Schedule",
    scheduleDescription: "Publish later",
    selectDate: "Select date",
    selectTime: "Time",
    scheduledFor: "Scheduled for",
    bestTimes: "Best times",
    bestTimesHint: "Based on engagement",
    publishNow: "Publish now",
    clear: "Clear",
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
  },
};

// Suggested best posting times based on typical engagement
const bestTimes = [
  { hour: 9, label: 'morning' },
  { hour: 12, label: 'morning' },
  { hour: 17, label: 'afternoon' },
  { hour: 19, label: 'evening' },
  { hour: 21, label: 'evening' },
];

export function PostScheduler({
  isScheduled,
  scheduledDate,
  onScheduledChanged,
  onDateChange,
  language,
}: PostSchedulerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    scheduledDate || undefined
  );
  const [selectedHour, setSelectedHour] = useState<string>(
    scheduledDate ? String(scheduledDate.getHours()) : '19'
  );
  const [selectedMinute, setSelectedMinute] = useState<string>(
    scheduledDate ? String(scheduledDate.getMinutes()).padStart(2, '0') : '00'
  );
  
  const t = translations[language];
  const dateLocale = language === 'el' ? el : enUS;

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const scheduledDateTime = setMinutes(
        setHours(date, parseInt(selectedHour)),
        parseInt(selectedMinute)
      );
      onDateChange(scheduledDateTime);
    }
  };

  const handleTimeChange = (hour: string, minute: string) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    if (selectedDate) {
      const scheduledDateTime = setMinutes(
        setHours(selectedDate, parseInt(hour)),
        parseInt(minute)
      );
      onDateChange(scheduledDateTime);
    }
  };

  const handleBestTimeClick = (hour: number) => {
    const date = selectedDate || addDays(new Date(), 1);
    setSelectedDate(date);
    setSelectedHour(String(hour));
    setSelectedMinute('00');
    
    const scheduledDateTime = setMinutes(setHours(date, hour), 0);
    onDateChange(scheduledDateTime);
    onScheduledChanged(true);
  };

  const clearSchedule = () => {
    setSelectedDate(undefined);
    onDateChange(null);
    onScheduledChanged(false);
  };

  // Generate hour options
  const hours = Array.from({ length: 24 }, (_, i) => ({
    value: String(i),
    label: String(i).padStart(2, '0'),
  }));

  // Generate minute options (15 min intervals)
  const minutes = ['00', '15', '30', '45'].map(m => ({
    value: m,
    label: m,
  }));

  return (
    <div className="space-y-4">
      {/* Toggle Schedule */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div>
            <Label className="font-medium">{t.schedulePost}</Label>
            <p className="text-xs text-muted-foreground">{t.scheduleDescription}</p>
          </div>
        </div>
        <Switch
          checked={isScheduled}
          onCheckedChange={onScheduledChanged}
        />
      </div>

      {/* Scheduler Controls */}
      {isScheduled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4 pt-2"
        >
          {/* Date & Time Selection */}
          <div className="grid grid-cols-2 gap-3">
            {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {selectedDate ? (
                    format(selectedDate, 'PPP', { locale: dateLocale })
                  ) : (
                    t.selectDate
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => isBefore(date, startOfDay(new Date()))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Time Picker */}
            <div className="flex gap-2">
              <Select
                value={selectedHour}
                onValueChange={(h) => handleTimeChange(h, selectedMinute)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="HH" />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((hour) => (
                    <SelectItem key={hour.value} value={hour.value}>
                      {hour.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <span className="flex items-center text-muted-foreground">:</span>
              
              <Select
                value={selectedMinute}
                onValueChange={(m) => handleTimeChange(selectedHour, m)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="MM" />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((minute) => (
                    <SelectItem key={minute.value} value={minute.value}>
                      {minute.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Best Times Suggestions */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{t.bestTimes}</span>
              <span className="text-xs text-muted-foreground">({t.bestTimesHint})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {bestTimes.map((time) => (
                <Button
                  key={time.hour}
                  variant="outline"
                  size="sm"
                  onClick={() => handleBestTimeClick(time.hour)}
                  className={cn(
                    "text-xs",
                    selectedHour === String(time.hour) && "border-primary bg-primary/5"
                  )}
                >
                  {String(time.hour).padStart(2, '0')}:00
                </Button>
              ))}
            </div>
          </div>

          {/* Scheduled Summary */}
          {scheduledDate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20"
            >
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{t.scheduledFor}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(scheduledDate, 'PPP', { locale: dateLocale })} {t.selectTime}{' '}
                    {format(scheduledDate, 'HH:mm')}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSchedule}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4 mr-1" />
                {t.clear}
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
