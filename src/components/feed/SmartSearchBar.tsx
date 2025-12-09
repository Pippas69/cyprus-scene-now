import { useState } from "react";
import { CalendarDays, Clock, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";

interface SmartSearchBarProps {
  language: "el" | "en";
  onSearch: (params: { date: Date | null; time: string | null; partySize: number | null }) => void;
  className?: string;
}

const SmartSearchBar = ({ language, onSearch, className }: SmartSearchBarProps) => {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string>("");
  const [partySize, setPartySize] = useState<string>("");

  const translations = {
    el: {
      date: "Ημερομηνία",
      selectDate: "Επιλέξτε ημερομηνία",
      time: "Ώρα",
      selectTime: "Επιλέξτε ώρα",
      partySize: "Άτομα",
      selectPartySize: "Πόσοι;",
      search: "Αναζήτηση",
      anytime: "Οποτεδήποτε",
      morning: "Πρωί (08:00-12:00)",
      afternoon: "Απόγευμα (12:00-18:00)",
      evening: "Βράδυ (18:00-23:00)",
      night: "Νύχτα (23:00+)",
      person: "άτομο",
      people: "άτομα",
    },
    en: {
      date: "Date",
      selectDate: "Select date",
      time: "Time",
      selectTime: "Select time",
      partySize: "Party Size",
      selectPartySize: "How many?",
      search: "Search",
      anytime: "Anytime",
      morning: "Morning (08:00-12:00)",
      afternoon: "Afternoon (12:00-18:00)",
      evening: "Evening (18:00-23:00)",
      night: "Night (23:00+)",
      person: "person",
      people: "people",
    },
  };

  const t = translations[language];
  const locale = language === "el" ? el : enUS;

  const timeSlots = [
    { value: "anytime", label: t.anytime },
    { value: "morning", label: t.morning },
    { value: "afternoon", label: t.afternoon },
    { value: "evening", label: t.evening },
    { value: "night", label: t.night },
  ];

  const handleSearch = () => {
    onSearch({
      date: date || null,
      time: time || null,
      partySize: partySize ? parseInt(partySize) : null,
    });
  };

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-0",
        "bg-card border border-border rounded-2xl p-2 md:p-1",
        "shadow-card hover:shadow-hover transition-shadow duration-300",
        className
      )}
    >
      {/* Date Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "flex-1 justify-start gap-3 h-12 md:h-14 px-4 rounded-xl",
              "hover:bg-muted/50 transition-colors",
              "text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarDays className="h-5 w-5 text-ocean shrink-0" />
            <div className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground">{t.date}</span>
              <span className="text-sm font-medium text-foreground">
                {date ? format(date, "PPP", { locale }) : t.selectDate}
              </span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Divider */}
      <div className="hidden md:block w-px h-10 bg-border mx-1" />

      {/* Time Selector */}
      <Select value={time} onValueChange={setTime}>
        <SelectTrigger
          className={cn(
            "flex-1 h-12 md:h-14 px-4 rounded-xl border-0",
            "hover:bg-muted/50 transition-colors",
            "focus:ring-0 focus:ring-offset-0"
          )}
        >
          <div className="flex items-center gap-3 w-full">
            <Clock className="h-5 w-5 text-ocean shrink-0" />
            <div className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground">{t.time}</span>
              <SelectValue placeholder={t.selectTime} className="text-sm font-medium" />
            </div>
          </div>
        </SelectTrigger>
        <SelectContent>
          {timeSlots.map((slot) => (
            <SelectItem key={slot.value} value={slot.value}>
              {slot.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Divider */}
      <div className="hidden md:block w-px h-10 bg-border mx-1" />

      {/* Party Size */}
      <Select value={partySize} onValueChange={setPartySize}>
        <SelectTrigger
          className={cn(
            "flex-1 h-12 md:h-14 px-4 rounded-xl border-0",
            "hover:bg-muted/50 transition-colors",
            "focus:ring-0 focus:ring-offset-0"
          )}
        >
          <div className="flex items-center gap-3 w-full">
            <Users className="h-5 w-5 text-ocean shrink-0" />
            <div className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground">{t.partySize}</span>
              <SelectValue placeholder={t.selectPartySize} className="text-sm font-medium" />
            </div>
          </div>
        </SelectTrigger>
        <SelectContent>
          {[1, 2, 3, 4, 5, 6, 7, 8, 10, 15, 20].map((size) => (
            <SelectItem key={size} value={size.toString()}>
              {size} {size === 1 ? t.person : t.people}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Search Button */}
      <Button
        onClick={handleSearch}
        className={cn(
          "h-12 md:h-12 px-6 md:px-8 rounded-xl md:rounded-full ml-0 md:ml-2",
          "bg-ocean hover:bg-ocean/90 text-white",
          "shadow-md hover:shadow-lg transition-all duration-300",
          "font-semibold gap-2"
        )}
      >
        <Search className="h-5 w-5" />
        <span className="md:hidden lg:inline">{t.search}</span>
      </Button>
    </div>
  );
};

export default SmartSearchBar;
