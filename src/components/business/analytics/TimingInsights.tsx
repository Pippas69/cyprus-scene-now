import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTimingOptimization, DAYS_EL } from "@/hooks/useTimingOptimization";
import { Clock, CalendarCheck, Ticket, Megaphone, Zap } from "lucide-react";

const translations = {
  el: {
    title: "Οι Καλύτερες Ώρες για την Επιχείρησή σου",
    subtitle: "Μάθε πότε οι πελάτες σου είναι πιο ενεργοί.",
    reservationsTitle: "Κρατήσεις",
    reservationsDesc: "Η καλύτερη μέρα και ώρα για κρατήσεις",
    ticketsTitle: "Πωλήσεις Εισιτηρίων",
    ticketsDesc: "Πότε πουλάς τα περισσότερα εισιτήρια",
    eventsTitle: "Δημοσίευση Events",
    eventsDesc: "Πότε τα events σου έχουν τη μεγαλύτερη προβολή",
    peakTitle: "Ώρα Αιχμής",
    peakDesc: "Πότε οι χρήστες είναι πιο ενεργοί",
    bestDay: "Καλύτερη μέρα",
    bestTime: "Καλύτερη ώρα",
    noData: "Χρειάζονται περισσότερα δεδομένα",
    morning: "πρωί",
    afternoon: "απόγευμα",
    evening: "βράδυ",
    night: "νύχτα",
    days: ["Κυριακή", "Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο"],
  },
  en: {
    title: "Best Times for Your Business",
    subtitle: "Learn when your customers are most active.",
    reservationsTitle: "Reservations",
    reservationsDesc: "Best day and time for bookings",
    ticketsTitle: "Ticket Sales",
    ticketsDesc: "When you sell the most tickets",
    eventsTitle: "Event Posting",
    eventsDesc: "When your events get the most visibility",
    peakTitle: "Peak Engagement",
    peakDesc: "When users are most active",
    bestDay: "Best day",
    bestTime: "Best time",
    noData: "More data needed",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night",
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  },
};

const periodTranslations = {
  el: { morning: "πρωί", afternoon: "απόγευμα", evening: "βράδυ", night: "νύχτα" },
  en: { morning: "morning", afternoon: "afternoon", evening: "evening", night: "night" },
};

interface TimingInsightsProps {
  businessId: string;
  language: "el" | "en";
}

const formatHour = (hour: number): string => {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:00 ${ampm}`;
};

interface InsightCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  bestDay: string | null;
  bestTime: string | null;
  bestDayLabel: string;
  bestTimeLabel: string;
  noDataLabel: string;
}

const InsightCard = ({ icon: Icon, title, description, bestDay, bestTime, bestDayLabel, bestTimeLabel, noDataLabel }: InsightCardProps) => (
  <Card>
    <CardHeader className="pb-3">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      {bestDay && bestTime ? (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{bestDayLabel}</span>
            <span className="text-sm font-semibold text-foreground">{bestDay}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{bestTimeLabel}</span>
            <span className="text-sm font-semibold text-foreground">{bestTime}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{noDataLabel}</p>
      )}
    </CardContent>
  </Card>
);

export const TimingInsights = ({ businessId, language }: TimingInsightsProps) => {
  const { data, isLoading } = useTimingOptimization(businessId);
  const t = translations[language];
  const pt = periodTranslations[language];

  const translateDay = (day: string | undefined) => {
    if (!day) return null;
    const dayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(day);
    return dayIndex >= 0 ? t.days[dayIndex] : day;
  };

  const translatePeriod = (period: string | undefined) => {
    if (!period) return "";
    return pt[period as keyof typeof pt] || period;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <InsightCard
          icon={CalendarCheck}
          title={t.reservationsTitle}
          description={t.reservationsDesc}
          bestDay={translateDay(data?.reservations?.bestDay)}
          bestTime={data?.reservations ? `${formatHour(data.reservations.bestHour)} (${translatePeriod(data.reservations.peakPeriod)})` : null}
          bestDayLabel={t.bestDay}
          bestTimeLabel={t.bestTime}
          noDataLabel={t.noData}
        />

        <InsightCard
          icon={Ticket}
          title={t.ticketsTitle}
          description={t.ticketsDesc}
          bestDay={translateDay(data?.tickets?.bestDay)}
          bestTime={data?.tickets ? `${formatHour(data.tickets.bestHour)} (${translatePeriod(data.tickets.peakPeriod)})` : null}
          bestDayLabel={t.bestDay}
          bestTimeLabel={t.bestTime}
          noDataLabel={t.noData}
        />

        <InsightCard
          icon={Megaphone}
          title={t.eventsTitle}
          description={t.eventsDesc}
          bestDay={translateDay(data?.eventPosting?.bestDay)}
          bestTime={data?.eventPosting ? `${formatHour(data.eventPosting.bestHour)} (${translatePeriod(data.eventPosting.peakPeriod)})` : null}
          bestDayLabel={t.bestDay}
          bestTimeLabel={t.bestTime}
          noDataLabel={t.noData}
        />

        <InsightCard
          icon={Zap}
          title={t.peakTitle}
          description={t.peakDesc}
          bestDay={null}
          bestTime={data?.peakEngagement ? `${formatHour(data.peakEngagement.hour)} (${translatePeriod(data.peakEngagement.period)})` : null}
          bestDayLabel={t.bestDay}
          bestTimeLabel={t.bestTime}
          noDataLabel={t.noData}
        />
      </div>
    </div>
  );
};
