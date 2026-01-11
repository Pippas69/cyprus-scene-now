import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar, Clock, Info } from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { cn } from "@/lib/utils";

export type AppearanceMode = 'date_range' | 'hourly';

interface AppearanceDurationPickerProps {
  mode: AppearanceMode;
  onModeChange: (mode: AppearanceMode) => void;
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  language: 'el' | 'en';
}

const translations = {
  el: {
    title: "Διάρκεια Εμφάνισης στο FOMO",
    subtitle: "Επιλέξτε πότε η εκδήλωσή σας θα εμφανίζεται στους χρήστες",
    dateRange: {
      label: "Εύρος Ημερομηνιών",
      description: "Η εκδήλωση εμφανίζεται από ημερομηνία έως ημερομηνία",
      startLabel: "Ημερομηνία Έναρξης Εμφάνισης",
      endLabel: "Ημερομηνία Λήξης Εμφάνισης",
    },
    hourly: {
      label: "Ωριαία",
      description: "Η εκδήλωση εμφανίζεται συγκεκριμένες ώρες μιας ημέρας",
      startLabel: "Ώρα Έναρξης",
      endLabel: "Ώρα Λήξης",
    },
    hint: "Αυτό καθορίζει πότε η εκδήλωσή σας θα είναι ορατή στη σελίδα Εκδηλώσεων και στον Χάρτη",
  },
  en: {
    title: "FOMO Appearance Duration",
    subtitle: "Choose when your event will appear to users",
    dateRange: {
      label: "Date Range",
      description: "Event appears from date to date",
      startLabel: "Appearance Start Date",
      endLabel: "Appearance End Date",
    },
    hourly: {
      label: "Hourly",
      description: "Event appears during specific hours of a day",
      startLabel: "Start Time",
      endLabel: "End Time",
    },
    hint: "This controls when your event will be visible on the Events page and Map",
  },
};

export const AppearanceDurationPicker: React.FC<AppearanceDurationPickerProps> = ({
  mode,
  onModeChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  language,
}) => {
  const t = translations[language];

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">{t.title}</h3>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      <RadioGroup
        value={mode}
        onValueChange={(val) => onModeChange(val as AppearanceMode)}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Date Range Option */}
        <Card
          className={cn(
            "cursor-pointer transition-all",
            mode === 'date_range'
              ? "border-primary ring-2 ring-primary/20"
              : "hover:border-primary/50"
          )}
          onClick={() => onModeChange('date_range')}
        >
          <CardContent className="p-4 flex items-start gap-3">
            <RadioGroupItem value="date_range" id="date_range" className="mt-1" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <Label htmlFor="date_range" className="font-medium cursor-pointer">
                  {t.dateRange.label}
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                {t.dateRange.description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Hourly Option */}
        <Card
          className={cn(
            "cursor-pointer transition-all",
            mode === 'hourly'
              ? "border-primary ring-2 ring-primary/20"
              : "hover:border-primary/50"
          )}
          onClick={() => onModeChange('hourly')}
        >
          <CardContent className="p-4 flex items-start gap-3">
            <RadioGroupItem value="hourly" id="hourly" className="mt-1" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <Label htmlFor="hourly" className="font-medium cursor-pointer">
                  {t.hourly.label}
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                {t.hourly.description}
              </p>
            </div>
          </CardContent>
        </Card>
      </RadioGroup>

      {/* Date/Time Pickers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="space-y-2">
          <Label>
            {mode === 'date_range' ? t.dateRange.startLabel : t.hourly.startLabel}
          </Label>
          <DateTimePicker
            date={startDate}
            setDate={onStartDateChange}
            placeholder={language === 'el' ? 'Επιλέξτε...' : 'Select...'}
          />
        </div>

        <div className="space-y-2">
          <Label>
            {mode === 'date_range' ? t.dateRange.endLabel : t.hourly.endLabel}
          </Label>
          <DateTimePicker
            date={endDate}
            setDate={onEndDateChange}
            placeholder={language === 'el' ? 'Επιλέξτε...' : 'Select...'}
          />
        </div>
      </div>

      {/* Hint */}
      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
        <p className="text-sm text-muted-foreground">
          {t.hint}
        </p>
      </div>
    </div>
  );
};

export default AppearanceDurationPicker;