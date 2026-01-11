import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ticket, CalendarCheck, DoorOpen, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type EventType = 'ticket' | 'reservation' | 'free_entry';

interface EventTypeSelectorProps {
  value: EventType | null;
  onChange: (type: EventType) => void;
  language: 'el' | 'en';
  disabled?: boolean;
}

const translations = {
  el: {
    title: "Τύπος Εκδήλωσης",
    subtitle: "Επιλέξτε πώς θα λειτουργεί η εκδήλωσή σας",
    warning: "Ο τύπος εκδήλωσης δεν μπορεί να αλλάξει μετά τη δημοσίευση",
    ticket: {
      name: "Εκδήλωση με Εισιτήρια",
      description: "Πώληση εισιτηρίων μέσω FOMO",
      fee: "Προμήθεια πλατφόρμας: 12%",
      visibility: "Εμφανίζεται στις Εκδηλώσεις και στον Χάρτη",
    },
    reservation: {
      name: "Εκδήλωση με Κρατήσεις",
      description: "Αποδοχή κρατήσεων με ελάχιστη προπληρωμή",
      fee: "Προμήθεια πλατφόρμας: 12% στην προπληρωμή",
      visibility: "Εμφανίζεται στις Εκδηλώσεις και στον Χάρτη",
    },
    free_entry: {
      name: "Ελεύθερη Είσοδος",
      description: "Χωρίς πληρωμή απαιτείται",
      fee: "Χωρίς χρέωση",
      visibility: "Μπορεί να προωθηθεί στο NOW",
      declaration: "Απαιτείται δήλωση",
    },
  },
  en: {
    title: "Event Type",
    subtitle: "Choose how your event will work",
    warning: "Event type cannot be changed after publishing",
    ticket: {
      name: "Ticket Event",
      description: "Sell tickets through FOMO",
      fee: "Platform fee: 12%",
      visibility: "Appears in Events and Map",
    },
    reservation: {
      name: "Reservation Event",
      description: "Accept reservations with prepaid minimum charge",
      fee: "Platform fee: 12% on prepaid amount",
      visibility: "Appears in Events and Map",
    },
    free_entry: {
      name: "Free Entry",
      description: "No payment required",
      fee: "No charge",
      visibility: "Can be boosted to NOW",
      declaration: "Declaration required",
    },
  },
};

export const EventTypeSelector: React.FC<EventTypeSelectorProps> = ({
  value,
  onChange,
  language,
  disabled = false,
}) => {
  const t = translations[language];

  const eventTypes: {
    type: EventType;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
  }[] = [
    {
      type: 'ticket',
      icon: <Ticket className="h-8 w-8" />,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      borderColor: 'border-red-200 dark:border-red-800',
    },
    {
      type: 'reservation',
      icon: <CalendarCheck className="h-8 w-8" />,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
    {
      type: 'free_entry',
      icon: <DoorOpen className="h-8 w-8" />,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      borderColor: 'border-green-200 dark:border-green-800',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold text-foreground">{t.title}</h3>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      {disabled && value && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-700 dark:text-amber-400">{t.warning}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {eventTypes.map(({ type, icon, color, bgColor, borderColor }) => {
          const typeText = t[type];
          const isSelected = value === type;

          return (
            <Card
              key={type}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md",
                isSelected
                  ? `${bgColor} ${borderColor} border-2 ring-2 ring-offset-2 ring-primary/20`
                  : "border hover:border-primary/50",
                disabled && !isSelected && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => !disabled && onChange(type)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className={cn("p-2 rounded-lg", bgColor, color)}>
                    {icon}
                  </div>
                  {isSelected && (
                    <Badge variant="secondary" className="bg-primary text-primary-foreground">
                      {language === 'el' ? 'Επιλεγμένο' : 'Selected'}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className={cn("font-semibold", isSelected && color)}>
                    {typeText.name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {typeText.description}
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-xs">
                      {typeText.fee}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {typeText.visibility}
                  </p>
                  {type === 'free_entry' && 'declaration' in typeText && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      ⚠️ {typeText.declaration}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default EventTypeSelector;