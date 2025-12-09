import { ReactNode } from "react";
import { Sun, Coffee, Moon, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeSectionProps {
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  language: "el" | "en";
  children: ReactNode;
  className?: string;
}

const TimeSection = ({ timeOfDay, language, children, className }: TimeSectionProps) => {
  const translations = {
    el: {
      morning: "Πρωινό",
      morningDesc: "Ξεκινήστε τη μέρα σας",
      afternoon: "Μεσημεριανό",
      afternoonDesc: "Γεύμα & δραστηριότητες",
      evening: "Βράδυ",
      eveningDesc: "Δείπνο & διασκέδαση",
      night: "Νύχτα",
      nightDesc: "Νυχτερινή ζωή",
    },
    en: {
      morning: "Morning",
      morningDesc: "Start your day",
      afternoon: "Afternoon",
      afternoonDesc: "Lunch & activities",
      evening: "Evening",
      eveningDesc: "Dinner & entertainment",
      night: "Night",
      nightDesc: "Nightlife",
    },
  };

  const t = translations[language];

  const sectionConfig = {
    morning: {
      icon: Coffee,
      title: t.morning,
      description: t.morningDesc,
      gradient: "from-amber-500/10 to-orange-500/10",
      iconColor: "text-amber-500",
      borderColor: "border-amber-500/20",
    },
    afternoon: {
      icon: Sun,
      title: t.afternoon,
      description: t.afternoonDesc,
      gradient: "from-yellow-500/10 to-amber-500/10",
      iconColor: "text-yellow-500",
      borderColor: "border-yellow-500/20",
    },
    evening: {
      icon: Moon,
      title: t.evening,
      description: t.eveningDesc,
      gradient: "from-purple-500/10 to-pink-500/10",
      iconColor: "text-purple-500",
      borderColor: "border-purple-500/20",
    },
    night: {
      icon: Star,
      title: t.night,
      description: t.nightDesc,
      gradient: "from-indigo-500/10 to-purple-500/10",
      iconColor: "text-indigo-500",
      borderColor: "border-indigo-500/20",
    },
  };

  const config = sectionConfig[timeOfDay];
  const Icon = config.icon;

  return (
    <section className={cn("space-y-4", className)}>
      {/* Section Header */}
      <div
        className={cn(
          "flex items-center gap-3 p-4 rounded-2xl",
          "bg-gradient-to-r",
          config.gradient,
          "border",
          config.borderColor
        )}
      >
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            "bg-background shadow-sm"
          )}
        >
          <Icon className={cn("h-5 w-5", config.iconColor)} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{config.title}</h3>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
      </div>

      {/* Content */}
      <div>{children}</div>
    </section>
  );
};

export default TimeSection;
