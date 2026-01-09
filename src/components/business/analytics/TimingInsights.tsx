import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTimingOptimization, DAYS_EL } from "@/hooks/useTimingOptimization";
import { Clock, CalendarCheck, Ticket, Megaphone, Zap, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
    explanations: {
      reservations: "Αναλύθηκε από τις χρονοσφραγίδες κρατήσεων για να βρεθεί πότε οι πελάτες κάνουν συχνότερα κρατήσεις.",
      reservationsDetails: "Χρησιμοποίησε αυτή την πληροφορία για να βελτιστοποιήσεις τη διαθεσιμότητα και την επικοινωνία σου.",
      tickets: "Βασίζεται στις χρονοσφραγίδες αγοράς εισιτηρίων για να εντοπιστούν οι περίοδοι αιχμής αγορών.",
      ticketsDetails: "Σκέψου να κυκλοφορήσεις νέα εισιτήρια ή προσφορές κατά τις ώρες αιχμής.",
      events: "Αναλύθηκαν τα μοτίβα προβολών events για να καθοριστεί πότε τα δημοσιευμένα events έχουν τη μεγαλύτερη αλληλεπίδραση.",
      eventsDetails: "Δημοσίευσε νέα events γύρω από αυτές τις ώρες για μέγιστη ορατότητα.",
      peak: "Συνολική δραστηριότητα πλατφόρμας για την επιχείρησή σου σε όλα τα μετρικά.",
      peakDetails: "Αυτό αντιπροσωπεύει πότε το κοινό σου είναι πιο ενεργό στο ΦΟΜΟ.",
    },
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
    explanations: {
      reservations: "Analyzed from booking timestamps to find when customers most frequently make reservations.",
      reservationsDetails: "Use this insight to optimize your availability and communications.",
      tickets: "Based on ticket purchase timestamps to identify peak buying periods.",
      ticketsDetails: "Consider releasing new tickets or promotions during peak hours.",
      events: "Analyzed event view patterns to determine when posted events get the most engagement.",
      eventsDetails: "Post new events around these times for maximum visibility.",
      peak: "Overall platform activity for your business across all metrics combined.",
      peakDetails: "This represents when your audience is most active on ΦΟΜΟ.",
    },
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
  explanation: string;
  details: string;
}

const InsightCard = ({ 
  icon: Icon, 
  title, 
  description, 
  bestDay, 
  bestTime, 
  bestDayLabel, 
  bestTimeLabel, 
  noDataLabel,
  explanation,
  details,
}: InsightCardProps) => (
  <Dialog>
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
          <DialogTrigger asChild>
            <button className="p-1 hover:bg-muted rounded-full transition-colors">
              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          </DialogTrigger>
        </div>
      </CardHeader>
      <CardContent>
        {bestDay || bestTime ? (
          <div className="space-y-2">
            {bestDay && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{bestDayLabel}</span>
                <span className="text-sm font-semibold text-foreground">{bestDay}</span>
              </div>
            )}
            {bestTime && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{bestTimeLabel}</span>
                <span className="text-sm font-semibold text-foreground">{bestTime}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{noDataLabel}</p>
        )}
      </CardContent>
    </Card>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        {(bestDay || bestTime) && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            {bestDay && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{bestDayLabel}</span>
                <span className="text-sm font-bold text-foreground">{bestDay}</span>
              </div>
            )}
            {bestTime && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{bestTimeLabel}</span>
                <span className="text-sm font-bold text-foreground">{bestTime}</span>
              </div>
            )}
          </div>
        )}
        <p className="text-sm text-muted-foreground">{explanation}</p>
        <p className="text-sm text-muted-foreground">{details}</p>
      </div>
    </DialogContent>
  </Dialog>
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
          explanation={t.explanations.reservations}
          details={t.explanations.reservationsDetails}
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
          explanation={t.explanations.tickets}
          details={t.explanations.ticketsDetails}
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
          explanation={t.explanations.events}
          details={t.explanations.eventsDetails}
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
          explanation={t.explanations.peak}
          details={t.explanations.peakDetails}
        />
      </div>
    </div>
  );
};